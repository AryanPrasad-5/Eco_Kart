import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Handler integration tests with the AWS SDK mocked.
 *
 * Key suite: proves the architectural guarantee that /match-facilities NEVER
 * reaches Bedrock — the Bedrock client module is intercepted and any call
 * fails the test, while /classify-and-match does exercise the (mocked)
 * Bedrock path.
 */

const { ddbSend, s3Send, bedrockSend } = vi.hoisted(() => ({
  ddbSend: vi.fn(),
  s3Send: vi.fn(),
  bedrockSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class {
    constructor(public config: unknown) {}
    send = ddbSend;
  },
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: (client: { send: unknown }) => client,
  },
  ScanCommand: class {
    constructor(public input: unknown) {}
  },
  PutCommand: class {
    constructor(public input: unknown) {}
  },
}));

vi.mock('@aws-sdk/client-s3', () => ({
  // Wrap the recording fn in a promise: real S3Client.send ALWAYS returns one,
  // so the fire-and-forget archiveImage must never see undefined.
  S3Client: class {
    send = (...args: unknown[]) => Promise.resolve(s3Send(...args));
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
}));

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class {
    send = bedrockSend;
  },
  ConverseCommand: class {
    constructor(public input: unknown) {}
  },
}));

// env must be set before the config module is imported (ESM hoisting) —
// vi.hoisted blocks run above all imports.
vi.hoisted(() => {
  process.env.TABLE_NAME = 'smartsort-facilities';
  process.env.UPLOADS_BUCKET = 'smartsort-uploads-test';
  process.env.BEDROCK_MODEL_ID = 'amazon.nova-lite-v1:0';
  process.env.BEDROCK_MODEL_ID_FALLBACK = 'global.amazon.nova-lite-v1:0';
  process.env.ALLOWED_ORIGIN = 'http://localhost:5173';
  // Short archival wait cap so the timeout-path test settles in ~50 ms.
  process.env.ARCHIVE_TIMEOUT_MS = '50';
});

import { handler as classifyHandler } from '../src/handlers/classify-and-match';
import { handler as matchHandler } from '../src/handlers/match-facilities';
import { handler as healthHandler } from '../src/handlers/health';
import { handler as facilitiesHandler } from '../src/handlers/facilities';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { asObjectResult, jsonBody } from './helpers';

/** A minimal valid JPEG (SOI + APP0 marker) — passes magic-byte sniffing. */
const JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x02, 0x00, 0x00, 0x01,
]);
const JPEG_B64 = JPEG_BYTES.toString('base64');

function v2Event(body: unknown, method: 'GET' | 'POST' = 'POST'): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: '/',
    rawQueryString: '',
    headers: method === 'POST' ? { 'content-type': 'application/json' } : {},
    requestContext: { requestId: 'req-test-123', http: { method, path: '/', protocol: 'HTTP/1.1', sourceIp: '127.0.0.1' }, stage: '$default' },
    isBase64Encoded: false,
    body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  } as unknown as APIGatewayProxyEventV2;
}

const F001 = {
  facility_id: 'F001',
  name: 'GreenCrate Buyback — MG Road',
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
};

const F014 = {
  facility_id: 'F014',
  name: 'Chetan Kabadiwala',
  lat: 12.988,
  lng: 77.604,
  accepted_categories: ['plastic', 'paper', 'metal', 'glass', 'other'],
  payout_estimate: { plastic: 30, paper: 13, metal: 44, glass: 6, other: 9 },
  payout_basis: 'estimated',
  verified: false,
  address: 'Seshadripuram, Bengaluru',
  contact: '+91-97XXXXXXXX',
  operating_hours: 'Mon–Sun 9:00–21:00',
  source: 'directory-listing-demo',
  updated_at: '2026-09-16',
};

beforeEach(() => {
  ddbSend.mockReset();
  s3Send.mockReset();
  bedrockSend.mockReset();
});

describe('GET /health', () => {
  it('returns 200 { status: "ok" } and reports registry state', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [F001] });
    const res = asObjectResult(await healthHandler(v2Event(undefined, 'GET')));
    expect(res.statusCode).toBe(200);
    const body = jsonBody(res);
    expect(body.status).toBe('ok');
    expect(body.registry).toBe('ok');
  });

  it('stays 200 when the registry errors (pure liveness probe)', async () => {
    ddbSend.mockRejectedValueOnce(new Error('TableNotFound'));
    const res = asObjectResult(await healthHandler(v2Event(undefined, 'GET')));
    expect(res.statusCode).toBe(200);
    expect(jsonBody(res).status).toBe('ok');
  });
});

