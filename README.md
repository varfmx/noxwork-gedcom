# 🌳 noxwork-gedcom

> A high-performance GEDCOM processing platform for parsing, analyzing, and visualizing complex family trees — built by **Fernando Valderrábano Reyes** at **Noxwork Labs**.

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-UNLICENSED-lightgrey)]()

---

## 📦 Monorepo Structure

```text
noxwork-gedcom/
├── noxwork-gedcom-api/      # Backend — NestJS REST API
└── (noxwork-gedcom-web/)     # Frontend — React (planned)
```

| Package | Tech | Status |
|---------|------|--------|
| **noxwork-gedcom-api** | NestJS 11 · TypeScript · Node.js | ✅ Active |
| **noxwork-gedcom-web** | React 19 · Vite · React Flow | 🔜 Planned |

---

## 🚀 noxwork-gedcom-api

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
git clone https://github.com/your-org/noxwork-gedcom.git
cd noxwork-gedcom

# Install API dependencies
cd noxwork-gedcom-api
npm install

# Start in development mode (hot reload)
npm run start:dev
```

The API will be available at `http://localhost:3000/api`.

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

## 🗺️ Roadmap

- [x] GEDCOM parser engine (INDI, FAM, HEAD)
- [x] REST API for file upload and session retrieval
- [x] Graph-based relationship resolver (BFS, multi-path)
- [ ] PostgreSQL persistence with Prisma ORM
- [ ] React frontend with React Flow visualization
- [ ] Layout engine (Dagre) for automatic node positioning
- [ ] PDF/PNG export of family trees
- [ ] Editor mode — create trees from scratch in the browser

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 11 · TypeScript 5.7 · Node.js |
| **Frontend** *(planned)* | React 19 · Vite · React Flow · Tailwind CSS |
| **Database** *(planned)* | PostgreSQL 16+ · Prisma ORM |
| **Hosting** *(planned)* | Vercel (frontend) · Railway (backend) · Neon (DB) |

---

<p align="center">
  <strong>© 2026 Noxwork Technologies</strong> · Engineering Innovation Labs
</p>
