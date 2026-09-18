import { CATEGORY_META, type Facility, type WasteCategory } from '../types';

/** Mandatory disclaimer, rendered with every payout (spec §7/§8). */
export const PAYOUT_DISCLAIMER = 'Indicative market estimate — not an offer.';

export function categoryLabel(category: WasteCategory): string {
  return CATEGORY_META[category].label;
}

export function categoryIcon(category: WasteCategory): string {
  return CATEGORY_META[category].icon;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export function formatPayout(facility: Facility, category: WasteCategory): string {
  const rate = facility.payout_estimate[category];
  if (rate === undefined) return 'Drop-off accepted';
  return `₹${rate}/kg`;
}

/** Human hours line — operating_hours is already "Mon–Sat 9:00–18:00" style. */
export function formatHours(facility: Facility): string {
  return facility.operating_hours;
}

export function directionsUrl(facility: Facility): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`;
}
