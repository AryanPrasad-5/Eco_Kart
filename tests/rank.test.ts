import { describe, expect, it } from 'vitest';
import { rankFacilities, RANKING_WEIGHTS, MAX_DISTANCE_KM } from '../src/lib/rank';
import type { Facility, Location } from '../src/types';

const DEMO: Location = { lat: 12.9716, lng: 77.5946 };

function facility(partial: Partial<Facility>): Facility {
  return {
    facility_id: 'FX',
    name: 'Test Facility',
    lat: 12.9716,
    lng: 77.5946,
    accepted_categories: ['plastic'],
    payout_estimate: {},
    payout_basis: 'estimated',
    verified: true,
    address: 'Test',
    contact: '+91-0000000000',
    operating_hours: 'Mon–Sat 9:00–18:00',
    source: 'test',
    updated_at: '2026-09-16',
    ...partial,
  };
}

describe('ranking weights', () => {
  it('sum to exactly 1.0 so each term is an interpretable share', () => {
    const sum = RANKING_WEIGHTS.distance + RANKING_WEIGHTS.payout + RANKING_WEIGHTS.verification;
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

describe('rankFacilities', () => {
  it('ranks the nearer facility first when payout is equal (worked example from the plan)', () => {
    // A(1.0 km, ₹20/kg) vs B(2.0 km, ₹30/kg) — convenience wins at household scale.
    const near = facility({
      facility_id: 'A',
      name: 'Facility A',
      lat: 12.9806, // ~1.0 km north of demo point
      lng: 77.5946,
      payout_estimate: { plastic: 20 },
      verified: true,
    });
    const far = facility({
      facility_id: 'B',
      name: 'Facility B',
      lat: 12.9896, // ~2.0 km north
      lng: 77.5946,
      payout_estimate: { plastic: 30 },
      verified: true,
    });

    const ranked = rankFacilities([far, near], 'plastic', DEMO);
    expect(ranked[0]?.facility.facility_id).toBe('A');
    expect(ranked[1]?.facility.facility_id).toBe('B');

    // Documented scores from the consolidated plan: A = 0.780 > B = 0.760.
    expect(ranked[0]?.score).toBeCloseTo(0.780, 2);
    expect(ranked[1]?.score).toBeCloseTo(0.760, 2);
  });

  it('floors the distance term beyond the 5 km horizon instead of hiding the facility', () => {
    const far = facility({
      facility_id: 'FAR',
      lat: 12.9716 + 5.5 / 111.132, // ~5.5 km north — clearly beyond the 5 km horizon
      lng: 77.5946,
      payout_estimate: { plastic: 50 }, // highest payout → payout score 1
      verified: true,
    });
    const mid = facility({
      facility_id: 'MID',
      lat: 12.9716 + 1 / 111.132, // ~1 km
      payout_estimate: { plastic: 10 },
      verified: true,
    });

    const ranked = rankFacilities([far, mid], 'plastic', DEMO);
    const farMatch = ranked.find((m) => m.facility.facility_id === 'FAR');
    expect(farMatch?.beyondRadius).toBe(true);
    expect(farMatch?.score).toBeCloseTo(0.4, 5); // 0.6·0 + 0.3·1 + 0.1·1
    expect(ranked[0]?.facility.facility_id).toBe('MID'); // mid still wins overall
  });

  it('gives verified facilities a visible but non-blocking advantage (bonus, not filter)', () => {
    const verified = facility({ facility_id: 'V', verified: true, payout_estimate: { plastic: 10 } });
    const unverified = facility({ facility_id: 'U', verified: false, payout_estimate: { plastic: 10 } });

    const ranked = rankFacilities([unverified, verified], 'plastic', DEMO);
    expect(ranked[0]?.facility.facility_id).toBe('V');
    expect(ranked[1]?.score).toBeCloseTo(ranked[0]!.score - 0.1, 5); // exactly the 0.1 penalty
    expect(ranked).toHaveLength(2); // unverified still appears — never hidden
  });

  it('normalizes payout against the best eligible facility per category', () => {
    const high = facility({ facility_id: 'H', payout_estimate: { plastic: 40 } });
    const low = facility({ facility_id: 'L', payout_estimate: { plastic: 10 } });

    const ranked = rankFacilities([low, high], 'plastic', DEMO);
    const h = ranked.find((m) => m.facility.facility_id === 'H')!;
    const l = ranked.find((m) => m.facility.facility_id === 'L')!;

    const payoutH = (h.score - 0.6 * (1 - h.distance_km / MAX_DISTANCE_KM) - 0.1) / 0.3;
    const payoutL = (l.score - 0.6 * (1 - l.distance_km / MAX_DISTANCE_KM) - 0.1) / 0.3;
    expect(payoutH).toBeCloseTo(1, 5);
    expect(payoutL).toBeCloseTo(0.25, 5);
  });

  it('breaks score ties by shorter distance', () => {
    const a = facility({ facility_id: 'A', lat: 12.9806, lng: 77.5946, payout_estimate: { plastic: 10 } });
    const b = facility({ facility_id: 'B', lat: 12.9896, lng: 77.5946, payout_estimate: { plastic: 10 } });

    const ranked = rankFacilities([b, a], 'plastic', DEMO);
    expect(ranked[0]?.facility.facility_id).toBe('A');
  });

  it('filters by accepted category and caps results at 5', () => {
    const many: Facility[] = [...Array(8)].map((_, i) =>
      facility({ facility_id: `P${i}`, accepted_categories: ['plastic'] }),
    );
    many.push(facility({ facility_id: 'G', accepted_categories: ['glass'] }));

    const ranked = rankFacilities(many, 'plastic', DEMO);
    expect(ranked).toHaveLength(5);
    expect(ranked.every((m) => m.facility.accepted_categories.includes('plastic'))).toBe(true);
  });

  it('handles a category with zero payout offers without dividing by zero', () => {
    const municipal = facility({ facility_id: 'M', payout_estimate: {}, verified: true });
    const ranked = rankFacilities([municipal], 'plastic', DEMO);
    expect(ranked[0]?.score).toBeCloseTo(0.7, 5); // 0.6·1 + 0.3·0 + 0.1·1
  });
});
