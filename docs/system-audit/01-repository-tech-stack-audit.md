# 01 — Repository & Tech Stack Audit

---

## Framework & Runtime

| Item | Value |
|------|-------|
| Framework | React 18.3.1 (SPA, NOT Next.js) |
| Build Tool | Vite 6.0.5 |
| Language | TypeScript 5.7.2 |
| Package Manager | npm (package-lock.json present) |
| Node Version | Specified via `.nvmrc` |
| Deployment Target | Vercel (vercel.json present) |
| Routing | React Router DOM 6.28.0 (client-side SPA) |

---

## Main Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| `@supabase/supabase-js` | ^2.106.2 | Auth + DB + Storage |
| `react` / `react-dom` | ^18.3.1 | Stable, current |
| `react-router-dom` | ^6.28.0 | Stable |
| `lucide-react` | ^0.469.0 | Icon library — correct |
| `tailwindcss` | ^3.4.17 | Utility CSS |
| `typescript` | ^5.7.2 | Stable |
| `vite` | ^6.0.5 | Latest major |
| `autoprefixer` / `postcss` | Tailwind pipeline | Correct |

**Notable absences:**
- No `shadcn/ui` or `@radix-ui/*` — all UI components are custom-built
- No form library (`react-hook-form`, `zod`) — forms use local `useState`
- No data table library (`tanstack/table`) — tables are bespoke HTML
- No state management (`zustand`, `jotai`) — all local state + context
- No date library (`date-fns`, `dayjs`) — native `Date` objects
- No chart library (`recharts`, `chart.js`) — reports use no visualizations yet
- No background job SDK (Inngest, Trigger.dev) — SLA is client-side only
- No email/SMS SDK (Novu, Resend) — notifications are in-app only (DB table)

---

## Folder Structure

```
ft-operations-portal/
├── src/
│   ├── app/              App.tsx — root router + lazy imports
│   ├── components/
│   │   ├── auth/         ProtectedRoute.tsx, RequireRole.tsx
│   │   ├── documents/    DocumentPanel.tsx
│   │   ├── features/     DocumentList.tsx, ReportExportBar.tsx
│   │   ├── layout/       Header.tsx, Sidebar.tsx
│   │   └── ui/           Badge, Button, Card, Drawer, EmptyState, etc.
│   ├── context/          AuthContext.tsx
│   ├── data/             Mock data files (15+ files)
│   ├── hooks/            useAuth.ts
│   ├── layouts/          AppLayout.tsx
│   ├── lib/              Business logic, Supabase client, audit helpers
│   ├── pages/            ~110 page components
│   ├── styles/           index.css (Tailwind directives)
│   ├── types/            index.ts (all app types), database.ts
│   └── main.tsx
├── supabase/
│   ├── migrations/       75 SQL migration files (001–075)
│   └── seed_real_roles.sql
├── docs/                 85+ design and planning documents
├── public/               Static assets
├── scripts/              Dev user creation scripts
├── vercel.json
├── vite.config.ts
├── tailwind.config.js
└── .env.example
```

**Observations:**
- All 110+ pages live in a flat `/pages/` folder — no feature-based organization
- No `/features/` or `/modules/` sub-grouping — discoverability suffers at scale
- `src/data/` contains 15 mock data files that should NOT exist in the production bundle
- `src/lib/` contains both client utilities and business logic in a flat structure
- No `/tests/` directory — zero automated tests exist
- No `src/services/` or `src/api/` layer — Supabase calls are scattered directly in pages

---

## Build Scripts

| Script | Command | Status |
|--------|---------|--------|
| `dev` | `vite` | Works |
| `build` | `tsc -b && vite build` | **PASS** — clean, 6.56s |
| `lint` | `eslint .` | **FAIL** — no `eslint.config.js` |
| `preview` | `vite preview` | Not tested |
| typecheck | `npx tsc --noEmit` | **PASS** — no errors |

**Build output summary:**
- Total chunks: ~70 lazy-split JS files
- Main bundle (`index-CqTIjZc7.js`): **464.90 KB** (gzip 129 KB) — oversized
- Largest page chunks: `ProjectDetail` 64.5 KB, `QuotationDetail` 30.7 KB
- Mock data files (`mockReports`, `mockStore`, `mockProcurement`) included in bundle

---

## Dependency Risks

| Risk | Detail | Severity |
|------|--------|----------|
| No ESLint config | `npm run lint` fails completely; code quality unchecked | High |
| Mock data in production bundle | 15 mock files are tree-shaken only if not imported — some pages import them directly | Medium |
| No form validation library | `useState` forms have no schema validation; server-side validation relies on Supabase constraints | Medium |
| Single `index.ts` types file | 1,673 lines — all types in one file; becomes a merge conflict magnet | Low |
| No automated tests | Zero test files; regression risk for each change | High |
| Large Supabase client | `@supabase/supabase-js` contributes significantly to bundle; not treeshaken | Medium |

---

## Architecture Observations

**Positive:**
- `getDataMode()` / `mockOrEmpty()` pattern cleanly separates mock from live
- Lazy-loaded routes via `React.lazy()` keep initial page load fast
- `AuthContext` is the single source of truth for auth state
- `current_user_role()` DB function used consistently across all RLS policies
- `SECURITY DEFINER` functions prevent role-check recursion

**Negative:**
- No service/repository layer — Supabase SDK calls are embedded directly in page components
- No error boundary components — a failed Supabase query can crash a page silently
- `AppLayout.tsx` renders `ProtectedRoute` but individual pages re-check auth redundantly
- No React Query / SWR — no caching, no deduplication, no background refetch
- `src/data/navigation.ts` and sidebar roles may drift from `RequireRole` definitions in App.tsx

---

## Alignment With Reference Library Recommendations

| Area | Current State | Reference Recommendation | Gap |
|------|---------------|--------------------------|-----|
| UI components | Custom | shadcn/ui (MIT) | High — no radix primitives, no accessible dialogs |
| CRUD patterns | Per-page custom | refine or react-admin | High — no resource abstraction |
| Form validation | Local useState | react-hook-form + zod | High — no schema validation |
| Background jobs | None | Inngest / Trigger.dev | Critical — SLA has no scheduler |
| Notifications | DB table only | Novu | Medium — no delivery engine |
| Data tables | Bespoke HTML | shadcn/ui DataTable (TanStack) | Medium — no sorting/filtering |
| Auth | Supabase Auth ✓ | Supabase recommended ✓ | None |
| Deployment | Vercel ✓ | Vercel ✓ | None |
