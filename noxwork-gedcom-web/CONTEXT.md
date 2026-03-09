# noxwork-gedcom-web — Project Context

> **Last updated:** 2026-03-08
> **Status:** Phase 7 — Manual Editing, Position Persistence & GEDCOM Date Picker ✅
> **Runtime:** React 19 + Vite 7 + TypeScript 5.9 (strict mode)
> **Target:** ES2022, bundler module resolution

---

## 1. Project Overview

`noxwork-gedcom-web` is the **frontend** of the Noxwork GEDCOM Labs platform. It is part of a **monorepo** located at `noxwork-gedcom/` alongside the backend (`noxwork-gedcom-api`).

The frontend is responsible for:
- **Auth:** Google SSO + Email/Password via Supabase Auth; JWT passed as `Authorization: Bearer` to backend; full password-recovery flow (forgot password, update password, resend confirmation)
- **Dashboard:** Overleaf-style project management — create, rename, delete, and open family tree projects
- Uploading GEDCOM files and sending them to the backend API
- Visualizing parsed family trees as an interactive graph using React Flow
- Displaying enriched individual data including multi-role kinship overlaps
- Automatic hierarchical layout via Dagre with spouse alignment
- **Editor Mode:** Creating, editing, and deleting person nodes; drawing relationship edges; GEDCOM-format date picker
- **Position Persistence:** Saving & restoring canvas node positions; "Auto Organize" layout button
- (Future) Exporting tree visualizations as PDF/PNG

The **backend** (NestJS 11 at `localhost:3000`) parses GEDCOM files, resolves kinship relationships, and persists data via Prisma/PostgreSQL.

---

## 2. Tech Stack

| Layer          | Technology                     | Notes                                           |
|----------------|--------------------------------|-------------------------------------------------|
| Framework      | React 19                       | Functional components, hooks only               |
| Build Tool     | Vite 7                         | `@vitejs/plugin-react`                          |
| Language       | TypeScript 5.9                 | Strict mode, `verbatimModuleSyntax`             |
| Routing        | react-router-dom v7            | Declarative routes, `BrowserRouter`             |
| Auth           | @supabase/supabase-js v2       | Google OAuth, session management, JWT           |
| Visualization  | React Flow v12 (`@xyflow/react`) | Custom nodes, dark `colorMode`                |
| State          | Zustand 5                      | useAuthStore, useProjectStore, useTreeStore     |
| Layout         | Dagre (`@dagrejs/dagre`)       | Hierarchical TB positioning + spouse alignment  |
| Styling        | Tailwind CSS v4                | CSS-first config via `@tailwindcss/vite`        |
| Dates          | date-fns v4                    | `formatDistanceToNow` in ProjectTable           |
| i18n           | react-i18next                  | EN + ES translations                            |
| Sync           | lodash.debounce                | Debounced API calls for node positioning        |
| Linting        | ESLint 9 + react-hooks plugin  |                                                 |

---

## 3. Folder Structure

