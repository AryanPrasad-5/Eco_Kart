# SmartSort Backend — production-hardened

API Gateway HTTP API → Lambda (Node 20/TypeScript, esbuild via SAM) →
**Amazon Rekognition (primary) / Amazon Bedrock Nova Lite (recovery path)** +
**DynamoDB** + private **S3** archive.

## 0a. Classification provider (ACTIVE: Rekognition)

Bedrock is blocked at the ACCOUNT level in ap-south-1 (ValidationException
"Operation not allowed" on both Nova profiles — reproduced via Lambda and a
direct root-principal probe; see §9). The active provider is therefore
**Amazon Rekognition DetectLabels** via `rekognition:DetectLabels` (no
account entitlement switch needed):

- **Seam**: handlers import `services/classifier.ts`, which dispatches on
  `CLASSIFIER_PROVIDER` (`rekognition` deployed via template; code default
  `bedrock` so existing tests need no env). `services/classify.ts` (Bedrock)
  is untouched and recovers by redeploying with
  `--parameter-overrides ClassifierProvider=bedrock` — zero code changes.
- **Honesty boundary**: Rekognition is a GENERIC label detector ("Bottle",
  "Plastic", "Mobile Phone"), NOT a waste classifier. A deterministic
  two-tier mapper (`services/rekognition.ts`) converts labels into the
  7-category contract: Tier 1 materials (Plastic, Glass, Metal, Aluminum,
  Tin Can, Paper, Cardboard, Newspaper, Food, Fruit, Vegetable, Plant,
  Flower, Electronics) beat Tier 2 objects (Bottle, Plastic Bag, Can, Book,
  Mobile Phone, Laptop, Computer, Keyboard, Computer Mouse, Television,
  Monitor). Highest-confidence match in the winning tier; exact ties break by
  fixed priority (plastic, paper, metal, glass, e-waste, organic). No match →
  `other`.
- **Confidence is REAL, never invented**: the winning Rekognition label's
  actual Confidence / 100 (AWS-calibrated CV signal). Unmapped detections →
  `other`, capped at 0.5. `rationale` is a deterministic template citing the
  winning label — no LLM text, no chain-of-thought.
- **IAM**: `rekognition:DetectLabels` on `Resource: "*"` — DetectLabels is a
  data-plane API taking image bytes inline and supports NO resource-level
  permissions (AWS service authorization reference); this is service-mandated
  scoping, on the classify role only. Bedrock IAM statement retained untouched
  for rollback.
- Tests: `tests/rekognition-classifier.test.ts` (SDK fully mocked; no live AWS
  in CI). Zero mock data in the live path.

Status: **production-quality MVP code** — validated via the backend and frontend
automated test suites, strict TypeScript, and clean production-dependency
audits (`npm audit --omit=dev`). AWS-side checks (`sam validate`, `sam build`,
live deploy) require SAM tooling — see §9.

## 0. Bedrock model IDs in ap-south-1

**Region behavior (ap-south-1):** every Amazon Nova model in this
account/region is `INFERENCE_PROFILE`-only (`inferenceTypesSupported`), so the
plain foundation-model ID `amazon.nova-lite-v1:0` CANNOT be invoked directly —
and the old fallback `global.amazon.nova-lite-v1:0` is not in this account's
profile list at all. Deploying with those IDs would make every classify call
503.

The template defaults are therefore **verified-working profiles**:

| Role | ID | Evidence |
|---|---|---|
| Primary | `apac.amazon.nova-lite-v1:0` | ACTIVE; routes across 6 APAC source regions incl. ap-south-1; TEXT+IMAGE |
| Fallback | `global.amazon.nova-2-lite-v1:0` | ACTIVE; newer model generation for genuine diversity; TEXT+IMAGE |

The IAM policy grants BOTH the profile ARN (local region/account) and the
underlying foundation-model ARN across regions (profile invocation requires
both). Re-verify when changing region or models:

```bash
aws bedrock list-foundation-models --region ap-south-1 \
  --query "modelSummaries[?contains(modelId,'nova')].[modelId,inferenceTypesSupported]" --output table
aws bedrock list-inference-profiles --region ap-south-1 \
  --query "inferenceProfileSummaries[*].inferenceProfileId" --output table
```

If you override the model parameters, update the matching foundation-model
ARNs in the ClassifyAndMatchFunction policy too.

## 1. Deployment safety (dev → test → prod)