describe('GET /facilities', () => {
  it('returns the validated registry array', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [F001] });
    const res = asObjectResult(await facilitiesHandler(v2Event(undefined, 'GET')));
    expect(res.statusCode).toBe(200);
    const body = jsonBody(res);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].facility_id).toBe('F001');
  });

  it('maps a DynamoDB failure to 500 without leaking internals', async () => {
    ddbSend.mockRejectedValueOnce(new Error('ProvisionedThroughputExceeded: arn:aws:dynamodb:...secret...'));
    const res = asObjectResult(await facilitiesHandler(v2Event(undefined, 'GET')));
    expect(res.statusCode).toBe(500);
    expect(jsonBody(res).error).toBe('Internal server error.');
    expect(res.body).not.toContain('secret');
  });
});

describe('POST /match-facilities (override path — MUST NOT call Bedrock)', () => {
  it('returns ranked matches without ANY Bedrock invocation', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [F001] });
    const res = asObjectResult(await matchHandler(v2Event({ category: 'plastic', lat: 12.9716, lng: 77.5946 })));

    expect(res.statusCode).toBe(200);
    const body = jsonBody(res);
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0].facility.facility_id).toBe('F001');
    expect(body.userLocation).toEqual({ lat: 12.9716, lng: 77.5946 });

    // THE guarantee: zero Bedrock calls on this path.
    expect(bedrockSend).not.toHaveBeenCalled();
  });

  it('normalizes model-style category spellings (e.g. e_waste → e-waste)', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [] });
    const res = asObjectResult(await matchHandler(v2Event({ category: 'e_waste', lat: 12.9716, lng: 77.5946 })));
    expect(res.statusCode).toBe(200);
  });

  it('rejects invalid categories with 422', async () => {
    const res = asObjectResult(await matchHandler(v2Event({ category: 'batteries', lat: 12.9716, lng: 77.5946 })));
    expect(res.statusCode).toBe(422);
    expect(jsonBody(res).code).toBe('INVALID_CATEGORY');
    expect(bedrockSend).not.toHaveBeenCalled();
  });

  it('rejects invalid coordinates with 400', async () => {
    const res = asObjectResult(await matchHandler(v2Event({ category: 'metal', lat: 999, lng: 77.59 })));
    expect(res.statusCode).toBe(400);
    expect(bedrockSend).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with 400', async () => {
    const res = asObjectResult(await matchHandler(v2Event('{not json')));
    expect(res.statusCode).toBe(400);
  });

  it('returns an empty matches array (not an error) when nothing accepts the category', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [F001] });
    const res = asObjectResult(await matchHandler(v2Event({ category: 'glass', lat: 12.9716, lng: 77.5946 })));
    expect(res.statusCode).toBe(200);
    expect(jsonBody(res).matches).toEqual([]);
  });

  it('follows Scan pagination via LastEvaluatedKey (multi-page registry)', async () => {
    ddbSend
      .mockResolvedValueOnce({ Items: [F001], LastEvaluatedKey: { facility_id: 'F001' } })
      .mockResolvedValueOnce({ Items: [F014] });
    const res = asObjectResult(await matchHandler(v2Event({ category: 'plastic', lat: 12.9716, lng: 77.5946 })));
    expect(res.statusCode).toBe(200);
    expect(ddbSend).toHaveBeenCalledTimes(2);
    const ids = jsonBody(res).matches.map((m: { facility: { facility_id: string } }) => m.facility.facility_id);
    expect(ids).toContain('F001');
    expect(ids).toContain('F014');
  });

  it('skips malformed registry rows instead of crashing the response', async () => {
    ddbSend.mockResolvedValueOnce({ Items: [F001, { facility_id: 'BAD', lat: 999, payout_estimate: 'nope' }] });
    const res = asObjectResult(await matchHandler(v2Event({ category: 'plastic', lat: 12.9716, lng: 77.5946 })));
    expect(res.statusCode).toBe(200);
    const ids = jsonBody(res).matches.map((m: { facility: { facility_id: string } }) => m.facility.facility_id);
    expect(ids).toEqual(['F001']);
  });
});

