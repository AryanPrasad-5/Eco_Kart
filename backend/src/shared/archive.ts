/**
 * Image archival to the private S3 bucket — bounded wait, never fails the response.
 *
 * The handler awaits this call, but the wait is capped at ARCHIVE_TIMEOUT_MS
 * (default 2 s): the response is never held longer than that. Upload failures
 * and timeouts are logged + counted and otherwise swallowed. (Replaces the
 * previous fire-and-forget design, whose in-flight PUTs could be silently
 * dropped when Lambda froze the container before completion.)
 *
 * Privacy: images may contain incidental personal information. Retention is
 * 30 days (template lifecycle rule); metadata is minimal (category, coarse
 * AI-signal, requestId) and no user identifiers are stored.
 */

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from './config';
import { log, metric } from './observability';

const s3 = new S3Client({});

export async function archiveImage(
  bucket: string,
  body: Buffer,
  mime: 'image/jpeg' | 'image/png',
  meta: { requestId: string; category: string; confidence: number },
): Promise<void> {
  // Safe key construction: requestId comes from API Gateway (UUID), category is
  // validated upstream — no user-controlled path segments, no traversal risk.
  const date = new Date().toISOString().slice(0, 10);
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  const key = `uploads/${date}/${meta.requestId}.${ext}`;

  const put = s3
    .send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: mime,
        Metadata: {
          category: meta.category,
          'confidence-signal': String(meta.confidence),
          'request-id': meta.requestId,
        },
      }),
    )
    .then(() => {
      metric('ArchiveSuccess', 1, { Route: 'classify-and-match' });
      log.info('archive', 'image archived', { key });
    })
    .catch((err: unknown) => {
      // Log-only by design: archival failure must never fail the user request.
      metric('ArchiveFailure', 1, { Route: 'classify-and-match' });
      log.warn('archive', 'archival failed (response unaffected)', {
        detail: err instanceof Error ? err.message : String(err),
      });
    });

  // Abandon the WAIT (never the response) if the upload exceeds the cap. The
  // upload itself is left to settle in the background — its eventual outcome
  // is still logged/metered by the put chain above.
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const waitCap = new Promise<void>((resolve) => {
    timeout = setTimeout(() => {
      log.warn('archive', 'upload exceeded wait cap — abandoning wait (response unaffected)', {
        ms: config.archiveTimeoutMs,
        key,
      });
      metric('ArchiveTimeout', 1, { Route: 'classify-and-match' });
      resolve();
    }, config.archiveTimeoutMs);
  });

  try {
    await Promise.race([put, waitCap]);
  } finally {
    clearTimeout(timeout);
  }
}
