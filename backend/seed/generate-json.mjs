#!/usr/bin/env node
/**
 * Generates seed/facilities-seed.json from seed/facilities-seed.ts.
 * Run once after editing the TS dataset:  node seed/generate-json.mjs
 * (We keep the JSON committed so seed.mjs has no TS dependency.)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ts = readFileSync(join(__dirname, 'facilities-seed.ts'), 'utf8');

// Extract the array literal between "FACILITIES_SEED: readonly SeedFacility[] = [" and the closing "];"
const start = ts.indexOf('= [');
const end = ts.lastIndexOf('];');
if (start < 0 || end < 0) {
  console.error('Could not locate FACILITIES_SEED array in the TS file');
  process.exit(1);
}

let literal = ts.slice(start + 2, end + 1);
// TS-only syntax inside the literal: none in our dataset (plain object/array/string literals).
// Sanity-check by evaluating with the Function constructor (data only, no imports inside).
const parsed = new Function(`"use strict"; return (${literal});`)();
if (!Array.isArray(parsed) || parsed.length !== 14) {
  console.error(`Expected 14 records, got ${Array.isArray(parsed) ? parsed.length : typeof parsed}`);
  process.exit(1);
}

writeFileSync(join(__dirname, 'facilities-seed.json'), JSON.stringify(parsed, null, 2) + '\n');
console.log(`Wrote facilities-seed.json with ${parsed.length} records.`);
