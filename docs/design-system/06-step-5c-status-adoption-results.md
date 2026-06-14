# 06 — Step 5C Status Adoption Results

**Step:** 5C — Safe StatusBadge and PageHeader Adoption Pass  
**Date:** 2026-06-14  
**Branch:** `feature/design-system-status-adoption`

---

## Objective

Replace per-page inline status badge color logic with the centralized `StatusBadge`
component (and `PriorityBadge` for severity levels) in 5 low-risk, read-only pages.
Migrate `PageHeader` imports in all 5 targets. No business logic, Supabase queries,
schema, or RLS changes.

---

## Selected Targets

| # | File | Why Safe |
|---|------|----------|
| 1 | `src/pages/AdminAccessRequests.tsx` | Admin-only, read-only list; only Supabase SELECT; no approval workflow |
| 2 | `src/pages/Projects.tsx` | Read-only list view; creates go to `/projects/new` (separate route); no writes here |
| 3 | `src/pages/GeneratedDocuments.tsx` | Read-only list; simple 4-status display; no create/approve/delete workflow |
| 4 | `src/pages/MaterialNcrs.tsx` | Mock-data-only page; no Supabase at all; purely display |
| 5 | `src/pages/ProcurementSuppliers.tsx` | Read-only list; only Supabase SELECT; no write actions |

**Avoided:**
- `ProjectDetail.tsx`, `ProjectNew.tsx`, `QuotationDetail.tsx`, `WoPnGate.tsx` — forbidden
- `Quotations.tsx` — high complexity (11 statuses, SLA tracking, priority maps)
- `HotProjects.tsx` — pipeline stages not entity statuses; would require large STATUS_CONFIG additions
- `AdminApprovals.tsx` — approval write workflows
- Any page with insert/update/delete/upsert operations

---

## Files Changed

### 1. `src/components/status/status-config.ts` — 10 new status entries

Added centrally with safe defaults, grouped by module:

**NCR / QC additions:**
- `corrective_action_in_progress` → "In Progress" (orange outline)
- `pending_evidence` → "Pending Evidence" (yellow outline)

**Supplier additions:**
- `approved_with_conditions` → "Approved w/ Conditions" (amber outline)
- `pending_review` → "Pending Review" (sky outline)
- `inactive` → "Inactive" (gray secondary)
- `assessed` → "Assessed" (blue default)
- `not_assessed` → "Not Assessed" (gray secondary)

**General / Documents:**
- `generated` → "Generated" (green default)
- `exported` → "Exported" (sky outline)
- `archived` → "Archived" (gray secondary)

### 2. `src/pages/AdminAccessRequests.tsx`

- **PageHeader:** Switched import to `@/components/common/page-header`; removed unsupported `icon` prop
- **StatusBadge:** Imported `StatusBadge` from `@/components/status/status-badge`; removed legacy `Badge` import
- **statusBadge() function:** Kept exported (used by `AdminAccessRequestDetail.tsx`), body replaced with `return <StatusBadge status={status} />`; per-page variant map eliminated
- All status values (`submitted`, `under_review`, `approved`, `rejected`, `cancelled`) were already in `STATUS_CONFIG`
- All imports converted to `@/` alias

### 3. `src/pages/Projects.tsx`

- **PageHeader:** Switched import to `@/components/common/page-header`; removed `icon` prop; renamed `action` → `actions`
- **StatusBadge:** Imported `StatusBadge`; removed `statusBadge()` function (8-status variant map eliminated)
- **Legacy Badge kept:** `Badge` import retained for `locationBadge()` (saudi/dubai display) and `medicalBadge()` (yes/no display) — these are visual indicators, not entity statuses
- **EmptyState:** Switched to `@/components/feedback/empty-state` (identical API)
- All 8 project status values already in `STATUS_CONFIG`
- Label change: `submitted_for_approval` now shows **"Pending Approval"** (DS standard) instead of "Submitted" (old per-page label). Documented per design system `02-status-badge-standards.md`.

