import { describe, expect, it } from 'vitest';
import { classifyImage } from '../src/mock/classification';
import { WASTE_CATEGORIES } from '../src/types';

describe('classifyImage (mock)', () => {
  it('returns a valid category from the strict union', () => {
    const result = classifyImage('dGVzdCBpbWFnZQ==');
    expect(WASTE_CATEGORIES).toContain(result.category);
  });

  it('is deterministic — same bytes, same verdict (demo rehearsal stability)', () => {
    const a = classifyImage('YWJjZGVmZ2hpamtsbW5vcA==');
    const b = classifyImage('YWJjZGVmZ2hpamtsbW5vcA==');
    expect(a).toEqual(b);
  });

  it('produces confidence in [0,1] and a non-empty rationale', () => {
    for (const seed of ['c2VlZDE=', 'c2VlZDI=', 'c2VlZDM=', 'c2VlZDQ=', 'c2VlZDU=']) {
      const result = classifyImage(seed);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.rationale.length).toBeGreaterThan(10);
    }
  });

  it('exercises the low-signal band (<0.6) across the corpus', () => {
    const low = [...Array(64)]
      .map((_, i) => classifyImage(`c2VlZC0=${i}:${'e'.repeat(i + 1)}`))
      .filter((r) => r.confidence < 0.6);
    expect(low.length).toBeGreaterThan(0);
  });
});
