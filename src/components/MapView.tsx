import { useEffect, useMemo, useRef, useState } from 'react';
import type { FacilityMatch, Location } from '../types';

interface MapViewProps {
  center: Location;
  matches: FacilityMatch[];
}

/** Map wiring from env — both unset ⇒ schematic mode, exactly as before. */
const MAP_STYLE = import.meta.env.VITE_MAP_STYLE as string | undefined;
const MAP_KEY = import.meta.env.VITE_MAP_API_KEY as string | undefined;

/**
 * Map (spec §10) — pluggable renderer behind one abstraction, and the ranked
 * LIST is always the primary experience.
 *
 *  - VITE_MAP_STYLE + VITE_MAP_API_KEY set → MapLibre GL JS + Amazon Location
 *    (style URL served by Location; key authorizes tile requests). Loaded via
 *    dynamic import so the schematic/dev mode ships zero map code.
 *  - Anything unset, failing, or slow → the lightweight SVG schematic below,
 *    positioned by lat/lng bounds around the user point. If anything here
 *    fails, ResultsScreen degrades to a small "map unavailable" note and the
 *    cards still work perfectly.
 */

function SchematicMap({ center, matches }: MapViewProps) {
  const [failed, setFailed] = useState(false);

  const positioned = useMemo(() => {
    if (failed || matches.length === 0) return [];
    const lats = [center.lat, ...matches.map((m) => m.facility.lat)];
    const lngs = [center.lng, ...matches.map((m) => m.facility.lng)];
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = Math.max(maxLat - minLat, 0.008);
    const spanLng = Math.max(maxLng - minLng, 0.008);

    const toXY = (lat: number, lng: number) => ({
      x: ((lng - minLng) / spanLng) * 100,
      y: 100 - ((lat - minLat) / spanLat) * 100,
    });

    return matches.map((m, i) => ({ rank: i + 1, ...toXY(m.facility.lat, m.facility.lng) }));
  }, [center, matches, failed]);

  if (failed) {
    return (
      <div className="card map-card">
        <div className="map-fallback">Map unavailable — the ranked list above has everything you need.</div>
      </div>
    );
  }

  const user = (() => {
    const lats = [center.lat, ...matches.map((m) => m.facility.lat)];
    const lngs = [center.lng, ...matches.map((m) => m.facility.lng)];
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = Math.max(maxLat - minLat, 0.008);
    const spanLng = Math.max(maxLng - minLng, 0.008);
    return {
      x: ((center.lng - minLng) / spanLng) * 100,
      y: 100 - ((center.lat - minLat) / spanLat) * 100,
    };
  })();

  return (
    <div className="card map-card">
      <div className="map-body" role="img" aria-label="Schematic map of nearby facilities">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }} onError={() => setFailed(true)}>
          {/* soft grid */}
          {[...Array(6)].map((_, i) => (
            <line key={`h${i}`} x1="0" x2="100" y1={i * 20} y2={i * 20} stroke="#d6e4d9" strokeWidth="0.3" />
          ))}
          {[...Array(6)].map((_, i) => (
            <line key={`v${i}`} y1="0" y2="100" x1={i * 20} x2={i * 20} stroke="#d6e4d9" strokeWidth="0.3" />
          ))}

          {/* facilities */}
          {positioned.map((p) => (
            <g key={p.rank}>
              <circle cx={p.x} cy={p.y} r={p.rank === 1 ? 4.2 : 3.2} fill={p.rank === 1 ? '#1f6b4a' : '#2ea06d'} opacity="0.92" />
              <text x={p.x} y={p.y + 1.4} textAnchor="middle" fontSize={p.rank === 1 ? 3.4 : 2.9} fill="#ffffff" fontWeight="700">
                {p.rank}
              </text>
            </g>
          ))}

          {/* user */}
          <circle cx={user.x} cy={user.y} r="3.4" fill="#2563eb" stroke="#ffffff" strokeWidth="1.2" />
          <text x={user.x} y={user.y - 5} textAnchor="middle" fontSize="2.6" fill="#2563eb" fontWeight="700">
            You
          </text>
        </svg>
      </div>
      <div className="map-caption">
        Development preview — MapLibre GL JS + Amazon Location Service connects here in the map phase.
      </div>
    </div>
  );
}

/** MapLibre renderer — mounted only when map env vars exist; never blocks the list. */
function LiveMap({ center, matches, onFail }: MapViewProps & { onFail: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        // Amazon Location serves MapLibre-compatible style documents; the API key
        // authorizes tile/API requests. Both come from env, never hard-coded.
        // maplibre-gl v6 exposes a namespace export (no default export).
        const [maplibregl] = await Promise.all([
          import('maplibre-gl'),
          import('maplibre-gl/dist/maplibre-gl.css' as string),
        ]);
        if (disposed || !containerRef.current) return;

        const styleUrl = `${MAP_STYLE}${MAP_STYLE?.includes('?') ? '&' : '?'}key=${MAP_KEY}`;
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: styleUrl,
          center: [center.lng, center.lat],
          zoom: 12,
          attributionControl: false,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

        map.on('error', () => {
          if (!disposed) onFail();
        });
        map.on('load', () => {
          if (disposed) return;
          // user marker
          new maplibregl.Marker({ color: '#2563eb' }).setLngLat([center.lng, center.lat]).addTo(map);
          // ranked facility markers
          matches.forEach((m, i) => {
            const el = document.createElement('div');
            el.className = 'map-pin';
            el.textContent = String(i + 1);
            el.style.cssText =
              'display:flex;align-items:center;justify-content:center;width:26px;height:26px;' +
              'border-radius:50%;color:#fff;font-weight:700;font-size:12px;' +
              `background:${i === 0 ? '#1f6b4a' : '#2ea06d'};box-shadow:0 1px 4px rgba(0,0,0,.35);border:2px solid #fff;`;
            new maplibregl.Marker({ element: el }).setLngLat([m.facility.lng, m.facility.lat]).addTo(map);
          });
        });

        cleanup = () => map.remove();
      } catch {
        if (!disposed) onFail();
      }
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  return (
    <div className="card map-card">
      <div ref={containerRef} className="map-body" style={{ minHeight: 260 }} aria-label="Map of nearby facilities" />
      <div className="map-caption">Amazon Location Service · ranked pins match the list above.</div>
    </div>
  );
}

export function MapView(props: MapViewProps) {
  const [liveFailed, setLiveFailed] = useState(false);
  const liveMode = Boolean(MAP_STYLE && MAP_KEY) && !liveFailed;
  return liveMode ? <LiveMap {...props} onFail={() => setLiveFailed(true)} /> : <SchematicMap {...props} />;
}
