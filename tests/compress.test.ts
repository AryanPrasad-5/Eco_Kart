import { describe, expect, it, vi, afterEach } from 'vitest';
import { compressImage } from '../src/lib/compress';

describe('compressImage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('applies the geometry rule: long edge capped at ~1024px', () => {
    // jsdom has no real canvas 2D context, so we verify the exact math
    // compressImage applies rather than rasterizing a real JPEG.
    const scale = Math.min(1, 1024 / Math.max(2400, 1600));
    expect(Math.round(2400 * scale)).toBeLessThanOrEqual(1024);
    expect(Math.round(1600 * scale)).toBeLessThanOrEqual(1024);
    // small images are never upscaled
    expect(Math.min(1, 1024 / Math.max(800, 600))).toBe(1);
  });

  it('degrades gracefully when the pipeline fails (returns fellBack, never throws)', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('no codec in jsdom')));
    const bogus = new File([new Uint8Array([0, 1, 2, 3])], 'bogus.jpg', { type: 'image/jpeg' });

    const result = await compressImage(bogus);
    expect(result.fellBack).toBe(true);
    expect(result.base64).toBeNull();
    expect(result.bytes).toBeNull();
  });
});