```
noxwork-gedcom-web/
├── src/
│   ├── main.tsx                                    # React root (StrictMode + BrowserRouter)
│   ├── App.tsx                                     # Router component + auth initialization
│   ├── index.css                                   # Tailwind + Noxwork design tokens
│   │
│   ├── lib/                                        # ══ External Service Clients ══
│   │   └── supabase.ts                             # Supabase singleton + getAccessToken()
│   │
│   ├── types/                                      # ══ Shared TypeScript Types ══
│   │   └── api.ts                                  # Backend API response types + ProjectSummary + PersonNodeData
│   │
│   ├── store/                                      # ══ State Management ══
│   │   ├── useAuthStore.ts                         # Auth state: Google SSO, email sign-in/up, reset, resend, updatePassword
│   │   ├── useProjectStore.ts                      # Projects CRUD with optimistic updates
│   │   └── useTreeStore.ts                         # Zustand store (upload, parse, layout, editor, position sync)
│   │
│   ├── components/                                 # ══ Shared Components ══
│   │   ├── ProtectedRoute.tsx                      # Auth guard: spinner → Outlet or Navigate /login
│   │   ├── Toast.tsx                               # Toast notification system (context + provider + hook)
│   │   └── GedcomDatePicker.tsx                    # GEDCOM-format date picker (D MMM YYYY)
│   │
│   ├── locales/                                    # ══ i18n ══
│   │   ├── en/translation.json                     # English translations
│   │   └── es/translation.json                     # Spanish translations
│   │
│   ├── pages/                                      # ══ Route Pages ══
│   │   ├── LoginPage.tsx                           # Email/Password + Google SSO login; Sign-up toggle; Resend confirmation
│   │   ├── AuthCallback.tsx                        # Supabase OAuth/email callback → /dashboard or /update-password
│   │   ├── ForgotPassword.tsx                      # Send password-reset email via Supabase
│   │   ├── UpdatePassword.tsx                      # Set new password after recovery; live strength meter + validation
│   │   ├── Dashboard.tsx                           # Project list + create modal + search; unconfirmed-user banner
│   │   └── VisualizerPage.tsx                      # Tree editor: sidebar (stats, create person, auto-organize, legend) + canvas
│   │
│   └── features/                                   # ══ Feature Modules ══
│       ├── visualizer/                             # Tree visualization & editing
│       │   ├── TreeCanvas.tsx                      # React Flow canvas (node selection, edge creation, pane click)
│       │   ├── EditPersonPanel.tsx                 # Slide-in panel: edit firstName/lastName/gender/birthDate, delete
│       │   ├── ConnectionTypeModal.tsx             # Modal for choosing Parent→Child or Spouse relationship type
│       │   └── nodes/
│       │       └── PersonNode.tsx                  # Custom node (gender border, multi-role badge, side handles)
│       │
│       ├── uploader/                               # File import
│       │   └── FileUploader.tsx                    # Drag-and-drop .ged upload
│       │
│       └── dashboard/                              # Dashboard feature components
│           ├── ProjectTable.tsx                    # Project rows, inline rename, ActionMenu, RelativeTime
│           └── EmptyState.tsx                      # Zero-state CTA: Create or Upload GEDCOM
│
├── public/                                         # Static assets
├── .env.example                                    # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── index.html                                      # Entry HTML
├── vite.config.ts                                  # Vite + Tailwind v4 + API proxy
├── tsconfig.json                                   # Project references root
├── tsconfig.app.json                               # App-level strict TS config
├── tsconfig.node.json                              # Node-level (vite.config)
├── eslint.config.js
└── package.json
```

---

## 4. Architecture & Design Patterns

### 4.1 Component Structure (Feature-Based)

Components are organized by **feature area**, not by type:

```
features/
  visualizer/  → TreeCanvas + EditPersonPanel + ConnectionTypeModal + PersonNode
  uploader/    → FileUploader (file import)
  dashboard/   → ProjectTable + EmptyState
```

### 4.2 State Management (Zustand)

Single store `useTreeStore` manages the entire tree lifecycle:

```
uploadAndParse(fileContent)           → fetch /api/gedcom/upload             → map to nodes/edges → set state
uploadToProject(projectId, content)   → fetch /api/projects/:id/upload       → map to nodes/edges → set state
loadProject(projectId)                → fetch /api/projects/:id              → map to nodes/edges → set state (hydration)
createPerson(data)                    → POST /api/projects/:id/persons       → add node to canvas
updatePerson(personId, data)          → PATCH /api/projects/:id/persons/:pid → optimistic update
deletePerson(personId)                → DELETE /api/projects/:id/persons/:pid → optimistic remove
createRelationship(data)              → POST /api/projects/:id/relationships → add edge to canvas
applyLayout()                         → dagre layout → debounced PATCH /projects/:id/positions
```

- **Hydration:** `loadProject()` fetches persisted data from `GET /api/projects/:id` and reconstructs the React Flow canvas. If saved positions exist in the response (`positionX`/`positionY`), they are restored; otherwise `applyLayout()` runs dagre.
- **Position persistence:** Node position changes (drag, auto-layout) are debounced and batch-saved via `PATCH /api/projects/:id/positions` with auth headers.
- **Optimistic CRUD:** `updatePerson`, `deletePerson`, and `createRelationship` apply changes immediately in the UI; on API failure, they roll back and show error toasts.
- **Nodes:** Each `GedcomIndividual` → React Flow `Node<PersonNodeData>` of type `'person'`
- **Edges:** Built from `GedcomFamily` records:
  - `husbandId ↔ wifeId` = Spouse edge (straight, dashed, orange `#FF8C00`)
  - `parentId → childId` = Parent-child edge (smoothstep, solid, cobalt `#0047AB`)

### 4.3 Custom Node System (React Flow)

React Flow's `nodeTypes` registry maps `'person'` → `PersonNode` component:
- **Gender border:** Left-accent colored by sex (blue M, orange F, gray U)
- **Multi-role badge:** Amber `⚠ N` badge when `detectedRoles.length > 1`
- **Handles:** Top (target, cobalt), Bottom (source, orange), Left/Right (spouse, orange)

### 4.4 Editor Components

- **EditPersonPanel:** Slide-in side panel (320px) for editing person details. Cobalt header, orange save button. Includes inline delete confirmation dialog.
- **ConnectionTypeModal:** Appears when an edge is drawn between two nodes. User chooses Parent→Child or Spouse.
- **GedcomDatePicker:** Custom date picker outputting GEDCOM format (`D MMM YYYY`). Features a 4×3 month grid, day/year number inputs, and live preview.

