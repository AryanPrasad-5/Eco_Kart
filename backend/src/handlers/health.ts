/**
 * GET /health — deployment / pre-demo liveness check.
 * Always 200 when the Lambda itself is running; the registry field carries
 * DynamoDB reachability/seed state so health stays a pure liveness probe.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { config } from '../shared/config';
import { jsonResponse } from '../shared/http';
import { respondWithError } from '../shared/errors';
import { requireMethod } from '../shared/validate';
import { setRequestId, log } from '../shared/observability';
import { listFacilities } from '../services/facilities';

const ROUTE = 'health';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  setRequestId(event.requestContext.requestId);
  try {
    requireMethod(event, 'GET');
    let registry: 'ok' | 'empty' | 'unavailable' = 'unavailable';
    if (config.tableName) {
      try {
        const facilities = await listFacilities();
        registry = facilities.length > 0 ? 'ok' : 'empty';
      } catch (err) {
        log.warn(ROUTE, 'registry probe failed', {
          detail: err instanceof Error ? err.message.slice(0, 200) : String(err),
        });
      }
    }
    return jsonResponse(200, { status: 'ok', registry, region: config.region }, config.allowedOrigin);
  } catch (err) {
    return respondWithError(err, ROUTE, config.allowedOrigin);
  }
};
