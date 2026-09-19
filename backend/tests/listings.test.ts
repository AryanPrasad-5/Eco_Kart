/**
 * Phase 3+4 unit tests: JWT identity guard + listing payload validation.
 */

import { describe, expect, it } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { requireJwtSub } from '../src/shared/auth';
import { validateListingInput } from '../src/shared/listingValidate';
import { HttpError } from '../src/shared/http';

const evt = (authorizer?: unknown): APIGatewayProxyEventV2 =>
  ({
    version: '2.0',
    routeKey: 'POST /listings',
    headers: { 'content-type': 'application/json' },
    requestContext: {
      requestId: 'r1',
      http: { method: 'POST', path: '/listings', protocol: 'HTTP/1.1', sourceIp: '1.2.3.4' },
      ...(authorizer ? { authorizer } : {}),
    },
  }) as unknown as APIGatewayProxyEventV2;

const VALID = {
  material: 'plastic',
  subtype: 'PET bottles, baled',
  quantityTonnes: 2.4,
  quality: 'A',
  pricePerKg: 38,
  city: 'Bengaluru',
  locality: 'Kanakapura Road',
  pickupLatitude: 12.91,
  pickupLongitude: 77.57,
  pickupFrom: '2026-09-24',
  description: 'Monthly PET collection',
};

describe('requireJwtSub (Phase 3)', () => {
  it('accepts a Cognito JWT authorizer context and returns sub', () => {
    const sub = requireJwtSub(evt({ jwt: { claims: { sub: 'user-a' } } }));
    expect(sub).toBe('user-a');
  });

  it('rejects missing authorizer with 401', () => {
    expect(() => requireJwtSub(evt())).toThrowError(HttpError);
    try {
      requireJwtSub(evt());
    } catch (e) {
      const httpError = e as HttpError;
      expect(httpError.status).toBe(401);
      expect(httpError.code).toBe('UNAUTHORIZED');
    }
  });

  it('rejects claims without sub', () => {
    expect(() => requireJwtSub(evt({ jwt: { claims: {} } }))).toThrowError(HttpError);
  });
});

describe('validateListingInput (Phase 4)', () => {
  it('accepts a valid payload and normalizes fields', () => {
    const out = validateListingInput({ ...VALID, description: '  padded  ' });
    expect(out.material).toBe('plastic');
    expect(out.description).toBe('padded');
    expect(out.pickupLatitude).toBe(12.91);
  });

  it('allows missing coordinates (null, honest unavailability downstream)', () => {
    const out = validateListingInput({ ...VALID, pickupLatitude: undefined, pickupLongitude: undefined });
    expect(out.pickupLatitude).toBeNull();
    expect(out.pickupLongitude).toBeNull();
  });

  it('rejects an unsupported material with 422', () => {
    try {
      validateListingInput({ ...VALID, material: 'nuclear' });
      expect.unreachable();
    } catch (e) {
      expect((e as HttpError).status).toBe(422);
    }
  });

  it('rejects a bad date format', () => {
    expect(() => validateListingInput({ ...VALID, pickupFrom: 'tomorrow' })).toThrowError(HttpError);
  });

  it('rejects out-of-range coordinates', () => {
    expect(() => validateListingInput({ ...VALID, pickupLatitude: 123 })).toThrowError(HttpError);
  });
});
