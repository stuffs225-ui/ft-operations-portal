# Step 19.3 — Commercial and Sales Coordinator Pages UX Improvement

**Branch:** `feature/step-19-3-commercial-sales-coordinator-ux`
**Status:** Complete
**Depends on:** Step 19.1 (Design System Foundation, merged PR #126), Step 19.2 (UX Audit Roadmap, merged)

---

## Objective

Apply the Step 19.1 design system tokens to 8 Commercial and Sales Coordinator pages: replace spinner/text loading states with Skeleton grids, align KPI card shapes with the token system, add `tabular-nums` to numeric values, add `bg-white` to search/select inputs (now that page background is off-white), and apply `rounded-lg`/`rounded-lg` corner consistency throughout.

**No business logic, routes, permissions, DB queries, approval flows, or role behavior was changed.**

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Sales.tsx` | Skeleton KPI grid loading state; `rounded-xl` → `rounded-lg` on KPI cards, alert banner, pipeline strip; `tabular-nums` on KPI values; removed unused `Loader2` import |
| `src/pages/Quotations.tsx` | Replaced `PageLoader` with inline table skeleton; `bg-white` on search input and priority select |
| `src/pages/SalesCoordinator.tsx` | Skeleton KPI grid loading state; `rounded-xl` → `rounded-lg` on KPI tiles and alert banner; `tabular-nums` on KPI values |
| `src/pages/CoordinatorQueue.tsx` | Replaced `PageLoader` with inline table skeleton; `bg-white` on search input; `rounded-xl` → `rounded-lg` on alert banner |
| `src/pages/HotProjects.tsx` | Replaced `PageLoader` with inline table skeleton; `uppercase tracking-[0.04em]` and `tabular-nums` on KPI strip; `bg-white` on search and stage select; `rounded-xl` → `rounded-lg` on table wrapper and alert banner |
| `src/pages/HotProjectNew.tsx` | `tracking-tight` on section headers |
| `src/pages/HotProjectDetail.tsx` | `inputCls`: `rounded` → `rounded-lg`, `py-1` → `py-1.5`; textarea: `rounded` → `rounded-lg`, added focus ring; replaced spinner loading with Skeleton layout; `tracking-tight` on card section headers |
| `src/pages/Receivables.tsx` | Replaced `PageLoader` with inline table skeleton; `uppercase tracking-[0.04em]` and `tabular-nums` on KPI cards; `rounded-xl` → `rounded-lg` on aging bucket buttons and table wrapper; table header `uppercase tracking-[0.04em]`; `bg-white` on search input |

---

## Changes by Category

### 1. Loading States

**Before:** Three patterns existed across the 8 pages:
- `<PageLoader />` (full-page centered spinner) — Quotations, CoordinatorQueue, HotProjects, Receivables
- Raw `<Loader2 animate-spin>` in a flex div — Sales
- Plain text `"Loading…"` — SalesCoordinator

**After:** All replaced with inline Skeleton patterns:
- KPI grid pages (Sales, SalesCoordinator): 8-card skeleton grid matching the real layout
- Table pages (Quotations, CoordinatorQueue, HotProjects, Receivables): header row + 5–6 skeleton rows with realistic column widths
- Detail page (HotProjectDetail): two-column skeleton matching the card layout

### 2. Corner Radius Consistency

`rounded-xl` (12px) was removed from pages-level divs — those should use the design system `rounded-lg` (6px via `--radius`). Affected: KPI cards, alert banners, aging bucket filter buttons, table wrappers, pipeline strip cards.

### 3. Input Contrast

All search inputs and select elements were given `bg-white` to ensure they stand out against the off-white page background (`--background: 0 0% 97.5%`).

### 4. KPI and Metric Typography

- `tabular-nums` added to all KPI value elements for stable number rendering
- `uppercase tracking-[0.04em]` added to KPI labels in HotProjects and Receivables (matching `MetricCard` label treatment)
- `tracking-tight` added to card section headers (`h3`) in HotProjectNew and HotProjectDetail

### 5. Form Input Polish (HotProjectDetail)

Inline edit inputs used `rounded` (2px) and `py-1` — updated to `rounded-lg` and `py-1.5` to match the rest of the design system. Textareas gained a proper `focus:ring-2 focus:ring-brand-600/30`.

---

## What Was Not Changed

- All business logic, data queries, mutation payloads
- All role checks (`isBroadView`, `isSalesUser`, `canCreate`, etc.)
- All quotation status transitions, coordinator assignment logic
- All Supabase filters and query structure
- All approval workflows and governance gates
- All route guards and `ROLE_MATRIX` references
- Navigation data and App.tsx
- All 130+ non-target page files

---

## Pre-existing Lint Issues in Target Files

Three `react-hooks/set-state-in-effect` errors exist in `Sales.tsx`, `HotProjectDetail.tsx`, and `Receivables.tsx` — these are pre-existing patterns (`setLoading(true)` inside `useEffect`) that were not introduced by this step and were not modified. They are part of the pre-existing 81-issue baseline.

---

## Validation

- `npm run build` — ✓ zero errors
- `npx tsc --noEmit` — ✓ zero errors
- `npx eslint` on 8 target files — 3 pre-existing errors, zero new errors

---

## Next Step

Step 19.4 — Projects / Sales Orders Experience Improvement (planned, not yet started).
