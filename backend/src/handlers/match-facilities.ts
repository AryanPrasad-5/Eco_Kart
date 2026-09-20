/**
 * POST /match-facilities — the human-override path.
 *
 *   guards → validate category+coords → DynamoDB → Haversine → rank → respond.
 *
 * ARCHITECTURAL GUARANTEE (unchanged, now IAM-reinforced too): this file
 * imports NO Bedrock module, and the Lambda's IAM policy grants no bedrock:*
 * actions. The override path can never invoke AI; Bedrock runs at most once
 * per image, only via /classify-and-match.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { config } from '../shared/config';
import { jsonResponse } from '../shared/http';
import { respondWithError } from '../shared/errors';
import { readJsonObject, validateCategory, validateLocation } from '../shared/validate';
import { setRequestId, startTimer, log, metric } from '../shared/observability';
import { matchFacilities } from '../services/facilities';

const ROUTE = 'match-facilities';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  setRequestId(event.requestContext.requestId);
  const elapsed = startTimer();
  try {
    const body = readJsonObject(event);
    const category = validateCategory(body);
    const userLocation = validateLocation(body);

    const matches = await matchFacilities(category, userLocation.lat, userLocation.lng);
    metric('MatchSuccess', 1, { Route: ROUTE, Category: category });
    if (matches.length === 0) metric('MatchEmptyResult', 1, { Route: ROUTE });

    log.info(ROUTE, 'request complete', {
      status: 200,
      latencyMs: elapsed(),
      matchCount: matches.length,
      category,
    });

    return jsonResponse(200, { matches, userLocation }, config.allowedOrigin);
  } catch (err) {
    log.info(ROUTE, 'request failed', { latencyMs: elapsed() });
    return respondWithError(err, ROUTE, config.allowedOrigin);
  }
};
