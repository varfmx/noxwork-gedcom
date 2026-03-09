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
| **noxwork-gedcom-api** | NestJS 11 · TypeScript · Prisma · PostgreSQL | Active |
| **noxwork-gedcom-web** | React 19 · Vite · React Flow · Tailwind CSS v4 · Zustand | Active |

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

- **React Flow Canvas** — Interactive, zoomable graph with background grid, minimap, and controls.
- **PersonNode** — Custom node with gender-colored border, birth/death dates, location, and multi-role badge for pedigree collapse cases.
- **Dagre Layout** — Automatic hierarchical positioning (top-to-bottom) with spouse alignment.
- **Auto Organize** — One-click dagre layout button that rearranges all nodes and saves positions.
- **Position Persistence** — Drag nodes to arrange them; positions are saved to the database and restored on load.
- **Edit Person Panel** — Slide-in side panel for editing firstName, lastName, gender, and birth date with inline delete confirmation.
- **Connection Drawing** — Draw edges between nodes; choose Parent→Child or Spouse relationship type.
- **Create New Person** — Inline sidebar form to add new individuals to the tree.
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

## Roadmap

### ✅ Completed

- [x] GEDCOM parser engine (INDI, FAM, HEAD tags)
- [x] REST API for file upload and session retrieval
- [x] Graph-based relationship resolver (BFS, multi-path, multi-role)
- [x] React frontend with React Flow visualization
- [x] Layout engine (Dagre) for automatic node positioning with spouse alignment
- [x] Supabase Auth: Google SSO + Email/Password login + registration
- [x] Password recovery flow (forgot password, update password)
- [x] Resend confirmation email + unconfirmed-user dashboard banner
- [x] Toast notification system (success/error/info/warning)
- [x] PostgreSQL persistence with Prisma ORM (Neon.tech)
- [x] GEDCOM 5.5.1 export from database records
- [x] Dashboard: project list, search, create, rename, delete
- [x] i18n: English + Spanish translations
- [x] Manual person CRUD (create, edit, delete) with optimistic updates
- [x] Relationship drawing (Parent→Child, Spouse) from the canvas
- [x] Position persistence (drag-save + restore on load)
- [x] Auto Organize button (dagre re-layout + batch save)
- [x] GEDCOM date picker (day/month/year → `D MMM YYYY`)
- [x] Backend deployment (Railway)
- [x] Frontend deployment (Vercel)

### 🔲 In Progress / Planned

- [ ] Search / filter individuals on the canvas
- [ ] Highlight kinship paths on hover
- [ ] Export tree as PNG/PDF
- [ ] Responsive sidebar (collapsible on mobile)
- [ ] Custom domain (`gedcom.noxwork.net`)

---

## Deployment

| Service | Platform | URL |
|---------|----------|-----|
| **API** | Railway | [`noxwork-gedcom-production.up.railway.app`](https://noxwork-gedcom-production.up.railway.app/api) |
| **Frontend** | Vercel | [`noxwork-gedcom.vercel.app`](https://noxwork-gedcom.vercel.app) |
| **Database** | Neon.tech | *Active (PostgreSQL via Prisma)* |

### Infrastructure Notes

- The API binds to `0.0.0.0` for Railway compatibility.
- A `vercel.json` rewrite proxies `/api/*` from Vercel to the Railway backend.
- CORS is configured via the `CORS_ORIGIN` environment variable.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 11 · TypeScript 5.7 · Prisma ORM · Node.js |
| **Frontend** | React 19 · Vite 7 · React Flow v12 · Tailwind CSS v4 · Zustand 5 · Dagre |
| **Database** | PostgreSQL 16+ · Prisma ORM · Neon.tech |
| **Auth** | Supabase Auth (Google SSO + Email/Password) |
| **Hosting** | Railway (backend) · Vercel (frontend) · Neon (DB) |

---

<p align="center">
  <strong>© 2026 Noxwork Technologies</strong> · Engineering Innovation Labs
</p>
