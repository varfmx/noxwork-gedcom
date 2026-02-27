# noxwork-gedcom-api — Project Context

> **Last updated:** 2026-02-26
> **Status:** Phase 3 — Prisma Integration & Editor Sync ✅
> **Runtime:** NestJS 11 + TypeScript 5.7 (strict mode)
> **Node target:** ES2023

---

## 1. Project Overview

`noxwork-gedcom-api` is the **backend** of the Noxwork GEDCOM Labs platform. It is part of a **monorepo** located at `noxwork-gedcom/` alongside the future frontend (`noxwork-gedcom-web`).

The API is responsible for:
- Receiving and parsing `.ged` (GEDCOM) genealogy files
- Converting GEDCOM plain text into structured JSON (individuals, families, metadata)
- Persisting parsed results and tree structures via Prisma ORM to PostgreSQL
- Computing complex family relationships with multi-role overlap detection (uncle/cousin/pedigree collapse)
- Handling real-time editor sync (adding, updating, deleting nodes and relationships)

The **frontend** (React 19 + Vite + React Flow) will consume this API to render interactive family tree visualizations.

---

## 2. Tech Stack

| Layer          | Technology                          | Notes                                      |
|----------------|-------------------------------------|---------------------------------------------|
| Framework      | NestJS 11                           | Module-based architecture                   |
| Language       | TypeScript 5.7                      | Strict mode (`strictNullChecks`, `noImplicitAny`, `isolatedModules`, `emitDecoratorMetadata`) |
| Validation     | class-validator + class-transformer | Global `ValidationPipe` with whitelist      |
| Package Mgr    | npm                                 |                                             |
| Testing        | Jest + Supertest                    | Unit + e2e                                  |
| Linting        | ESLint 9 + Prettier                 |                                             |
| DB             | PostgreSQL 16+ via Prisma ORM       | Integrated with `Tree`, `Person`, `Relationship` models |
| Cache (planned)| Redis                               | For large tree layout caching (>5000 nodes) |

---

## 3. Folder Structure

```
noxwork-gedcom-api/
├── src/
│   ├── main.ts                                  # Bootstrap: CORS, ValidationPipe, global prefix /api
│   ├── app.module.ts                            # Root module, imports GedcomModule
│   ├── app.controller.ts                        # Default health check (GET /api)
│   ├── app.service.ts                           # Default service
│   │
│   └── gedcom/                                  # ══ GEDCOM Domain Module ══
│       ├── gedcom.module.ts                     # NestJS module with DI wiring
│       ├── gedcom.controller.ts                 # REST endpoints (upload, session, node/edge sync)
│       ├── gedcom.service.ts                    # Business logic orchestrator & Prisma transactions
│       │
│       ├── dto/                                 # Data Transfer Objects
│       │   ├── index.ts                         # Barrel export
│       │   └── upload-gedcom.dto.ts             # UploadGedcomDto (fileContent, fileName?)
│       │
│       ├── interfaces/                          # TypeScript interfaces (pure types)
│       │   ├── index.ts                         # Barrel export (uses `export type`)
│       │   ├── individual.interface.ts          # GedcomIndividual
│       │   ├── family.interface.ts              # GedcomFamily
│       │   ├── parse-result.interface.ts        # GedcomParseResult, GedcomMetadata
│       │   └── relationship.interface.ts        # EdgeType, RelationshipType, KinshipPath, DetectedRole, EnrichedIndividual, RelationshipResult
│       │
│       ├── parser/                              # 🧠 Core parsing & relationship engine
│       │   ├── index.ts                         # Barrel export
│       │   ├── gedcom-engine.ts                 # GedcomEngine class (stateless, pure logic)
│       │   ├── relations.ts                     # RelationshipResolver class (multi-path BFS, kinship classifier)
│       │   └── relations.spec.ts                # Unit tests (18 tests, 9 categories)
│       │
│       └── repositories/                        # Data persistence layer (Repository Pattern)
│           ├── index.ts                         # Barrel export (uses `export type` for interface)
│           ├── gedcom.repository.ts             # GedcomRepository interface + GEDCOM_REPOSITORY Symbol token
│           └── in-memory-gedcom.repository.ts   # InMemoryGedcomRepository (Map-based, dev only)
│
├── prisma/                                      # Prisma ORM schema and migrations (at monorepo root)
│   └── schema.prisma                            # Tree, Person, Relationship models
│
├── test/                                        # e2e tests
│   ├── jest-e2e.json
│   └── app.e2e-spec.ts
│
├── tsconfig.json                                # Strict TS config
├── tsconfig.build.json
├── nest-cli.json
├── eslint.config.mjs
├── package.json
└── .prettierrc
```