| Stage | Stack name | AllowedOrigin | Budget alarm |
|---|---|---|---|
| dev | `smartsort-backend-dev` | `http://localhost:5173` (samconfig default) | required — always created |
| prod | `smartsort-backend` | `https://<amplify-domain>` | required — always created |

`AlarmEmail` is a **required template parameter** (no default): the first
`sam deploy` aborts with `Missing parameter: AlarmEmail` until you add a real
address to samconfig or pass `--parameter-overrides AlarmEmail=...`. This is
the deliberate cost fail-closed control — the $25/80% budget alarm always
exists.

Stack names are now load-bearing: the DynamoDB table and S3 bucket are
stack-qualified (`${StackName}-facilities`, `smartsort-uploads-${StackName}-...`),
so dev + prod can coexist in one account/region. Constraints: stack names must
be **lowercase** (S3) and **≤19 chars** (63-char bucket limit). Renaming a
stack replaces the table/bucket (re-seed afterwards).

```bash
# DEV — samconfig carries AllowedOrigin=localhost; add AlarmEmail once
sam build && sam deploy --guided            # stack: smartsort-backend-dev

# PROD — never reuse dev values
sam deploy --config-env prod --stack-name smartsort-backend \
  --parameter-overrides AllowedOrigin=https://<amplify-domain> AlarmEmail=<email>
```

**The wildcard CORS default is a template-only fallback.** The samconfig
default deploy path pins `http://localhost:5173`; `*` is reachable only by
explicit override — production must set the Amplify domain. Secrets never
live in Git: the stack needs none (Lambda env = names/IDs only; no keys).

## 2. Seed the registry

```bash
node seed/seed.mjs                                          # dev default table: smartsort-backend-dev-facilities
node seed/seed.mjs --table <stack-name>-facilities          # non-default stack (or use the TableName stack output)
node seed/seed.mjs --clear                                  # delete ONLY the 14 seed IDs — never unrelated rows
curl "$API/facilities" | jq length                          # verify: 14
```

Idempotent: `facility_id` is the hash key and writes are upserts, so running
the seed twice never duplicates rows or changes the ID set. EVERY record is
validated against the runtime's facility contract (mirror of `parseFacility`)
BEFORE any write — one bad record aborts the seed with nothing written. Writes
use BatchWriteItem (25/chunk) with bounded unprocessed-item retry. Credentials
 come from the ambient AWS chain: seeding is a developer-side operation, and
the runtime Lambda roles intentionally hold NO write permissions.

## 3. Smoke tests

```bash
curl "$API/health"                                                          # status ok + registry state
curl -X POST "$API/match-facilities" -H 'Content-Type: application/json' \
  -d '{"category":"metal","lat":12.9716,"lng":77.5946}'                     # NO Bedrock involved
curl -X POST "$API/classify-and-match" -H 'Content-Type: application/json' \
  -d "{\"imageBase64\":\"$(base64 -w0 test.jpg)\",\"lat\":12.9716,\"lng\":77.5946}"

# Full read-only live verification (all categories, independent 0.6/0.3/0.1
# ranking recomputation, determinism, normalization, far-location edge cases):
node scripts/verify-match-live.mjs "$API"
```

## 4. Error contract (stable for the frontend)

Flat `{ "error": string, "code": string }`; codes are stable identifiers:

| Code | HTTP | Meaning |
|---|---|---|
| `BAD_REQUEST` / field errors | 400 | malformed body/coords (method errors: 405 `METHOD_NOT_ALLOWED`) |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | missing/wrong Content-Type on POST routes |
| `PAYLOAD_TOO_LARGE` | 413 | image > 4 MB decoded |
| `INVALID_CATEGORY` / `INVALID_IMAGE` / `MALFORMED_IMAGE` | 422 | semantic validation |
| `CLASSIFICATION_UNAVAILABLE` | 503 | Bedrock exhausted (retry+fallback) → UI manual grid |
| `CONFIGURATION_ERROR` / `INTERNAL_ERROR` | 500 | logged with full detail; clients get nothing raw |

## 5. Observability

- **Structured JSON logs** (`LogFormat: JSON`, 14-day retention, pre-created groups):
  every line carries `requestId` + `route` + latency; every request logs outcome,
  match count, category, image bytes. Never logged: image data, credentials.
- **CloudWatch EMF metrics** (namespace `SmartSort`): `ClassificationSuccess/
  Failure/FallbackUsed` (by model/reason — a clean AI-health signal: client
  validation errors emit `RequestRejected` instead), `MatchSuccess/
  MatchEmptyResult` (by route/category), `ArchiveSuccess/Failure/Timeout`.
