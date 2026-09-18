import { describe, expect, it } from 'vitest';
import { parseFacility } from '../src/shared/validate';
import { rankFacilities } from '../src/shared/rank';

const DEMO = { lat: 12.9716, lng: 77.5946 };

function validFacility(partial: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    facility_id: 'F001',
    name: 'GreenCrate Buyback',
    lat: 12.9756,
    lng: 77.6068,
    accepted_categories: ['plastic', 'paper', 'metal'],
    payout_estimate: { plastic: 24, paper: 12, metal: 38 },
    payout_basis: 'estimated',
    verified: true,
    address: 'MG Road, Bengaluru',
    contact: '+91-98XXXXXXXX',
    operating_hours: 'Mon–Sat 9:00–18:00',
    source: 'curated-demo-listing',
    updated_at: '2026-09-16',
    ...partial,
  };
}

describe('parseFacility (DynamoDB records are untrusted)', () => {
  it('accepts a fully valid record', () => {
    const f = parseFacility(validFacility());
    expect(f).not.toBeNull();
    expect(f?.facility_id).toBe('F001');
  });

  it('rejects out-of-range coordinates (no NaN distances possible)', () => {
    expect(parseFacility(validFacility({ lat: 95 }))).toBeNull();
    expect(parseFacility(validFacility({ lng: -200 }))).toBeNull();
    expect(parseFacility(validFacility({ lat: NaN }))).toBeNull();
    expect(parseFacility(validFacility({ lat: Infinity }))).toBeNull();
    expect(parseFacility(validFacility({ lat: '12.97' }))).toBeNull();
  });

  it('rejects negative, non-finite and absurd payouts', () => {
    expect(parseFacility(validFacility({ payout_estimate: { plastic: -5 } }))).toBeNull();
    expect(parseFacility(validFacility({ payout_estimate: { plastic: NaN } }))).toBeNull();
    expect(parseFacility(validFacility({ payout_estimate: { plastic: Infinity } }))).toBeNull();
    expect(parseFacility(validFacility({ payout_estimate: { plastic: 99_999 } }))).toBeNull();
  });

  it('accepts an empty payout map (free drop-off facility)', () => {
    const f = parseFacility(validFacility({ payout_estimate: {} }));
    expect(f).not.toBeNull();
    expect(f?.payout_estimate).toEqual({});
  });

  it('rejects unknown categories and non-array/empty accepted_categories', () => {
    expect(parseFacility(validFacility({ accepted_categories: ['batteries'] }))).toBeNull();
    expect(parseFacility(validFacility({ accepted_categories: [] }))).toBeNull();
    expect(parseFacility(validFacility({ accepted_categories: 'plastic' }))).toBeNull();
  });

  it('rejects bad identity/verification fields', () => {
    expect(parseFacility(validFacility({ facility_id: '' }))).toBeNull();
    expect(parseFacility(validFacility({ facility_id: 'x'.repeat(65) }))).toBeNull();
    expect(parseFacility(validFacility({ name: '  ' }))).toBeNull();
    expect(parseFacility(validFacility({ verified: 'yes' }))).toBeNull();
    expect(parseFacility(validFacility({ payout_basis: 'guaranteed' }))).toBeNull();
  });

  it('rejects non-object input and truncates oversized text fields', () => {
    expect(parseFacility(undefined)).toBeNull();
    expect(parseFacility('F001' as unknown as Record<string, unknown>)).toBeNull();
    const f = parseFacility(validFacility({ name: 'N'.repeat(500) }));
    expect(f?.name).toHaveLength(200);
  });
});

describe('ranking resilience against bad-but-parseable data', () => {
  it('never produces NaN scores even with zero-payout and unverified mixes', () => {
    const free = parseFacility(validFacility({ facility_id: 'FREE', payout_estimate: {} }))!;
    const paid = parseFacility(validFacility({ facility_id: 'PAID' }))!;
    const ranked = rankFacilities([free, paid], 'plastic', DEMO);
    for (const m of ranked) {
      expect(Number.isFinite(m.score)).toBe(true);
      expect(Number.isFinite(m.distance_km)).toBe(true);
    }
  });

  it('deterministic tie-break: equal scores → shorter distance, then stable facility_id', () => {
    // Same distance & payout & verification → tie broken by facility_id ascending.
    const a = parseFacility(validFacility({ facility_id: 'A', lat: 12.9806, lng: 77.5946 }))!;
    const b = parseFacility(validFacility({ facility_id: 'B', lat: 12.9806, lng: 77.5946 }))!;
    const ranked = rankFacilities([b, a], 'plastic', DEMO);
    expect(ranked.map((m) => m.facility.facility_id)).toEqual(['A', 'B']);

    // Same payout, different distance → shorter distance wins the tie.
    const near = parseFacility(validFacility({ facility_id: 'NEAR', lat: 12.975 }))!;
    const far = parseFacility(validFacility({ facility_id: 'FAR', lat: 12.988 }))!;
    const ranked2 = rankFacilities([far, near], 'plastic', DEMO);
    expect(ranked2[0]?.facility.facility_id).toBe('NEAR');
  });
});
