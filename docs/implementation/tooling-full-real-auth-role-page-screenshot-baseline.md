# Tooling — Full Real-Auth Role/Page Screenshot Baseline

**Branch:** `tooling/full-real-auth-role-page-screenshot-baseline`
**Base:** `main` @ `f9e2f5d`
**Purpose:** Provide a comprehensive visual baseline — per-role, per-page screenshots captured with real Supabase auth — to support the Phase 19 UX modernisation review.

---

## Why This Exists

Before any Phase 19 redesign work begins, reviewers need a trustworthy reference showing exactly what each role sees on each page of the portal today. A previous attempt on branch `tooling/full-role-page-screenshot-baseline` captured 96 screenshots but did so in dev/admin-only fallback mode (`.env.local` was absent), so every account saw an admin-level view. Those screenshots were invalid as a role-based baseline.

This tool enforces REAL_AUTH — if the app is not connected to real Supabase it exits immediately with code 2 — and captures independent sessions for all 12 test accounts.

---

## Tool Files

| File | Description |
|------|-------------|
| `tools/screenshots/capture-all-role-pages.mjs` | Main runner |
| `tools/screenshots/screenshot-routes.mjs` | Route catalogue from App.tsx |
| `tools/screenshots/screenshot-accounts.mjs` | 12 account registry |
| `tools/screenshots/screenshot-modules.mjs` | 14 module metadata |
| `tools/screenshots/generate-screenshot-index.mjs` | HTML gallery + summary generator |
| `tools/screenshots/README.md` | Usage guide |

---

## Route Catalogue

Routes are derived directly from `src/app/App.tsx` RequireRole guards (not hardcoded).
Each entry carries: `path`, `name`, `module`, `moduleSlug`, `moduleOrder`, `roles[]`, `dynamic`.

| Modules | Routes |
|---------|--------|
| 14 modules total | ~100 static routes + dynamic (project/quotation detail pages) |

Admin role bypasses all RequireRole guards (`role === 'admin'` always passes) and therefore captures the full route catalogue.

---

## Test Accounts

12 accounts, one Playwright browser context each:

| Key | Role |
|-----|------|
| admin | admin |
| stuffs | admin |
| coo | operations_manager |
| ops | operations_manager |
| sales-test | sales_user |
| testsales | sales_user / sales_coordinator (verified from detected landing) |
| procurement | procurement_user |
| factory | factory_user |
| store | store_user |
| qc | qc_user |
| afs | afs_user |
| viewer | viewer |

---

## REAL_AUTH Enforcement

```
node tools/screenshots/capture-all-role-pages.mjs
```

On startup the runner navigates to `/login` in an isolated browser context.
If the app redirects away from `/login` within 3 seconds, it is in dev/admin-only mode
and the process exits with code `2`.

To bypass (e.g., CI without Supabase): `--allow-dev-mode-admin-only`.

---

## Gitignored Outputs

The following are explicitly gitignored and never committed:

- `.env.local` (Supabase credentials)
- `.env.screenshots.local` (test account passwords)
- `docs/artifact-context/screenshots/.auth/` (Playwright storage states)
- `docs/artifact-context/screenshots/**/*.png`
- `docs/artifact-context/screenshots/**/*.zip`
- `tools/screenshots/screenshot-run-results.json`

---

## Artifact Review Briefs

Per-module briefs are in `docs/artifact-context/`:

| # | Module | Brief |
|---|--------|-------|
| 01 | Sales | 01-sales/artifact-brief.md |
| 02 | Sales Coordinator | 02-sales-coordinator/artifact-brief.md |
| 03 | Projects / SO | 03-projects-so/artifact-brief.md |
| 04 | Procurement | 04-procurement/artifact-brief.md |
| 05 | Store / Warehouse | 05-store-warehouse/artifact-brief.md |
| 06 | Factory | 06-factory/artifact-brief.md |
| 07 | QC | 07-qc/artifact-brief.md |
| 08 | Dubai AFS | 08-dubai-afs/artifact-brief.md |
| 09 | After Sales | 09-after-sales/artifact-brief.md |
| 10 | Reports | 10-reports/artifact-brief.md |
| 11 | Control Tower | 11-control-tower/artifact-brief.md |
| 12 | Admin | 12-admin/artifact-brief.md |
| 13 | Viewer / Management | 13-viewer-management/artifact-brief.md |

Master brief: `docs/artifact-context/artifact-review-master-brief.md`

---

## Run Record

| Field | Value |
|-------|-------|
| Supabase project | `ytmavxvfemcxixxcgfdv.supabase.co` |
| Viewport | 1440×1000 |
| Auth mode required | REAL_AUTH |
| Accounts | 12 |
| Modules | 14 |

Screenshot gallery: `docs/artifact-context/screenshots/index.html`
Run summary: `docs/artifact-context/screenshots/screenshot-run-summary.md`
