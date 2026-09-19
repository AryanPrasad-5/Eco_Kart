/**
 * RekognitionClassifier — the ACTIVE classification provider.
 *
 * Replaces Bedrock as primary (account-level Bedrock entitlement is blocked:
 * ValidationException "Operation not allowed" on both Nova profiles). Bedrock
 * remains intact + recoverable in services/classify.ts via the provider seam
 * (services/classifier.ts) — NOT part of the live fallback chain.
 *
 * HONESTY BOUNDARY (by design): Amazon Rekognition DetectLabels is a GENERIC
 * visual label detector — it returns labels like "Bottle", "Plastic",
 * "Mobile Phone". It does NOT classify waste. All category semantics live in
 * the deterministic mapper below (application layer), never in the service.
 *
 * Contract in : { bytes, mime } — validated upstream (JPEG/PNG magic bytes,
 *               ≤4 MB). DetectLabels accepts raw bytes (JPEG/PNG, ≤5 MB,
 *               ≤10,000 px) → NO re-encoding, NO S3 prerequisite.
 * Contract out: { category, confidence, rationale } — identical shape to the
 *               Bedrock provider; the handler/frontend cannot tell them apart.
 * Confidence  : the ACTUAL Rekognition label Confidence / 100 (a calibrated
 *               CV signal from AWS). Never synthesized. Unmapped detections
 *               are capped at 0.5 so the system never over-claims uncertainty.
 * Errors      : ClassificationError — the same taxonomy the handler already
 *               maps to 503 CLASSIFICATION_UNAVAILABLE (frontend manual grid).
 */

import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import { config } from '../shared/config';
import { ClassificationError } from '../shared/errors';
import { log, metric } from '../shared/observability';
import type { ClassificationResult, WasteCategory } from '../shared/types';

const rekognition = new RekognitionClient({ region: config.region });

/** MVP tuning: few labels, low floor — precision comes from the mapper. */
const MAX_LABELS = 10;
const MIN_CONFIDENCE = 50;

const MODEL_DIM = 'rekognition-detect-labels';

/** Tier 1 — material/substance evidence. Beats shape inference. */
const TIER1: Readonly<Record<string, WasteCategory>> = {
  plastic: 'plastic',
  glass: 'glass',
  metal: 'metal',
  aluminum: 'metal',
  'aluminum can': 'metal',
  'tin can': 'metal',
  paper: 'paper',
  cardboard: 'paper',
  newspaper: 'paper',
  food: 'organic',
  fruit: 'organic',
  vegetable: 'organic',
  plant: 'organic',
  flower: 'organic',
  electronics: 'e-waste',
};

/** Tier 2 — object/shape inference, consulted ONLY when no Tier-1 label exists. */
const TIER2: Readonly<Record<string, WasteCategory>> = {
  bottle: 'plastic',
  'plastic bag': 'plastic',
  can: 'metal',
  book: 'paper',
  'mobile phone': 'e-waste',
  phone: 'e-waste',
  laptop: 'e-waste',
  computer: 'e-waste',
  keyboard: 'e-waste',
  'computer mouse': 'e-waste',
  television: 'e-waste',
  monitor: 'e-waste',
};

/** Fixed tie-break order — deterministic, never random. */
const PRIORITY: readonly WasteCategory[] = ['plastic', 'paper', 'metal', 'glass', 'e-waste', 'organic'];

/** Cap for the "other" category — the system never over-claims uncertainty. */
const OTHER_CONFIDENCE_CAP = 0.5;

export interface MappedVerdict {
  result: ClassificationResult;
  /** Cleaned label names actually considered (for logging only — never returned to clients). */
  usedLabels: string[];
}

/**
 * Pure, deterministic label→category mapping. Exported so unit tests cover
 * the full mapping table with zero AWS dependency.
 *
 * Rules:
 *   1. Tier 1 (materials) beats Tier 2 (objects) — "Bottle + Glass" → glass.
 *   2. Within a tier: highest confidence wins; exact ties broken by the
 *      fixed PRIORITY order (never random).
 *   3. No relevant label in either tier → "other", confidence capped at 0.5.
 */
