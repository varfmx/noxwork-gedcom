# noxwork-gedcom-api — Project Context

> **Last updated:** 2026-03-08
> **Status:** Phase 7 — Manual Editing & Position Persistence ✅
> **Runtime:** NestJS 11 + TypeScript 5.7 (strict mode)
> **Node target:** ES2023

---

## 1. Project Overview

`noxwork-gedcom-api` is the **backend** of the Noxwork RADIX FLOW platform. It is part of a **monorepo** located at `noxwork-gedcom/` alongside the frontend (`noxwork-gedcom-web`).

The API is responsible for:
- Receiving and parsing `.ged` (GEDCOM) genealogy files
- Converting GEDCOM plain text into structured JSON (individuals, families, metadata)
- Persisting parsed results and tree structures via Prisma ORM to PostgreSQL
- Computing complex family relationships with multi-role overlap detection (uncle/cousin/pedigree collapse)
- Handling real-time editor sync (adding, updating, deleting nodes and relationships)
- Batch-saving canvas node positions for UI state persistence
- Exporting GEDCOM 5.5.1 files from persisted database records

The **frontend** (React 19 + Vite + React Flow) consumes this API to render interactive family tree visualizations.

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
│   ├── app.module.ts                            # Root module, imports all feature modules
│   ├── app.controller.ts                        # Default health check (GET /api)
│   ├── app.service.ts                           # Default service
│   │
│   ├── auth/                                    # ══ Auth Module (Supabase JWT) ══
│   │   ├── auth.module.ts                       # Registers PassportModule + SupabaseJwtStrategy
│   │   ├── supabase-jwt.strategy.ts             # PassportStrategy('supabase-jwt') via HS256
│   │   ├── jwt-auth.guard.ts                    # JwtAuthGuard extends AuthGuard('supabase-jwt')
│   │   ├── decorators/
│   │   │   └── get-user.decorator.ts            # @GetUser() / @GetUser('id') param decorator
│   │   └── interfaces/
│   │       ├── index.ts                         # Barrel export (export type)
│   │       ├── jwt-payload.interface.ts         # JwtPayload (Supabase JWT claims)
│   │       └── authenticated-user.interface.ts  # AuthenticatedUser { id, email }
│   │
│   ├── project/                                 # ══ Project (Tree CRUD + Persistence) Module ══
│   │   ├── project.module.ts                    # Imports AuthModule, provides ProjectService
│   │   ├── project.controller.ts                # REST: GET/POST/PATCH/DELETE /api/projects + person/relationship CRUD + positions
│   │   ├── project.service.ts                   # Business logic + ownership enforcement + GEDCOM persistence
│   │   ├── gedcom-exporter.service.ts           # GEDCOM 5.5.1 export from DB records
│   │   └── dto/
│   │       ├── index.ts                         # Barrel export
│   │       ├── create-project.dto.ts            # CreateProjectDto (name, description?)
│   │       ├── rename-project.dto.ts            # RenameProjectDto (name)
│   │       ├── upload-to-project.dto.ts         # UploadToProjectDto (fileContent, fileName?)
│   │       ├── create-person.dto.ts             # CreatePersonDto (firstName, lastName?, gender?, birthDate?)
│   │       ├── update-person.dto.ts             # UpdatePersonDto (all optional fields)
│   │       ├── create-relationship.dto.ts       # CreateRelationshipDto (type, sourceId, targetId)
│   │       └── batch-update-positions.dto.ts    # BatchUpdatePositionsDto (updates[{id, positionX, positionY}])
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
├── prisma/                                      # Prisma ORM schema and migrations
│   └── schema.prisma                            # User, Tree, Person, Relationship models
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

### 4.5 Dual ID Resolution (gedcomId + UUID)

GEDCOM-imported nodes use their original GEDCOM ID (e.g. `@I5@`) as the frontend React Flow node ID, while manually created nodes use their database UUID. All CRUD endpoints (`updatePerson`, `deletePerson`, `createRelationship`, `batchUpdatePositions`) resolve identifiers by checking **both** the `id` and `gedcomId` columns via Prisma `OR` queries.

### 4.6 TypeScript Strict Mode Conventions

Because `isolatedModules` and `emitDecoratorMetadata` are both enabled:
- **Interfaces must be re-exported with `export type`** (not `export`)
- **Interfaces used in constructor DI must be imported with `import type`** (separate from value imports)
- The `GEDCOM_REPOSITORY` Symbol token must be imported as a **value import** (not `import type`)

---

## 5. API Endpoints

All routes are prefixed with `/api` (set in `main.ts`).

### Public (no auth required)

