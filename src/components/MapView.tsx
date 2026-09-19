import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as maplibregl from 'maplibre-gl';
import type { FacilityMatch, Location } from '../types';

interface MapViewProps {
  center: Location;
  /** Ranked matches → numbered pins; empty → single pickup-zone marker. */
  matches?: FacilityMatch[] | undefined;
  /** Caption under the map. */
  caption?: string | undefined;
  /** Facility id highlighted from the list (marker grows + glows). */
  selectedFacilityId?: string | null | undefined;
  /** Fired when the user selects a marker (for list highlight sync). */
  onSelectFacility?: ((facilityId: string | null) => void) | undefined;
}

/* ── Amazon Location wiring (env-only, never hard-coded) ─────────────── */

const MAP_STYLE = import.meta.env.VITE_MAP_STYLE as string | undefined;
const MAP_KEY = import.meta.env.VITE_MAP_API_KEY as string | undefined;
const LIVE_CONFIGURED = Boolean(MAP_STYLE && MAP_KEY);

/**
 * Amazon Location serves MapLibre-compatible style documents; the key
 * authorizes GetTile/GetStyleDescriptor requests for browser clients.
 * Unset ⇒ the schematic locator renders instead and zero map code loads.
 */
function amazonLocationStyleUrl(): string {
  const base = MAP_STYLE as string;
  const styleUrl = base.endsWith('/style-descriptor') ? base : `${base.replace(/\/+$/, '')}/style-descriptor`;
  return `${styleUrl}${styleUrl.includes('?') ? '&' : '?'}key=${MAP_KEY}`;
}

/* ── Coordinate validation (task §18) — never pass invalid data to MapLibre ── */

function isValidCoords(loc: Location | undefined | null): boolean {
  return (
    !!loc &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng) &&
    loc.lat >= -90 &&
    loc.lat <= 90 &&
    loc.lng >= -180 &&
    loc.lng <= 180
  );
}

/* ── Dark-map CSS injected once (maplibre uses canvas; Tailwind can't reach in) ── */

const MAP_CSS_ID = 'wastex-maplibre-theme';
const MAP_CSS = `
.mx-marker-user{display:grid;place-items:center;width:26px;height:26px;}
.mx-marker-user i{display:block;width:14px;height:14px;border-radius:9999px;background:#34e27a;border:3px solid #050505;box-shadow:0 0 0 2px rgba(52,226,122,.35),0 0 14px rgba(52,226,122,.55);}
.mx-marker-user span{position:absolute;width:26px;height:26px;border-radius:9999px;background:rgba(52,226,122,.25);animation:mx-ping 1.8s cubic-bezier(0,0,.2,1) infinite;}
@keyframes mx-ping{75%,100%{transform:scale(2);opacity:0;}}
.mx-marker-fac{display:grid;place-items:center;width:26px;height:26px;border-radius:9999px;background:#121514;border:2px solid #333836;color:#9aa39d;font:600 11px "IBM Plex Mono",monospace;cursor:pointer;transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease;}
.mx-marker-fac:hover{border-color:#34e27a66;color:#f5f7f5;transform:scale(1.08);}
.mx-marker-fac.is-selected{border-color:#34e27a;background:#0d1f16;color:#34e27a;transform:scale(1.18);box-shadow:0 0 0 3px rgba(52,226,122,.18),0 0 16px rgba(52,226,122,.4);}
.maplibregl-popup{z-index:30;}
.maplibregl-popup-content{background:#0d0f0e!important;color:#f5f7f5!important;border:1px solid #333836;border-radius:10px;padding:0!important;box-shadow:0 12px 40px rgba(0,0,0,.55)!important;min-width:196px;overflow:hidden;}
.maplibregl-popup-tip{border-top-color:#333836!important;border-bottom-color:#333836!important;}
.maplibregl-ctrl-group{background:#0d0f0eee!important;border:1px solid #333836!important;border-radius:8px!important;overflow:hidden;}
.maplibregl-ctrl-group button{width:30px!important;height:30px!important;}
.maplibregl-ctrl-group button+button{border-top:1px solid #333836!important;}
.maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'%3E%3Cpath d='M9 4v10M4 9h10' stroke='%23f5f7f5' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E")!important;}
.maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'%3E%3Cpath d='M4 9h10' stroke='%23f5f7f5' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E")!important;}
`;

