/**
 * Contract types — mirrored from the frontend's src/types.ts.
 * The frontend is the source of truth; these shapes must stay identical
 * so src/api/client.ts (httpApi) needs zero response remapping.
 */

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

export interface Location {
  lat: number;
  lng: number;
}

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

/** Model-produced verdict. `confidence` is an AI signal, NOT a calibrated probability. */
export interface ClassificationResult {
  category: WasteCategory;
  confidence: number;
  rationale: string;
}

export interface FacilityMatch {
  facility: Facility;
  distance_km: number;
  /** Internal ranking score — never rendered by the UI. */
  score: number;
  /** True when the facility lies beyond the 5 km scoring horizon. */
  beyondRadius: boolean;
}

/** Response of POST /classify-and-match — identical to frontend ClassifyMatchResponse. */
export interface ClassifyMatchResponse {
  classification: ClassificationResult;
  matches: FacilityMatch[];
  userLocation: Location;
}

/** Response of POST /match-facilities — identical to frontend MatchFacilitiesResponse. */
export interface MatchFacilitiesResponse {
  matches: FacilityMatch[];
  userLocation: Location;
}
