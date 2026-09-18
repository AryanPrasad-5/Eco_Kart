/**
 * Runtime configuration from environment variables (set in template.yaml) with
 * STARTUP VALIDATION (production-readiness §24): missing configuration fails
 * clearly at the first invocation of an affected route instead of surfacing as
 * a confusing 500 deep inside AWS SDK calls.
 *
 * BEDROCK_MODEL_ID / BEDROCK_MODEL_ID_FALLBACK are deployment parameters so the
 * model can be adapted per region WITHOUT touching code. Defaults are
 * LIVE-VERIFIED inference profiles in ap-south-1 (2026-09-16, README §0):
 * every Nova model there is INFERENCE_PROFILE-only, so plain foundation-model
 * IDs cannot be invoked directly.
 */

import { ConfigurationError } from './errors';

const str = (value: string | undefined, fallback: string): string =>
  value && value.trim().length > 0 ? value.trim() : fallback;

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  region: str(process.env.AWS_REGION, 'ap-south-1'),
  /** Locked-down CORS origin — Amplify domain in prod, localhost in dev. */
  allowedOrigin: str(process.env.ALLOWED_ORIGIN, '*'),
  tableName: str(process.env.TABLE_NAME, ''),
  uploadsBucket: str(process.env.UPLOADS_BUCKET, ''),
  archiveImages: str(process.env.ARCHIVE_IMAGES, 'true') !== 'false',

  bedrockModelId: str(process.env.BEDROCK_MODEL_ID, 'apac.amazon.nova-lite-v1:0'),
  bedrockModelIdFallback: str(process.env.BEDROCK_MODEL_ID_FALLBACK, 'global.amazon.nova-2-lite-v1:0'),

  /** Per-attempt Bedrock timeout — the whole retry+fallback chain is additionally
   *  capped by the 26 s wall-clock deadline in classify.ts (gateway ceiling 29 s). */
  classifyTimeoutMs: num(process.env.CLASSIFY_TIMEOUT_MS, 8_000),

  /** How long the response may wait for S3 image archival before abandoning
   *  the wait (the upload is logged as timed out; the response still succeeds). */
  archiveTimeoutMs: num(process.env.ARCHIVE_TIMEOUT_MS, 2_000),
} as const;

/** Assert configuration required by the DynamoDB-backed routes. */
export function requireTableConfig(): string {
  if (!config.tableName) {
    throw new ConfigurationError('TABLE_NAME is not set — Lambda environment is misconfigured.');
  }
  return config.tableName;
}