function ensureMapCss(): void {
  if (document.getElementById(MAP_CSS_ID)) return;
  const style = document.createElement('style');
  style.id = MAP_CSS_ID;
  style.textContent = MAP_CSS;
  document.head.appendChild(style);
}

/* ── Popup HTML (compact card; display fields only — no internal DB fields) ── */

function popupHtml(m: FacilityMatch): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const f = m.facility;
  const categories = f.accepted_categories.map(esc).join(' • ');
  const payout = f.payout_estimate;
  const payoutEntry = Object.entries(payout ?? {})
    .filter(([, v]) => typeof v === 'number' && (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
  const payoutLine = payoutEntry ? `₹${payoutEntry[1]}/kg indicative` : 'Payout on request';
  const verified = f.verified ? '<span style="color:#34e27a">✓ Verified</span>' : '<span style="color:#e2b634">Unverified</span>';
  return `
    <div style="padding:10px 12px 4px">
      <p style="margin:0;font:600 13px 'Space Grotesk',sans-serif;color:#f5f7f5">${esc(f.name)}</p>
      <p style="margin:2px 0 0;font:500 10.5px 'IBM Plex Mono',monospace;color:#9aa39d;letter-spacing:.04em;text-transform:uppercase">${categories}</p>
    </div>
    <div style="padding:8px 12px 10px;border-top:1px solid #23272580;margin-top:6px">
      <p style="margin:0;font:600 12px 'IBM Plex Mono',monospace;color:#34e27a">${m.distance_km.toFixed(1)} km away</p>
      <p style="margin:3px 0 0;font:500 11.5px 'Space Grotesk',sans-serif;color:#9aa39d">${payoutLine}</p>
      <p style="margin:3px 0 0;font:500 11.5px 'Space Grotesk',sans-serif">${verified}</p>
      <button type="button" data-mx-view="${esc(f.facility_id)}" style="margin-top:8px;width:100%;border:1px solid #34e27a42;background:rgba(52,226,122,.12);color:#34e27a;font:600 11.5px 'Space Grotesk',sans-serif;padding:6px 10px;border-radius:7px;cursor:pointer">View facility</button>
    </div>`;
}

/* ── Live map: Amazon Location + MapLibre ─────────────────────────────── */

function LiveMap({ center, matches = [], caption, selectedFacilityId, onSelectFacility }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const popupsRef = useRef<maplibregl.Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(selectedFacilityId ?? null);
  /** Resolved dynamic module + readiness flag for the markers effect. */
  const libRef = useRef<typeof import('maplibre-gl') | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => setSelected(selectedFacilityId ?? null), [selectedFacilityId]);

  /** Selecting a marker ↔ list: one handler, both directions stay in sync. */
  const select = useCallback(
    (id: string | null) => {
      setSelected(id);
      onSelectFacility?.(id);
    },
    [onSelectFacility],
  );

  // Init the map ONCE per configuration — never on re-render (task §19).
  // maplibre-gl is dynamically imported so the main bundle never carries it.
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        ensureMapCss();
        const maplibre = await import('maplibre-gl');
        if (disposed || !containerRef.current) return;
        libRef.current = maplibre;

        const map = new maplibre.Map({
          container: containerRef.current,
          style: amazonLocationStyleUrl(),
          center: [center.lng, center.lat], // MapLibre order: [lng, lat]
          zoom: 11,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        });
        mapRef.current = map as unknown as maplibregl.Map;

        map.addControl(new maplibre.NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right');

        map.on('error', (e: maplibregl.ErrorEvent) => {
          // Style/tile fetch failures (bad key, missing resource, network) → fallback.
          const msg = e?.error?.message ?? '';
          if (!disposed && (msg.includes('Failed to fetch') || msg.includes('Unauthorized') || msg.includes('401') || msg.includes('403') || msg.includes('Not Found') || msg.includes('404'))) {
            setFailed(true);
          }
        });

        map.on('load', () => {
          if (disposed) return;
          setLoading(false);
          setMapReady(true);
        });

        // Safety net: style that never loads within 12s (silent network failure).
        const timeout = window.setTimeout(() => {
          if (!disposed && !map.loaded()) setFailed(true);
        }, 12_000);

        cleanup = () => {
          window.clearTimeout(timeout);
          map.remove();
          mapRef.current = null;
        };
      } catch {
        if (!disposed) setFailed(true);
      }
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
    // center is deliberately excluded — initial view only; bounds update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  /** Markers: rebuilt only when the facility set actually changes. */
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib || failed || !mapReady) return;

    const render = () => {
      // clear previous markers/popups
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      popupsRef.current.forEach((p) => p.remove());
      popupsRef.current = [];

      const validMatches = matches.filter((m) => isValidCoords({ lat: m.facility.lat, lng: m.facility.lng }));
      const bounds = new lib.LngLatBounds();

      if (isValidCoords(center)) {
        if (!userMarkerRef.current) {
          const el = document.createElement('div');
          el.className = 'mx-marker-user';
          el.innerHTML = '<span></span><i></i>';
          userMarkerRef.current = new lib.Marker({ element: el }).setLngLat([center.lng, center.lat]).addTo(map);
        } else {
          userMarkerRef.current.setLngLat([center.lng, center.lat]);
        }
        bounds.extend([center.lng, center.lat]);
      }

      validMatches.forEach((m, i) => {
        const el = document.createElement('div');
        el.className = 'mx-marker-fac';
        el.textContent = String(i + 1);
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', `${m.facility.name}, ${m.distance_km.toFixed(1)} km`);

        const popup = new lib.Popup({ offset: 14, closeButton: false, maxWidth: '240px' }).setHTML(popupHtml(m));
        popupsRef.current.push(popup);

        const openPopup = () => {
          popupsRef.current.forEach((p) => p.remove());
          popup.setLngLat([m.facility.lng, m.facility.lat]).addTo(map);
          select(m.facility.facility_id);
        };

        el.addEventListener('click', openPopup);
        el.addEventListener('keydown', (e) => {
          if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
            e.preventDefault();
            openPopup();
          }
        });

        const marker = new lib.Marker({ element: el })
          .setLngLat([m.facility.lng, m.facility.lat])
          .addTo(map);
        markersRef.current.push(marker);
        bounds.extend([m.facility.lng, m.facility.lat]);
      });

      // Fit bounds (task §9): user + facilities, padded, never uselessly far out.
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 350 });
      }
    };

    if (map.loaded()) render();
    else {
      map.once('load', render);
      return () => {
        map.off('load', render);
      };
    }
    // matches array identity changes when results change → re-render markers.
  }, [matches, center, failed, mapReady, select]);

  /** Marker highlight synced from the facility list. */
  useEffect(() => {
    markersRef.current.forEach((marker) => {
      const el = marker.getElement();
      const idx = Number(el.textContent);
      const match = matches[idx - 1];
      el.classList.toggle('is-selected', match?.facility.facility_id === selected);
    });
  }, [selected, matches]);

  /** "View facility" clicks inside popups (delegated once per popup set). */
  useEffect(() => {
    const handler = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('[data-mx-view]') as HTMLElement | null;
      if (btn) select(btn.dataset.mxView ?? null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [select]);

  if (failed) return <SchematicMap center={center} matches={matches} caption={caption} />;

  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-[#0a0c0b]">
      <div className="relative h-56 sm:h-64">
        <div ref={containerRef} className="absolute inset-0" aria-label="Interactive map of nearby facilities" />
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#0a0c0b]" role="status" aria-live="polite">
            <div className="flex items-center gap-2.5 text-xs text-ink-soft">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
              Loading map…
            </div>
          </div>
        )}
      </div>
      {caption && <figcaption className="border-t border-line bg-surface px-3.5 py-2.5 text-[11.5px] text-ink-faint">{caption}</figcaption>}
    </figure>
  );
}