- **API access logs** with latency + per-route detailed metrics; X-Ray tracing active.
- Answerable from logs/metrics alone: what happened, when, which endpoint, how long,
  did Bedrock/DynamoDB/S3 fail, final outcome.

## 6. Cost protection

- `POST /classify-and-match` has its OWN throttle (2 rps / burst 5 vs 10/20 default)
  — free routes can never inflate Bedrock spend, and sustained scripted abuse of
  the AI route is capped at ~173k invocations/day worst case (down from ~432k).
  Excess traffic gets 429 → the frontend shows "service is busy" and the manual
  category grid, so the demo journey continues.
- Retry chain bounded: ≤3 primary + ≤2 fallback attempts, ≤8 s per attempt,
  26 s hard wall-clock deadline (gateway ceiling 29 s), jittered exponential backoff.
- S3 archival is a **bounded wait** (≤2 s, `ARCHIVE_TIMEOUT_MS`) — never blocks
  longer, never fails the response; timed-out uploads are counted (`ArchiveTimeout`).
- Image ceiling 4 MB decoded / 4 MB base64 pre-check; S3 30-day expiry; PITR free tier;
  logs 14-day retention; DynamoDB PAY_PER_REQUEST on a 14-record table.
- `AWS::Budgets::Budget` ($25/month, 80% alert) is **always created** — `AlarmEmail`
  is a required parameter, so the alarm can never be silently skipped. No cost
  figure is claimed without measurement.

## 7. Data & privacy decisions (documented)

- **S3 retention 30 days** (lifecycle) — images may contain incidental personal
  info; archival exists for post-hackathon model-evaluation only. Bucket is fully
  private (all four public-access blocks), AES256, BucketOwnerEnforced, write-only
  IAM (`s3:PutObject` on `uploads/*`), no user-controlled key segments.
  Archival is a bounded wait (≤2 s): failures and timeouts are logged + metered
  and never affect the response; an upload slower than the cap is abandoned.
- **DynamoDB**: PITR ON. **Deletion protection deliberately OFF** — the table holds
  14 re-seedable demo records and the stack is disposable by design.
- **Idempotency**: analyzed, NOT implemented. Duplicate risk is bounded by the UI
  busy-state, per-route throttling and the fact that both endpoints are effectively
  read-only + one S3 PUT keyed by requestId. A real idempotency store (or
  request-hashing) is deferred until duplicate charges are measurable.
- **Ranking tie-breaker** (deterministic, mirrored in frontend): equal scores →
  shorter distance → ascending `facility_id`.

## 8. Tests

```bash
cd backend && npm run check     # tsc --noEmit + vitest suites
```

Suites: handlers (incl. **"/match-facilities never calls Bedrock"** with the Bedrock
client fully intercepted, 405/415 Content-Type guards, CORS echo, bounded-await
archival incl. timeout/abandon path, `isBase64Encoded` decoding, Scan pagination,
malformed-row skipping), classify hardening (permanent-vs-transient retry,
deadline, injection-guard prompt), facility validation (NaN/negative payouts,
bad coords, malformed rows skipped), ranking parity + deterministic tie-break,
Haversine parity, verdict runtime validation. Frontend: 18 tests, production
build clean.

## 9. Verification record

The live verification log was removed when the development stack was
decommissioned. After any redeploy, re-run sam validate, sam build, the
test suites, and read-only endpoint checks before trusting the stack.

## 10. Environment variables

| Backend (Lambda, set by template) | Frontend (Vite `.env.local`) |
|---|---|
| `BEDROCK_MODEL_ID` / `_FALLBACK`, `TABLE_NAME`, `UPLOADS_BUCKET`, `ALLOWED_ORIGIN`, `CLASSIFY_TIMEOUT_MS`, `ARCHIVE_TIMEOUT_MS`, `ARCHIVE_IMAGES` | `VITE_API_BASE_URL`, `VITE_MAP_STYLE`, `VITE_MAP_API_KEY`, `VITE_DEMO_LAT/LNG` — public config only; **never** backend secrets |

## 11. Demo-day runbook

1. `curl $API/health` → `"status":"ok"` and `registry":"ok"`.
2. Scan → confirm → results (real Bedrock path).
3. Override chip → instant results (AI-free path).
4. Bedrock down? The app shows the manual-category grid — demo continues.
5. Watch `SmartSort` namespace metrics (or `/smartsort/lambda/*` log groups) live.
