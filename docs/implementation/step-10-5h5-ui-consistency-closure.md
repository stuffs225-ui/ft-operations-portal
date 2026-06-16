# Step 10.5H.5 — UI Consistency Closure

**Date:** 2026-06-16
**Branch:** `feature/step-10-5h5-ui-consistency-closure`
**Scope:** Close remaining UI consistency items from Step 10.5H audit
**Depends on:** Step 10.5H (PR #85 merged into main)

---

## Executive Summary

Closes all remaining UI consistency items from the Step 10.5H audit:

1. **Part B** — Completed EmptyState standardisation: migrated 2 remaining pages
   (`MaterialNcrs.tsx`, `ProcurementSuppliers.tsx`) to canonical `ui/EmptyState`.
   `feedback/empty-state.tsx` now has zero consumers and can be deprecated.

2. **Part C** — Added `icon?` prop support to `common/page-header.tsx`, unblocking
   migration of all 30 `ui/PageHeader` consumers (previously only 13 Group B pages
   were blocked by restricted-module constraints; 17 Group A pages were additionally
   blocked by missing `icon=` support).

3. **Part D** — Migrated 3 safe non-restricted pages (`Quotations`, `Sales`,
   `SalesCoordinator`) from legacy `ui/PageHeader` to canonical `common/page-header`.
   These were the Group A pages without layout risk (all use `space-y-6` wrapper that
   provides equivalent spacing to the legacy `mb-6`).

4. **Part E** — Loading state guidelines documented below.

---

## Part A — Baseline Verification

| Check | Result |
|-------|--------|
| PR #85 Step 10.5H merged | ✅ Confirmed — merge commit `729b38b` |
| `npm run build` on latest main before changes | ✅ built in 8.35s, zero errors |
| AuditLog, GeneratedDocuments, Projects on `ui/EmptyState` | ✅ Confirmed |
| MaterialNcrs on old `feedback/empty-state` | ✅ Confirmed (to be migrated) |
| ProcurementSuppliers on old `feedback/empty-state` | ✅ Confirmed (to be migrated) |

**Blocking issues found:** None.

---

## Part B — EmptyState Standardisation (Final 2 Pages)

### Changes made

| File | Change |
|------|--------|
| `src/pages/MaterialNcrs.tsx` | `import { EmptyState } from '../components/ui/EmptyState'` (was `@/components/feedback/empty-state`) |
| `src/pages/ProcurementSuppliers.tsx` | `import { EmptyState } from '../components/ui/EmptyState'` (was `@/components/feedback/empty-state`) |

Both components have identical `icon`, `title`, `description`, `action`, `className` props.
Call sites are unchanged.

**Visual effect:** Empty state icon containers in MaterialNcrs and ProcurementSuppliers will
now show `bg-brand-50` tinted background and `text-brand-400` icon colour instead of neutral
`bg-muted`.

### `feedback/empty-state.tsx` status

After these two migrations, `src/components/feedback/empty-state.tsx` has **zero consumers**
across the entire codebase. Verified by grep — no remaining import of `feedback/empty-state`.
The file can be deleted in a future cleanup step (deferred to avoid risk; it is dead code).

**Build evidence:** The `empty-state-*.js` chunk present in the Step 10.5H baseline bundle
(`0.54 kB`) is absent from the Step 10.5H.5 post-change bundle — confirming zero consumers.

---

## Part C — `icon?` Prop Added to `common/page-header.tsx`

### Motivation

`ui/PageHeader.tsx` supports `icon?: React.ReactNode` (17 Group A consumers depend on it).
`common/page-header.tsx` did not — blocking migration of all Group A pages.

### Change

Added `icon?: React.ReactNode` to `PageHeaderProps` interface and render it in the same
visual style as `ui/PageHeader.tsx`:

```tsx
{icon ? (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  </div>
) : (
  <>
    <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">{title}</h1>
    {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
  </>
)}
```

**Backwards compatibility:** The conditional structure means all existing callers without
`icon=` are completely unaffected — the rendered output is identical to pre-change.

**Bundle size:** `page-header-*.js` grew from 0.91 kB to 1.36 kB (icon render logic added).

---

## Part D — PageHeader Migration (3 Safe Pages)

### Migration criteria

To qualify for migration in this step:
1. No `icon=` prop used on the PageHeader call site (or icon prop now supported after Part C)
2. Outer wrapper uses `space-y-6` (so `mb-6` loss from legacy component is neutral)
3. Not in a restricted module (QC, Store, Dubai/AFS, Factory)

### Pages migrated

| Page | `action=` → `actions=` | Breadcrumb change | Notes |
|------|------------------------|-------------------|-------|
| `Quotations.tsx` | ✅ renamed | None (no breadcrumb) | `space-y-6` wrapper |
| `Sales.tsx` | ✅ renamed | None (no breadcrumb) | `space-y-6` wrapper |
| `SalesCoordinator.tsx` | — (no action prop) | None (no breadcrumb) | `space-y-6` wrapper |

**No other changes** — page logic, queries, role guards unchanged.

### Updated `ui/PageHeader` consumer count

| Group | Before | After |
|-------|--------|-------|
| Group A (icon users) | 17 | 17 (migration unblocked by Part C; deferred to next step) |
| Group B (no icon, restricted modules) | 13 | 13 (deferred) |
| Non-restricted, no icon | 3 | **0** (migrated above) |
| **Total `ui/PageHeader` consumers** | **30** | **27** |

---

## Part E — Loading State Guidelines

### Three loading patterns in this codebase

| Pattern | Component | Usage | Py spacing |
|---------|-----------|-------|------------|
| Route-chunk fallback | `PageLoader` | Suspense `fallback=` in `App.tsx` lazy routes | `py-24` |
| Data loading (list pages) | Inline `Loader2` | While Supabase fetch is in flight | `py-16` |
| Data loading (panel/card) | `PageLoader` (reused) | Inside a card/panel while fetching | Inner `py-4` wrapper |

### When to use which

**`PageLoader`** — use only for:
- React Suspense lazy-route chunk fallbacks (`<Suspense fallback={<PageLoader />}>`)
- Full-page data loading inside a card panel (e.g., `GeneratedDocuments.tsx` wraps it in `<div className="py-4">`)

**Inline `Loader2` spinner** — use for:
- List/table pages where data is fetching (Projects, Quotations, etc.)
- The pattern: `<div className="flex items-center justify-center py-16"><Loader2 size={24} className="text-brand-500 animate-spin" /></div>`
- Keeps visual height smaller than `PageLoader` (py-16 vs py-24) — intentional for list pages

**Decision rule:** If the loading replaces a full route (user has navigated to the page), use `PageLoader`. If it replaces a data list or section within a page that has already rendered its header and chrome, use inline `Loader2`.

**No code changes required** — existing usage is already correct and consistent with these guidelines.

---

## Part F — Files Changed

| File | Change |
|------|--------|
| `src/pages/MaterialNcrs.tsx` | EmptyState import → `ui/EmptyState` |
| `src/pages/ProcurementSuppliers.tsx` | EmptyState import → `ui/EmptyState` |
| `src/components/common/page-header.tsx` | Added `icon?: React.ReactNode` prop |
| `src/pages/Quotations.tsx` | PageHeader import → `common/page-header`; `action=` → `actions=` |
| `src/pages/Sales.tsx` | PageHeader import → `common/page-header`; `action=` → `actions=` |
| `src/pages/SalesCoordinator.tsx` | PageHeader import → `common/page-header` |
| `docs/implementation/step-10-5h5-ui-consistency-closure.md` | This file |

---

## Governance Preservation

- No business logic changed
- No Supabase queries changed
- No route guards changed
- No RLS / schema / migration changes
- No route paths changed or deleted
- No navigation structure changed
- No Dashboard logic changed
- No ProjectDetail logic changed
- No QC / Store / Factory / Dubai / AFS logic changed
- No approval logic changed
- No new dependencies added
- Component APIs fully backwards compatible (`icon=` is optional, defaults to nothing)
- All existing `common/page-header` consumers unaffected (no icon, no layout change)

---

## Validation

| Check | Result |
|-------|--------|
| `npm run build` before changes (on main) | ✅ built in 8.35s, zero errors |
| `npm run build` after changes | ✅ built in 6.57s, zero errors |
| `feedback/empty-state` consumers remaining | ✅ 0 — confirmed by grep |
| `empty-state-*.js` chunk in bundle | ✅ Gone (was present in Step 10.5H baseline) |
| `page-header` bundle size | 0.91 kB → 1.36 kB (icon logic added — expected) |
| `ui/PageHeader` consumers | 30 → 27 (3 migrated to `common/page-header`) |

---

## Manual Test Checklist

- [ ] `npm run build` passes
- [ ] Quotations page renders; header layout unchanged; New Quotation button present for permitted roles
- [ ] Sales Workspace renders; header layout unchanged; action buttons present
- [ ] Sales Coordinator renders; header layout unchanged
- [ ] MaterialNcrs renders; "No NCRs" empty state shows brand-50 icon container
- [ ] ProcurementSuppliers renders; "No suppliers found" empty state shows brand-50 icon container
- [ ] Pages that already used `common/page-header` (Dashboard, Projects, AuditLog, etc.) unchanged
- [ ] `ui/PageHeader` pages with `icon=` (HotProjectDetail, CustodyDetail, etc.) unchanged
- [ ] No route paths changed
- [ ] No business logic changed

---

## Remaining UI Debt (Post Step 10.5H.5)

| Item | Blocker | Recommended Step |
|------|---------|-----------------|
| `ui/PageHeader` → `common/page-header` (Group B, 13 pages) | Restricted modules (QC/AFS/Store/Dubai) | Step 10.5I Part A |
| `ui/PageHeader` → `common/page-header` (Group A, 17 pages) | Restricted modules + `icon=` now supported | Step 10.5I Part A |
| Delete `feedback/empty-state.tsx` (zero consumers) | None — safe to delete | Step 10.5I Part B |

---

## Step 10.5I Recommended Scope

| Part | Description |
|------|-------------|
| A | PageHeader Group A + B migration: remaining 27 consumers across all modules. `icon=` support is now in place on `common/page-header.tsx`. Migration pattern: rename `action=` → `actions=`, rename `breadcrumb.{path}` → `breadcrumb.{href}`, drop the wrapper `mb-6` where callers have their own spacing |
| B | Delete `src/components/feedback/empty-state.tsx` — zero consumers confirmed |
| C | Final audit: confirm `ui/PageHeader.tsx` consumer count reaches 0 and can be deprecated |