---

## 4. Architecture & Design Patterns

### 4.1 Repository Pattern (Dependency Inversion)

The data layer uses **interface-based dependency injection** to decouple business logic from storage:

```
GedcomService  →  GedcomRepository (interface)  ←  InMemoryGedcomRepository
                                                ←  PrismaGedcomRepository (future)
```

- **`GedcomRepository`** — Abstract interface in `repositories/gedcom.repository.ts`
- **`GEDCOM_REPOSITORY`** — `Symbol` injection token (not a string) for NestJS DI
- **`InMemoryGedcomRepository`** — Current implementation using `Map<string, GedcomParseResult>`
- **To swap to Prisma:** Change `useClass` in `gedcom.module.ts` from `InMemoryGedcomRepository` to `PrismaGedcomRepository`

### 4.2 Service Layer (Orchestrator Pattern)

`GedcomService` orchestrates:
1. Parsing via `GedcomEngine` (instantiated directly, not DI — it's pure logic)
2. Persistence via injected `GedcomRepository`
3. Logging via NestJS `Logger`

### 4.3 Parser Engine (Pure Logic, No DI)

`GedcomEngine` is a **stateless class** with no NestJS decorators. It can be tested independently without the DI container. The parsing pipeline is:

```
Raw text → tokenize() → parseLine() → groupRecords() → parse[Header|Individual|Family]() → GedcomParseResult
```

### 4.4 Relationship Resolver (Graph-Based Kinship Engine)

`RelationshipResolver` is a **stateless, pure-logic class** (same pattern as `GedcomEngine`). It processes parsed GEDCOM data to detect all kinship relationships from a source individual, including complex multi-role overlaps.

**Algorithm:** Multi-path BFS with per-path visited sets:
```
buildAdjacencyGraph() → findAllPaths() (BFS) → classifyAllPaths() → buildEnrichedResult()
```

- **Adjacency graph:** Bidirectional directed graph with typed edges (`parent-of`, `child-of`, `spouse-of`)
- **Multi-path BFS:** Per-path visited sets (not global) allow discovering ALL routes, not just shortest
- **Depth cap:** Configurable, default 10 hops — prevents combinatorial explosion in dense pedigree-collapse graphs
- **Kinship classifier:** Uses generational offset math (count `child-of` up vs `parent-of` down) to determine relationship type
- **Multi-role detection:** Deduplicates by `type:degree` key, preserving distinct role types for the same target
- **Supported classifications:** Parent, Child, Sibling, Half-Sibling, Spouse, Grandparent, Grandchild, Uncle/Aunt, Nephew/Niece, Cousin, Great-Grandparent, Great-Grandchild, Great-Uncle/Aunt, Great-Nephew/Niece

### 4.5 TypeScript Strict Mode Conventions

Because `isolatedModules` and `emitDecoratorMetadata` are both enabled:
- **Interfaces must be re-exported with `export type`** (not `export`)
- **Interfaces used in constructor DI must be imported with `import type`** (separate from value imports)
- The `GEDCOM_REPOSITORY` Symbol token must be imported as a **value import** (not `import type`)

---

## 5. API Endpoints

All routes are prefixed with `/api` (set in `main.ts`).

| Method | Route                    | Body / Params                                  | Response                                                   |
|--------|--------------------------|-------------------------------------------------|------------------------------------------------------------|
| `GET`  | `/api`                   | —                                               | `"Hello World!"` (default health check)                    |
| `POST` | `/api/gedcom/upload`     | `{ fileContent: string, fileName?: string }`    | `{ success, message, data: { sessionId, stats, individuals[], families[], metadata } }` |
| `GET`  | `/api/gedcom/session/:id`| `:id` = session UUID                            | `{ success, data: { individuals[], families[], metadata } }` |

### Request / Response Examples

**POST /api/gedcom/upload**
```json
// Request
{
  "fileContent": "0 HEAD\n1 SOUR MyApp\n0 @I1@ INDI\n1 NAME John /Doe/\n1 SEX M\n0 TRLR",
  "fileName": "family.ged"
}

// Response
{
  "success": true,
  "message": "Successfully parsed GEDCOM file with 1 individuals and 0 families",
  "data": {
    "sessionId": "uuid-here",
    "stats": { "individualsCount": 1, "familiesCount": 0 },
    "individuals": [
      {
        "id": "@I1@",
        "givenName": "John",
        "surname": "Doe",
        "fullName": "John Doe",
        "sex": "M",
        "birthDate": null,
        "birthPlace": null,
        "deathDate": null,
        "deathPlace": null,
        "familySpouseIds": [],
        "familyChildId": null
      }
    ],
    "families": [],
    "metadata": { "source": "MyApp", "gedcomVersion": null, "charset": null }
  }
}
```

---

## 6. Data Models

### GedcomIndividual
| Field             | Type                    | Description                                      |
|-------------------|-------------------------|--------------------------------------------------|
| `id`              | `string`                | GEDCOM xref ID, e.g. `@I1@`                      |
| `givenName`       | `string`                | First/given name                                  |
| `surname`         | `string`                | Family/surname                                    |
| `fullName`        | `string`                | Full name without GEDCOM slash formatting          |
| `sex`             | `'M' \| 'F' \| 'U'`    | Biological sex                                    |
| `birthDate`       | `string \| null`        | Raw GEDCOM date string (e.g. `"15 MAR 1950"`)     |
| `birthPlace`      | `string \| null`        | Birth place                                       |
| `deathDate`       | `string \| null`        | Raw GEDCOM date string                            |
| `deathPlace`      | `string \| null`        | Death place                                       |
| `familySpouseIds` | `readonly string[]`     | Family IDs where this person is a spouse (FAMS)   |
| `familyChildId`   | `string \| null`        | Family ID where this person is a child (FAMC)     |

### GedcomFamily
| Field           | Type                  | Description                                    |
|-----------------|-----------------------|------------------------------------------------|
| `id`            | `string`              | GEDCOM xref ID, e.g. `@F1@`                    |
| `husbandId`     | `string \| null`      | Individual ID of husband/partner 1              |
| `wifeId`        | `string \| null`      | Individual ID of wife/partner 2                 |
| `childrenIds`   | `readonly string[]`   | Individual IDs of children                      |
| `marriageDate`  | `string \| null`      | Raw GEDCOM marriage date                        |
| `marriagePlace` | `string \| null`      | Marriage place                                  |

### GedcomMetadata
| Field           | Type             | Description                       |
|-----------------|------------------|-----------------------------------|
| `source`        | `string \| null` | GEDCOM source application         |
| `gedcomVersion` | `string \| null` | GEDCOM standard version (e.g. 5.5.1) |
| `charset`       | `string \| null` | Character set (e.g. UTF-8)        |

### EnrichedIndividual (extends GedcomIndividual)
| Field           | Type                        | Description                                       |
|-----------------|-----------------------------|-------------------------------------------------  |
| `detectedRoles` | `readonly DetectedRole[]`   | All kinship roles relative to the source individual |

### DetectedRole
| Field         | Type               | Description                                  |
|---------------|--------------------|----------------------------------------------|
| `type`        | `RelationshipType` | Classified relationship label                |
| `degree`      | `number`           | Degree of separation (hop count)             |
| `kinshipPath` | `KinshipPath`      | Specific path through the graph              |

### KinshipPath
| Field   | Type                   | Description                              |
|---------|------------------------|------------------------------------------|
| `path`  | `readonly string[]`    | Ordered individual IDs from source to target |
| `edges` | `readonly EdgeType[]`  | Edge labels on each hop                  |

---

## 7. GEDCOM Parser — Supported Tags

The `GedcomEngine` currently supports GEDCOM 5.5/5.5.1 tags:

| Record | Tags Parsed                                                        |
|--------|--------------------------------------------------------------------|
| `HEAD` | `SOUR`, `GEDC` → `VERS`, `CHAR`                                   |
| `INDI` | `NAME` (+ `GIVN`, `SURN`), `SEX`, `BIRT` → `DATE`/`PLAC`, `DEAT` → `DATE`/`PLAC`, `FAMS`, `FAMC` |
| `FAM`  | `HUSB`, `WIFE`, `CHIL`, `MARR` → `DATE`/`PLAC`                    |

### Parser Internals
- **`parseLine()`** — Regex: `^(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s+(.*))?$`
- **Name extraction** — `"GivenName /Surname/"` format, with fallback for non-standard names
- **Event context tracking** — Level-1 tags (`BIRT`, `DEAT`, `MARR`) set context for level-2 sub-tags (`DATE`, `PLAC`)

---

## 8. Server Configuration

| Setting          | Value / Source                                   |
|------------------|--------------------------------------------------|
| Port             | `process.env.PORT` or `3000`                     |
| CORS origin      | `process.env.CORS_ORIGIN` or `http://localhost:5173` |
| Global prefix    | `/api`                                           |
| ValidationPipe   | `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` |

---

## 9. Available npm Scripts

| Script            | Command                      | Purpose                        |
|-------------------|------------------------------|--------------------------------|
| `start:dev`       | `nest start --watch`         | Development with hot reload    |
| `start:debug`     | `nest start --debug --watch` | Debug mode                     |
| `start`           | `nest start`                 | Production start               |
| `start:prod`      | `node dist/main`             | Run compiled production build  |
| `build`           | `nest build`                 | Compile to `dist/`             |
| `test`            | `jest`                       | Run unit tests                 |
| `test:e2e`        | `jest --config ./test/jest-e2e.json` | Run e2e tests           |
| `lint`            | `eslint ... --fix`           | Lint and auto-fix              |
| `format`          | `prettier --write ...`       | Format code                    |

---

## 10. Roadmap (from Strategic Plan)

### ✅ Phase 1 — Base Setup & GEDCOM Parsing Engine
- [x] NestJS project scaffolded with strict TypeScript
- [x] `gedcom` module with controller, service, DTOs
- [x] `GedcomEngine` parser for INDI, FAM, HEAD tags
- [x] Repository pattern with in-memory implementation
- [x] POST `/api/gedcom/upload` endpoint working
- [x] GET `/api/gedcom/session/:id` endpoint working
- [x] CORS configured for frontend at `:5173`

### ✅ Phase 2 — Relationships Engine
- [x] `parser/relations.ts` — `RelationshipResolver` class with multi-path BFS
- [x] Kinship classifier: Parent, Child, Sibling, Half-Sibling, Spouse, Grandparent, Grandchild, Uncle/Aunt, Nephew/Niece, Cousin, Great-* variants
- [x] Multi-role overlap detection for pedigree collapse scenarios
- [x] Unit tests: 18 tests covering 9 categories (all passing)

### ✅ Phase 3 — Layout Engine *(implemented in frontend)*
- [x] Dagre-based hierarchical TB positioning (in `noxwork-gedcom-web`)
- [x] Generational rank assignment from parent-child edges
- [x] Spouse alignment post-processing (same Y level)

### 🔲 Phase 4 — Database Integration
- [ ] Prisma ORM setup with PostgreSQL 16+
- [ ] `PrismaGedcomRepository` implementing `GedcomRepository` interface
- [ ] Normalized schema: `Person` entity + `Relationship` edges (N:N)
- [ ] JSONB columns for non-standard GEDCOM extensions
- [ ] Transactional bulk inserts for large files
- [ ] Swap `useClass` in `gedcom.module.ts`

### 🔲 Phase 5 — Export Engine
- [ ] Generate valid GEDCOM 7.0 standard files from database
- [ ] PDF/PNG export of visualized trees

### 🔲 Phase 6 — Deployment
- [ ] Backend: Railway.app (Node.js runtime)
- [ ] Database: Neon.tech (PostgreSQL Serverless)
- [ ] Frontend: Vercel
- [ ] Domain: `gedcom.noxwork.net`

---

## 11. Branding Reference

| Element          | Value            |
|------------------|------------------|
| Primary Color    | `#0047AB` (Cobalt Blue) |
| Accent Color     | `#FF8C00` (Orange)      |
| Brand            | Noxwork Technologies    |

---

## 12. Key Gotchas & Conventions

1. **`export type` is mandatory** for re-exporting interfaces in barrel files (due to `isolatedModules`)
2. **`import type` is mandatory** for interfaces used in decorated constructors (due to `emitDecoratorMetadata`)
3. **DI token is a `Symbol`**, not a string — `GEDCOM_REPOSITORY = Symbol('GEDCOM_REPOSITORY')`
4. **`GedcomEngine` and `RelationshipResolver` are NOT injectable** — they're instantiated directly as pure logic classes with no NestJS dependencies
5. **All repository methods are `async`** even in the in-memory implementation, to match the future DB interface
6. **GEDCOM line format:** `LEVEL [XREF_ID] TAG [VALUE]` — for level-0 records with xref, the record type (INDI/FAM) appears as the **tag**, not the value
7. **Responses follow a consistent envelope:** `{ success: boolean, message?: string, data: T | null }`
8. **`RelationshipResolver` uses per-path visited sets** — NOT a global visited set. This is critical for multi-role detection
9. **Jest 30 uses `--testPathPatterns`** (plural), not `--testPathPattern` (singular)
