#!/usr/bin/env node
/**
 * Seed the DynamoDB facility registry with the finalized 14 Bengaluru records
 * (seed/facilities-seed.json).
 *
 * Usage (from backend/):
 *   node seed/seed.mjs                                  # dev stack default
 *   node seed/seed.mjs --table <stack-name>-facilities  # another stack
 *   node seed/seed.mjs --clear                          # delete seed IDs only
 *
 * Region defaults to ap-south-1. Credentials come from the ambient AWS
 * credential chain (developer credentials) — nothing is hard-coded, and no
 * runtime Lambda role needs write access: seeding is a developer-side
 * one-command operation.
 *
 * Guarantees:
 *   - EVERY record is validated (mirror of src/shared/validate.ts parseFacility)
 *     BEFORE any write; one bad record aborts the whole seed with nothing written.
 *   - Idempotent: facility_id is the HASH key and PutRequest is an upsert —
 *     running the seed twice never duplicates rows or changes the ID set.
 *   - Writes use BatchWriteItem (25/chunk) with bounded retry on unprocessed items.
 *   - --clear removes ONLY the seed-set IDs, never unrelated rows.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** The project's closed category vocabulary (mirror of shared/categories.ts). */
const CATEGORIES = new Set(['plastic', 'paper', 'metal', 'glass', 'e-waste', 'organic', 'other']);

/**
 * Validate one facility record — a mirror of the runtime validator
 * (src/shared/validate.ts parseFacility) so a row the registry would silently
 * drop can never be seeded. Returns a list of problems ([] = valid).
 * Deliberately NO stricter and NO looser than the runtime contract.
 */
export function validateSeedRecord(record) {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    return ['record is not a JSON object'];
  }
  const r = record;
  const problems = [];

  if (typeof r.facility_id !== 'string' || r.facility_id.length === 0 || r.facility_id.length > 64) {
    problems.push('facility_id must be a string of 1–64 chars');
  }
  if (typeof r.name !== 'string' || r.name.trim().length === 0) {
    problems.push('name must be a non-empty string');
  }
  if (typeof r.lat !== 'number' || !Number.isFinite(r.lat) || r.lat < -90 || r.lat > 90) {
    problems.push('lat must be a finite number in [-90, 90]');
  }
  if (typeof r.lng !== 'number' || !Number.isFinite(r.lng) || r.lng < -180 || r.lng > 180) {
    problems.push('lng must be a finite number in [-180, 180]');
  }

  const accepted = r.accepted_categories;
  if (
    !Array.isArray(accepted) ||
    accepted.length === 0 ||
    accepted.length > 7 ||
    !accepted.every((c) => CATEGORIES.has(c))
  ) {
    problems.push('accepted_categories must be 1–7 valid categories');
  }

  const payout = r.payout_estimate;
  if (typeof payout !== 'object' || payout === null || Array.isArray(payout)) {
    problems.push('payout_estimate must be an object');
  } else {
    for (const [category, value] of Object.entries(payout)) {
      if (!CATEGORIES.has(category)) {
        problems.push(`payout_estimate.${category} is not a valid category`);
      }
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10_000) {
        problems.push(`payout_estimate.${category} must be a finite number in [0, 10000]`);
      }
    }
  }

  if (r.payout_basis !== 'estimated' && r.payout_basis !== 'verified') {
    problems.push('payout_basis must be "estimated" or "verified"');
  }
  if (typeof r.verified !== 'boolean') {
    problems.push('verified must be a boolean');
  }

  return problems;
}

/** Load the seed dataset as unvalidated records (throws if not a JSON array). */
export function loadSeedRecords() {
  const raw = JSON.parse(readFileSync(join(__dirname, 'facilities-seed.json'), 'utf8'));
  if (!Array.isArray(raw)) throw new Error('seed file is not an array');
  return raw;
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
  };
  const clear = args.includes('--clear');
  const region = arg('--region', process.env.AWS_REGION ?? 'ap-south-1');
  const table = arg('--table', 'smartsort-backend-dev-facilities');

  // 1. Validate EVERYTHING before touching AWS — abort on any bad record.
  const records = loadSeedRecords();
  const failures = [];
  if (records.length !== 14) {
    failures.push(`expected 14 seed records, found ${records.length}`);
  }
  for (const record of records) {
    const problems = validateSeedRecord(record);
    if (problems.length > 0) {
      const id = typeof record?.facility_id === 'string' ? record.facility_id : '(no id)';
      failures.push(`${id}: ${problems.join('; ')}`);
    }
  }
  if (failures.length > 0) {
    console.error('Seed aborted — invalid records (nothing was written):');
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

  // 2. Optional cleanup — ONLY the seed IDs, never unrelated rows.
  if (clear) {
    for (const record of records) {
      await client.send(new DeleteCommand({ TableName: table, Key: { facility_id: record.facility_id } }));
    }
    console.log(`Cleared ${records.length} seed records from "${table}".`);
  }

  // 3. BatchWrite in chunks of 25 with bounded retry on unprocessed items.
  let written = 0;
  for (let i = 0; i < records.length; i += 25) {
    const chunk = records.slice(i, i + 25);
    let pending = chunk.map((Item) => ({ PutRequest: { Item } }));
    for (let attempt = 1; pending.length > 0 && attempt <= 5; attempt++) {
      const res = await client.send(new BatchWriteCommand({ RequestItems: { [table]: pending } }));
      pending = res.UnprocessedItems?.[table] ?? [];
      if (pending.length > 0) {
        const delayMs = 200 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    if (pending.length > 0) {
      throw new Error(`${pending.length} item(s) stayed unprocessed after 5 attempts — aborting.`);
    }
    written += chunk.length;
    for (const record of chunk) {
      console.log(`  ✓ ${record.facility_id} — ${record.name}`);
    }
  }

  // 4. Read back and summarize (fail loudly on duplicates).
  const verify = await client.send(new ScanCommand({ TableName: table, ConsistentRead: true }));
  const items = verify.Items ?? [];
  const ids = items.map((it) => it.facility_id).sort();
  const uniqueIds = new Set(ids);
  console.log(`Seeded ${written}/${records.length} records into "${table}" (${region}).`);
  console.log(`Table now holds ${items.length} rows; ${uniqueIds.size} unique facility_ids.`);
  console.log(`IDs: ${ids.join(', ')}`);
  if (uniqueIds.size !== ids.length) {
    console.error('Duplicate facility_ids detected — investigate before proceeding.');
    process.exit(1);
  }
}

// Run only when executed directly — importing from tests must have no side effects.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
}
