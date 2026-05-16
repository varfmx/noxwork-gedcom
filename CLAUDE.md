# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Full-stack genealogy visualization platform. Two independent npm packages in a loose monorepo:
- `noxwork-gedcom-api/` — NestJS 11 + PostgreSQL/Prisma backend (port 3000)
- `noxwork-gedcom-web/` — React 19 + Vite + Tailwind v4 frontend (port 5173)

Each package is managed independently (separate `node_modules`, `package.json`, install commands).

## Commands

### Backend (`noxwork-gedcom-api/`)

```bash
npm run start:dev      # Dev server with watch (runs prisma generate first)
npm run build          # Compile to dist/
npm run test           # Jest unit tests
npm run test:watch     # Jest in watch mode
npm run test:cov       # Jest with coverage
npm run test:e2e       # E2E tests (jest --config ./test/jest-e2e.json)
npm run lint           # ESLint with auto-fix
npm run format         # Prettier

npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations (dev)
npm run prisma:studio    # Open Prisma Studio GUI
```

### Frontend (`noxwork-gedcom-web/`)

```bash
npm run dev      # Vite dev server (proxies /api → localhost:3000)
npm run build    # tsc -b && vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Architecture

### Backend (NestJS)

Feature modules under `src/`:

- **`auth/`** — Supabase JWT validation via Passport strategy. Guards protect all routes except health check. The user's Supabase `sub` claim is the `User.id` in Prisma.
- **`gedcom/`** — GEDCOM file parsing and relationship inference. Contains a `parser/` subdirectory with `GedcomEngine` and `RelationshipResolver`. Uses a repository pattern (`repositories/`) with injected Prisma services.
- **`project/`** — Tree/persons/relationships CRUD. Includes a `gedcom-exporter.service` for round-tripping data back to GEDCOM format. Node canvas positions are stored in `Person.metadata` (JSON field).
- **`users/`** — User profile management, synced with Supabase auth UUIDs.
- **`mail/`** — Email via Resend provider.
- **`prisma/`** — Singleton `PrismaService` shared across modules.

**Data model key details:**
- `Person.gedcomId` stores the original GEDCOM xref (e.g., `@I5@`). Unique constraint is `(treeId, gedcomId)`.
- `Person.metadata` (JSON) stores both GEDCOM-specific data and React Flow canvas position.
- Relationship types: `PARENT`, `SPOUSE`, `SIBLING` with optional `subType` (e.g., `BIOLOGICAL`).
- All tree data cascades delete from `Tree → Person → Relationship`.

### Frontend (React + Vite)

**Routing** (React Router in `App.tsx`):
- Public: `/login`, `/auth/callback`, `/forgot-password`, `/update-password`
- Protected via `<ProtectedRoute>`: `/dashboard`, `/visualizer`, `/visualizer/:projectId`

**State management** (Zustand stores in `src/store/`):
- `useAuthStore` — Supabase session, login/signup/password recovery
- `useProjectStore` — Projects list CRUD with optimistic updates
- `useTreeStore` — Canvas state: uploaded file, parsed nodes/edges, layout, position sync
- `useThemeStore` — Light/dark toggle, persisted to localStorage

**Feature modules** (`src/features/`):
- `visualizer/` — React Flow canvas (`TreeCanvas.tsx`), custom `PersonNode.tsx` (gender-colored), slide-in `EditPersonPanel.tsx`, context menus
- `uploader/` — Drag-and-drop GEDCOM file uploader
- `dashboard/` — Project list table

**Styling:** Tailwind v4 CSS-first configuration — design tokens defined via `@theme` directives in `src/index.css`. No `tailwind.config.js`.

**i18n:** `react-i18next` with EN/ES translations in `src/locales/`.

**API:** In dev, Vite proxies `/api/*` to `localhost:3000`. In prod, Vercel rewrites `/api/*` to the Railway backend URL. The frontend `services/` layer wraps all API calls.

### Deployment

- **Backend:** Vercel (`vercel.json` in api package). Entry point is `src/serverless.ts` — compiled to `dist/serverless.js` by `nest build`. Vercel wraps it as a serverless function. Migrations run at deploy time via `prisma migrate deploy` in `buildCommand`.
- **Frontend:** Vercel (`vercel.json` in web package). Rewrites `/api/*` to the backend Vercel URL — update `REPLACE_WITH_API_VERCEL_URL` in `noxwork-gedcom-web/vercel.json` after deploying the API.
- **Database:** Neon.tech serverless PostgreSQL. Add `?connection_limit=1` to `DATABASE_URL` in Vercel environment variables to avoid connection pool exhaustion across serverless instances.

## Environment Variables

**Backend** (`.env`):
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/neondb?sslmode=require
SUPABASE_URL=https://your-project-id.supabase.co
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**Frontend** (`.env`):
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=https://noxwork-gedcom-api.railway.app  # prod only
```

Both packages have `.env.example` files.

## Key Conventions

- Both packages use **ESLint 9 flat config** and **Prettier** (single quotes, trailing commas).
- Backend TS targets ES2023 with `emitDecoratorMetadata` enabled (required for NestJS DI).
- Frontend TS uses `bundler` module resolution (Vite requirement).
- More detailed architecture notes are in each package's `CONTEXT.md` file.
