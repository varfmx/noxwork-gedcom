# noxwork-gedcom

> A high-performance GEDCOM processing platform for parsing, analyzing, and visualizing complex family trees — built by **Fernando Valderrábano Reyes** at **Noxwork Labs**.


---

## Monorepo Structure

```text
noxwork-gedcom/
├── noxwork-gedcom-api/      # Backend — NestJS REST API
└── noxwork-gedcom-web/      # Frontend — React + React Flow
```

| Package | Tech | Status |
|---------|------|--------|
| **noxwork-gedcom-api** | NestJS 11 · TypeScript · Node.js | Active |
| **noxwork-gedcom-web** | React 19 · Vite · React Flow · Tailwind CSS v4 | Active |

---

## noxwork-gedcom-api

The backend service handles GEDCOM file parsing, relationship resolution, and data persistence.

### Key Features

- **GEDCOM Engine** — Parses GEDCOM 5.5/5.5.1 files into structured JSON (INDI, FAM, HEAD records).
- **Relationship Resolver** — Graph-based BFS kinship engine that detects all relationship types including complex multi-role cases (e.g., pedigree collapse, uncle-cousin overlaps).
- **Session Storage** — In-memory repository with a pluggable interface designed for future Prisma/PostgreSQL integration.
- **Strict Validation** — DTO-based input validation via `class-validator` and `class-transformer`.

### Architecture

```text
noxwork-gedcom-api/src/
├── main.ts                          # Server bootstrap (CORS, global prefix, validation)
├── app.module.ts                    # Root module
└── gedcom/                          # Core domain module
    ├── gedcom.module.ts
    ├── gedcom.controller.ts         # REST endpoints
    ├── gedcom.service.ts            # Orchestration layer
    ├── dto/
    │   └── upload-gedcom.dto.ts     # File upload validation
    ├── interfaces/
    │   ├── individual.interface.ts  # GedcomIndividual type
    │   ├── family.interface.ts      # GedcomFamily type
    │   ├── parse-result.interface.ts
    │   └── relationship.interface.ts # EdgeType, RelationshipType, KinshipPath, etc.
    ├── parser/
    │   ├── gedcom-engine.ts         # GEDCOM text → JSON parser
    │   ├── relations.ts             # BFS-based RelationshipResolver
    │   └── relations.spec.ts        # Unit tests
    └── repositories/
        ├── gedcom.repository.ts            # Abstract repository interface
        └── in-memory-gedcom.repository.ts  # In-memory implementation
```

### API Endpoints

All routes are prefixed with `/api`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/gedcom/upload` | Upload raw GEDCOM content; returns parsed individuals, families, and stats |
| `GET` | `/api/gedcom/session/:id` | Retrieve a previously parsed result by session ID |

#### Example: Upload a GEDCOM File

```bash
curl -X POST http://localhost:3000/api/gedcom/upload \
  -H "Content-Type: application/json" \
  -d '{ "fileContent": "0 HEAD\n1 SOUR MyApp\n0 @I1@ INDI\n1 NAME John /Doe/\n0 TRLR" }'
```

#### Example Response

```json
{
  "success": true,
  "message": "Successfully parsed GEDCOM file with 1 individuals and 0 families",
  "data": {
    "sessionId": "abc123",
    "stats": { "individualsCount": 1, "familiesCount": 0 },
    "individuals": [ ... ],
    "families": [],
    "metadata": { "source": "MyApp" }
  }
}
```

### Relationship Types Supported

The `RelationshipResolver` classifies paths through a kinship graph into these types:

| Type | Description |
|------|-------------|
| Parent / Child | Direct parent-child link |
| Grandparent / Grandchild | 2-generation gap |
| Great-Grandparent / Great-Grandchild | 3-generation gap |
| Sibling / Half-Sibling | Shared one or both parents |
| Spouse | Married/partnered individuals |
| Uncle/Aunt · Nephew/Niece | One generation offset, lateral |
| Great-Uncle/Aunt · Great-Nephew/Niece | Two generations offset, lateral |
| Cousin | Same generation, shared ancestor |

### Getting Started

#### Prerequisites

- **Node.js** ≥ 22
- **npm** ≥ 10

#### Install & Run

```bash
# Clone the repo
git clone git@github.com:varfmx/noxwork-gedcom.git
cd noxwork-gedcom

# Install API dependencies
cd noxwork-gedcom-api
npm install

# Start in development mode (hot reload)
npm run start:dev
```

The API will be available at `http://localhost:3000/api`.

---

## noxwork-gedcom-web

The frontend dashboard for visualizing GEDCOM family trees as interactive graphs.

### Key Features

- **React Flow Canvas** — Interactive, zoomable graph with background grid, minimap, and controls.
- **PersonNode** — Custom node with gender-colored borders, birth/death dates, and multi-role badge for pedigree collapse cases.
- **Dagre Layout** — Automatic hierarchical positioning (top-to-bottom) with spouse alignment.
- **Drag & Drop Upload** — Upload `.ged` files directly in the browser.
- **Dark Theme** — Noxwork-branded cobalt/orange palette with Tailwind CSS v4.

### Install & Run

```bash
cd noxwork-gedcom-web
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` and proxies API calls to `:3000`.

#### Available Scripts

| Script | Command | Description |
|--------|----------|-------------|
| Dev server | `npm run start:dev` | Start with file watching |
| Debug mode | `npm run start:debug` | Start with inspector attached |
| Production | `npm run start:prod` | Run compiled output |
| Build | `npm run build` | Compile TypeScript |
| Lint | `npm run lint` | ESLint with auto-fix |
| Format | `npm run format` | Prettier formatting |
| Unit tests | `npm test` | Run Jest test suite |
| Test coverage | `npm run test:cov` | Generate coverage report |
| E2E tests | `npm run test:e2e` | Integration tests |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (frontend URL) |

---

## Roadmap

- [x] GEDCOM parser engine (INDI, FAM, HEAD)
- [x] REST API for file upload and session retrieval
- [x] Graph-based relationship resolver (BFS, multi-path)
- [x] React frontend with React Flow visualization
- [x] Layout engine (Dagre) for automatic node positioning with spouse alignment
- [x] Backend deployment (Railway)
- [x] Frontend deployment (Vercel)
- [ ] PostgreSQL persistence with Prisma ORM (Neon.tech)
- [ ] PDF/PNG export of family trees
- [ ] Editor mode — create trees from scratch in the browser
- [ ] Custom domain (`gedcom.noxwork.net`)

---

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| **API** | Railway | [`noxwork-gedcom-production.up.railway.app`](https://noxwork-gedcom-production.up.railway.app/api) |
| **Frontend** | Vercel | *Pending deployment* |
| **Database** | Neon.tech | *Planned* |

### Infrastructure Notes

- The API binds to `0.0.0.0` for Railway compatibility.
- A `vercel.json` rewrite proxies `/api/*` from Vercel to the Railway backend, keeping the same relative-path pattern used in development.
- CORS is configured via the `CORS_ORIGIN` environment variable.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 11 · TypeScript 5.7 · Node.js |
| **Frontend** | React 19 · Vite 7 · React Flow v12 · Tailwind CSS v4 · Zustand 5 · Dagre |
| **Database** *(planned)* | PostgreSQL 16+ · Prisma ORM |
| **Hosting** | Railway (backend) · Vercel (frontend) · Neon (DB, planned) |

---

<p align="center">
  <strong>© 2026 Noxwork Technologies</strong> · Engineering Innovation Labs
</p>
