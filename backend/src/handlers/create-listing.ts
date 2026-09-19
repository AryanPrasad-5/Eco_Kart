/**
 * POST /listings (Phase 4) — authenticated listing creation.
 * Identity comes exclusively from the Cognito JWT (requestContext), never
 * from the request body. Server generates the listingId and timestamps.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { config } from '../shared/config';
import { jsonResponse } from '../shared/http';
import { respondWithError } from '../shared/errors';
import { readJsonObject } from '../shared/validate';
import { validateListingInput } from '../shared/listingValidate';
import { requireJwtSub } from '../shared/auth';
import { setRequestId, log } from '../shared/observability';
import { putListing, type ListingRecord } from '../services/listings';

const ROUTE = 'create-listing';

function newListingId(): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return 'LX-' + suffix;
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  setRequestId(event.requestContext.requestId);
  try {
    const ownerId = requireJwtSub(event);
    const input = validateListingInput(readJsonObject(event));
    const now = new Date().toISOString();
    const record: ListingRecord = {
      listingId: newListingId(),
      ownerId,
      material: input.material,
      subtype: input.subtype,
      quantityTonnes: input.quantityTonnes,
      quality: input.quality,
      pricePerKg: input.pricePerKg,
      city: input.city,
      locality: input.locality,
      pickupLatitude: input.pickupLatitude,
      pickupLongitude: input.pickupLongitude,
      pickupFrom: input.pickupFrom,
      description: input.description,
      status: 'available',
      createdAt: now,
      updatedAt: now,
    };
    await putListing(record);
    return jsonResponse(201, { listingId: record.listingId, createdAt: record.createdAt, status: record.status }, config.allowedOrigin);
  } catch (err) {
    return respondWithError(err, ROUTE, config.allowedOrigin);
  }
};
