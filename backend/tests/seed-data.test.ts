/**
 * Seed dataset integrity (Issue #4).
 *
 * The seed file is the source of truth for the dev registry, so it is held to
 * the SAME contract the runtime enforces (validateSeedRecord mirrors
 * src/shared/validate.ts parseFacility) — a record the registry would silently
 * drop must never be seedable. The actual write path (BatchWriteCommand,
 * unprocessed-item retry, scoped --clear) is exercised live against the dev
 * table, not mocked here.
 */
import { describe, expect, it } from 'vitest';
import { loadSeedRecords, validateSeedRecord } from '../seed/seed.mjs';

const CATEGORIES = ['plastic', 'paper', 'metal', 'glass', 'e-waste', 'organic', 'other'];

const records = loadSeedRecords() as Record<string, unknown>[];

describe('seed dataset (facilities-seed.json)', () => {
  it('contains exactly 14 records with unique facility_ids', () => {
    expect(records).toHaveLength(14);
    const ids = records.map((r) => r.facility_id);
    expect(new Set(ids).size).toBe(14);
    for (const id of ids) expect(typeof id).toBe('string');
  });

  it('every record passes the runtime-mirror validator untouched', () => {
    for (const record of records) {
      expect(validateSeedRecord(record)).toEqual([]);
    }
  });

  it('uses only the closed category vocabulary (accepted + payout keys)', () => {
    for (const r of records) {
      const accepted = r.accepted_categories as string[];
      expect(accepted.length).toBeGreaterThan(0);
      for (const c of accepted) expect(CATEGORIES).toContain(c);
      for (const c of Object.keys(r.payout_estimate as object)) {
        expect(CATEGORIES).toContain(c);
      }
    }
  });

  it('coordinates fall inside the Bengaluru bounding box', () => {
    for (const r of records) {
      expect(r.lat as number).toBeGreaterThan(12.7);
      expect(r.lat as number).toBeLessThan(13.2);
      expect(r.lng as number).toBeGreaterThan(77.3);
      expect(r.lng as number).toBeLessThan(77.9);
    }
  });

  it('payout values are typed numbers and basis stays "estimated"', () => {
    for (const r of records) {
      expect(r.payout_basis).toBe('estimated');
      expect(typeof r.verified).toBe('boolean');
      for (const value of Object.values(r.payout_estimate as Record<string, unknown>)) {
        expect(typeof value).toBe('number');
        expect(Number.isFinite(value as number)).toBe(true);
        expect(value as number).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('validator rejects malformed records before any write', () => {
    const first = records[0];
    if (!first) throw new Error('seed dataset is empty');
    expect(validateSeedRecord({ ...first, lat: 999 })).not.toEqual([]);
    expect(validateSeedRecord({ ...first, lng: '77.6' })).not.toEqual([]);
    expect(validateSeedRecord({ ...first, accepted_categories: ['nuclear'] })).not.toEqual([]);
    expect(validateSeedRecord({ ...first, accepted_categories: [] })).not.toEqual([]);
    expect(validateSeedRecord({ ...first, payout_estimate: { plastic: 'free' } })).not.toEqual([]);
    expect(validateSeedRecord({ ...first, payout_estimate: { plastic: -5 } })).not.toEqual([]);
    expect(validateSeedRecord({ ...first, verified: 'yes' })).not.toEqual([]);
    expect(validateSeedRecord({ ...first, payout_basis: 'guaranteed' })).not.toEqual([]);
    expect(validateSeedRecord('not an object')).not.toEqual([]);
  });
});
