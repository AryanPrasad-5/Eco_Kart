/**
 * WasteX — domain model.
 *
 * WasteX evolves SmartSort: the waste-classification core becomes the
 * AI material-tagging assist inside Create Listing, and the facility
 * registry becomes the verified-recycler roster. Marketplace primitives
 * (materials, listings, offers, transactions) are new.
 *
 * The legacy SmartSort types (Facility, ClassificationResult, etc.) live
 * at the bottom — still the contract of src/api/client.ts, mapped into
 * WasteX domain objects at the edges.
 */

/* ── Materials ──────────────────────────────────────────────────────── */

export type Material =
  | 'plastic'
  | 'paper'
  | 'cardboard'
  | 'metal'
  | 'glass'
  | 'e-waste';

export const MATERIALS: readonly Material[] = ['plastic', 'paper', 'cardboard', 'metal', 'glass', 'e-waste'] as const;

export interface MaterialSpec {
  avgPrice: number; // ₹/kg
  priceUnit: '₹/kg';
  typicalQty: string;
  demand: 'High' | 'Moderate' | 'Seasonal';
  /** 0–100 recyclability score. */
  recyclability: number;
  useCases: string[];
  /** Commodity-chart series for the materials explorer. */
  priceHistory: number[];
}

export const MATERIAL_SPECS: Record<Material, MaterialSpec> = {
  plastic: {
    avgPrice: 38,
    priceUnit: '₹/kg',
    typicalQty: '0.5–12 t',
    demand: 'High',
    recyclability: 82,
    useCases: ['rPET food-grade pellets', 'Textile fibre', 'Moulded furniture'],
    priceHistory: [31, 32, 34, 33, 35, 36, 38],
  },
  paper: {
    avgPrice: 16,
    priceUnit: '₹/kg',
    typicalQty: '1–20 t',
    demand: 'Moderate',
    recyclability: 74,
    useCases: ['Packaging board', 'Newsprint', 'Moulded pulp'],
    priceHistory: [14, 15, 15, 16, 15, 16, 16],
  },
  cardboard: {
    avgPrice: 14,
    priceUnit: '₹/kg',
    typicalQty: '2–30 t',
    demand: 'High',
    recyclability: 91,
    useCases: ['Corrugated linerboard', 'Carton stock', 'Insulation board'],
    priceHistory: [11, 12, 12, 13, 13, 14, 14],
  },
  metal: {
    avgPrice: 62,
    priceUnit: '₹/kg',
    typicalQty: '0.2–8 t',
    demand: 'High',
    recyclability: 96,
    useCases: ['Ferrous smelting charge', 'Aluminium billets', 'Copper rod'],
    priceHistory: [54, 56, 57, 59, 60, 61, 62],
  },
  glass: {
    avgPrice: 5,
    priceUnit: '₹/kg',
    typicalQty: '1–15 t',
    demand: 'Seasonal',
    recyclability: 88,
    useCases: ['Container cullet', 'Fibreglass', 'Tile aggregate'],
    priceHistory: [5, 5, 4, 5, 5, 5, 5],
  },
  'e-waste': {
    avgPrice: 185,
    priceUnit: '₹/kg',
    typicalQty: '50–900 kg',
    demand: 'High',
    recyclability: 70,
    useCases: ['Precious-metal recovery', 'Copper harness', 'Shredder feedstock'],
    priceHistory: [150, 158, 165, 170, 176, 180, 185],
  },
};

/* ── Quality grades ─────────────────────────────────────────────────── */

export type QualityGrade = 'A' | 'B' | 'C';
export const QUALITY_GRADES: readonly QualityGrade[] = ['A', 'B', 'C'] as const;

export const QUALITY_META: Record<QualityGrade, { label: string; note: string }> = {
  A: { label: 'Grade A', note: 'Sorted, contamination < 2%' },
  B: { label: 'Grade B', note: 'Lightly mixed, contamination < 8%' },
  C: { label: 'Grade C', note: 'Mixed load, contamination < 15%' },
};

