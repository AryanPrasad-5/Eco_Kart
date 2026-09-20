import { describe, it, expect } from 'vitest';
import { rankFacilitiesByDistance } from '../src/lib/haversine';
import type { Facility, Location } from '../src/types';

describe('rankFacilitiesByDistance', () => {
  const center: Location = { lat: 12.0, lng: 77.0 };

  const facilities: Facility[] = [
    {
      facility_id: 'F1',
      name: 'Far',
      lat: 13.0,
      lng: 78.0,
      accepted_categories: [],
      payout_estimate: {},
      payout_basis: 'estimated',
      verified: true,
      address: '',
      contact: '',
      operating_hours: '',
      source: 'test',
      updated_at: '',
    },
    {
      facility_id: 'F2',
      name: 'Near',
      lat: 12.1,
      lng: 77.1,
      accepted_categories: [],
      payout_estimate: {},
      payout_basis: 'estimated',
      verified: true,
      address: '',
      contact: '',
      operating_hours: '',
      source: 'test',
      updated_at: '',
    },
    {
      facility_id: 'F3',
      name: 'Unverified',
      lat: 12.1,
      lng: 77.1,
      accepted_categories: [],
      payout_estimate: {},
      payout_basis: 'estimated',
      verified: false,
      address: '',
      contact: '',
      operating_hours: '',
      source: 'test',
      updated_at: '',
    }
  ];

  it('filters unverified and sorts by distance', () => {
    const result = rankFacilitiesByDistance(center, facilities);
    
    // F3 should be filtered out
    expect(result.length).toBe(2);
    
    // Near (F2) should be first
    expect(result[0]!.facility.facility_id).toBe('F2');
    expect(result[1]!.facility.facility_id).toBe('F1');
    
    // distances should be ascending
    expect(result[0]!.distance_km).toBeLessThan(result[1]!.distance_km);
  });
});