export function mapLabelsToCategory(
  labels: ReadonlyArray<{ Name?: unknown; Confidence?: unknown }>,
): MappedVerdict {
  // Coerce once; keep Rekognition's calibrated Confidence (0–100) → [0,1].
  const valid = labels.flatMap((l) => {
    if (typeof l?.Name !== 'string' || l.Name.trim().length === 0) return [];
    if (typeof l?.Confidence !== 'number' || !Number.isFinite(l.Confidence)) return [];
    if (l.Confidence < 0 || l.Confidence > 100) return [];
    return [{ name: l.Name, conf: l.Confidence / 100 }];
  });

  const usedLabels = valid.map((v) => v.name);

  for (const tier of [TIER1, TIER2]) {
    let best: { category: WasteCategory; conf: number; label: string } | null = null;
    for (const { name, conf } of valid) {
      const category = tier[name.trim().toLowerCase()];
      if (!category) continue;
      const better =
        best === null ||
        conf > best.conf ||
        (conf === best.conf && PRIORITY.indexOf(category) < PRIORITY.indexOf(best.category));
      if (better) best = { category, conf, label: name };
    }
    if (best) {
      return {
        result: {
          category: best.category,
          confidence: Math.round(best.conf * 1000) / 1000,
          rationale: `Visual labels detected: ${best.label}.`,
        },
        usedLabels,
      };
    }
  }

  // Honest uncertainty path.
  const top = valid[0];
  return {
    result: {
      category: 'other',
      confidence: top ? Math.min(OTHER_CONFIDENCE_CAP, Math.round(top.conf * 1000) / 1000) : 0.3,
      rationale: top
        ? `Unrecognized waste item — visual label: ${top.name}.`
        : 'No recognizable waste labels detected.',
    },
    usedLabels,
  };
}

/** AWS exception names that mean transient load — safe to surface as 'throttled'. */
const THROTTLED = new Set([
  'ThrottlingException',
  'ProvisionedThroughputExceededException',
  'ServiceUnavailableException',
  'InternalServerError',
]);

/**
 * Classify via ONE real DetectLabels call (bounded by the existing per-attempt
 * timeout). No retry chain — the SDK's standard retry mode handles transient
 * transport failures internally; anything surfaced here maps to the existing
 * 503 CLASSIFICATION_UNAVAILABLE contract.
 */
export async function classifyImageRekognition(
  image: { bytes: Buffer; mime: 'image/jpeg' | 'image/png' },
): Promise<ClassificationResult> {
  const started = Date.now();
  try {
    const response = await rekognition.send(
      new DetectLabelsCommand({
        Image: { Bytes: new Uint8Array(image.bytes) },
        MaxLabels: MAX_LABELS,
        MinConfidence: MIN_CONFIDENCE,
      }),
      { abortSignal: AbortSignal.timeout(config.classifyTimeoutMs) },
    );

    const labels = Array.isArray(response.Labels) ? response.Labels : [];
    if (labels.length === 0) {
      throw new ClassificationError('invalid_output', `${MODEL_DIM}: empty Labels array`);
    }

    const { result, usedLabels } = mapLabelsToCategory(labels);
    metric('ClassificationSuccess', 1, { Model: MODEL_DIM });
    log.info('classify', 'classified', {
      model: MODEL_DIM,
      fallback: false,
      latencyMs: Date.now() - started,
      category: result.category,
      labelCount: usedLabels.length,
    });
    return result;
  } catch (err) {
    if (err instanceof ClassificationError) {
      metric('ClassificationFailure', 1, { Model: MODEL_DIM, Reason: err.reason });
      throw err;
    }
    const name = (err as { name?: string })?.name ?? 'unknown';
    const reason = THROTTLED.has(name) ? ('throttled' as const) : ('model_error' as const);
    metric('ClassificationFailure', 1, { Model: MODEL_DIM, Reason: reason });
    // AWS message is logged for diagnosis; only the typed error leaves the service.
    const awsMessage = err instanceof Error && err.message ? err.message.slice(0, 200) : '';
    log.warn('classify', 'rekognition call failed', { awsError: name, reason, awsMessage });
    throw new ClassificationError(reason, `${MODEL_DIM}: ${name}`);
  }
}
