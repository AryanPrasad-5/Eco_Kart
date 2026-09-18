/**
 * GET /facilities — raw registry dump (debug + seed verification).
 * Returns the validated facility array (frontend httpApi.getFacilities
 * consumes it as Facility[]). Malformed records never appear here.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { config } from '../shared/config';
import { jsonResponse } from '../shared/http';
import { respondWithError } from '../shared/errors';
import { requireMethod } from '../shared/validate';
import { setRequestId, startTimer, log } from '../shared/observability';
import { listFacilities } from '../services/facilities';

const ROUTE = 'facilities';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  setRequestId(event.requestContext.requestId);
  const elapsed = startTimer();
  try {
    requireMethod(event, 'GET');
    const facilities = await listFacilities();
    log.info(ROUTE, 'request complete', { status: 200, latencyMs: elapsed(), count: facilities.length });
    return jsonResponse(200, facilities, config.allowedOrigin);
  } catch (err) {
    log.info(ROUTE, 'request failed', { latencyMs: elapsed() });
    return respondWithError(err, ROUTE, config.allowedOrigin);
  }
};
