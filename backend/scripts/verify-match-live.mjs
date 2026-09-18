#!/usr/bin/env node
/**
 * Issue #5 live verification harness — pure READ-ONLY API consumer.
 *
 * Proves, against the DEPLOYED stack (no mocks, no AWS SDK, no credentials):
 *   1. every category matches only facilities that accept it
 *   2. Haversine distances + the finalized 0.6/0.3/0.1 ranking, recomputed
 *      HERE from GET /facilities data, equal the API's returned values
 *   3. ranking is deterministic (repeated calls are byte-identical)
 *   4. response shape is the frontend contract (userLocation echo, no leaks)
 *
 * Usage:
 *   node scripts/verify-match-live.mjs [apiBaseUrl]      # default: dev stack
 *
 * Exit code 0 = all checks passed; 1 = any failure (details printed).
 */

const API = (process.argv[2] ?? 'https://zwy8mv3ihh.execute-api.ap-south-1.amazonaws.com').replace(/\/$/, '');
const USER = { lat: 12.9716, lng: 77.5946 }; // Bengaluru demo coordinate
const CATEGORIES = ['plastic', 'paper', 'metal', 'glass', 'e-waste', 'organic', 'other'];
const WEIGHTS = { distance: 0.6, payout: 0.3, verification: 0.1 };
const MAX_DISTANCE_KM = 5;

let failures = 0;
const check = (name, pass, detail = '') => {
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!pass) failures++;
};

const toRad = (d) => (d * Math.PI) / 180;
/** Independent Haversine (km) — same formula/earth radius as the repository. */
function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

/** Independent ranking re-implementation from the spec/README formulas. */
function rankIndependently(facilities, category, user) {
  const eligible = facilities.filter((f) => f.accepted_categories.includes(category));
  const maxPayout = Math.max(1, ...eligible.map((f) => f.payout_estimate[category] ?? 0));
  return eligible
    .map((f) => {
      const distance_km = haversineKm(user, { lat: f.lat, lng: f.lng });
      const score =
        WEIGHTS.distance * Math.max(0, 1 - distance_km / MAX_DISTANCE_KM) +
        WEIGHTS.payout * ((f.payout_estimate[category] ?? 0) / maxPayout) +
        WEIGHTS.verification * (f.verified ? 1 : 0);
      return { id: f.facility_id, distance_km, score, beyondRadius: distance_km > MAX_DISTANCE_KM };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.distance_km - b.distance_km ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 5);
}

const post = (body) =>
  fetch(`${API}/match-facilities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

console.log(`Live verification harness → ${API}`);

// Source of truth for independent recomputation: the registry the API serves.
const facRes = await fetch(`${API}/facilities`);
if (!facRes.ok) {
  console.error(`GET /facilities failed: ${facRes.status}`);
  process.exit(1);
}
const facilities = await facRes.json();
console.log(`Registry: ${facilities.length} facilities from GET /facilities\n`);

for (const category of CATEGORIES) {
  const res = await post({ category, ...USER });
  if (!res.ok) {
    check(`${category}: HTTP 200`, false, `got ${res.status}`);
    continue;
  }
  const body = await res.json();
  const matches = body.matches ?? [];

  const allAccept = matches.every((m) => m.facility.accepted_categories.includes(category));
  const sorted = matches.every(
    (m, i) => i === 0 || matches[i - 1].score >= m.score,
  );
  const echoOk =
    JSON.stringify(body.userLocation) === JSON.stringify(USER);
  const noLeak = matches.every(
    (m) => !('pk' in m.facility) && !('sk' in m.facility) && !('score' in m.facility),
  );

  const mine = rankIndependently(facilities, category, USER);
  const orderOk = matches.map((m) => m.facility.facility_id).join(',') === mine.map((m) => m.id).join(',');
  const valuesOk =
    matches.length === mine.length &&
    matches.every((m, i) =>
      Math.abs(m.score - mine[i].score) < 1e-6 && Math.abs(m.distance_km - mine[i].distance_km) < 1e-4,
    );

  check(
    category,
    allAccept && sorted && echoOk && noLeak && orderOk && valuesOk,
    `${matches.length} matches · order+scores independently verified: ${orderOk && valuesOk}`,
  );
}

// Determinism: two identical calls must return identical ranked output.
const [d1, d2] = await Promise.all([
  post({ category: 'metal', ...USER }).then((r) => r.json()),
  post({ category: 'metal', ...USER }).then((r) => r.json()),
]);
const sig = (b) => JSON.stringify((b.matches ?? []).map((m) => [m.facility.facility_id, m.distance_km, m.score]));
check('determinism (metal ×2 identical)', sig(d1) === sig(d2));

// Edge: uppercase + whitespace normalization.
for (const [label, raw] of [['uppercase "PLASTIC"', 'PLASTIC'], ['whitespace "  plastic  "', '  plastic  ']]) {
  const res = await post({ category: raw, ...USER });
  const body = res.ok ? await res.json() : { matches: [] };
  const canonical = await post({ category: 'plastic', ...USER }).then((r) => r.json());
  check(
    `normalization: ${label}`,
    res.status === 200 && sig(body) === sig(canonical),
    `identical to canonical plastic: ${sig(body) === sig(canonical)}`,
  );
}

// Edge: location far from all facilities — 200, ranked, all beyond 5 km.
const far = { lat: 28.6139, lng: 77.209 }; // Delhi
const farRes = await post({ category: 'plastic', ...far });
const farBody = farRes.ok ? await farRes.json() : { matches: [] };
check(
  'far location (Delhi)',
  farRes.status === 200 && (farBody.matches ?? []).length > 0 && (farBody.matches ?? []).every((m) => m.beyondRadius === true),
  `${(farBody.matches ?? []).length} matches, all beyondRadius`,
);

console.log(failures === 0 ? '\nALL LIVE MATCH CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
