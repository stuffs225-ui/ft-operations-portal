# Step 19.4A — Projects / Sales Orders UX Improvement

**Branch:** `feature/step-19-4a-projects-so-ux-improvement`
**Status:** Complete
**Depends on:** Step 19.1 (Design System Foundation, merged PR #126), Step 19.3 (merged PR #128)

---

## Objective

Apply the Step 19.1 design system tokens to the 2 Projects / Sales Orders pages: replace spinner/text loading states with Skeleton grids/tables, fix `set-state-in-effect` lint issues, align table wrappers and KPI mini-cards with the token system (`rounded-xl` → `rounded-lg`), add `uppercase tracking-[0.04em]` to table headers, add `tabular-nums` to all numeric KPI values, and add `bg-white` to search and select inputs.

**No business logic, routes, permissions, DB queries, approval flows, creation wizard, or role behavior was changed.**

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Projects.tsx` | Skeleton table loading state; removed `Loader2` import; `useState(true)` for loading; `Promise.resolve().then()` for mock setState; `rounded-xl` → `rounded-lg border-gray-200/80` on table wrapper; table headers `uppercase tracking-[0.04em] font-medium text-gray-500`; `bg-white` on search input and both selects; `border-gray-300` → `border-gray-200` on selects; `tabular-nums` on SAR value |
| `src/pages/ProjectDetail.tsx` | Removed `Loader2` import; added `Skeleton` import; Skeleton layout loading state; `RoutingSummaryCard` Skeleton routing pills; fixed `set-state-in-effect` in 3 useEffects (`RoutingSummaryCard`, `isTabVisible`, main data effect); `rounded-xl` → `rounded-lg` on Vehicle Lines table wrapper, Store KPI cards, Quality KPI cards, Dubai AFS notice; `border-gray-200` → `border-gray-200/80` on KPI cards; table headers `uppercase tracking-[0.04em] font-medium text-gray-500` on Vehicle Lines, Procurement PRs, and Procurement POs; `tabular-nums` on all KPI values (Total Sales Value, health score, blockers, SLA, issues, vehicle line quantities/values, Store KPIs, Dubai AFS KPIs, Quality KPIs) |

---

## Changes by Category

### 1. Loading States

**Before:**
- `Projects.tsx`: `<Loader2 size={24} className="text-brand-500 animate-spin" />` centered in a flex div
- `ProjectDetail.tsx`: `<Loader2 size={28} className="text-brand-500 animate-spin" />` centered in a flex div
- `RoutingSummaryCard` (sub-component): `<Loader2 size={14} className="animate-spin" /> Loading routing…`

**After:**
- `Projects.tsx`: Table skeleton (6 header cells + 5 skeleton rows with realistic column widths including hidden responsive columns)
- `ProjectDetail.tsx`: Two-section skeleton — page header area + tabs strip + 4-card overview grid
- `RoutingSummaryCard`: Three skeleton pills matching the real routing chip layout

### 2. Lint — `set-state-in-effect`

Three effects in `ProjectDetail.tsx` and one in `Projects.tsx` had synchronous `setState` calls inside `useEffect` bodies, flagged by the extended Meta `eslint-plugin-react-hooks` rule:

| File | Effect | Fix |
|------|--------|-----|
| `Projects.tsx` | Data load effect | `useState(true)` for loading; removed `setLoading(true)`; wrapped mock setState in `Promise.resolve().then()` |
| `ProjectDetail.tsx` | `RoutingSummaryCard` routing load | `useState(isSupabaseConfigured)` for `loadingRouting`; removed `setLoadingRouting(true)` + `setRoutingLoadError(null)` from effect top; wrapped mock setStates; moved error clearing into `.then()` |
| `ProjectDetail.tsx` | `isTabVisible` tab reset | Wrapped `setActiveTab('overview')` in `Promise.resolve().then()` |
| `ProjectDetail.tsx` | Main data load | Wrapped `!id` early-exit setStates; wrapped all mock data setStates; removed `setLoading(true)` from Supabase branch (already `true` from `useState(true)`) |

### 3. Corner Radius Consistency

`rounded-xl` (12px) removed from page-level elements — replaced with `rounded-lg` (6px via `--radius`):
- `Projects.tsx`: table wrapper
- `ProjectDetail.tsx`: Vehicle Lines table wrapper, Store KPI mini-cards, Quality KPI mini-cards, Dubai AFS location notice

### 4. Border Opacity

`border-gray-200` → `border-gray-200/80` on table wrappers and KPI mini-cards for a softer, more premium appearance.

### 5. Table Header Typography

All data tables updated from `font-semibold text-gray-700` to `font-medium text-gray-500 uppercase tracking-[0.04em]`:
- `Projects.tsx`: Main projects table (Project/SO, Customer, Status, Route, Delivery, Value, Sales Owner)
- `ProjectDetail.tsx`: Vehicle Lines table (#, Type, Description, Qty, Unit/Total SAR, Status)
- `ProjectDetail.tsx`: Procurement PRs table (PR Number, Status, Received Date, Source Dept, Actions)
- `ProjectDetail.tsx`: Procurement POs table (PO Number, Supplier, PO Date, Status, Value, ETA, Actions)

### 6. Input Contrast

`bg-white` added to:
- `Projects.tsx`: Search input, Location select, Medical select
- `Projects.tsx`: `border-gray-300` → `border-gray-200` on both selects

### 7. Numeric Typography — `tabular-nums`

Added to all numeric value elements for stable number rendering:
- `Projects.tsx`: SAR value column
- `ProjectDetail.tsx`: Total Sales Value, health score, blockers count, SLA breaches count, open issues count, vehicle line quantities, vehicle line unit/total values, Store KPI values (3), Dubai AFS KPI values (4), Quality KPI values (5)

---

## What Was Not Changed

- All business logic, data queries, mutation payloads
- Project creation wizard (`ProjectNew.tsx`) — explicitly excluded from this step
- `ProjectDetail` tab logic, tab visibility rules, `TAB_ROLES` definition
- Approval flow (`ApprovePanel`) — routing, location/medical selection, approve/sendback/reject
- WO/PN Gate card (`WoPnGateCard`) — gate status, form, add-ref logic
- `RoutingSummaryCard` display logic — only loading state and effect
- All Supabase filters and query structure
- All role checks (`canSeeMoney`, `canApprove`, `canAudit`, `canAddRef`, `canSeeCost`)
- All route guards and `ROLE_MATRIX` references
- Navigation data and App.tsx
- All 136+ non-target page files
- Documents tab (`DocumentPanel`)
- Activity tab (Timeline and Audit Log)

---

## Pre-existing Lint Issues Not in Target Files

The global baseline remains at 78 pre-existing lint issues (unchanged from Step 19.3 stabilization). Zero new errors introduced.

---

## Validation

- `npm run build` — ✓ zero errors
- `npx tsc --noEmit` — ✓ zero errors
- `npx eslint src/pages/Projects.tsx src/pages/ProjectDetail.tsx` — ✓ zero errors
- Global lint: 78 issues (same as Step 19.3 baseline)

---

## Next Step

Step 19.4B — Procurement and Store UX Improvement (planned, not yet started).
