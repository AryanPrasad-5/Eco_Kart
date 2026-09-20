/**
 * Geodesic helpers — pure math, zero dependencies.
 * Straight-line (great-circle) distance only: the app never claims
 * driving distance or travel time (no routing service integrated).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance in kilometres (Haversine, mean Earth radius). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Human format: ~650 m under 1 km, then 2.4 km / 24 km. */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  if (km < 1) return String(Math.round((km * 1000) / 10) * 10) + ' m';
  if (km < 10) return km.toFixed(1) + ' km';
  return String(Math.round(km)) + ' km';
}

/** Honest-unavailable reasons — never fabricate a position. */
export const GEO_ERRORS = {
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
  TIMEOUT: 'timeout',
} as const;
export type GeoErrorKind = (typeof GEO_ERRORS)[keyof typeof GEO_ERRORS];

/** One-shot browser geolocation (10s timeout), wrapped in a promise. */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error(GEO_ERRORS.UNAVAILABLE));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        const kind =
          err.code === err.PERMISSION_DENIED ? GEO_ERRORS.DENIED :
          err.code === err.POSITION_UNAVAILABLE ? GEO_ERRORS.UNAVAILABLE :
          GEO_ERRORS.TIMEOUT;
        reject(new Error(kind));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}
