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

Status: **production-quality MVP code** — validated via 71 backend + 18 frontend
automated tests (all green, re-run 2026-09-16), strict TypeScript, 0
production-dependency vulnerabilities (both projects, `npm audit --omit=dev`
2026-09-16). AWS-side checks (`sam validate`, `sam build`, live deploy) require
SAM tooling — see §9 for the honest boundary of what has been verified where.

## 0. Bedrock model IDs in ap-south-1 (VERIFIED 2026-09-16)

**Live check result (ap-south-1, 2026-09-16):** every Amazon Nova model in this
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
stack replaces the table/bucket (re-seed afterwards — verified 2026-09-16: no
prior deployment exists in ap-south-1 to migrate).

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

### Live verification record (2026-09-16, Issue 5)

- `/health` → 200 `{status:ok, registry:ok}` (~136 ms median, warm).
- `/facilities` → 200, 14 facilities, contract shape exact, leak scan clean.
- `/match-facilities` → 200 (~188 ms median client-side; 18–71 ms Lambda-side
  per structured logs). All 7 categories: returned order, distances and scores
  equal an INDEPENDENT recomputation (Haversine + 0.6/0.3/0.1) to 1e-6;
  determinism proven (identical repeat calls); only category-accepting
  facilities returned; `userLocation` echoed.
- Validation battery: 422 invalid/missing category · 400 missing/out-of-range/
  string coords · 400 malformed JSON · 400 empty body · 415 missing
  Content-Type. Unsupported methods (GET/DELETE on POST route) → gateway 404 —
  routes exist only for their defined methods, so the Lambda-level 405 guard is
  defense-in-depth only. `PLASTIC` / `  plastic  ` normalize to canonical.
- IAM (read from live roles): match/facilities/health roles = single scoped
  `dynamodb:Scan`; classify = 4 scoped Bedrock ARNs + Scan + S3 `uploads/*`.
  No wildcards. CORS: preflight echoes allowed origin only; unknown origins
  get no ACAO header.
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
cd backend && npm run check     # tsc --noEmit + 71 vitest tests (all green 2026-09-16)
```

Suites: handlers (incl. **"/match-facilities never calls Bedrock"** with the Bedrock
client fully intercepted, 405/415 Content-Type guards, CORS echo, bounded-await
archival incl. timeout/abandon path, `isBase64Encoded` decoding, Scan pagination,
malformed-row skipping), classify hardening (permanent-vs-transient retry,
deadline, injection-guard prompt), facility validation (NaN/negative payouts,
bad coords, malformed rows skipped), ranking parity + deterministic tie-break,
Haversine parity, verdict runtime validation. Frontend: 18 tests, production
build clean.

## 9. What has / has NOT been verified from this machine

- ✅ Verified live against AWS (ap-south-1, 2026-09-16, read-only API calls):
  Nova model/inference-profile availability — source of §0's verified defaults;
  no pre-existing CloudFormation stacks or DynamoDB tables (first deploy is clean).
- ✅ Verified here (2026-09-16): backend `tsc --noEmit` clean; backend vitest
  71/71 (6 files, ~3 s); frontend vitest 18/18 (4 files, ~2.3 s); root
  `tsc --noEmit` clean; `npm audit --omit=dev` = 0 vulnerabilities (both
  projects); CloudFormation reviewed line-by-line.
- ✅ SAM CLI 1.166.2 installed (2026-09-16, winget/MSI) and BOTH checks executed
  for real: `sam validate` → PASS; `sam build` → PASS (4 handler bundles in
  `.aws-sam/build/`, `@aws-sdk/*` external, all four export `handler`).
  Fixes the tooling surfaced in template.yaml: added the missing `Resources:`
  wrapper, removed the unsupported `OutDir: dist` esbuild property, corrected
  `Handler:` paths to entry-point basenames (SAM rewrites them at build time).
  Build procedure: `cd backend && npm install`, then run SAM's builder with
  esbuild on PATH:
  `PATH="$(pwd)/node_modules/.bin:$PATH" sam build`
  (esbuild is a devDependency; SAM's Python builder resolves it via PATH).
- ✅ DEPLOYED (2026-09-16): dev stack `smartsort-backend-dev` in ap-south-1 is
  CREATE_COMPLETE with API/Lambda/DynamoDB/S3/IAM/log-groups/budget verified
  live; `/health` answers 200 (registry empty until seeding). Deploy-time early
  validation exposed 2 more template bugs (Budget notifications outside
  `Properties`; invalid `ApplicationLogGroupArn` on all 4 functions — correct
  SAM key is `LogGroup`), both fixed. API base: see stack output `ApiBaseUrl`.
- ✅ SEEDED + MATCHED (2026-09-16, Issue 4): dev table seeded with the 14
  facilities (read back from DynamoDB and schema-validated); live
  `GET /facilities` returns all 14 with the exact contract shape; live
  `POST /match-facilities` ranking independently recomputed from the returned
  registry and matched to 1e-6 (order, scores, Haversine distances); rejections
  verified live (422 invalid category · 400 coords/body · 415 Content-Type);
  CloudWatch shows 0 classify-and-match invocations while 8 match-facilities
  invocations ran — the AI-free override path is proven end-to-end.
- ⛔ FIRST BEDROCK INVOCATION ATTEMPT (2026-09-16, Issue 6): one real
  POST /classify-and-match with a 3.8 KB synthetic bottle PNG → 503
  CLASSIFICATION_UNAVAILABLE in 389 ms. Logs show AccessDeniedException on
  BOTH models (primary apac.amazon.nova-lite-v1:0, then fallback
  global.amazon.nova-2-lite-v1:0) — account-level model access is not yet
  enabled (the AWS CLI catalog lists the models ACTIVE; entitlement is a
  separate console switch). POSITIVE VERIFICATIONS from this attempt: the
  hardened error path behaved exactly as designed (permanent-error → no
  retry → immediate fallback → clean typed 503, no stack traces/secrets,
  request-ID correlation intact), and image validation accepted a real PNG.
  PENDING MANUAL STEP: enable model access (see runbook §0), then re-run
  the single invocation.
- ⛔ Still NOT verified: a successful real Bedrock invocation (blocked by the
  account entitlement — now bypassed via Rekognition; recover when AWS fixes
  access by redeploying with `ClassifierProvider=bedrock`).
- ✅ REKOGNITION LIVE END-TO-END (2026-09-19): deployed with
  `ClassifierProvider=rekognition`; ONE real request
  POST /classify-and-match with a real 294 KB JPEG → HTTP 200 in one shot:
  real DetectLabels (10 labels, 495 ms), honest `other` @ 0.5 (photo was not
  waste — real photo, not a synthetic fixture), 3 ranked matches from the
  real DynamoDB registry, image archived to
  `uploads/2026-09-19/D70bygOxhcwEPVQ=.jpg` (AES256, private bucket) — the
  first successful AI + archival path in project history. CloudWatch:
  ClassificationSuccess{Model=rekognition-detect-labels} + MatchSuccess +
  ArchiveSuccess, requestId correlation, no base64/secrets/stack traces.
  IAM verified live: classify role = DetectLabels (Resource "*",
  service-mandated) + untouched scoped Bedrock/DynamoDB/S3 statements.
  Tests 96/96 (81 prior + 15 Rekognition); match harness re-passed live.

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
