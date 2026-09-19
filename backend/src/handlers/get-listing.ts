/**
 * GET /listings/{id} (Phase 4) — public read of one persisted listing.
 * Serves the ListingDetails page for user-created lots (sample/demo lots
 * stay client-side). Returns 404 for unknown ids — never fabricated data.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { config } from '../shared/config';
import { jsonResponse, HttpError } from '../shared/http';
import { respondWithError } from '../shared/errors';
import { requireMethod } from '../shared/validate';
import { setRequestId } from '../shared/observability';
import { getListing } from '../services/listings';

const ROUTE = 'get-listing';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  setRequestId(event.requestContext.requestId);
  try {
    requireMethod(event, 'GET');
    const listingId = event.pathParameters?.listingId ?? '';
    if (!/^[A-Za-z0-9-]{1,64}$/.test(listingId)) throw new HttpError(400, 'Invalid listing id.', 'VALIDATION_ERROR');
    const record = await getListing(listingId);
    if (!record) throw new HttpError(404, 'Listing not found.', 'NOT_FOUND');
    return jsonResponse(200, record, config.allowedOrigin);
  } catch (err) {
    return respondWithError(err, ROUTE, config.allowedOrigin);
  }
};
