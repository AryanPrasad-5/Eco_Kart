/**
 * Client-side image compression (spec §3).
 * Resizes to ≤1024 px on the long edge and JPEG-compresses with quality
 * stepping until the result is ≤ ~800 KB (best-effort).
 *
 * Uses document.createElement('canvas') rather than OffscreenCanvas for
 * iOS Safari safety. Never throws for recoverable problems — callers get
 * `null` and should fall back to the original file bytes instead.
 */

const MAX_DIMENSION = 1024;
const INITIAL_QUALITY = 0.8;
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.1;
const TARGET_BYTES = 800_000;

export interface CompressResult {
  /** Base64 (no data: prefix) of the compressed JPEG, or null on failure. */
  base64: string | null;
  /** Compressed size in bytes, or null on failure. */
  bytes: number | null;
  /** True when compression failed and the caller should fall back to the original. */
  fellBack: boolean;
}

function canvasToBase64(canvas: HTMLCanvasElement, quality: number): Promise<{ base64: string; bytes: number }> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('canvas.toBlob returned null'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          // strip the "data:image/jpeg;base64," prefix
          resolve({ base64: dataUrl.slice(dataUrl.indexOf(',') + 1), bytes: blob.size });
        };
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

export async function compressImage(file: File): Promise<CompressResult> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    let quality = INITIAL_QUALITY;
    let result = await canvasToBase64(canvas, quality);

    // quality stepping until ≤ ~800 KB (spec §3)
    while (result.bytes > TARGET_BYTES && quality > MIN_QUALITY) {
      quality -= QUALITY_STEP;
      result = await canvasToBase64(canvas, quality);
    }

    return { base64: result.base64, bytes: result.bytes, fellBack: false };
  } catch (err) {
    console.warn('SmartSort: compression failed, sending original bytes.', err);
    return { base64: null, bytes: null, fellBack: true };
  }
}

/** Read a File as raw base64 (no data: prefix) — the fallback path. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}