/* ── Listings & offers ──────────────────────────────────────────────── */

export type ListingStatus = 'available' | 'reserved' | 'traded' | 'draft';

export interface Listing {
  id: string;
  seller: string;
  sellerType: 'Business' | 'Residential community';
  material: Material;
  subtype: string;
  quantityTonnes: number;
  pricePerKg: number;
  quality: QualityGrade;
  city: string;
  locality: string;
  lat: number;
  lng: number;
  pickupFrom: string; // ISO date
  description: string;
  status: ListingStatus;
  listedAt: string; // ISO date
  views: number;
  verified: boolean;
}

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface Offer {
  id: string;
  listingId: string;
  bidder: string;
  pricePerKg: number;
  quantityTonnes: number;
  status: OfferStatus;
  placedAt: string;
  note?: string;
}

/* ── Transactions & pickups ─────────────────────────────────────────── */

export type TransactionStageIndex = 0 | 1 | 2 | 3 | 4 | 5;

export const TRANSACTION_STAGES = [
  'Listing created',
  'Offer received',
  'Offer accepted',
  'Pickup scheduled',
  'Material collected',
  'Payment completed',
] as const;

export interface Transaction {
  id: string;
  listingId: string;
  counterparty: string;
  material: Material;
  quantityTonnes: number;
  valueInr: number;
  /** Index into TRANSACTION_STAGES the transaction has reached. */
  stage: TransactionStageIndex;
  openedAt: string;
  direction: 'sold' | 'purchased';
}

export interface Pickup {
  id: string;
  transactionId: string;
  partner: string;
  material: Material;
  quantityTonnes: number;
  date: string; // ISO date
  slot: string;
  address: string;
  status: 'scheduled' | 'in-progress' | 'completed';
}

/* ── Analytics ──────────────────────────────────────────────────────── */

export interface MonthlyPoint {
  month: string;
  volume: number; // tonnes
  revenue: number; // ₹
}

export interface ImpactStats {
  wasteDivertedTonnes: number;
  co2AvoidedTonnes: number;
  economicValueInr: number;
  recoveryRate: number; // 0–100
}

/* ── Roles ──────────────────────────────────────────────────────────── */

export type Role = 'generator' | 'recycler';

/* ── Legacy SmartSort model (still the src/api/client.ts contract) ──── */

export type WasteCategory = 'plastic' | 'paper' | 'metal' | 'glass' | 'e-waste' | 'organic' | 'other';

export const WASTE_CATEGORIES: readonly WasteCategory[] = [
  'plastic',
  'paper',
  'metal',
  'glass',
  'e-waste',
  'organic',
  'other',
] as const;

/** Maps legacy classifier categories onto WasteX tradable materials. */
export function categoryToMaterial(category: WasteCategory): Material | null {
  switch (category) {
    case 'plastic':
    case 'paper':
    case 'metal':
    case 'glass':
    case 'e-waste':
      return category;
    default:
      return null; // organic / other are not tradable marketplace materials
  }
}

export interface Location {
  lat: number;
  lng: number;
}

export interface Facility {
  facility_id: string;
  name: string;
  lat: number;
  lng: number;
  accepted_categories: WasteCategory[];
  payout_estimate: Partial<Record<WasteCategory, number>>;
  payout_basis: 'estimated' | 'verified';
  verified: boolean;
  address: string;
  contact: string;
  operating_hours: string;
  source: string;
  updated_at: string;
}

export interface FacilityMatch {
  facility: Facility;
  distance_km: number;
  score: number;
  beyondRadius: boolean;
}

export interface ClassificationResult {
  category: WasteCategory;
  confidence: number;
  rationale: string;
}

export interface ClassifyMatchResponse {
  classification: ClassificationResult;
  matches: FacilityMatch[];
  userLocation: Location;
}

export interface MatchFacilitiesResponse {
  matches: FacilityMatch[];
  userLocation: Location;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'server' | 'validation',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