| Method | Route                    | Body / Params                                  | Response                                                   |
|--------|--------------------------|-------------------------------------------------|------------------------------------------------------------|
| `GET`  | `/api`                   | —                                               | `"Hello World!"` (default health check)                    |
| `POST` | `/api/gedcom/upload`     | `{ fileContent: string, fileName?: string }`    | `{ success, message, data: { sessionId, stats, individuals[], families[], metadata } }` |
| `GET`  | `/api/gedcom/session/:id`| `:id` = session UUID                            | `{ success, data: { individuals[], families[], metadata } }` |

### Protected (requires `Authorization: Bearer <supabase-jwt>`)

| Method   | Route                                    | Body / Params                                | Response                            |
|----------|------------------------------------------|----------------------------------------------|-------------------------------------|
| `GET`    | `/api/projects`                          | —                                            | `{ success, data: ProjectSummary[] }` |
| `POST`   | `/api/projects`                          | `{ name, description? }`                    | `{ success, message, data: ProjectSummary }` |
| `GET`    | `/api/projects/:id`                      | —                                            | `{ success, data: ProjectDetail }`  |
| `POST`   | `/api/projects/:id/upload`               | `{ fileContent, fileName? }`                | `{ success, message, data: ProjectDetail }` |
| `GET`    | `/api/projects/:id/export`               | —                                            | GEDCOM 5.5.1 file download          |
| `PATCH`  | `/api/projects/:id`                      | `{ name }`                                   | `{ success, message, data: ProjectSummary }` |
| `DELETE` | `/api/projects/:id`                      | —                                            | `204 No Content`                    |
| `POST`   | `/api/projects/:id/persons`              | `{ firstName, lastName?, gender?, birthDate? }` | `{ success, data: ProjectDetail }` |
| `PATCH`  | `/api/projects/:id/persons/:personId`    | `{ firstName?, lastName?, gender?, birthDate? }` | `{ success, data: Person }`       |
| `DELETE` | `/api/projects/:id/persons/:personId`    | —                                            | `204 No Content`                    |
| `POST`   | `/api/projects/:id/relationships`        | `{ type, sourceId, targetId, subType? }`     | `{ success, data: Relationship }`   |
| `PATCH`  | `/api/projects/:id/positions`            | `{ updates: [{id, positionX, positionY}] }` | `204 No Content`                    |

#### ProjectDetail shape (extends ProjectSummary)

```ts
{
  ...ProjectSummary,
  individuals: GedcomIndividual[];  // Now includes positionX, positionY
  families:    GedcomFamily[];
}
```

The `GET /projects/:id` and `POST /projects/:id/upload` endpoints return `ProjectDetail`,
which includes the same `individuals[]` and `families[]` shapes that the frontend receives
from `POST /gedcom/upload`. Individual records now include `positionX` and `positionY`
(stored in metadata JSON) so the frontend can restore canvas positions on load.

### Security model
- All `/api/projects` routes are guarded by `JwtAuthGuard` (Supabase ES256/RS256 JWT validation via JWKS).
- `JwtAuthGuard` overrides `handleRequest` to log `[401]` events with method + URL + failure reason.
- Ownership is enforced at the **Prisma query level**: every read/write scopes `where` to include the caller's `userId`.
- Existence leak prevention: attempting to access someone else's project returns **404**, not 403.
- `DELETE` cascades to `Person` and `Relationship` records via Prisma schema `onDelete: Cascade`.

---

## 6. Data Models

### GedcomIndividual
| Field             | Type                    | Description                                      |
|-------------------|-------------------------|--------------------------------------------------|
| `id`              | `string`                | GEDCOM xref ID (e.g. `@I1@`) or DB UUID          |
| `givenName`       | `string`                | First/given name                                  |
| `surname`         | `string`                | Family/surname                                    |
| `fullName`        | `string`                | Full name without GEDCOM slash formatting          |
| `sex`             | `'M' \| 'F' \| 'U'`    | Biological sex                                    |
| `birthDate`       | `string \| null`        | GEDCOM format date string (e.g. `"15 MAR 1950"`)  |
| `birthPlace`      | `string \| null`        | Birth place                                       |
| `deathDate`       | `string \| null`        | Raw GEDCOM date string                            |
| `deathPlace`      | `string \| null`        | Death place                                       |
| `familySpouseIds` | `readonly string[]`     | Family IDs where this person is a spouse (FAMS)   |
| `familyChildId`   | `string \| null`        | Family ID where this person is a child (FAMC)     |
| `positionX`       | `number \| null`        | Canvas X position (saved in metadata JSON)        |
| `positionY`       | `number \| null`        | Canvas Y position (saved in metadata JSON)        |

