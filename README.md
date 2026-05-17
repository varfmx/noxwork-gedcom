# noxwork-radix-flow

> A high-performance GEDCOM processing platform for parsing, analyzing, and visualizing complex family trees — built by **Fernando Valderrábano Reyes** at **Noxwork Labs**.

---

## Monorepo Structure

```text
noxwork-gedcom/
├── noxwork-gedcom-api/      # Backend — NestJS REST API
└── noxwork-gedcom-web/      # Frontend — React
```

| Package | Tech | Status |
|---------|------|--------|
| **noxwork-gedcom-api** | NestJS 11 · TypeScript · Prisma · PostgreSQL | Active |
| **noxwork-gedcom-web** | React 19 · Vite · Tailwind CSS v4 · Zustand | Active |

---

## noxwork-gedcom-api

The backend service handles GEDCOM file parsing, relationship resolution, data persistence, and real-time tree editing.

### Key Features

- **GEDCOM Engine** — Parses GEDCOM 5.5/5.5.1 files into structured JSON (INDI, FAM, HEAD records).
- **Relationship Resolver** — Graph-based multi-path BFS kinship engine that detects all relationship types including complex multi-role cases (pedigree collapse, uncle-cousin overlaps).
- **Supabase JWT Auth** — All project endpoints are protected via Supabase ES256/RS256 JWKS validation with ownership enforcement.
- **Prisma ORM Persistence** — PostgreSQL storage for Users, Trees, Persons, and Relationships with cascade delete.
- **Person CRUD** — Create, update, and delete individuals within a project; dual ID resolution supports both GEDCOM IDs (`@I5@`) and database UUIDs.
- **Relationship CRUD** — Create typed relationships (PARENT/SPOUSE) between persons.
- **Position Persistence** — Batch-save canvas node positions into Person metadata JSON.
- **GEDCOM Export** — Generate valid GEDCOM 5.5.1 files from database records.
- **Strict Validation** — DTO-based input validation via `class-validator` and `class-transformer`.

### API Endpoints

All routes are prefixed with `/api`.

#### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api`   | Health check |
| `POST` | `/api/gedcom/upload` | Upload raw GEDCOM content; returns parsed individuals, families, and stats |
| `GET`  | `/api/gedcom/session/:id` | Retrieve a previously parsed result by session ID |

#### Protected (requires `Authorization: Bearer <supabase-jwt>`)

| Method   | Endpoint                                  | Description |
|----------|-------------------------------------------|-------------|
| `GET`    | `/api/projects`                           | List all projects for the authenticated user |
| `POST`   | `/api/projects`                           | Create a new project |
| `GET`    | `/api/projects/:id`                       | Get project detail with individuals, families, and positions |
| `POST`   | `/api/projects/:id/upload`                | Upload GEDCOM to a project (persist to DB) |
| `GET`    | `/api/projects/:id/export`                | Download project as GEDCOM 5.5.1 file |
| `PATCH`  | `/api/projects/:id`                       | Rename a project |
| `DELETE` | `/api/projects/:id`                       | Delete a project (cascades to persons + relationships) |
| `POST`   | `/api/projects/:id/persons`               | Create a new person in the project |
| `PATCH`  | `/api/projects/:id/persons/:personId`     | Update person details (partial) |
| `DELETE` | `/api/projects/:id/persons/:personId`     | Delete person + cascade relationships |
| `POST`   | `/api/projects/:id/relationships`         | Create a typed relationship (PARENT/SPOUSE) |
| `PATCH`  | `/api/projects/:id/positions`             | Batch-update canvas node positions |

### Relationship Types Supported

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

---

## noxwork-gedcom-web

The frontend dashboard for visualizing and editing GEDCOM family trees as interactive graphs.

### Key Features

- **Canvas** — Interactive, zoomable graph with background grid, minimap, and controls.
- **PersonNode** — Custom node with gender-colored border, birth/death dates, location, and multi-role badge for pedigree collapse cases.
- **Dagre Layout** — Automatic hierarchical positioning (top-to-bottom) with spouse alignment.
- **Auto Organize** — One-click dagre layout button that rearranges all nodes and saves positions.
- **Position Persistence** — Drag nodes to arrange them; positions are saved to the database and restored on load.
- **Edit Person Panel** — Slide-in side panel for editing firstName, lastName, gender, and birth date with inline delete confirmation.
- **Connection Drawing** — Draw edges between nodes; choose Parent→Child or Spouse relationship type.
- **Create New Person** — Inline sidebar form to add new individuals to the tree (available even on empty projects).
- **Right-Click Context Menu** — Right-click any node to add a child, spouse, or parent; or delete the person.
- **Keyboard Delete** — Select a node and press Delete/Backspace to remove it.
- **Inline Project Rename** — Click the project name in the sidebar to rename it without leaving the tree view.
- **Clear Canvas** — Remove all persons from the canvas (with backend sync) while staying in the project.
- **Export PNG/PDF** — Download the tree as a high-resolution PNG or PDF with project name title and Noxwork branding.
- **GEDCOM Date Picker** — Custom date picker outputting GEDCOM standard format (e.g. `8 DEC 1977`).
- **Drag & Drop Upload** — Upload `.ged` files directly in the browser.
- **Dark Theme** — Noxwork-branded cobalt/orange palette with Tailwind CSS v4.
- **Auth** — Google SSO + Email/Password via Supabase Auth with password recovery flow.
- **Dashboard** — Overleaf-style project management with search, rename, delete, and export.
- **i18n** — Full English and Spanish translations.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 22
- **npm** ≥ 10
- **PostgreSQL** (or use Neon.tech serverless)

### Install & Run

```bash
# Clone the repo
git clone git@github.com:varfmx/noxwork-gedcom.git
cd noxwork-gedcom

# ── Backend ──
cd noxwork-gedcom-api
npm install
cp .env.example .env    # Configure SUPABASE_URL, SUPABASE_JWT_SECRET, DATABASE_URL
npx prisma generate     # Generate Prisma client
npm run start:dev        # http://localhost:3000/api

# ── Frontend ──
cd ../noxwork-gedcom-web
npm install
cp .env.example .env.local  # Configure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:5173 (proxies /api → :3000)
```

### Environment Variables

#### Backend (`noxwork-gedcom-api/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `SUPABASE_URL` | — | Supabase project URL |
| `SUPABASE_JWT_SECRET` | — | Supabase JWT secret (for local dev bypass) |
| `DATABASE_URL` | — | PostgreSQL connection string |

#### Frontend (`noxwork-gedcom-web/.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

---


## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 11 · TypeScript 5.7 · Prisma ORM · Node.js |
| **Frontend** | React 19 · Vite 7 · Tailwind CSS v4 · Zustand 5 · Dagre |
| **Database** | PostgreSQL 16+ · Prisma ORM · Neon.tech |
| **Auth** | Supabase Auth (Google SSO + Email/Password) |
| **Hosting** | Vercel (backend + frontend) · Neon (DB) |

---

<p align="center">
  <strong>© 2026 Noxwork Technologies</strong> · Engineering Innovation Labs
</p>
