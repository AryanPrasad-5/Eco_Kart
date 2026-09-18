import type { LocationStatus as Status } from '../types';
import { DEMO_LOCATION } from '../lib/geolocation';

interface LocationStatusChipProps {
  status: Status;
  onRequestLocation: () => void;
  onUseDemoLocation: () => void;
}

/**
 * Location row on the capture screen (spec §11).
 * Granted → real coordinates. Demo → amber "Demo location" chip.
 * Failed → "Location unavailable" + the Use Demo Location action.
 */
export function LocationStatusChip({ status, onRequestLocation, onUseDemoLocation }: LocationStatusChipProps) {
  const demoLabel = `Demo location — Bengaluru (${DEMO_LOCATION.lat.toFixed(4)}, ${DEMO_LOCATION.lng.toFixed(4)})`;

  return (
    <div className="location-panel">
      {status.state === 'idle' && (
        <button className="btn btn-ghost" onClick={onRequestLocation}>
          📍 Use my current location
        </button>
      )}

      {status.state === 'acquiring' && (
        <span className="location-chip">
          <span className="dot" aria-hidden />
          Detecting your location…
        </span>
      )}

      {status.state === 'granted' && (
        <span className="location-chip">
          <span className="dot" aria-hidden />
          Using your location ({status.location.lat.toFixed(4)}, {status.location.lng.toFixed(4)})
        </span>
      )}

      {status.state === 'demo' && (
        <span className="location-chip demo" title="Demo fallback — not your real position">
          <span className="dot" aria-hidden />
          {demoLabel}
        </span>
      )}

      {status.state === 'failed' && (
        <>
          <span className="location-chip failed" role="alert">
            ⚠ Location unavailable
            {status.reason === 'denied' && ' — permission denied'}
            {status.reason === 'timeout' && ' — timed out'}
            {status.reason === 'unavailable' && ' — not accessible'}
          </span>
          <button className="btn btn-secondary" onClick={onUseDemoLocation}>
            Use Demo Location
          </button>
        </>
      )}

      {status.state === 'demo' && (
        <button className="btn btn-ghost" onClick={onRequestLocation}>
          Try my real location again
        </button>
      )}

      {status.state === 'idle' && (
        <button className="btn btn-secondary" onClick={onUseDemoLocation}>
          Use Demo Location
        </button>
      )}
    </div>
  );
}