### Person Metadata JSON
Stored in the `metadata` column of the `Person` model. Contains:
- `birthDate`, `birthPlace`, `deathDate`, `deathPlace` — Raw GEDCOM strings
- `familySpouseIds`, `familyChildId` — GEDCOM family cross-references
- `positionX`, `positionY` — Canvas node positions (persisted on drag/layout)

---

## 7. GEDCOM Parser — Supported Tags

The `GedcomEngine` currently supports GEDCOM 5.5/5.5.1 tags:

| Record | Tags Parsed                                                        |
|--------|---------------------------------------------------------------------|
| `HEAD` | `SOUR`, `GEDC` → `VERS`, `CHAR`                                   |
| `INDI` | `NAME` (+ `GIVN`, `SURN`), `SEX`, `BIRT` → `DATE`/`PLAC`, `DEAT` → `DATE`/`PLAC`, `FAMS`, `FAMC` |
| `FAM`  | `HUSB`, `WIFE`, `CHIL`, `MARR` → `DATE`/`PLAC`                    |

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

### ✅ Phase 4 — User Authentication & Project Management
- [x] `User` model in Prisma schema (id = Supabase `sub` claim)
- [x] `Tree.userId` FK with `onDelete: Cascade`, `Tree_userId_idx` index
- [x] `AuthModule`: `SupabaseJwtStrategy` (passport-jwt, ES256/RS256 JWKS)
- [x] `JwtAuthGuard` (extends `AuthGuard('supabase-jwt')`)
- [x] `@GetUser()` param decorator to extract `AuthenticatedUser` from request
- [x] `ProjectController` — `GET/POST/PATCH/DELETE /api/projects`
- [x] `ProjectService` — ownership-scoped queries, `ensureUser()` upsert on create

### ✅ Phase 5 — Email Auth Guard Hardening
- [x] `JwtAuthGuard` overrides `handleRequest` to log `[401]` rejections with request context
- [x] `JwtPayload` interface updated with `aal` and `amr` claims

### ✅ Phase 6 — Persistence Layer (Upload + Hydration)
- [x] `POST /api/projects/:id/upload` — GEDCOM upload + Prisma transaction persistence
- [x] `GET /api/projects/:id` — Reconstructed `individuals[]` and `families[]` from DB
- [x] `GET /api/projects/:id/export` — GEDCOM 5.5.1 export from DB records

### ✅ Phase 7 — Manual Editing & Position Persistence
- [x] `POST /api/projects/:id/persons` — Create a person within a project
- [x] `PATCH /api/projects/:id/persons/:personId` — Update person details (partial)
- [x] `DELETE /api/projects/:id/persons/:personId` — Delete person + cascade relationships
- [x] `POST /api/projects/:id/relationships` — Create typed relationship (PARENT/SPOUSE)
- [x] `PATCH /api/projects/:id/positions` — Batch-update node canvas positions
- [x] Dual ID resolution: all endpoints resolve identifiers by both `id` and `gedcomId`
- [x] Position storage in Person metadata JSON (`positionX`, `positionY`)
- [x] `findOneForUser()` returns positions in API response

### ✅ Phase 8 — Export & Sync Enhancements
- [x] GEDCOM 5.5.1 export
- [x] PNG/PDF export of visualized trees (implemented client-side in `ExportService`)
- [x] **Project Timestamp Fix** — Modified `ProjectService` to update the Tree's `updatedAt` field whenever a person or relationship is modified, ensuring the dashboard accurately reflects the last edit time.

### 🔲 Phase 9 — Deployment
- [x] Backend: Railway.app (Node.js runtime)
- [x] Database: Supabase PostgreSQL + Prisma
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Environment variable validation for production

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
9. **`SUPABASE_URL` must be set** — strategy throws at bootstrap if missing; used to construct the JWKS URI
10. **`User.id` is the Supabase `sub` claim** (UUID), NOT auto-generated by Prisma
11. **`ensureUser()` is called on every `POST /projects`** — idempotent upsert handles first-time SSO logins
12. **Ownership leak prevention** — returns **404** (not 403) when record doesn't belong to caller
13. **Upload persistence strategy** — delete-then-insert transaction (not upserts) for clean GEDCOM re-uploads
14. **Family reconstruction** — `reconstructFamilies()` rebuilds `GedcomFamily[]` from flat SPOUSE + PARENT rows
15. **Person metadata column** — Dates, places, family cross-references, and canvas positions stored in `metadata` JSON
16. **Dual ID resolution** — All person/relationship endpoints check both `id` (UUID) and `gedcomId` (e.g. `@I5@`) via Prisma `OR` queries, because React Flow uses gedcomId as the node ID for imported persons
17. **Position batch endpoint** — `PATCH /projects/:id/positions` uses a `$transaction` for atomicity when updating multiple persons
