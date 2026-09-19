/**
 * GET /my-listings (Phase 5) — owner-scoped listing management list.
 * JWT required; only the caller records are ever returned.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { config } from '../shared/config';
import { jsonResponse } from '../shared/http';
import { respondWithError } from '../shared/errors';
import { requireMethod } from '../shared/validate';
import { requireJwtSub } from '../shared/auth';
import { setRequestId } from '../shared/observability';
import { listingsByOwner } from '../services/listings';

const ROUTE = 'my-listings';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  setRequestId(event.requestContext.requestId);
  try {
    requireMethod(event, 'GET');
    const ownerId = requireJwtSub(event);
    const listings = await listingsByOwner(ownerId);
    return jsonResponse(200, { listings }, config.allowedOrigin);
  } catch (err) {
    return respondWithError(err, ROUTE, config.allowedOrigin);
  }
};
