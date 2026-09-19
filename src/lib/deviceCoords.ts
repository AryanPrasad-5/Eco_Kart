/**
 * Device coordinates captured during the AI scan (Phase 4).
 * classify-and-match already returns the device-supplied location; storing
 * the latest real fix here lets Publish attach genuine pickup coordinates
 * without ever inventing or hardcoding them.
 */

let lastDeviceCoords: { lat: number; lng: number } | null = null;

export function setDeviceCoords(lat: number, lng: number): void {
  lastDeviceCoords = { lat, lng };
}

export function getDeviceCoords(): { lat: number; lng: number } | null {
  return lastDeviceCoords;
}
