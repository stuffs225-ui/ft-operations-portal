# Tooling: Full Role-Page Screenshot Baseline

## Purpose

Capture a visual baseline of every accessible page in the FT Operations Portal for every user role, before any UX or design improvements are applied. This establishes a before/after reference for the Phase 1 Design System Modernisation.

## Branch

`tooling/full-role-page-screenshot-baseline`

## Scope

- 12 test accounts covering all 10 application roles
- ~80+ static routes catalogued
- 14 modules documented with artifact review briefs
- Visual gallery HTML index generated

## Tool Architecture

```
tools/screenshots/
├── capture-all-role-pages.mjs     Main runner (Playwright)
├── generate-screenshot-index.mjs  Index + summary generator
├── screenshot-routes.mjs          Route catalogue
├── screenshot-accounts.mjs        Account registry
├── screenshot-modules.mjs         Module metadata
└── README.md                      Usage documentation
```

## Output Structure

```
docs/artifact-context/
├── artifact-review-master-brief.md
├── screenshots/
│   ├── index.html                  Visual review gallery
│   ├── screenshot-run-summary.md   Run summary
│   ├── .auth/                      Playwright auth states (gitignored)
│   ├── admin/
│   │   ├── 01-sales/
│   │   ├── 12-admin/
│   │   └── ... (per module)
│   ├── coo/
│   └── ... (per account)
├── 01-sales/artifact-brief.md
├── 02-sales-coordinator/artifact-brief.md
├── 03-projects-so/artifact-brief.md
├── 04-procurement/artifact-brief.md
├── 05-store-warehouse/artifact-brief.md
├── 06-factory/artifact-brief.md
├── 07-qc/artifact-brief.md
├── 08-dubai-afs/artifact-brief.md
├── 09-after-sales/artifact-brief.md
├── 10-reports/artifact-brief.md
├── 11-control-tower/artifact-brief.md
├── 12-admin/artifact-brief.md
└── 13-viewer-management/artifact-brief.md
```

## Security Measures

- Credentials loaded exclusively from `.env.screenshots.local` (gitignored)
- Playwright auth state files gitignored
- Screenshot images gitignored
- Passwords never logged or printed
- Run results JSON (gitignored) contains no credentials

## Running the Tool

```bash
# Prerequisites
cp .env.screenshots.example .env.screenshots.local
# fill in credentials

npm install @playwright/test
npm run dev &   # start dev server

# Run capture
node tools/screenshots/capture-all-role-pages.mjs

# Generate index
node tools/screenshots/generate-screenshot-index.mjs

# Open gallery
open docs/artifact-context/screenshots/index.html
```

## Accounts Covered

| Key | Role | Landing Page |
|-----|------|-------------|
| admin | admin | /admin-dashboard |
| stuffs | admin | /admin-dashboard |
| coo | operations_manager | /control-tower |
| ops | operations_manager | /control-tower |
| testsales | sales_user | /sales |
| sales_test | sales_user | /sales |
| procurement | procurement_user | /procurement |
| factory | factory_user | /factory |
| store | store_user | /store |
| qc | qc_user | /qc |
| afs | afs_user | /dubai-afs |
| viewer | viewer | /management-dashboard |

## What is NOT Captured

- Dynamic routes (e.g., `/projects/:id`) unless `SAMPLE_*` env vars are set
- Modals and drawers (require interaction)
- Hover/active states
- Mobile/responsive viewports (desktop 1440×1000 only)
- Authenticated error states

## Constraints

This tooling branch:
- Does NOT modify any application source files
- Does NOT change routes, navigation, roleMatrix, or business logic
- Does NOT commit screenshots, auth states, or credentials
- Only adds tooling and documentation files
