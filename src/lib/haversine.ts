import type { Location } from '../types';

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Great-circle distance between two points in kilometres (Haversine formula).
 * Shared contract with the backend implementation so distances match exactly.
 */
export function haversineKm(a: Location, b: Location): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
}

export function rankFacilitiesByDistance(center: Location, facilities: readonly import('../types').Facility[]): import('../types').FacilityMatch[] {
  return facilities
    .filter(f => f.verified && Number.isFinite(f.lat) && Number.isFinite(f.lng))
    .map(f => ({
      facility: f,
      distance_km: haversineKm(center, { lat: f.lat, lng: f.lng }),
      score: 1,
      beyondRadius: false,
    }))
    .sort((a, b) => a.distance_km - b.distance_km);
}
