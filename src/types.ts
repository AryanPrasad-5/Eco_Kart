/**
 * SmartSort — central type definitions.
 * Single source of truth for the data contract between the frontend,
 * the mock API layer, and (later) the real API Gateway/Lambda backend.
 */

/** The seven supported waste categories — strict union, extended nowhere else. */
export type WasteCategory =
  | 'plastic'
  | 'paper'
  | 'metal'
  | 'glass'
  | 'e-waste'
  | 'organic'
  | 'other';

export const WASTE_CATEGORIES: readonly WasteCategory[] = [
  'plastic',
  'paper',
  'metal',
  'glass',
  'e-waste',
  'organic',
  'other',
] as const;

/** Display metadata for the category chips. */
export const CATEGORY_META: Record<WasteCategory, { label: string; icon: string }> = {
  plastic: { label: 'Plastic', icon: '🥤' },
  paper: { label: 'Paper', icon: '📄' },
  metal: { label: 'Metal', icon: '🥫' },
  glass: { label: 'Glass', icon: '🍾' },
  'e-waste': { label: 'E-waste', icon: '🔌' },
  organic: { label: 'Organic', icon: '🥬' },
  other: { label: 'Other', icon: '🗑️' },
};

/** Geographic coordinates. */
export interface Location {
  lat: number;
  lng: number;
}

/** Source of the location used for matching — demo location is always labeled. */
export type LocationSource = 'device' | 'demo' | 'manual';

export interface ResolvedLocation extends Location {
  source: LocationSource;
}

/** A recycling / scrap / reuse facility in the registry. */
export interface Facility {
  facility_id: string;
  name: string;
  lat: number;
  lng: number;
  accepted_categories: WasteCategory[];
  /** INR per kg, keyed by category. Empty object when the facility pays nothing. */
  payout_estimate: Partial<Record<WasteCategory, number>>;
  /** Always "estimated" in the MVP — never presented as an offer. */
  payout_basis: 'estimated' | 'verified';
  verified: boolean;
  address: string;
  contact: string;
  operating_hours: string;
  source: string;
  updated_at: string;
}

/** What the classifier returns. `confidence` is an AI signal, NOT a calibrated probability. */
export interface ClassificationResult {
  category: WasteCategory;
  /** Model-generated confidence signal in [0, 1]. Displayed as "AI signal". */
  confidence: number;
  rationale: string;
}

/** A facility joined with distance + internal ranking score for one query. */
export interface FacilityMatch {
  facility: Facility;
  distance_km: number;
  /** Internal ranking score — never shown in the UI. */
  score: number;
  /** True when the facility lies beyond the 5 km scoring horizon. */
  beyondRadius: boolean;
}

/** Response of POST /classify-and-match. */
export interface ClassifyMatchResponse {
  classification: ClassificationResult;
  matches: FacilityMatch[];
  userLocation: Location;
}

/** Response of POST /match-facilities (override/manual path — no AI call). */
export interface MatchFacilitiesResponse {
  matches: FacilityMatch[];
  userLocation: Location;
}

/** Phase machine driving the primary flow (spec §14). */
export type Phase = 'capture' | 'classifying' | 'confirm' | 'results';

/** Which nav view is active (spec §18 — deliberately minimal). */
export type NavView = 'landing' | 'app' | 'about';

/** Location acquisition outcome handled by the UI. */
export type LocationStatus =
  | { state: 'idle' }
  | { state: 'acquiring' }
  | { state: 'granted'; location: Location }
  | { state: 'demo'; location: Location }
  | { state: 'failed'; reason: 'denied' | 'timeout' | 'unavailable' };

/** Errors surfaced by the API layer. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'server' | 'validation',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
