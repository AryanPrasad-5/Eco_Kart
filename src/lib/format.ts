/** Formatting helpers — one vocabulary for the whole product. */

const inrPlain = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** ₹91,200 / ₹1.2L / ₹3.4Cr — Indian notation without the ambiguous "T". */
export function formatInr(value: number): string {
  if (value < 100_000) return `₹${inrPlain.format(Math.round(value))}`;
  if (value < 10_000_000) return `₹${(value / 100_000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
  return `₹${(value / 10_000_000).toLocaleString('en-IN', { maximumFractionDigits: 2 })}Cr`;
}

/** ₹84,000 style plain money. */
export function formatInrPlain(value: number): string {
  return `₹${inrPlain.format(value)}`;
}

/** 12.4K / 1.2M style compact number (international units, per spec). */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** ₹12.4M — international millions, as the brief's stat formats. */
export function formatInrMillions(value: number): string {
  return `₹${(value / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
}

/** 2,340 plain Indian-grouping number. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

/** 2.4 t / 820 kg — picks the unit sensibly. */
export function formatTonnes(tonnes: number): string {
  if (tonnes < 1) return `${Math.round(tonnes * 1000)} kg`;
  return `${tonnes.toLocaleString('en-IN', { maximumFractionDigits: 1 })} t`;
}

/** 2,400 kg — standardises display of quantity in kg. */
export function formatQuantity(tonnes: number): string {
  return `${(tonnes * 1000).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg`;
}

/** ₹38/kg price label. */
export function formatPricePerKg(price: number): string {
  return `₹${price}/kg`;
}

/** Estimated total value for a listing. */
export function estimateValue(pricePerKg: number, quantityTonnes: number): number {
  return Math.round(pricePerKg * quantityTonnes * 1000);
}

/** 24 Sep 2026 — short, unambiguous. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** 24 Sep — for tight table cells. */
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