### 4.5 API Proxy

Vite dev server proxies `/api/*` to `http://localhost:3000` to avoid CORS issues during development. In production, configure the reverse proxy at the deployment layer.

### 4.6 Tailwind v4 (CSS-First Configuration)

No `tailwind.config.js` file. Design tokens are defined in `index.css` using `@theme`:

```css
@theme {
  --color-nox-cobalt: #0047AB;
  --color-nox-orange: #FF8C00;
  --color-nox-surface: #0f172a;
  /* ... */
}
```

These generate Tailwind utility classes like `bg-nox-cobalt`, `text-nox-orange`, `border-nox-surface-lighter`.

---

## 5. Routing (react-router-dom)

All routes are declared in `App.tsx` using `<Routes>`:

| Path                 | Component          | Guard          | Description                                          |
|----------------------|--------------------|----------------|------------------------------------------------------|
| `/login`             | `LoginPage`        | —              | Email/Password + Google SSO; Sign-up + Resend        |
| `/auth/callback`     | `AuthCallback`     | —              | OAuth/email confirmation → /dashboard                |
| `/forgot-password`   | `ForgotPassword`   | —              | Request password reset email                         |
| `/update-password`   | `UpdatePassword`   | —              | Set new password (requires PASSWORD_RECOVERY session) |
| `/dashboard`         | `Dashboard`        | ProtectedRoute | Project list; unconfirmed-user warning banner        |
| `/visualizer`        | `VisualizerPage`   | ProtectedRoute | Tree editor (no active project)                      |
| `/visualizer/:id`    | `VisualizerPage`   | ProtectedRoute | Tree editor for a specific project                   |
| `*`                  | —                  | —              | Redirects to `/dashboard`                            |

---

## 6. Environment Variables

| Variable               | Required | Description                                |
|------------------------|----------|---------------------------------------------|
| `VITE_SUPABASE_URL`    | ✅ Yes   | Supabase project URL                       |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anonymous/public key              |

---

## 7. Design Tokens (Noxwork Palette)

| Token                | Value       | Usage                          |
|----------------------|-------------|--------------------------------|
| `nox-cobalt`         | `#0047AB`   | Primary brand, parent edges    |
| `nox-cobalt-light`   | `#1a6dd4`   | Hover states, active accents   |
| `nox-cobalt-dark`    | `#003080`   | Deep accents                   |
| `nox-orange`         | `#FF8C00`   | Secondary brand, spouse edges  |
| `nox-orange-light`   | `#ffaa40`   | Hover states                   |
| `nox-orange-dark`    | `#e07800`   | Pressed states                 |
| `nox-surface`        | `#0f172a`   | Main background (slate-900)    |
| `nox-surface-light`  | `#1e293b`   | Card/node backgrounds          |
| `nox-surface-lighter`| `#334155`   | Borders, separators            |
| `nox-text`           | `#f1f5f9`   | Primary text                   |
| `nox-text-muted`     | `#94a3b8`   | Secondary/label text           |
| `nox-male`           | `#3b82f6`   | Male gender indicator          |
| `nox-female`         | `#f97316`   | Female gender indicator        |
| `nox-unknown`        | `#6b7280`   | Unknown gender indicator       |
| `nox-warning`        | `#f59e0b`   | Multi-role badge               |
| `nox-danger`         | `#ef4444`   | Errors, destructive actions    |

---

## 8. Available npm Scripts

| Script    | Command                  | Purpose                         |
|-----------|--------------------------|---------------------------------|
| `dev`     | `vite`                   | Dev server with HMR at `:5173`  |
| `build`   | `tsc -b && vite build`   | Type-check + production build   |
| `preview` | `vite preview`           | Preview production build        |
| `lint`    | `eslint .`               | Lint all source files           |

---

## 9. Roadmap

### ✅ Phase 1 — Canvas Setup & Custom Node
- [x] Vite + React 19 + TypeScript scaffolded
- [x] Tailwind v4 with Noxwork dark theme
- [x] React Flow canvas with background, controls, minimap
- [x] PersonNode with gender borders + multi-role badge
- [x] FileUploader with drag-and-drop
- [x] Zustand store with upload → parse → render pipeline

### ✅ Phase 2 — Automatic Layout
- [x] Dagre integration for hierarchical top-to-bottom positioning
- [x] Spouse alignment post-processing (same Y, adjacent X)
- [x] Generational rank assignment via parent-child edge graph

