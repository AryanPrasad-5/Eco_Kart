import { ApiError } from '../types';
import type { Listing } from '../types';
import { getAccessToken } from '../auth/cognito';

/**
 * Listings API (Phases 4+5) - the real persistence path.
 * Every write call carries the Cognito access token; the backend derives
 * ownerId from the verified JWT sub, never from the request body.
 */

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(new RegExp('/+$'), '');

export interface ListingRecord {
  listingId: string;
  ownerId: string;
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
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingInput {
  material: string;
  subtype: string;
  quantityTonnes: number;
  quality: string;
  pricePerKg: number;
  city: string;
  locality: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  pickupFrom: string;
  description: string;
}

async function callListingsApi<T>(path: string, init: RequestInit = {}, authed = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authed) {
    const token = await getAccessToken();
    if (!token) throw new ApiError('Sign in to continue.', 'validation');
    headers.Authorization = 'Bearer ' + token;
  }
  let res: Response;
  try {
    res = await fetch(API_BASE + path, { ...init, headers, signal: AbortSignal.timeout(15000) });
  } catch {
    throw new ApiError('Network error - check your connection and try again.', 'network');
  }
  if (res.status === 404) return null as T;
  const body = (await res.json().catch(() => null)) as (T & { error?: string; message?: string }) | null;
  if (!res.ok) {
    throw new ApiError(body?.error ?? body?.message ?? (res.status === 401 ? 'Your session has expired - sign in again.' : 'The service is temporarily unavailable.'), res.status >= 500 ? 'server' : 'validation');
  }
  return body as T;
}

/** POST /listings - authenticated; server assigns the id and ownerId. */
export function createListing(input: CreateListingInput): Promise<{ listingId: string; createdAt: string; status: string }> {
  return callListingsApi('/listings', { method: 'POST', body: JSON.stringify(input) }, true);
}

/** GET /listings/{id} - public read; null when the listing does not exist. */
export function fetchListing(id: string): Promise<ListingRecord | null> {
  return callListingsApi('/listings/' + encodeURIComponent(id));
}

/** GET /my-listings - owner-scoped; JWT required. */
export function fetchMyListings(): Promise<{ listings: ListingRecord[] }> {
  return callListingsApi('/my-listings', {}, true);
}

/** Map a persisted record onto the Listing domain type used by the UI. */
export function recordToListing(r: ListingRecord): Listing {
  return {
    id: r.listingId,
    seller: 'EcoKart seller',
    sellerType: 'Business',
    material: r.material as Listing['material'],
    subtype: r.subtype,
    quantityTonnes: r.quantityTonnes,
    pricePerKg: r.pricePerKg,
    quality: r.quality as Listing['quality'],
    city: r.city,
    locality: r.locality,
    lat: r.pickupLatitude ?? Number.NaN,
    lng: r.pickupLongitude ?? Number.NaN,
    pickupFrom: r.pickupFrom,
    description: r.description || 'No description provided.',
    status: r.status as Listing['status'],
    listedAt: r.createdAt,
    views: 0,
    verified: false,
  };
}
