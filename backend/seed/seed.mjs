#!/usr/bin/env node
/**
 * Seed the DynamoDB facility table (`<stack-name>-facilities`) with the 14
 * Bengaluru demo records.
 *
 * Usage:
 *   node seed/seed.mjs [--table smartsort-backend-facilities] [--region ap-south-1] [--clear]
 *
 * The table name is stack-qualified (template.yaml: ${StackName}-facilities);
 * the default matches the samconfig default stack `smartsort-backend`.
 * Requires AWS credentials in the environment (or an SSO/CLI profile exported).
 * Idempotent: upserts every record; --clear wipes the table first.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse args
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const clear = args.includes('--clear');
const region = arg('--region', process.env.AWS_REGION ?? 'ap-south-1');
const table = arg('--table', process.env.TABLE_NAME ?? 'smartsort-backend-facilities');

// Load the compiled seed data via a tiny TS→JSON extraction (avoid a build step):
// the dataset is plain data, so we import it through tsx-free means: we read the
// TS file and evaluate the exported array with a regex-free approach — simplest
// reliable path is requiring the compiled copy if present, else parse via node:vm.
// For the hackathon we keep it dead simple: the data also lives as JSON.
const seedPath = join(__dirname, 'facilities-seed.json');
const records = JSON.parse(readFileSync(seedPath, 'utf8'));

if (!Array.isArray(records) || records.length !== 14) {
  console.error(`Expected 14 seed records, found ${Array.isArray(records) ? records.length : 'non-array'}`);
  process.exit(1);
}

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

async function main() {
  console.log(`Seeding table "${table}" in ${region} (${records.length} records)…`);

  if (clear) {
    const existing = await client.send(new ScanCommand({ TableName: table, ProjectionExpression: 'facility_id' }));
    for (const item of existing.Items ?? []) {
      await client.send(new DeleteCommand({ TableName: table, Key: { facility_id: item.facility_id } }));
    }
    console.log(`Cleared ${existing.Items?.length ?? 0} existing records.`);
  }

  for (const record of records) {
    await client.send(new PutCommand({ TableName: table, Item: record }));
    console.log(`  ✓ ${record.facility_id} — ${record.name}`);
  }

  // Verify
  const verify = await client.send(new ScanCommand({ TableName: table }));
  console.log(`Done. Table now holds ${verify.Items?.length ?? 0} records.`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
