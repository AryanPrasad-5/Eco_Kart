/**
 * Facility registry service backed by DynamoDB (table: ${STACK_NAME}-facilities,
 * injected via TABLE_NAME — see template.yaml).
 *
 * For the MVP's 14 curated records a Scan is correct and sufficient — no
 * geospatial index, no GSI over-engineering. Production-readiness hardening:
 *  - full pagination via ExclusiveStartKey (no silent truncation above 1 MB);
 *  - duplicate facility_id last-writer-wins dedupe;
 *  - every record passes strict validation (parseFacility) — one malformed row
 *    is skipped + logged, never served, never crashes matching.
 *
 * This module contains NO Bedrock imports by design: it is shared by the
 * override Lambda, whose IAM policy has no bedrock:* permissions.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { requireTableConfig } from '../shared/config';
import { log } from '../shared/observability';
import { parseFacility } from '../shared/validate';
import { rankFacilities } from '../shared/rank';
import type { Facility, FacilityMatch, WasteCategory } from '../shared/types';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

/** Load all facilities with full pagination (Scan — appropriate at this scale). */
export async function listFacilities(): Promise<Facility[]> {
  const tableName = requireTableConfig();
  const byId = new Map<string, Facility>();
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  let malformed = 0;

  do {
    const result = await ddb.send(
      new ScanCommand({ TableName: tableName, ExclusiveStartKey, ConsistentRead: true }),
    );
    for (const item of (result.Items ?? []) as Record<string, unknown>[]) {
      const facility = parseFacility(item);
      if (facility) byId.set(facility.facility_id, facility);
      else malformed++;
    }
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  if (malformed > 0) {
    log.warn('facilities', 'malformed registry records skipped', { count: malformed });
  }
  return [...byId.values()];
}

/**
 * The reusable matching service: retrieve → filter by category → rank
 * (distance/payout/verification) → top 5. Pure DynamoDB + math.
 */
export async function matchFacilities(
  category: WasteCategory,
  lat: number,
  lng: number,
): Promise<FacilityMatch[]> {
  const facilities = await listFacilities();
  return rankFacilities(facilities, category, { lat, lng });
}