describe('POST /classify-and-match (AI path)', () => {
  const validBody = { imageBase64: JPEG_B64, lat: 12.9716, lng: 77.5946 };

  function toolUseResponse(category: string, confidence: number) {
    return {
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              toolUse: {
                name: 'report_waste_classification',
                toolUseId: 'tu-1',
                input: { category, confidence, rationale: 'Moulded translucent bottle.' },
              },
            },
          ],
        },
      },
    };
  }

  it('classifies via Bedrock then matches — Bedrock IS called exactly once', async () => {
    bedrockSend.mockResolvedValueOnce(toolUseResponse('plastic', 0.87));
    ddbSend.mockResolvedValueOnce({ Items: [F001] });

    const res = asObjectResult(await classifyHandler(v2Event(validBody)));
    expect(res.statusCode).toBe(200);

    const body = jsonBody(res);
    expect(body.classification).toEqual({
      category: 'plastic',
      confidence: 0.87,
      rationale: 'Moulded translucent bottle.',
    });
    expect(body.matches[0].facility.facility_id).toBe('F001');
    expect(body.userLocation).toEqual({ lat: 12.9716, lng: 77.5946 });

    expect(bedrockSend).toHaveBeenCalledTimes(1);
    // calls[0][0] is the ConverseCommand instance; calls[0][1] is {abortSignal}
    const converseCommand = bedrockSend.mock.calls[0]?.[0];
    expect(JSON.stringify(converseCommand)).toContain('report_waste_classification');
  });

  it('awaits bounded S3 archival with server-built key and content type', async () => {
    bedrockSend.mockResolvedValueOnce(toolUseResponse('paper', 0.8));
    ddbSend.mockResolvedValueOnce({ Items: [] });
    s3Send.mockResolvedValueOnce({});

    const res = asObjectResult(await classifyHandler(v2Event(validBody)));
    expect(res.statusCode).toBe(200);
    expect(s3Send).toHaveBeenCalledTimes(1);

    const command = s3Send.mock.calls[0]?.[0] as {
      input: { Bucket: string; Key: string; ContentType: string; Metadata: Record<string, string> };
    };
    expect(command.input.Bucket).toBe('smartsort-uploads-test');
    expect(command.input.Key).toMatch(/^uploads\/\d{4}-\d{2}-\d{2}\/req-test-123\.jpg$/);
    expect(command.input.ContentType).toBe('image/jpeg');
    expect(command.input.Metadata['request-id']).toBe('req-test-123');
    expect(command.input.Metadata['category']).toBe('paper');
  });

  it('abandons the archival wait (still 200) when the upload exceeds the cap', async () => {
    bedrockSend.mockResolvedValueOnce(toolUseResponse('metal', 0.75));
    ddbSend.mockResolvedValueOnce({ Items: [] });
    s3Send.mockImplementationOnce(() => new Promise(() => undefined)); // never settles

    const res = asObjectResult(await classifyHandler(v2Event(validBody)));
    expect(res.statusCode).toBe(200); // ARCHIVE_TIMEOUT_MS=50 in the test env
    expect(jsonBody(res).classification.category).toBe('metal');
  });

  it('still returns 200 when S3 archival fails', async () => {
    bedrockSend.mockResolvedValueOnce(toolUseResponse('metal', 0.75));
    ddbSend.mockResolvedValueOnce({ Items: [] });
    s3Send.mockRejectedValueOnce(new Error('S3 blew up'));

    const res = asObjectResult(await classifyHandler(v2Event(validBody)));
    expect(res.statusCode).toBe(200);
    expect(jsonBody(res).classification.category).toBe('metal');
  });

  it('maps Bedrock total failure to 503 AI_UNAVAILABLE', async () => {
    bedrockSend.mockRejectedValue(
      Object.assign(new Error('Service is throttled'), { name: 'ThrottlingException' }),
    );
    const res = asObjectResult(await classifyHandler(v2Event(validBody)));
    expect(res.statusCode).toBe(503);
    const body = jsonBody(res);
    expect(body.code).toBe('CLASSIFICATION_UNAVAILABLE');
    expect(bedrockSend.mock.calls.length).toBeGreaterThan(1); // retries happened
  });

  it('retries once when the model emits invalid output, then succeeds', async () => {
    bedrockSend
      .mockResolvedValueOnce({ output: { message: { content: [{ text: 'It is probably plastic' }] } } }) // no toolUse
      .mockResolvedValueOnce(toolUseResponse('glass', 0.9));
    ddbSend.mockResolvedValueOnce({ Items: [] });

    const res = asObjectResult(await classifyHandler(v2Event(validBody)));
    expect(res.statusCode).toBe(200);
    expect(jsonBody(res).classification.category).toBe('glass');
    expect(bedrockSend).toHaveBeenCalledTimes(2);
  });

  it('skips the retry loop to the fallback model on AccessDenied (bad model ID)', async () => {
    bedrockSend
      .mockRejectedValueOnce(Object.assign(new Error('not authorized'), { name: 'AccessDeniedException' }))
      .mockResolvedValueOnce(toolUseResponse('organic', 0.7));
    ddbSend.mockResolvedValueOnce({ Items: [] });

    const res = asObjectResult(await classifyHandler(v2Event(validBody)));
    expect(res.statusCode).toBe(200);
    expect(jsonBody(res).classification.category).toBe('organic');
  });

  // ── request validation ────────────────────────────────────────────────
  it('rejects missing imageBase64 with 400', async () => {
    const res = asObjectResult(await classifyHandler(v2Event({ lat: 12.97, lng: 77.59 })));
    expect(res.statusCode).toBe(400);
  });

  it('rejects malformed base64 with 422', async () => {
    const res = asObjectResult(await classifyHandler(v2Event({ ...validBody, imageBase64: '!!!not-base64!!!' })));
    expect(res.statusCode).toBe(422);
    expect(jsonBody(res).code).toBe('MALFORMED_IMAGE');
  });

  it('rejects non-image bytes with 422 (magic-byte sniffing)', async () => {
    const notImage = Buffer.from('hello, definitely not an image').toString('base64');
    const res = asObjectResult(await classifyHandler(v2Event({ ...validBody, imageBase64: notImage })));
    expect(res.statusCode).toBe(422);
    expect(jsonBody(res).code).toBe('INVALID_IMAGE');
  });

  it('rejects an oversized image with 413', async () => {
    const big = Buffer.alloc(4 * 1024 * 1024 + 1000, 0xff);
    big[0] = 0xff; big[1] = 0xd8; big[2] = 0xff; // make it look like a JPEG
    const res = asObjectResult(await classifyHandler(v2Event({ ...validBody, imageBase64: big.toString('base64') })));
    expect(res.statusCode).toBe(413);
  });

  it('accepts PNG magic bytes too', async () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
    bedrockSend.mockResolvedValueOnce(toolUseResponse('other', 0.5));
    ddbSend.mockResolvedValueOnce({ Items: [] });
    const res = asObjectResult(await classifyHandler(v2Event({ ...validBody, imageBase64: png.toString('base64') })));
    expect(res.statusCode).toBe(200);
  });

  it('decodes an isBase64Encoded body (HTTP API binary passthrough)', async () => {
    bedrockSend.mockResolvedValueOnce(toolUseResponse('plastic', 0.9));
    ddbSend.mockResolvedValueOnce({ Items: [] });
    const event = v2Event(validBody);
    event.isBase64Encoded = true;
    event.body = Buffer.from(JSON.stringify(validBody), 'utf8').toString('base64');
    const res = asObjectResult(await classifyHandler(event));
    expect(res.statusCode).toBe(200);
    expect(jsonBody(res).classification.category).toBe('plastic');
  });

  it('rejects out-of-range coordinates with 400', async () => {
    const res = asObjectResult(await classifyHandler(v2Event({ ...validBody, lng: 9999 })));
    expect(res.statusCode).toBe(400);
  });

  it('rejects a non-object body with 400', async () => {
    const res = asObjectResult(await classifyHandler(v2Event('[1,2,3]')));
    expect(res.statusCode).toBe(400);
  });

  // ── HTTP-level security guards ─────────────────────────────────────────
  it('rejects GET on the POST-only route with 405', async () => {
    const res = asObjectResult(await classifyHandler(v2Event(undefined, 'GET')));
    expect(res.statusCode).toBe(405);
    expect(bedrockSend).not.toHaveBeenCalled();
  });

  it('rejects requests without application/json Content-Type (415)', async () => {
    const event = v2Event(validBody);
    event.headers = {}; // strip content-type
    const res = asObjectResult(await classifyHandler(event));
    expect(res.statusCode).toBe(415);
    expect(jsonBody(res).code).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(bedrockSend).not.toHaveBeenCalled();
  });

  it('echoes ONLY the configured origin in CORS headers', async () => {
    bedrockSend.mockResolvedValueOnce(toolUseResponse('plastic', 0.8));
    ddbSend.mockResolvedValueOnce({ Items: [] });
    const res = asObjectResult(await classifyHandler(v2Event(validBody)));
    expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });
});
