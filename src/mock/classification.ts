/**
 * Mock classification engine — now the AI material-tagging assist inside
 * Create Listing. Deterministic per image: an FNV-1a hash of the image
 * bytes selects a verdict, so the same photo always classifies the same
 * way. Confidence lands in the "AI signal" band the UI expects; ~1 in 6
 * images lands below 0.6 to exercise the low-signal path. Rationales
 * speak in material terms and never claim accuracy we don't have.
 */

import type { ClassificationResult, WasteCategory } from '../types';

/** Stable 32-bit FNV-1a hash of the image bytes. */
function fnv1a(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i] as number;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const RATIONALES: Record<WasteCategory, string[]> = {
  plastic: [
    'Rigid container with smooth moulded surface and uniform translucency typical of PET plastic.',
    'Lightweight item with moulded seams and a screw-top neck consistent with plastic packaging.',
  ],
  paper: [
    'Matte fibrous texture and folded creases characteristic of paper or cardboard packaging.',
    'Printed fibrous sheet with soft edges — consistent with newspaper or paper waste.',
  ],
  metal: [
    'Reflective metallic surface with rolled rim, typical of an aluminium or tin can.',
    'Dull grey metal body with stamped markings — consistent with scrap metal.',
  ],
  glass: [
    'Transparent body with thick walls and specular highlights typical of container glass.',
    'Smooth glass surface with uniform refraction and a moulded base.',
  ],
  'e-waste': [
    'Housing with vents, cables and electronic markings — consistent with discarded electronics.',
    'Device shell with circuit elements visible — classified by material as electronic waste.',
  ],
  organic: [
    'Irregular soft-edged item with moist organic texture and natural coloration.',
    'Food/leaf matter with uneven surface — classified by material as organic waste.',
  ],
  other: [
    'Mixed materials or insufficient visual cues — best classified as other.',
    'Surface details are inconclusive; material composition cannot be determined reliably.',
  ],
};

/** Distinct verdict slots; several map to 'other' to exercise low-signal paths. */
const VERDICT_SLOTS: readonly WasteCategory[] = [
  'plastic',
  'plastic',
  'paper',
  'metal',
  'glass',
  'e-waste',
  'organic',
  'other',
  'other',
  'other',
  'plastic',
  'paper',
];

export function classifyImage(base64: string): ClassificationResult {
  const hash = fnv1a(new TextEncoder().encode(base64.slice(0, 4096)));
  const category = VERDICT_SLOTS[hash % VERDICT_SLOTS.length] as WasteCategory;
  const rationales = RATIONALES[category];

  // Confidence band by hash: most images 0.72–0.94; ~1 in 6 below 0.6 (low-signal path).
  const band = hash % 6;
  const confidence =
    band === 0
      ? 0.38 + ((hash >> 8) % 18) / 100 // 0.38–0.55 — low signal
      : 0.72 + ((hash >> 8) % 23) / 100; // 0.72–0.94

  return {
    category,
    confidence: Math.round(confidence * 100) / 100,
    rationale: rationales[hash % rationales.length] as string,
  };
}

/** Staged loading messages shown while the (mock) tagging pipeline runs. */
export const CLASSIFICATION_STAGES = [
  'Analyzing the photo…',
  'Identifying material composition…',
  'Matching against tradable materials…',
] as const;

/** Realistic total latency for the mock pipeline. */
export const MOCK_LATENCY_MS = 1400;
