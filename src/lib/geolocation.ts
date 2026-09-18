/**
 * Browser Geolocation wrapper (spec §11).
 * Resolves every failure mode into a typed status instead of throwing:
 * granted / denied / timeout / unavailable. 10 s timeout, high accuracy.
 * Demo location (Bengaluru) is injected by the UI and clearly labeled —
 * it is never presented as the user's real position.
 */

import type { Location, LocationStatus } from '../types';

const TIMEOUT_MS = 10_000;
const MAX_AGE_MS = 30_000;

export const DEMO_LOCATION: Location = {
  lat: Number(import.meta.env.VITE_DEMO_LAT ?? 12.9716),
  lng: Number(import.meta.env.VITE_DEMO_LNG ?? 77.5946),
};

export function getLocation(): Promise<LocationStatus> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ state: 'failed', reason: 'unavailable' });
      return;
    }

    let settled = false;
    const settle = (status: LocationStatus) => {
      if (!settled) {
        settled = true;
        resolve(status);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (position) =>
        settle({
          state: 'granted',
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) settle({ state: 'failed', reason: 'denied' });
        else if (err.code === err.POSITION_UNAVAILABLE) settle({ state: 'failed', reason: 'unavailable' });
        else settle({ state: 'failed', reason: 'timeout' });
      },
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: MAX_AGE_MS },
    );
  });
}
