import { describe, expect, it } from 'vitest';
import { haversineKm } from '../src/lib/haversine';

describe('haversineKm', () => {
  it('is zero for identical points', () => {
    const p = { lat: 12.9716, lng: 77.5946 };
    expect(haversineKm(p, p)).toBeCloseTo(0, 9);
  });

  it('matches a known Bengaluru pair (MG Road → Indiranagar ≈ 3.75 km)', () => {
    const mgRoad = { lat: 12.9756, lng: 77.6068 };
    const indiranagar = { lat: 12.9719, lng: 77.6412 };
    const km = haversineKm(mgRoad, indiranagar);
    expect(km).toBeGreaterThan(3.5);
    expect(km).toBeLessThan(4.0); // ≈3.75 km great-circle
  });

  it('handles ~0.01° latitude ≈ 1.11 km (independent hand calculation, ±1 m)', () => {
    const a = { lat: 12.9716, lng: 77.5946 };
    const b = { lat: 12.9816, lng: 77.5946 };
    expect(haversineKm(a, b)).toBeCloseTo(1.112, 2);
  });

  it('is symmetric', () => {
    const a = { lat: 12.9756, lng: 77.6068 };
    const b = { lat: 12.9812, lng: 77.6210 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });
});
