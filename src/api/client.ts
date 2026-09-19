/**
 * Swappable API layer (spec §12).
 *
 * Components call `getApi()` and only ever see the `SmartSortApi` interface.
 * With VITE_API_BASE_URL unset → `mockApi` (built-in offline demo mode).
 * With it set → `httpApi`, the real API Gateway backend. Same signatures,
 * so no component ever changes. Mock data lives exclusively in src/mock.
 *
 * EcoKart production rule (P0-1): a PRODUCTION build MUST have
 * VITE_API_BASE_URL configured — if it is missing, getApi() throws a clear
 * configuration error instead of silently serving mock data. Mocks are for
 * unit tests and offline dev only, never the live/demo path.
 */

import type {
  ClassifyMatchResponse,
  ClassificationResult,
  Facility,
  Location,
  MatchFacilitiesResponse,
  WasteCategory,
} from '../types';
import { ApiError } from '../types';
import { rankFacilities } from '../lib/rank';
import { classifyImage, MOCK_LATENCY_MS } from '../mock/classification';
import { FACILITIES } from '../mock/facilities';

/** The contract the real backend honours (consolidated plan §4). */
export interface SmartSortApi {
  /** POST /classify-and-match — classification + matching in one call. */
  classifyAndMatch(imageBase64: string, userLocation: Location): Promise<ClassifyMatchResponse>;
  /** POST /match-facilities — override/manual path; NO AI call. */
  matchFacilities(category: WasteCategory, userLocation: Location): Promise<MatchFacilitiesResponse>;
  /** GET /facilities — raw registry (debug/seed verification). */
  getFacilities(): Promise<Facility[]>;
  /** GET /health — pre-demo liveness check. */
  healthCheck(): Promise<boolean>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const mockApi: SmartSortApi = {
  async classifyAndMatch(imageBase64, userLocation) {
    await wait(MOCK_LATENCY_MS);
    const classification: ClassificationResult = classifyImage(imageBase64);
    const matches = rankFacilities(FACILITIES, classification.category, userLocation);
    return { classification, matches, userLocation };
  },

  async matchFacilities(category, userLocation) {
    // Deliberately fast — this path must never re-run classification (spec §6).
    await wait(150);
    const matches = rankFacilities(FACILITIES, category, userLocation);
    return { matches, userLocation };
  },

  async getFacilities() {
    return [...FACILITIES];
  },

  async healthCheck() {
    return true;
  },
};

/* ───────────────────────────────────────────────────────────────────────────
 * Real backend (API Gateway HTTP API → Lambda → Bedrock/DynamoDB/S3).
 * Contract details:
 *  - classification attempts: Bedrock at most once, server-side;
 *  - override path (/match-facilities): NO AI anywhere;
 *  - 503 { code: "CLASSIFICATION_UNAVAILABLE" } → mapped to kind 'server' so
 *    the UI's manual-category error state appears (the designed AI-down fallback).
 * ──────────────────────────────────────────────────────────────────────── */

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '';
const REQUEST_TIMEOUT_MS = 35_000; // classify path worst case ≈ 29 s gateway ceiling

async function callApi<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('Network error — check your connection and try again.', 'network');
  } finally {
    clearTimeout(timer);
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // non-JSON error body (e.g. gateway-level) — handled below by status
  }

  if (!response.ok) {
    const err = payload as { error?: string } | null;
    const message =
      err?.error ??
      (response.status === 429
        ? 'The service is busy — please try again in a moment.'
        : 'The service is temporarily unavailable.');
    // 5xx (incl. CLASSIFICATION_UNAVAILABLE) → 'server'; the app's error UI then offers
    // the manual category grid, so the journey continues without AI.
    throw new ApiError(message, response.status >= 500 ? 'server' : 'validation');
  }
  return payload as T;
}

export const httpApi: SmartSortApi = {
  async classifyAndMatch(imageBase64, userLocation) {
    return callApi<ClassifyMatchResponse>('/classify-and-match', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, lat: userLocation.lat, lng: userLocation.lng }),
    });
  },

  async matchFacilities(category, userLocation) {
    return callApi<MatchFacilitiesResponse>('/match-facilities', {
      method: 'POST',
      body: JSON.stringify({ category, lat: userLocation.lat, lng: userLocation.lng }),
    });
  },

  async getFacilities() {
    return callApi<Facility[]>('/facilities');
  },

  async healthCheck() {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return false;
      const body = (await res.json()) as { status?: string };
      return body.status === 'ok';
    } catch {
      return false;
    }
  },
};

export function getApi(): SmartSortApi {
  // Production safety guard (EcoKart P0-1): a production build without
  // VITE_API_BASE_URL must fail loudly — never silently serve mock data.
  if (import.meta.env.PROD && !API_BASE) {
    throw new Error(
      'EcoKart configuration error: VITE_API_BASE_URL is not set in this production build. ' +
        'The live application must talk to the real API Gateway backend — mock data is ' +
        'not allowed outside unit tests.',
    );
  }
  return API_BASE ? httpApi : mockApi;
}

/** Demo image kept tiny (a 40×30 JPEG) so the mock hash stays stable across browsers. */
export const SAMPLE_IMAGE_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAsACgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+v/9k=';
