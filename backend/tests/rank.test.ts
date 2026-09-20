import { describe, expect, it } from 'vitest';
import { rankFacilities, RANKING_WEIGHTS } from '../src/shared/rank';
import type { Facility, Location } from '../src/shared/types';

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
  it('sum to exactly 1.0', () => {
    expect(RANKING_WEIGHTS.distance + RANKING_WEIGHTS.payout + RANKING_WEIGHTS.verification).toBeCloseTo(1.0, 10);
  });
});

describe('rankFacilities (backend parity with frontend)', () => {
  it('reproduces the plan worked example: A(1 km, ₹20) = 0.780 beats B(2 km, ₹30) = 0.760', () => {
    const a = facility({ facility_id: 'A', lat: 12.9806, lng: 77.5946, payout_estimate: { plastic: 20 } });
    const b = facility({ facility_id: 'B', lat: 12.9896, lng: 77.5946, payout_estimate: { plastic: 30 } });

    const ranked = rankFacilities([b, a], 'plastic', DEMO);
    expect(ranked[0]?.facility.facility_id).toBe('A');
    expect(ranked[0]?.score).toBeCloseTo(0.780, 2);
    expect(ranked[1]?.score).toBeCloseTo(0.760, 2);
  });

  it('floors distance beyond 5 km instead of hiding facilities', () => {
    const far = facility({
      facility_id: 'FAR',
      lat: 12.9716 + 5.5 / 111.132,
      payout_estimate: { plastic: 50 },
    });
    const ranked = rankFacilities([far], 'plastic', DEMO);
    expect(ranked[0]?.beyondRadius).toBe(true);
    expect(ranked[0]?.score).toBeCloseTo(0.4, 5); // 0.6·0 + 0.3·1 + 0.1·1
  });

  it('applies exactly the 0.1 verification penalty and never filters unverified facilities', () => {
    const v = facility({ facility_id: 'V', verified: true, payout_estimate: { plastic: 10 } });
    const u = facility({ facility_id: 'U', verified: false, payout_estimate: { plastic: 10 } });
    const ranked = rankFacilities([u, v], 'plastic', DEMO);
    expect(ranked[0]?.facility.facility_id).toBe('V');
    expect(ranked[1]?.score).toBeCloseTo(ranked[0]!.score - 0.1, 5);
  });

  it('handles zero/missing payout without dividing by zero', () => {
    const m = facility({ facility_id: 'M', payout_estimate: {} });
    const ranked = rankFacilities([m], 'plastic', DEMO);
    expect(ranked[0]?.score).toBeCloseTo(0.7, 5); // 0.6·1 + 0.3·0 + 0.1·1
  });

  it('caps results at 5', () => {
    const many: Facility[] = [...Array(8)].map((_, i) => facility({ facility_id: `P${i}` }));
    expect(rankFacilities(many, 'plastic', DEMO)).toHaveLength(5);
  });
});
