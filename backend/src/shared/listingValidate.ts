/**
 * Listing payload validation (Phase 4) — the client is untrusted.
 * Server-side mirror of the wizard rules; also used by tests.
 */

import { HttpError } from './http';
import { isRecord } from './validate';

const MATERIALS = ['plastic', 'paper', 'cardboard', 'metal', 'glass', 'e-waste'];
const QUALITIES = ['A', 'B', 'C'];
const MAX_STR = 200;

function str(v: unknown, field: string, max = MAX_STR, optional = false): string {
  if (v === undefined || v === '') {
    if (optional) return '';
    throw new HttpError(400, field + ' is required.', 'VALIDATION_ERROR');
  }
  if (typeof v !== 'string') throw new HttpError(400, field + ' must be a string.', 'VALIDATION_ERROR');
  const t = v.trim();
  if (!optional && t.length === 0) throw new HttpError(400, field + ' is required.', 'VALIDATION_ERROR');
  return t.slice(0, max);
}

function num(v: unknown, field: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
    throw new HttpError(400, field + ' must be a number in [' + min + ', ' + max + '].', 'VALIDATION_ERROR');
  }
  return v;
}

export interface ValidatedListingInput {
  material: string;
  subtype: string;
  quantityTonnes: number;
  quality: string;
  pricePerKg: number;
  city: string;
  locality: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  pickupFrom: string;
  description: string;
}

export function validateListingInput(body: unknown): ValidatedListingInput {
  if (!isRecord(body)) throw new HttpError(400, 'Request body must be a JSON object.');
  const material = str(body.material, 'material', 20);
  if (!MATERIALS.includes(material)) throw new HttpError(422, 'Unsupported material.', 'INVALID_CATEGORY');
  const quality = str(body.quality, 'quality', 2);
  if (!QUALITIES.includes(quality)) throw new HttpError(422, 'quality must be A, B or C.', 'VALIDATION_ERROR');
  const quantityTonnes = num(body.quantityTonnes, 'quantityTonnes', 0.0001, 10_000);
  const pricePerKg = num(body.pricePerKg, 'pricePerKg', 0.5, 10_000);
  const locality = str(body.locality, 'locality');
  const city = str(body.city, 'city', 80);
  const subtype = str(body.subtype, 'subtype');
  const pickupFrom = str(body.pickupFrom, 'pickupFrom', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupFrom)) {
    throw new HttpError(400, 'pickupFrom must be an ISO date (YYYY-MM-DD).', 'VALIDATION_ERROR');
  }
  const latGiven = body.pickupLatitude !== undefined && body.pickupLatitude !== null;
  const lngGiven = body.pickupLongitude !== undefined && body.pickupLongitude !== null;
  if (latGiven !== lngGiven) {
    throw new HttpError(400, 'pickupLatitude and pickupLongitude must be provided together.', 'VALIDATION_ERROR');
  }
  const hasCoords = latGiven;
  let pickupLatitude: number | null = null;
  let pickupLongitude: number | null = null;
  if (hasCoords) {
    pickupLatitude = num(body.pickupLatitude, 'pickupLatitude', -90, 90);
    pickupLongitude = num(body.pickupLongitude, 'pickupLongitude', -180, 180);
  }
  const description = str(body.description, 'description', 2000, true);
  return { material, subtype, quantityTonnes, quality, pricePerKg, city, locality, pickupLatitude, pickupLongitude, pickupFrom, description };
}