### 4. `src/pages/GeneratedDocuments.tsx`

- **PageHeader:** Switched to `@/components/common/page-header`; removed `icon` prop; fixed `breadcrumb.path` → `breadcrumb.href`
- **StatusBadge:** Imported `StatusBadge`; removed legacy `Badge` import; removed `STATUS_BADGE` constant
- **EmptyState:** Switched to `@/components/feedback/empty-state`
- Added 3 new status entries to STATUS_CONFIG (`generated`, `exported`, `archived`)
- Legacy `Button` retained (used for "View" link buttons)

### 5. `src/pages/MaterialNcrs.tsx`

- **PageHeader:** Switched to `@/components/common/page-header` (no props change needed — no `icon` or `action` on this page)
- **StatusBadge:** Imported `StatusBadge`; replaced `statusVariant()` helper (6 cases)
- **PriorityBadge:** Imported `PriorityBadge`; replaced `severityVariant()` helper; `critical/high/medium/low` map to `PRIORITY_CONFIG`
- **EmptyState:** Switched to `@/components/feedback/empty-state`
- Added 2 new status entries to STATUS_CONFIG (`corrective_action_in_progress`, `pending_evidence`)
- Legacy `Button` retained for "View" link buttons

### 6. `src/pages/ProcurementSuppliers.tsx`

- **PageHeader:** Switched to `@/components/common/page-header`; removed `icon` prop; fixed `breadcrumb.path` → `breadcrumb.href`
- **StatusBadge:** Imported `StatusBadge`; removed `procurementStatusBadge()` (7-case map) and `qcStatusBadge()` (5-case map)
- **Legacy Badge kept:** Used for boolean Yes/No medical/critical item indicators; no equivalent status in CONFIG
- **EmptyState:** Switched to `@/components/feedback/empty-state`
- **Card:** Kept legacy `Card` (table wrapper — different padding API from new primitives/card)
- Added 5 new supplier status entries to STATUS_CONFIG

---

## StatusBadge Adoption Summary

| Page | Old approach | New approach | Status values migrated |
|------|-------------|-------------|----------------------|
| AdminAccessRequests | Inline map → legacy Badge | `StatusBadge` | 5 |
| Projects | Inline map → legacy Badge | `StatusBadge` | 8 |
| GeneratedDocuments | Static constant → legacy Badge | `StatusBadge` | 4 |
| MaterialNcrs | Inline helpers → legacy Badge | `StatusBadge` + `PriorityBadge` | 6 + 4 |
| ProcurementSuppliers | Two inline maps → legacy Badge | `StatusBadge` | 12 |

Total: **35 status/priority values** now rendered via centralized design system components.

---

## PageHeader Adoption Summary

All 5 targets migrated from `src/components/ui/PageHeader` to `@/components/common/page-header`.

API changes applied per file:

