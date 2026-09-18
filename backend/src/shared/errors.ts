/**
 * Internal error model → safe HTTP mapping (consolidated plan §23).
 *
 * Transport shape is PRESERVED for the frontend contract: flat
 * `{ error: string, code?: string }`. Internal exception details are logged
 * server-side, never serialized to clients.
 *
 *   ValidationError      → 400   PayloadTooLarge      → 413
 *   InvalidImage         → 422   InvalidCategory      → 422
 *   ClassificationError  → 503   ConfigurationError   → 500
 *   anything else        → 500
 */

import { HttpError, jsonResponse } from './http';
import { log } from './observability';

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/** HttpError: validation-class errors carrying their own status + code. */
export { HttpError } from './http';

/** Bedrock classification failures (retry/fallback exhausted upstream). */
export class ClassificationError extends Error {
  constructor(
    readonly reason: 'no_tool_use' | 'invalid_output' | 'timeout' | 'throttled' | 'model_error',
    message: string,
  ) {
    super(message);
    this.name = 'ClassificationError';
  }
}

interface SafeResponse {
  status: number;
  code: string;
  message: string;
}

/** Map any error to a client-safe response spec. Raw AWS messages never leave. */
export function safeResponse(err: unknown): SafeResponse {
  if (err instanceof HttpError) {
    return {
      status: err.status,
      code: err.code ?? 'BAD_REQUEST',
      message: err.message,
    };
  }
  if (err instanceof ClassificationError) {
    return {
      status: 503,
      code: 'CLASSIFICATION_UNAVAILABLE',
      message: 'Waste classification is temporarily unavailable. You can still choose the material manually.',
    };
  }
  if (err instanceof ConfigurationError) {
    return {
      status: 500,
      code: 'CONFIGURATION_ERROR',
      message: 'The service is misconfigured. Contact the maintainers.',
    };
  }
  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error.',
  };
}

/** Render any error as a safe HTTP response with structured logging. */
export function respondWithError(
  err: unknown,
  route: string,
  allowedOrigin: string,
): ReturnType<typeof jsonResponse> {
  const safe = safeResponse(err);
  const detail = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : 'Unknown';
  const logFn = safe.status >= 500 ? log.error : log.warn;
  logFn(route, safe.status >= 500 ? 'internal error' : 'request rejected', {
    status: safe.status,
    code: safe.code,
    errorType: name,
    detail: safe.status >= 500 ? detail : detail.slice(0, 200),
  });
  return jsonResponse(safe.status, { error: safe.message, code: safe.code }, allowedOrigin);
}
