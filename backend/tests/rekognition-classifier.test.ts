import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Rekognition classifier tests — mapper purity + service error mapping +
 * provider dispatch. The Rekognition SDK client is fully mocked; no live AWS.
 *
 * Dispatch coverage strategy: this file runs with the CODE-LEVEL default
 * (CLASSIFIER_PROVIDER unset → 'bedrock') for the routing test that asserts
 * Bedrock stays the recovery path, and explicitly sets CLASSIFIER_PROVIDER=
 * 'rekognition' via vi.hoisted for the rekognition-branch test. The untouched
 * handlers.test.ts suite (no env set → bedrock default) doubles as proof the
 * existing 81 tests are unaffected by the seam.
 */

const { rekognitionSend } = vi.hoisted(() => ({ rekognitionSend: vi.fn() }));

vi.mock('@aws-sdk/client-rekognition', () => ({
  RekognitionClient: class {
    send = rekognitionSend;
  },
  DetectLabelsCommand: class {
    constructor(public input: unknown) {}
  },
}));

vi.hoisted(() => {
  process.env.CLASSIFY_TIMEOUT_MS = '500';
});

import { classifyImageRekognition, mapLabelsToCategory } from '../src/services/rekognition';
import { config } from '../src/shared/config';
import { ClassificationError } from '../src/shared/errors';

const IMAGE = { bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), mime: 'image/jpeg' as const };

/** Build one well-formed Rekognition label. */
const label = (Name: string, Confidence: number) => ({ Name, Confidence });

const rekogResponse = (...labels: Array<{ Name: string; Confidence: number }>) => ({
  Labels: labels.map((l) => ({ ...l, Categories: [], Parents: [] })),
});

