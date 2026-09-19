import type { Material, WasteCategory } from '../types';

/**
 * Maps WasteX tradable materials onto the SmartSort classifier's seven
 * waste categories — the contract of /match-facilities. Cardboard maps to
 * paper (same recovered fiber stream); organic/other have no marketplace
 * material and are unreachable from this map.
 */
export const MATERIAL_TO_CATEGORY: Record<Material, WasteCategory> = {
  plastic: 'plastic',
  paper: 'paper',
  cardboard: 'paper',
  metal: 'metal',
  glass: 'glass',
  'e-waste': 'e-waste',
};
