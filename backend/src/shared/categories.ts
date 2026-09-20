import type { WasteCategory } from './types';
import { WASTE_CATEGORIES } from './types';

export function isWasteCategory(value: unknown): value is WasteCategory {
  return typeof value === 'string' && (WASTE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Normalize common model/user spellings to the canonical category union.
 * Returns null when the value cannot be mapped to one of the seven categories.
 */
export function normalizeCategory(raw: unknown): WasteCategory | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (isWasteCategory(value)) return value;
  if (value === 'ewaste' || value === 'e-waste' || value === 'electronic' || value === 'electronics') {
    return 'e-waste';
  }
  return null;
}
