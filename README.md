# WasteX

**Waste isn't waste. It's inventory.**

WasteX is a B2B waste-trading marketplace: businesses and residential communities list recyclable materials — plastic, paper, cardboard, metal, glass, e-waste — and verified recyclers discover them, place offers, and arrange pickup through a transparent, price-indexed exchange. The financial infrastructure for the circular economy.

WasteX is the evolution of the SmartSort hackathon MVP: the AI waste-classification core (Amazon Rekognition via a swappable API layer) lives on as the **AI material-tagging assist** in the listing flow, and the verified facility registry survives as the **verified-recycler roster**.

## Live backend configuration

Copy `.env.local` (gitignored) with:

```
VITE_API_BASE_URL=https://zwy8mv3ihh.execute-api.ap-south-1.amazonaws.com
VITE_MAP_STYLE=https://maps.geo.ap-south-1.amazonaws.com/maps/v0/maps/ecokart-map
VITE_MAP_API_KEY=<Amazon Location API key>
```

Production builds **require** this variable: `getApi()` throws a configuration
error if it is missing in a production build — the live app can never silently
fall back to mock data. `mockApi` remains available for unit tests and offline
development only.

### Live map (Amazon Location)

MapView renders real Amazon Location tiles via MapLibre when `VITE_MAP_STYLE`
and `VITE_MAP_API_KEY` are set; without them (or on tile failure) it falls back
to the schematic map. The key is a public API key restricted to `geo:GetMap*`
on the `ecokart-map` resource with referrer allow-listing (localhost for dev;
add the production domain before Amplify deploy) — the frontend-only, keyless-
credential pattern AWS documents for MapLibre. Verified live: style descriptor,
sprites, and tiles all return 200 with the referrer-restricted key, andthe app's referrer-restriction denial behaves correctly (403 without Referer).

### Production deployment (AWS Amplify)

The frontend is live at **https://main.dpp2josj8mc9h.amplifyapp.com** (Amplify
app `ecokart`, id `dpp2josj8mc9h`, region ap-south-1, branch `main`, zip
deployment). The build receives three Vite env vars — `VITE_API_BASE_URL`,
`VITE_MAP_STYLE`, `VITE_MAP_API_KEY` (build-time; no AWS credentials in
Amplify) — so the deployed bundle targets the real API Gateway and Amazon
Location. The map key's referrer allow-list includes the Amplify domain.
`amplify.yml` defines the GitHub-connected build (`nvm use 20` → `npm ci` →
`npm run build` → `dist`); hash routing needs no SPA rewrites. Backend CORS
still allows localhost only — the Amplify origin is added in the next issue.

Frontend: React 18 + Vite + TypeScript + Tailwind CSS v4 + Framer Motion + Recharts + react-three-fiber. Backend: serverless AWS — API Gateway, Lambda, Bedrock, DynamoDB, S3 (see [`backend/README.md`](backend/README.md)).

---

## 🌟 Key Features

- **Marketplace**: Search, multi-facet filters (material, location, price, quantity, quality, pickup date), sorting, and financial-instrument listing cards with live estimated values.
- **Listing details**: Lot specs, seller verification, competing offers, transaction history, pickup-zone map, and a binding Make-an-Offer flow with escrow settlement terms.
- **Create listing wizard**: Six steps — material, quantity & quality, indexed pricing, pickup, photos, review — with AI material tagging from a photo and drag-and-drop uploads.
- **Dual dashboards**: Generator (revenue, volumes, material mix, pickups) and Recycler (spend, active bids, demand index, matched lots) experiences.
- **Transaction tracking**: Six-stage settlement timeline — listing → offer → acceptance → pickup → collection → payment — with escrow and weight-slip reconciliation.
- **Quantified impact**: Tonnes diverted, CO₂e avoided, economic value created, and recovery rate — measured like business metrics.
- **AI material tagging**: Photo → material classification with confidence signal (Bedrock Nova Lite, automatic multi-model fallback), degrading gracefully to manual selection.
- **3D Landing Hero**: A react-three-fiber "materials exchange" sculpture — lazy-loaded so three.js never touches the critical path, skipped on WebGL-less devices and reduced-motion.
- **Offline & mock resilient**: Seamlessly falls back to mock market data when offline or in local demo mode.
- **Serverless AWS Backend**: Production-ready AWS SAM template, AWS Lambda (Node.js 20 & TypeScript), DynamoDB single-table design, and private S3 audit archiving.

---

## 🏗️ Architecture

```
[ Frontend: React + Vite + TS + Tailwind v4 + R3F + Recharts ]
                         │
                         ▼ (REST / JSON)
[ Amazon API Gateway HTTP API ]
        │
        ├──▶ [ AWS Lambda Handlers (TypeScript) ]
        │            │
        │            ├──▶ [ Amazon Bedrock (Nova Lite Converse API) ]
        │            ├──▶ [ Amazon DynamoDB (Facilities Table) ]
        │            └──▶ [ Amazon S3 (Audit Archiving) ]
```

---

## 📂 Repository Structure

```
.
├── src/                # WasteX frontend (React application)
│   ├── api/            # Swappable API client (mock fallback + real backend)
│   ├── components/     # UI kit (ui/), landing sections (landing/), marketplace, maps, 3D hero
│   ├── layouts/        # DashboardLayout (sidebar shell for app pages)
│   ├── pages/          # Landing, Marketplace, ListingDetails, CreateListing, dashboards, …
│   ├── data/           # Sample market data (listings, offers, transactions, pickups)
│   ├── hooks/          # Hash router, count-up, toasts
│   ├── lib/            # Formatting, compression, haversine, rank
│   └── mock/           # Classification engine & verified-recycler registry
├── tests/              # Frontend unit tests (Vitest)
├── backend/            # AWS SAM serverless backend
│   ├── src/            # Lambda handlers & services (classify, facilities, health)
│   ├── seed/           # DynamoDB seed data scripts & facility coordinates
│   ├── tests/          # Backend unit & integration test suites
│   ├── template.yaml   # AWS SAM Infrastructure as Code (IaC)
│   └── samconfig.toml  # SAM deployment configuration
├── docs/               # Architecture reports and evolution documentation
├── .env.example        # Environment variable template
└── package.json        # Frontend dependencies & scripts
```

---

## 🚀 Quick Start

### 1. Frontend Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev        # http://localhost:5173 — landing at #/, marketplace at #/marketplace

# Run tests
npm test

# Build for production
npm run build
```

### 2. Backend Setup & Testing

For full backend details, architecture decisions, and SAM deployment instructions, see the [`backend/README.md`](backend/README.md).

```bash
cd backend
npm install
npm test
```

---

## 🧪 Testing

Both frontend and backend are thoroughly covered by automated Vitest test suites:

- **Backend**: Handlers, validation, haversine calculations, ranking algorithms, and Bedrock fallback resilience.
- **Frontend**: Component interactions, image compression, coordinate conversions, and ranking logic.

---

## 📄 License

This project is licensed under the terms of the [MIT License](LICENSE).