### ✅ Phase 3 — Editor Mode & Backend Sync
- [x] Add / delete individual nodes (with API sync)
- [x] Debounced position sync via `PATCH /projects/:id/positions`
- [x] Optimistic updates with rollback on API failure

### ✅ Phase 4 — Dashboard & Auth
- [x] Supabase Google SSO + Email/Password login + registration
- [x] React Router DOM routes: `/login`, `/auth/callback`, `/dashboard`, `/visualizer/:id`
- [x] `ProtectedRoute` guard, `Dashboard` page, `ProjectTable`, `EmptyState`
- [x] `useProjectStore`: CRUD operations with optimistic updates, JWT auth headers

### ✅ Phase 5 — Email Auth Flow
- [x] Email/Password sign-in and sign-up
- [x] `ForgotPassword` + `UpdatePassword` pages with live strength meter
- [x] `Toast` system: Noxwork-branded toast notifications

### ✅ Phase 6 — Persistence Layer (Upload + Hydration)
- [x] `useTreeStore.loadProject(projectId)` — hydrates React Flow canvas from DB
- [x] `useTreeStore.uploadToProject()` — persisted GEDCOM uploads
- [x] `isHydrating` state flag for loading spinner

### ✅ Phase 7 — Manual Editing & Position Persistence
- [x] **EditPersonPanel** — Slide-in side panel for editing firstName, lastName, gender, birthDate
- [x] **ConnectionTypeModal** — Choose Parent→Child or Spouse when drawing edges
- [x] **Create New Person** — Inline form in sidebar with name inputs + gender picker
- [x] **Delete Person** — Inline confirmation dialog with cascade edge cleanup
- [x] **GedcomDatePicker** — Custom date picker outputting GEDCOM format (D MMM YYYY)
- [x] **Position persistence** — Node positions saved to DB, restored on load
- [x] **Auto Organize button** — Dagre layout + batch save positions
- [x] **Zustand CRUD actions** — createPerson, updatePerson, deletePerson, createRelationship
- [x] **i18n** — All editor keys in EN + ES

### 🔲 Phase 8 — Interactivity & Polish
- [ ] Search / filter individuals
- [ ] Highlight kinship paths on hover
- [ ] Zoom to selected individual
- [ ] Responsive sidebar (collapsible on mobile)
- [ ] Keyboard shortcuts
- [ ] Export tree as PNG/PDF

### 🔲 Phase 9 — Deployment
- [x] Vercel deploy configuration
- [ ] Environment variable management for staging/production

---

## 10. Key Gotchas & Conventions

1. **Tailwind v4 uses CSS-first config** — design tokens go in `index.css` via `@theme`, NOT in a `tailwind.config.js`
2. **`verbatimModuleSyntax` is enabled** — use `import type { ... }` for type-only imports
3. **React Flow v12 import** — use `@xyflow/react`, NOT the old `reactflow` package
4. **React Flow `colorMode="dark"`** — enables built-in dark theme for controls/background
5. **Vite proxy** handles `/api` routing in dev — no hardcoded `localhost:3000` URLs in components
6. **Zustand v5** — no more `create<T>()(...)` double-call pattern; just `create<T>(...)` directly
7. **Node type key `'person'`** — registered in `TreeCanvas.tsx`, used in `useTreeStore.ts` when mapping
8. **Spouse edges use `data.isSpouse`** — controls Dagre exclusion and post-process alignment
9. **PersonNodeData needs `[key: string]: unknown`** — React Flow v12 requires node data to satisfy `Record<string, unknown>`
10. **`useAuthStore.initialize()`** must be called once in `App.tsx` via `useEffect`
11. **Supabase env vars** — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required
12. **Auth redirect URIs** — Register `{origin}/auth/callback` AND `{origin}/update-password` in Supabase Dashboard
13. **API auth headers** — `getAccessToken()` from `src/lib/supabase.ts` adds `Authorization: Bearer {token}` to every request
14. **Toast system** — `useToast()` hook from `src/components/Toast.tsx`; `ToastProvider` must wrap the app
15. **Password recovery flow** — `UpdatePassword` listens for `onAuthStateChange(PASSWORD_RECOVERY)`
16. **Dual ID system** — GEDCOM-imported nodes use `gedcomId` (e.g. `@I5@`) as their React Flow node ID; manually created nodes use their database UUID
17. **Position persistence** — `flushPositionUpdates` debounces 1s then batch-saves via `PATCH /projects/:id/positions` with auth headers
18. **Conditional layout** — `loadProject()` skips `applyLayout()` when saved positions exist in the API response
19. **GedcomDatePicker** — Outputs dates in GEDCOM standard format `D MMM YYYY` (e.g. `8 DEC 1977`); supports partial dates (year-only, month+year)