/* ── Schematic fallback: zero-cost, dev-safe, list still carries the data ── */

function SchematicMap({ center, matches, caption, selectedFacilityId }: MapViewProps) {
  const facilityMatches = matches ?? [];
  const bounds = useMemo(() => {
    const lats = [center.lat, ...facilityMatches.map((m) => m.facility.lat)];
    const lngs = [center.lng, ...facilityMatches.map((m) => m.facility.lng)];
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      minLat,
      spanLat: Math.max(maxLat - minLat, 0.012),
      minLng,
      spanLng: Math.max(maxLng - minLng, 0.012),
    };
  }, [center, matches]);

  const toXY = (lat: number, lng: number) => ({
    x: ((lng - bounds.minLng) / bounds.spanLng) * 100,
    y: 100 - ((lat - bounds.minLat) / bounds.spanLat) * 100,
  });

  const user = toXY(center.lat, center.lng);

  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-[#0a0c0b]">
      <div className="relative h-56 bg-grid" role="img" aria-label="Schematic map of the pickup zone">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="block h-full w-full" aria-hidden>
          {[...Array(5)].map((_, i) => (
            <line key={`h${i}`} x1="0" x2="100" y1={i * 25} y2={i * 25} stroke="#ffffff10" strokeWidth="0.25" />
          ))}
          {[...Array(5)].map((_, i) => (
            <line key={`v${i}`} y1="0" y2="100" x1={i * 25} x2={i * 25} stroke="#ffffff10" strokeWidth="0.25" />
          ))}
          <circle cx={user.x} cy={user.y} r="26" fill="#34e27a08" stroke="#34e27a33" strokeWidth="0.4" strokeDasharray="2 1.6" />
          {[...Array(12)].map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <circle key={i} cx={user.x + Math.cos(a) * 26} cy={user.y + Math.sin(a) * 26} r="0.7" fill="#34e27a55" />;
          })}
        </svg>

        <span className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${user.x}%`, top: `${user.y}%` }}>
          <span className="relative grid h-7 w-7 place-items-center">
            <span className="absolute h-7 w-7 animate-ping rounded-full bg-accent/25" aria-hidden />
            <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0a0c0b] bg-accent shadow-[0_0_10px_rgba(52,226,122,0.6)]" />
          </span>
        </span>

        {facilityMatches.map((m, i) => {
          const p = toXY(m.facility.lat, m.facility.lng);
          return (
            <span
              key={m.facility.facility_id}
              className={`tabular absolute z-10 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border font-mono text-[9px] font-medium ${
                m.facility.facility_id === selectedFacilityId
                  ? 'border-accent bg-[#0d1f16] text-accent'
                  : 'border-line-strong bg-surface-2 text-ink-soft'
              }`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              title={m.facility.name}
            >
              {i + 1}
            </span>
          );
        })}

        <span className="absolute bottom-2 left-2 rounded border border-line bg-void/70 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-ink-faint backdrop-blur">
          pickup zone · {center.lat.toFixed(3)}°N {center.lng.toFixed(3)}°E
        </span>
      </div>
      {caption && <figcaption className="border-t border-line px-3.5 py-2.5 text-[11.5px] text-ink-faint">{caption}</figcaption>}
    </figure>
  );
}

/**
 * Public component. Live Amazon Location map when env config exists;
 * schematic locator otherwise — the facility list always carries the data.
 */
export function MapView(props: MapViewProps) {
  return LIVE_CONFIGURED ? <LiveMap {...props} /> : <SchematicMap {...props} />;
}
