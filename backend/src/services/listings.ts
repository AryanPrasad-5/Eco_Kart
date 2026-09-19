/**
 * Listings persistence (Phase 4) — DynamoDB single-purpose table.
 *
 * Table: PK listingId; GSI1 ownerId + createdAt (owner-scoped queries).
 * The facilities table is never touched by this service.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../shared/config';
import { ConfigurationError } from '../shared/errors';
import { log } from '../shared/observability';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

export interface ListingRecord {
  listingId: string;
  ownerId: string;
  material: string;
  subtype: string;
  quantityTonnes: number;
  quality: string;
  pricePerKg: number;
  city: string;
  locality: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  pickupFrom: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function table(): string {
  const name = config.listingsTableName;
  if (!name) {
    throw new ConfigurationError('LISTINGS_TABLE_NAME is not set — Lambda environment is misconfigured.');
  }
  return name;
}

export async function putListing(record: ListingRecord): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: table(),
      Item: record,
      ConditionExpression: 'attribute_not_exists(listingId)',
    }),
  );
  log.info('listings', 'listing created', { listingId: record.listingId, ownerId: record.ownerId, material: record.material });
}

export async function getListing(listingId: string): Promise<ListingRecord | null> {
  const res = await ddb.send(new GetCommand({ TableName: table(), Key: { listingId } }));
  return (res.Item as ListingRecord | undefined) ?? null;
}

export async function listingsByOwner(ownerId: string, limit = 50): Promise<ListingRecord[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: table(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'ownerId = :o',
      ExpressionAttributeValues: { ':o': ownerId },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (res.Items as ListingRecord[] | undefined) ?? [];
}
