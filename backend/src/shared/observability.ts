/**
 * Structured logging + CloudWatch EMF metrics — zero dependencies.
 *
 * Every request emits correlation-consistent JSON log lines (CloudWatch Logs
 * Insights searchable) and key events emit EMF metric lines so CloudWatch
 * creates custom metrics without any agent or Powertools dependency.
 *
 * NEVER logged: image bytes/base64, credentials, secrets. Coordinates are
 * coarse inputs and are logged only at info for POST routes (truncated).
 */

type Json = string | number | boolean | null;

let currentRequestId = 'local';

export function setRequestId(id: string): void {
  currentRequestId = id || 'unknown';
}

export function getRequestId(): string {
  return currentRequestId;
}

function emit(level: 'INFO' | 'WARN' | 'ERROR', route: string, message: string, fields?: Record<string, Json>): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    requestId: currentRequestId,
    route,
    message,
    ...fields,
  });
  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.info(line);
}

export const log = {
  info: (route: string, message: string, fields?: Record<string, Json>) => emit('INFO', route, message, fields),
  warn: (route: string, message: string, fields?: Record<string, Json>) => emit('WARN', route, message, fields),
  error: (route: string, message: string, fields?: Record<string, Json>) => emit('ERROR', route, message, fields),
};

/* ── CloudWatch EMF metrics (embedded metric format) ─────────────────────── */

const METRIC_NAMESPACE = 'SmartSort';

export type MetricName =
  | 'ClassificationSuccess'
  | 'ClassificationFailure'
  | 'ClassificationFallbackUsed'
  | 'MatchSuccess'
  | 'MatchEmptyResult'
  | 'RequestRejected'
  | 'ArchiveSuccess'
  | 'ArchiveFailure'
  | 'ArchiveTimeout';

export function metric(
  name: MetricName,
  value: number,
  dimensions: Record<string, string>,
  unit: 'Count' | 'Milliseconds' = 'Count',
): void {
  // EMF: metric directives embedded in a log line CloudWatch parses.
  const emf = {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: METRIC_NAMESPACE,
          Dimensions: [Object.keys(dimensions)],
          Metrics: [{ Name: name, Unit: unit }],
        },
      ],
    },
    RequestId: currentRequestId,
    ...dimensions,
    [name]: value,
  };
  console.info(JSON.stringify(emf));
}

/** Latency helper for per-request duration logging. */
export function startTimer(): () => number {
  const started = Date.now();
  return () => Date.now() - started;
}