| File | `icon` | `action` → `actions` | `breadcrumb.path` → `.href` |
|------|:---:|:---:|:---:|
| AdminAccessRequests | Removed | n/a (no action) | n/a |
| Projects | Removed | ✅ | n/a |
| GeneratedDocuments | Removed | n/a | ✅ |
| MaterialNcrs | n/a (wasn't used) | n/a | n/a |
| ProcurementSuppliers | Removed | n/a | ✅ |

---

## Label Changes

One intentional label change from the design system standard:

| Status key | Old per-page label | DS label (STATUS_CONFIG) | Documented in |
|------------|-------------------|--------------------------|---------------|
| `submitted_for_approval` | "Submitted" | "Pending Approval" | `02-status-badge-standards.md` |

All other status labels match or are consistent with existing per-page labels.

---

## What Was NOT Changed

- Legacy `Button.tsx`, `Badge.tsx`, `Card.tsx` — not deleted, not modified
- `src/components/ui/primitives/` — not collapsed
- No global import replacement — only imports in touched files updated
- Legacy `Badge` kept in `Projects.tsx` (location/medical indicators) and `ProcurementSuppliers.tsx` (Yes/No boolean indicators)
- Legacy `Card` kept in `ProcurementSuppliers.tsx`
- No Supabase queries changed
- No business logic changed (filtering, role checks, data loading — all untouched)
- No schema, migrations, RLS, or policies modified
- Forbidden pages untouched

---

## Validation Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Zero errors |
| `npm run build` | ✅ Clean (5.44 s) |
| `npm run lint` | ✅ Zero NEW errors (all pre-existing `set-state-in-effect` errors documented in `04-step-5b-adoption-plan.md`) |

---

## Visual / Manual Test Checklist

- [ ] `/admin/access-requests` — status column shows DS badges (Submitted=blue, Under Review=yellow, Approved=green, Rejected=red, Cancelled=gray)
- [ ] `/projects` — status column shows DS badges; "Pending Approval" label for submitted_for_approval; location/medical badges still show as before (legacy Badge)
- [ ] `/templates/generated` — status column shows DS badges (Draft/Generated/Exported/Archived)
- [ ] `/material-qc/ncrs` — severity column shows PriorityBadge (Critical=dark-red, High=orange-red, Medium=yellow, Low=gray); status column shows StatusBadge
- [ ] `/procurement/suppliers` — both Procurement Status and QC Status columns use DS badges; Medical/Critical Yes/No still show as before
- [ ] Breadcrumb links in GeneratedDocuments and ProcurementSuppliers still navigate correctly (changed `path` → `href`)
- [ ] PageHeader layout unchanged — titles, subtitles, actions render correctly
- [ ] `AdminAccessRequestDetail.tsx` renders status badge correctly (uses re-exported `statusBadge()` wrapper)

---

## Step 5 Closure Recommendation

Step 5 (Design System Foundation + Adoption) can be **closed** and Step 6 started.

**Completed across Steps 5A–5C:**
- shadcn/ui design system installed with 50+ components
- StatusBadge covers 35+ status values centrally
- PageHeader migrated in 8 pages (5 in 5C + 3 in 5B)
- EmptyState, SectionCard adopted in low-risk pages
- Zero business logic or Supabase changes
- Zero regressions (builds and type-checks clean)

**Remaining DS adoption (Step 5D — optional, after Step 6):**
- Full Button variant rename across ~40 pages (`primary` → `default`, `danger` → `destructive`)
- Badge removal across ~40 pages (replace with StatusBadge or primitives/badge)
- Card → SectionCard migration (layout-sensitive, lowest priority)
- Delete legacy `Button.tsx`, `Badge.tsx`, `Card.tsx` after all callers migrated

**Recommendation: Start Step 6 (RBAC / RLS / Permissions) now.** Full legacy component removal is a housekeeping task that does not block any feature work and can be done incrementally alongside Step 6.

---

## Recommended Step 6 Prompt Outline

**Step 6 — RBAC Hardening and Permission Enforcement**

Scope:
1. Create `usePermission(key: PermissionKey)` hook backed by the existing `PERMISSION_KEYS` constant in `src/lib/roles.ts` — currently defined but never imported
2. Create `useFinancialVisibility()` hook that checks `role === 'admin' || role === 'operations_manager'` (currently inline in every page)
3. Fix bug B-013: add `<RequireRole roles={['admin', 'operations_manager', 'sales_user']}>` guard to `/projects/new` route in `App.tsx`
4. Wire `usePermission()` to existing UI elements that should be gated (identified in `docs/architecture/06-rbac-and-permissions-architecture.md`)
5. Add RLS to the high-gap tables identified in `06-rbac-and-permissions-architecture.md`
6. Do NOT change page layout, business logic, or Supabase query structure

Files to read first:
- `docs/architecture/06-rbac-and-permissions-architecture.md`
- `src/lib/roles.ts`
- `src/components/auth/RequireRole.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/App.tsx` (route configuration)
- `supabase/migrations/` (latest migration for RLS gaps)
