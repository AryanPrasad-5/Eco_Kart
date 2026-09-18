/**
 * POST /classify-and-match — the AI path.
 *
 *   guards → validate image+coords → Bedrock (≤1 verdict, hardened chain)
 *   → DynamoDB match → rank → bounded S3 archival (≤2 s) → respond.
 *
 * Bedrock exhaustion maps to 503 CLASSIFICATION_UNAVAILABLE — the frontend
 * shows its manual-category grid, so the journey survives AI downtime.
 * Request correlation: requestId → all log/metric lines.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { config } from '../shared/config';
import { jsonResponse } from '../shared/http';
import { ClassificationError, HttpError, respondWithError } from '../shared/errors';
import { readJsonObject, validateImagePayload, validateLocation } from '../shared/validate';
import { setRequestId, startTimer, log, metric } from '../shared/observability';
import { archiveImage } from '../shared/archive';
import { classifyImage } from '../services/classify';
import { matchFacilities } from '../services/facilities';

const ROUTE = 'classify-and-match';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const requestId = event.requestContext.requestId;
  setRequestId(requestId);
  const elapsed = startTimer();
  try {
    // 1 — validate (client untrusted; method/Content-Type/body/coords/image)
    const body = readJsonObject(event);
    const image = validateImagePayload(body.imageBase64);
    const userLocation = validateLocation(body);

    // 2 — classify (Bedrock; at most one verdict, bounded retry+fallback inside)
    const classification = await classifyImage(image);

    // 3 — match + rank (pure data + math)
    const matches = await matchFacilities(classification.category, userLocation.lat, userLocation.lng);
    metric('MatchSuccess', 1, { Route: ROUTE, Category: classification.category });
    if (matches.length === 0) metric('MatchEmptyResult', 1, { Route: ROUTE });

    // 4 — archival: bounded wait (≤2 s cap). Never fails the response; a slow
    // or hung upload is abandoned (logged) rather than held open.
    if (config.archiveImages && config.uploadsBucket) {
      await archiveImage(config.uploadsBucket, image.bytes, image.mime, {
        requestId,
        category: classification.category,
        confidence: classification.confidence,
      });
    }

    log.info(ROUTE, 'request complete', {
      status: 200,
      latencyMs: elapsed(),
      imageBytes: image.bytes.length,
      matchCount: matches.length,
      category: classification.category,
      confidence: classification.confidence,
    });

    return jsonResponse(
      200,
      {
        classification: {
          category: classification.category,
          confidence: classification.confidence,
          rationale: classification.rationale,
        },
        matches,
        userLocation,
      },
      config.allowedOrigin,
    );
  } catch (err) {
    // Validation rejections are client errors — keep the ClassificationFailure
    // metric a clean AI-health signal (it drives alarms on Bedrock outages).
    if (err instanceof HttpError) {
      metric('RequestRejected', 1, { Route: ROUTE, Code: err.code ?? 'BAD_REQUEST' });
    } else {
      metric('ClassificationFailure', 1, {
        Model: 'handler',
        Reason: err instanceof ClassificationError ? err.reason : 'internal',
      });
    }
    log.info(ROUTE, 'request failed', { status: 'see-error-line', latencyMs: elapsed() });
    return respondWithError(err, ROUTE, config.allowedOrigin);
  }
};
