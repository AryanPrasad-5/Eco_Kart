import { describe, expect, it } from 'vitest';
import { haversineKm } from '../src/shared/haversine';
import type { Location } from '../src/shared/types';

const DEMO: Location = { lat: 12.9716, lng: 77.5946 }; // Bengaluru demo point

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(DEMO, DEMO)).toBe(0);
  });

  it('matches the documented frontend worked-example distances', () => {
    // The frontend test suite pins A ≈ 1.0 km and B ≈ 2.0 km north of the demo
    // point; the backend must agree so both sides rank identically.
    const oneKmNorth: Location = { lat: 12.9806, lng: 77.5946 };
    const twoKmNorth: Location = { lat: 12.9896, lng: 77.5946 };
    expect(haversineKm(DEMO, oneKmNorth)).toBeCloseTo(1.0, 1);
    expect(haversineKm(DEMO, twoKmNorth)).toBeCloseTo(2.0, 1);
  });

  it('is symmetric', () => {
    const other: Location = { lat: 12.9552, lng: 77.6018 };
    expect(haversineKm(DEMO, other)).toBeCloseTo(haversineKm(other, DEMO), 10);
  });

  it('scales with known Bengaluru reference distance (demo → Indiranagar ≈ 5.0 km)', () => {
    const indiranagar: Location = { lat: 12.9719, lng: 77.6412 };
    const d = haversineKm(DEMO, indiranagar);
    expect(d).toBeGreaterThan(4.5);
    expect(d).toBeLessThan(5.5);
  });
});
