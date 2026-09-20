import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as maplibregl from 'maplibre-gl';
import type { FacilityMatch, Location } from '../types';

interface MapViewProps {
  /** Listing pickup location -> red Seller pickup pin. */
  center: Location;
  /** Real device location -> green You marker; absent = never faked. */
  userLocation?: Location | null | undefined;
  /** Ranked matches → numbered pins; empty → single pickup-zone marker. */
  matches?: FacilityMatch[] | undefined;
  /** Caption under the map. */
  caption?: string | undefined;
  /** Facility id highlighted from the list (marker grows + glows). */
  selectedFacilityId?: string | null | undefined;
  /** Fired when the user selects a marker (for list highlight sync). */
  onSelectFacility?: ((facilityId: string | null) => void) | undefined;
  /** Whether the center marker is draggable. */
  draggableMarker?: boolean | undefined;
  /** Fired when the center marker is dragged or map is clicked (if draggable). */
  onLocationChange?: ((loc: Location) => void) | undefined;
  /** Whether the map should fill its container height (with min-heights). */
  fullHeight?: boolean | undefined;
  /** Internal flag: true when LiveMap fails to load. */
  isFallback?: boolean | undefined;
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
  if (base.includes('/v2/styles/')) {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}key=${MAP_KEY}&color-scheme=Dark`;
  }
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

/** Red pickup pin (inline SVG, dark-theme matched, no external asset). */
const PICKUP_PIN_SVG =
  '<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.1 10.9 19.6 12.3 20.9a1 1 0 0 0 1.4 0C15.1 32.6 26 22.1 26 13 26 5.8 20.2 0 13 0Z" fill="#e25c4a"/><circle cx="13" cy="13" r="5" fill="#0a0c0b"/></svg>';

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
.mx-marker-pickup{display:grid;place-items:center;width:30px;height:34px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.65));}
.mx-marker-pickup svg{display:block;}
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

function LiveMap(props: MapViewProps) {
  const { center, userLocation, matches = [], caption, selectedFacilityId } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
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
      props.onSelectFacility?.(id);
    },
    [props.onSelectFacility],
  );

  const latestOnChange = useRef(props.onLocationChange);
  const latestDraggable = useRef(props.draggableMarker);
  useEffect(() => {
    latestOnChange.current = props.onLocationChange;
    latestDraggable.current = props.draggableMarker;
  }, [props.onLocationChange, props.draggableMarker]);

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
          if (import.meta.env.DEV) {
            const status = (e?.error as any)?.status;
            console.warn('MapLibre error:', msg.replace(/key=[^&]*/g, 'key=***'), status ? `Status: ${status}` : '');
          }
          if (!disposed && (msg.includes('Failed to fetch') || msg.includes('Unauthorized') || msg.includes('401') || msg.includes('403') || msg.includes('Not Found') || msg.includes('404'))) {
            setFailed(true);
          }
        });

        map.on('load', () => {
          if (disposed) return;
          setLoading(false);
          setMapReady(true);
        });

        map.on('click', (e: maplibregl.MapMouseEvent) => {
          if (!latestDraggable.current) return;
          if ((e.originalEvent.target as HTMLElement).closest('.mx-marker-fac')) return;
          latestOnChange.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
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

      // Red pickup pin — the listing real coordinates; removed when invalid.
      if (pickupMarkerRef.current && !isValidCoords(center)) {
        pickupMarkerRef.current.remove();
        pickupMarkerRef.current = null;
      } else if (isValidCoords(center)) {
        if (!pickupMarkerRef.current) {
          const el = document.createElement('div');
          el.className = 'mx-marker-pickup';
          if (latestDraggable.current) el.style.cursor = 'grab';
          el.innerHTML = PICKUP_PIN_SVG;
          const marker = new lib.Marker({ element: el, draggable: Boolean(latestDraggable.current) })
            .setLngLat([center.lng, center.lat])
            .addTo(map);
            
          marker.on('dragend', () => {
            const ll = marker.getLngLat();
            latestOnChange.current?.({ lat: ll.lat, lng: ll.lng });
          });
          pickupMarkerRef.current = marker;
        } else {
          pickupMarkerRef.current.setLngLat([center.lng, center.lat]);
        }
        bounds.extend([center.lng, center.lat]);
      }

      // Green You marker — only ever a real device position, never a fallback.
      const userPos: Location | null = userLocation && isValidCoords(userLocation) ? { lat: userLocation.lat, lng: userLocation.lng } : null;
      if (userMarkerRef.current && !userPos) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      } else if (userPos) {
        if (!userMarkerRef.current) {
          const el = document.createElement('div');
          el.className = 'mx-marker-user';
          el.innerHTML = '<span></span><i></i>';
          userMarkerRef.current = new lib.Marker({ element: el }).setLngLat([userPos.lng, userPos.lat]).addTo(map);
        } else {
          userMarkerRef.current.setLngLat([userPos.lng, userPos.lat]);
        }
        bounds.extend([userPos.lng, userPos.lat]);
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

      // Route line
      const selMatch = validMatches.find((m) => m.facility.facility_id === selected);
      if (selMatch && isValidCoords(center)) {
        const lineData = {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [center.lng, center.lat],
              [selMatch.facility.lng, selMatch.facility.lat],
            ],
          },
          properties: {},
        };
        if (!map.getSource('route-line')) {
          map.addSource('route-line', { type: 'geojson', data: lineData });
          map.addLayer({
            id: 'route-line-layer',
            type: 'line',
            source: 'route-line',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#34e27a', 'line-width': 3, 'line-dasharray': [1.5, 2] },
          });
        } else {
          (map.getSource('route-line') as maplibregl.GeoJSONSource).setData(lineData);
        }
      } else if (map.getSource('route-line')) {
        (map.getSource('route-line') as maplibregl.GeoJSONSource).setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] },
          properties: {},
        });
      }

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
  }, [matches, center, userLocation, failed, mapReady, select]);

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

  if (failed) return <SchematicMap {...props} isFallback />;

  return (
    <figure className={`overflow-hidden rounded-lg border border-line bg-[#0a0c0b] flex flex-col ${props.fullHeight ? 'flex-1 min-h-[300px] lg:min-h-[380px]' : ''}`}>
      <div className={`relative ${props.fullHeight ? 'flex-1 min-h-[300px] lg:min-h-[380px]' : 'h-56 sm:h-64'}`}>
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

function SchematicMap(props: MapViewProps) {
  const { center, userLocation, matches, caption, selectedFacilityId, draggableMarker, onLocationChange } = props;
  const facilityMatches = matches ?? [];
  const bounds = useMemo(() => {
    const lats = [center.lat, ...facilityMatches.map((m) => m.facility.lat)];
    const lngs = [center.lng, ...facilityMatches.map((m) => m.facility.lng)];
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const rawSpanLat = Math.max(maxLat - minLat, 0.012);
    const rawSpanLng = Math.max(maxLng - minLng, 0.012);
    const padLat = rawSpanLat * 0.15;
    const padLng = rawSpanLng * 0.15;
    return {
      minLat: minLat - padLat,
      spanLat: rawSpanLat + padLat * 2,
      minLng: minLng - padLng,
      spanLng: rawSpanLng + padLng * 2,
    };
  }, [center, matches]);

  const toXY = (lat: number, lng: number) => ({
    x: ((lng - bounds.minLng) / bounds.spanLng) * 100,
    y: 100 - ((lat - bounds.minLat) / bounds.spanLat) * 100,
  });

  const hasUser = Boolean(userLocation && isValidCoords(userLocation));
  const user = userLocation && isValidCoords(userLocation) ? toXY(userLocation.lat, userLocation.lng) : toXY(center.lat, center.lng);
  const pickup = toXY(center.lat, center.lng);

  return (
    <figure className={`overflow-hidden rounded-lg border border-line bg-[#0a0c0b] flex flex-col ${props.fullHeight ? 'flex-1 min-h-[300px] lg:min-h-[380px]' : ''}`}>
      <div 
        className={`relative bg-grid ${props.fullHeight ? 'flex-1 min-h-[300px] lg:min-h-[380px]' : 'h-56'} ${props.draggableMarker ? 'cursor-pointer touch-none' : ''}`}
        role="img" 
        aria-label="Schematic map of the pickup zone"
        onPointerDown={(e) => {
          if (!draggableMarker || !onLocationChange) return;
          const container = e.currentTarget;
          if ((e.target as HTMLElement).closest('.mx-marker-fac-schematic')) return; // ignore clicks on facility markers
          container.setPointerCapture(e.pointerId);
          
          const update = (evt: React.PointerEvent | PointerEvent) => {
            const rect = container.getBoundingClientRect();
            const xPct = ((evt.clientX - rect.left) / rect.width) * 100;
            const yPct = ((evt.clientY - rect.top) / rect.height) * 100;
            const lng = (xPct / 100) * bounds.spanLng + bounds.minLng;
            const lat = bounds.minLat + (1 - (yPct / 100)) * bounds.spanLat;
            onLocationChange({ lat, lng });
          };
          update(e); // initial click
          
          const move = (mv: PointerEvent) => update(mv);
          const up = () => {
            container.removeEventListener('pointermove', move);
            container.removeEventListener('pointerup', up);
            container.releasePointerCapture(e.pointerId);
          };
          container.addEventListener('pointermove', move);
          container.addEventListener('pointerup', up);
        }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="block h-full w-full" aria-hidden>
          {[...Array(5)].map((_, i) => (
            <line key={`h${i}`} x1="0" x2="100" y1={i * 25} y2={i * 25} stroke="#ffffff10" strokeWidth="0.25" />
          ))}
          {[...Array(5)].map((_, i) => (
            <line key={`v${i}`} y1="0" y2="100" x1={i * 25} x2={i * 25} stroke="#ffffff10" strokeWidth="0.25" />
          ))}
          
          {(() => {
            const selMatch = facilityMatches.find((m) => m.facility.facility_id === selectedFacilityId);
            if (selMatch && isValidCoords(center) && isValidCoords({ lat: selMatch.facility.lat, lng: selMatch.facility.lng })) {
              const p1 = toXY(center.lat, center.lng);
              const p2 = toXY(selMatch.facility.lat, selMatch.facility.lng);
              return <line x1={`${p1.x}%`} y1={`${p1.y}%`} x2={`${p2.x}%`} y2={`${p2.y}%`} stroke="#34e27a" strokeWidth="0.8" strokeDasharray="1.5 1.5" />;
            }
            return null;
          })()}
          <circle cx={user.x} cy={user.y} r="26" fill="#34e27a08" stroke="#34e27a33" strokeWidth="0.4" strokeDasharray="2 1.6" />
          {[...Array(12)].map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <circle key={i} cx={user.x + Math.cos(a) * 26} cy={user.y + Math.sin(a) * 26} r="0.7" fill="#34e27a55" />;
          })}
        </svg>

        {hasUser && (
          <span className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${user.x}%`, top: `${user.y}%` }} title="You (device location)">
            <span className="relative grid h-7 w-7 place-items-center">
              <span className="absolute h-7 w-7 animate-ping rounded-full bg-accent/25" aria-hidden />
              <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0a0c0b] bg-accent shadow-[0_0_10px_rgba(52,226,122,0.6)]" />
            </span>
          </span>
        )}
        {isValidCoords(center) && (
          <span
            className="absolute z-10 -translate-x-1/2 -translate-y-full"
            style={{ left: `${pickup.x}%`, top: `${pickup.y}%` }}
            title="Seller pickup location"
          >
            <svg width="22" height="29" viewBox="0 0 26 34" aria-hidden>
              <path d="M13 0C5.8 0 0 5.8 0 13c0 9.1 10.9 19.6 12.3 20.9a1 1 0 0 0 1.4 0C15.1 32.6 26 22.1 26 13 26 5.8 20.2 0 13 0Z" fill="#e25c4a" />
              <circle cx="13" cy="13" r="5" fill="#0a0c0b" />
            </svg>
          </span>
        )}

        {facilityMatches.map((m, i) => {
          const p = toXY(m.facility.lat, m.facility.lng);
          return (
            <span
              key={m.facility.facility_id}
              className={`mx-marker-fac-schematic tabular absolute z-10 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border font-mono text-[9px] font-medium ${
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
        {props.isFallback && (
          <span className="absolute top-2 right-2 rounded border border-[#e2b634]/30 bg-[#e2b634]/10 px-2 py-0.5 font-medium text-[10px] text-[#e2b634] backdrop-blur shadow-sm">
            Schematic view (live tiles unavailable)
          </span>
        )}
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
