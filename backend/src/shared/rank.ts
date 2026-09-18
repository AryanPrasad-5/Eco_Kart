import { haversineKm } from './haversine';
import type { Facility, FacilityMatch, Location, WasteCategory } from './types';

/**
 * Ranking weights — identical to the frontend (sum exactly 1.0).
 * Distance dominates at household scale; value second; trust bonus third.
 */
export const RANKING_WEIGHTS = {
  distance: 0.6,
  payout: 0.3,
  verification: 0.1,
} as const;

/** Scoring horizon: distance contribution floors at 0 beyond this many km. */
export const MAX_DISTANCE_KM = 5;

/** How many facilities to return. */
export const TOP_N = 5;

/**
 * Rank facilities for a waste category around a user location.
 *
 *   distance_score     = max(0, 1 − distance_km / 5)
 *   payout_score       = facility_payout / max_payout_among_eligible (max floor 1 → no ÷0)
 *   verification_score = 1 if verified else 0
 *   final_score        = 0.6·distance + 0.3·payout + 0.1·verification
 *
 * The raw score is INTERNAL — the API returns it because the frontend's
 * FacilityMatch type carries it, but the UI never renders it.
 *
 * Deterministic tie-breaker (documented): equal final scores rank by
 *   1. shorter distance (the score's dominant factor)
 *   2. ascending facility_id (stable, data-order-independent)
 */
export function rankFacilities(
  facilities: readonly Facility[],
  category: WasteCategory,
  user: Location,
): FacilityMatch[] {
  const eligible = facilities.filter((f) => f.accepted_categories.includes(category));
  const maxPayout = Math.max(1, ...eligible.map((f) => f.payout_estimate[category] ?? 0));

  return eligible
    .map((facility) => {
      const distance_km = haversineKm(user, { lat: facility.lat, lng: facility.lng });
      const distanceScore = Math.max(0, 1 - distance_km / MAX_DISTANCE_KM);
      const payoutScore = (facility.payout_estimate[category] ?? 0) / maxPayout;
      const verificationScore = facility.verified ? 1 : 0;

      const score =
        RANKING_WEIGHTS.distance * distanceScore +
        RANKING_WEIGHTS.payout * payoutScore +
        RANKING_WEIGHTS.verification * verificationScore;

      return {
        facility,
        distance_km,
        score,
        beyondRadius: distance_km > MAX_DISTANCE_KM,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.distance_km - b.distance_km ||
        a.facility.facility_id.localeCompare(b.facility.facility_id),
    )
    .slice(0, TOP_N);
}