beforeEach(() => {
  rekognitionSend.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('mapLabelsToCategory — deterministic mapping rules', () => {
  it('maps Bottle + Plastic → plastic using the REAL label confidence', () => {
    const { result } = mapLabelsToCategory([label('Bottle', 98.2), label('Plastic', 96.4)]);
    expect(result.category).toBe('plastic');
    // Best TIER-1 match wins (Plastic 96.4) — the approved tier rule, and the
    // exact worked example from the project spec (not the shape label's 0.982).
    expect(result.confidence).toBe(0.964); // actual label confidence / 100 — never invented
    expect(result.rationale).toContain('Plastic');
  });

  it('Tier 1 beats shape: Bottle + Glass → glass', () => {
    const { result } = mapLabelsToCategory([label('Bottle', 98.0), label('Glass', 94.1)]);
    expect(result.category).toBe('glass');
  });

  it('metal via Aluminum Can; paper via Cardboard/Newspaper', () => {
    expect(mapLabelsToCategory([label('Aluminum Can', 97)]).result.category).toBe('metal');
    expect(mapLabelsToCategory([label('Newspaper', 95), label('Cardboard', 92)]).result.category).toBe('paper');
  });

  it('Mobile Phone → e-waste', () => {
    expect(mapLabelsToCategory([label('Mobile Phone', 99)]).result.category).toBe('e-waste');
  });

  it('Food + Plastic → higher-confidence Tier-1 substance wins (deterministic)', () => {
    expect(mapLabelsToCategory([label('Food', 97), label('Plastic', 90)]).result.category).toBe('organic');
    expect(mapLabelsToCategory([label('Food', 88), label('Plastic', 93)]).result.category).toBe('plastic');
  });

  it('exact confidence ties break by fixed PRIORITY order — never random', () => {
    const a = mapLabelsToCategory([label('Paper', 90), label('Plastic', 90)]).result.category;
    const b = mapLabelsToCategory([label('Plastic', 90), label('Paper', 90)]).result.category;
    expect(a).toBe(b);
    expect(a).toBe('plastic'); // plastic precedes paper in PRIORITY
  });

  it('no relevant labels → other, confidence capped at 0.5', () => {
    const { result } = mapLabelsToCategory([label('Person', 99.9), label('Clothing', 97)]);
    expect(result.category).toBe('other');
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });

  it('completely empty/invalid label list → other at the honest default', () => {
    expect(mapLabelsToCategory([]).result.category).toBe('other');
    expect(mapLabelsToCategory([]).result.confidence).toBe(0.3);
    expect(mapLabelsToCategory([label('X', 'high' as unknown as number)]).result.category).toBe('other');
  });
});

describe('classifyImageRekognition — real DetectLabels call (SDK mocked)', () => {
  it('sends ONE DetectLabels command with correct shape (bytes inline, no S3)', async () => {
    rekognitionSend.mockResolvedValueOnce(rekogResponse(label('Plastic', 96)));
    const result = await classifyImageRekognition(IMAGE);

    expect(result.category).toBe('plastic');
    expect(rekognitionSend).toHaveBeenCalledTimes(1);
    const firstCall = rekognitionSend.mock.calls[0];
    expect(firstCall).toBeDefined();
    const cmd = (firstCall?.[0] as { input: unknown }).input as {
      Image: { Bytes: Uint8Array };
      MaxLabels: number;
      MinConfidence: number;
    };
    expect(cmd.Image.Bytes).toBeInstanceOf(Uint8Array);
    expect(cmd.MaxLabels).toBe(10);
    expect(cmd.MinConfidence).toBe(50);
  });

  it('empty Labels array → typed invalid_output error (→ 503 contract)', async () => {
    rekognitionSend.mockResolvedValueOnce({ Labels: [] });
    await expect(classifyImageRekognition(IMAGE)).rejects.toThrow(ClassificationError);
  });

  it('ThrottlingException → throttled reason', async () => {
    rekognitionSend.mockRejectedValueOnce(Object.assign(new Error('busy'), { name: 'ThrottlingException' }));
    await expect(classifyImageRekognition(IMAGE)).rejects.toMatchObject({ reason: 'throttled' });
  });

  it('AccessDeniedException → model_error reason', async () => {
    rekognitionSend.mockRejectedValueOnce(Object.assign(new Error('nope'), { name: 'AccessDeniedException' }));
    await expect(classifyImageRekognition(IMAGE)).rejects.toMatchObject({ reason: 'model_error' });
  });

  it('does NOT retry on the same provider — exactly one send per call', async () => {
    rekognitionSend.mockRejectedValue(Object.assign(new Error('down'), { name: 'ServiceUnavailableException' }));
    await expect(classifyImageRekognition(IMAGE)).rejects.toThrow(ClassificationError);
    expect(rekognitionSend).toHaveBeenCalledTimes(1);
  });
});

describe('provider seam — dispatch by CLASSIFIER_PROVIDER', () => {
  it('code default (env unset) routes to Bedrock — recovery path stays intact', () => {
    // config was imported in this file WITHOUT CLASSIFIER_PROVIDER set → 'bedrock'.
    // handlers.test.ts (untouched) already proves this branch end-to-end via the
    // bedrock mock; here we assert the config gate itself.
    expect(config.classifierProvider).toBe('bedrock');
  });

  it("env CLASSIFIER_PROVIDER='rekognition' routes to Rekognition", async () => {
    // Fresh module graph with the env flipped, proving the gate admits rekognition.
    vi.resetModules();
    process.env.CLASSIFIER_PROVIDER = 'rekognition';
    const { classifyImage: dispatch } = await import('../src/services/classifier');
    const { classifyImageRekognition: rekgFn } = await import('../src/services/rekognition');
    rekognitionSend.mockResolvedValueOnce(rekogResponse(label('Glass', 91)));
    const result = await dispatch(IMAGE);
    expect(result.category).toBe('glass');
    expect(rekognitionSend).toHaveBeenCalledTimes(1);
    void rekgFn;
    process.env.CLASSIFIER_PROVIDER = '';
  });
});
