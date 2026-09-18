# SmartSort ♻️

AI-Powered Waste Classification & Recycling Facility Locator.

SmartSort helps individuals and organizations correctly categorize waste items and locate nearby verified drop-off and recycling centers with minimal friction. Built with a React + TypeScript frontend and a serverless AWS backend powered by Amazon Bedrock (Nova Lite), DynamoDB, and API Gateway.

---

## 🌟 Key Features

- **AI Waste Classification**: Snaps or uploads waste photos, classified in real time using Amazon Bedrock multimodal models (Nova Lite with automatic multi-model fallback).
- **Recycling Facility Locator**: Computes nearest disposal points using Haversine distance and ranks by category suitability, verified status, and proximity.
- **Interactive Map**: Built with MapLibre GL for smooth, responsive geospatial exploration of nearby recycling centers.
- **Offline & Mock Resilient**: Seamlessly falls back to mock classification and cached facilities if offline or in local demo mode.
- **Serverless AWS Backend**: Production-ready AWS SAM template, AWS Lambda (Node.js 20 & TypeScript), DynamoDB single-table design, and private S3 audit archiving.

---

## 🏗️ Architecture

```
[ Frontend: React + Vite + TypeScript + MapLibre GL ]
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
├── src/                # Frontend React application
│   ├── api/            # API client (Axios/Fetch with retry & mock fallback)
│   ├── components/     # UI components (Landing, Capture, Results, MapView, etc.)
│   ├── lib/            # Utilities (compression, geolocation, haversine, rank)
│   └── mock/           # Mock classification & facility datasets
├── tests/              # Frontend unit and component tests (Vitest)
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
npm run dev

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
