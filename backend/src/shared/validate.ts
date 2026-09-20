/**
 * Centralized request + data validation (single source of truth).
 *
 * The client is untrusted: method, Content-Type, JSON shape, coordinates,
 * image encoding/size/format and facility records are all validated here —
 * handlers never re-implement validation.
 *
 *   400 Bad Request · 413 Payload Too Large · 422 Unprocessable Entity
 */

import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { Facility, Location, WasteCategory } from './types';
import { isWasteCategory, normalizeCategory } from './categories';
import { HttpError } from './http';

/* ── Limits ──────────────────────────────────────────────────────────────── */

/** Hard ceiling on the decoded image. The frontend targets ≤ ~800 KB;
 *  4 MB leaves headroom for the uncompressed-fallback path while staying far
 *  below API Gateway's 10 MB request limit (which also guards this Lambda). */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/* ── Guards (method / content type) ──────────────────────────────────────── */

export function requireMethod(event: APIGatewayProxyEventV2, ...allowed: string[]): void {
  const method = event.requestContext.http.method.toUpperCase();
  if (!allowed.includes(method)) {
    throw new HttpError(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED');
  }
}

export function requireJsonContentType(event: APIGatewayProxyEventV2): void {
  // GET/OPTIONS have no body; POSTs must declare JSON. Absent header → reject.
  const header = Object.entries(event.headers ?? {}).find(
    ([k]) => k.toLowerCase() === 'content-type',
  );
  const contentType = header?.[1] ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json.', 'UNSUPPORTED_MEDIA_TYPE');
  }
}

/* ── Body parsing ────────────────────────────────────────────────────────── */

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Parse the JSON body of an HTTP API v2 event (handles isBase64Encoded). */
export function parseJsonBody(event: APIGatewayProxyEventV2): unknown {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
    : event.body;
  if (!raw) throw new HttpError(400, 'Request body is required.');
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
}

/** Extract and validate a JSON-object body, enforcing method + content type. */
export function readJsonObject(
  event: APIGatewayProxyEventV2,
): Record<string, unknown> {
  requireMethod(event, 'POST');
  requireJsonContentType(event);
  const body = parseJsonBody(event);
  if (!isRecord(body)) throw new HttpError(400, 'Request body must be a JSON object.');
  return body;
}

/* ── Coordinates ─────────────────────────────────────────────────────────── */

export function validateLocation(body: Record<string, unknown>): Location {
  const lat = body.lat;
  const lng = body.lng;
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new HttpError(400, 'Invalid lat: must be a number in [-90, 90].');
  }
  if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new HttpError(400, 'Invalid lng: must be a number in [-180, 180].');
  }
  return { lat, lng };
}

/* ── Category ────────────────────────────────────────────────────────────── */

export function validateCategory(body: Record<string, unknown>): WasteCategory {
  const category = normalizeCategory(body.category);
  if (!category) {
    throw new HttpError(
      422,
      'category must be one of: plastic, paper, metal, glass, e-waste, organic, other.',
      'INVALID_CATEGORY',
    );
  }
  return category;
}

/* ── Image ───────────────────────────────────────────────────────────────── */

export interface ValidatedImage {
  bytes: Buffer;
  mime: 'image/jpeg' | 'image/png';
}

function decodeBase64(base64: string): Buffer {
  if (base64.length === 0) throw new HttpError(422, 'Image payload is empty.', 'EMPTY_IMAGE');
  if (base64.length > MAX_IMAGE_BYTES * 1.4) {
    // 4/3 expansion → base64 length ≈ bytes × 1.37; reject before decoding.
    throw new HttpError(413, 'Image too large after encoding.', 'PAYLOAD_TOO_LARGE');
  }
  if (!/^[A-Za-z0-9+/\r\n]+={0,2}$/.test(base64)) {
    throw new HttpError(422, 'Image payload is not valid base64.', 'MALFORMED_IMAGE');
  }
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) throw new HttpError(422, 'Image payload is empty.', 'EMPTY_IMAGE');
  if (bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'Image too large.', 'PAYLOAD_TOO_LARGE');
  return bytes;
}

/** Magic-byte sniffing — Content-Type is never trusted. */
function sniffMime(bytes: Buffer): 'image/jpeg' | 'image/png' | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length > 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  return null;
}

export function validateImagePayload(base64: unknown): ValidatedImage {
  if (typeof base64 !== 'string' || base64.trim().length === 0) {
    throw new HttpError(400, 'imageBase64 is required.');
  }
  const bytes = decodeBase64(base64.trim());
  const mime = sniffMime(bytes);
  if (!mime) {
    throw new HttpError(422, 'Unsupported image data — expected a JPEG or PNG image.', 'INVALID_IMAGE');
  }
  return { bytes, mime };
}

/* ── Facility records (DynamoDB is untrusted data too) ───────────────────── */

const MAX_TEXT_LEN = 200;

/** Numeric payout value in INR/kg — finite, non-negative, sane upper bound. */
function parsePayoutValue(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10_000) {
    return null;
  }
  return value;
}

/**
 * Validate one facility record. Returns null for malformed records
 * (caller skips + logs) so ONE bad row can never crash matching,
 * produce NaN distances, or corrupt ranking.
 */
export function parseFacility(item: Record<string, unknown> | undefined): Facility | null {
  if (!isRecord(item)) return null;

  const facility_id = item.facility_id;
  if (typeof facility_id !== 'string' || facility_id.length === 0 || facility_id.length > 64) return null;
  const name = item.name;
  if (typeof name !== 'string' || name.trim().length === 0) return null;
  const trimmedName = name.slice(0, MAX_TEXT_LEN);

  const lat = item.lat;
  const lng = item.lng;
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) return null;

  const accepted = item.accepted_categories;
  if (!Array.isArray(accepted) || accepted.length === 0 || accepted.length > 7) return null;
  if (!accepted.every((c) => isWasteCategory(c))) return null;

  const payoutRaw = item.payout_estimate;
  if (!isRecord(payoutRaw)) return null;
  const payout_estimate: Partial<Record<WasteCategory, number>> = {};
  for (const [key, value] of Object.entries(payoutRaw)) {
    if (!isWasteCategory(key)) return null;
    const payout = parsePayoutValue(value);
    if (payout === null) return null; // reject NaN/negative/absurd payouts outright
    payout_estimate[key as WasteCategory] = payout;
  }

  const payout_basis = item.payout_basis;
  if (payout_basis !== 'estimated' && payout_basis !== 'verified') return null;
  const verified = item.verified;
  if (typeof verified !== 'boolean') return null;

  const text = (key: string): string => {
    const value = item[key];
    return typeof value === 'string' ? value.slice(0, MAX_TEXT_LEN) : '';
  };

  return {
    facility_id,
    name: trimmedName,
    lat,
    lng,
    accepted_categories: accepted as WasteCategory[],
    payout_estimate,
    payout_basis,
    verified,
    address: text('address'),
    contact: text('contact'),
    operating_hours: text('operating_hours'),
    source: text('source'),
    updated_at: text('updated_at'),
  };
}
