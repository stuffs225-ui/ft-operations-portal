# Step 16.5 — Sales User Sidebar + Excel-style Reports

**Branch:** `feature/step-16-5-sales-user-reports`
**Date:** 2026-06-19
**Lint baseline before:** 75 problems (59 errors, 16 warnings)
**Lint after:** 75 problems (59 errors, 16 warnings) — no change, no new issues

---

## Executive Summary

Three improvements for the Sales User experience:

1. **SALES & COMMERCIAL sidebar reordered** — Sales Workspace is now first, followed by Hot Projects, Quotation Requests, Receivables. This matches the primary sales workflow.
2. **"My Quotation Requests" hidden for `sales_user`** — The quotation table inside Sales Workspace is hidden for `sales_user` (they have a dedicated `/quotations` page). Admin and ops_manager still see "All Quotation Requests" in the workspace.
3. **Print/Export reports added** to three pages:
   - **Sales Workspace** — Invoicing Plan (salesperson's projects with total SAR values + totals row)
   - **Hot Projects** — Hot Projects Report (all visible opportunities with weighted pipeline)
   - **Projects / SO** — Projects Report (filtered project list with total SAR values)

All reports use the existing `ReportExportBar` component and `exportRowsToCsv` utility. No new dependencies. Print layout uses the existing `.report-print-root` / `.no-print` print CSS pattern from `src/styles/index.css`.

---

## Before / After Status

| Capability | Before | After |
|---|---|---|
| SALES & COMMERCIAL sidebar order | Quotation Requests → Sales Workspace → Hot Projects | Sales Workspace → Hot Projects → Quotation Requests → Receivables |
| "My Quotation Requests" for `sales_user` | Always visible in Sales Workspace | Hidden (use `/quotations` page instead) |
| Sales Workspace — Invoicing Plan export | No export | CSV export + print-ready layout via `ReportExportBar` |
| Hot Projects — report export | No export | CSV export + print-ready layout via `ReportExportBar` |
| Projects / SO — report export | No export | CSV export + print-ready layout via `ReportExportBar` |
| Hot Projects — sales_user scoping | Loaded all records | Filtered by `sales_owner_id` for non-broad-view roles |
| Projects — sales_user scoping | Loaded all records | Filtered by `sales_owner_id` for non-broad-view roles |

---

## Files Modified

| File | Change |
|---|---|
| `src/data/navigation.ts` | Reordered SALES & COMMERCIAL: `sales` → `hot-projects` → `quotations` → `sales-coordinator` → `receivables` |
| `src/pages/Sales.tsx` | Added `isSalesUser`; hidden quotation card for `sales_user`; replaced Invoicing Plan card with `ReportExportBar` + print-ready table + totals row; added `handleExportInvoicingPlan()` |
| `src/pages/HotProjects.tsx` | Added `useAuth`, `ReportExportBar`, `exportRowsToCsv` imports; `isBroadView` + `sales_owner_id` filter; `handleExportCsv()`; `report-print-root` wrapper with print header on table section; KPI strip + filters marked `no-print` |
| `src/pages/Projects.tsx` | Added `ReportExportBar`, `exportRowsToCsv` imports; `isBroadView` + `sales_owner_id` filter in Supabase query; `handleExportCsv()`; `report-print-root` wrapper with print header around table |

---

## Part 1 — Sidebar Reorder

### Before (flattened visible order for `sales_user`):
1. Sales Workspace
2. Hot Projects
3. Quotation Requests
4. Receivables

Wait — the old order in navigation.ts was: `quotations → sales → hot-projects → sales-coordinator → receivables`.

For `sales_user` (who cannot see `sales-coordinator`), the visible order was:
1. Quotation Requests
2. Sales Workspace
3. Hot Projects
4. Receivables

### After (new order in navigation.ts):
`sales → hot-projects → quotations → sales-coordinator → receivables`

For `sales_user`, visible order is now:
1. Sales Workspace
2. Hot Projects
3. Quotation Requests
4. Receivables

This matches the primary sales funnel: pipeline (Hot Projects) → quotation → workspace summary → receivables.

Route paths are UNCHANGED.

---

## Part 2 — "My Quotation Requests" Hidden for sales_user

In `Sales.tsx`, added `const isSalesUser = role === 'sales_user';`. The entire "My Quotation Requests" / "All Quotation Requests" Card is wrapped in `{!isSalesUser && <Card>...</Card>}`.

Sales users are directed to the dedicated `/quotations` page which provides full filtering and sorting. The workspace quotation table was redundant for this role.

Admin and `operations_manager` (broad view) still see "All Quotation Requests" in the workspace.

---

## Part 3 — Invoicing Plan Report (Sales Workspace)

The existing "Invoicing Plan & Milestones" section in `Sales.tsx` was replaced with a full "Invoicing Plan Report" card containing:

- `ReportExportBar` with CSV export via `handleExportInvoicingPlan()`
- `report-print-root` wrapper (print targets only this section)
- Print-only header (title, salesperson name, generated date) — `hidden print:block`
- Projects table with columns: No. | Customer | Project/SO | Total Value (SAR) | Delivery Date | Status
- Totals row: total SAR across all loaded projects

**Data source:** The `projects` state already loaded in `Sales.tsx` (filtered by `sales_owner_id` for `sales_user`, all for broad view). No additional query.

**CSV columns:** Customer, Project Code, SO/JOH Number, Total Value (SAR), Delivery Date, Status.

**Note on monthly columns:** The reference Excel file (INV_PLANABDULLAH_MAY2025.xlsx) includes monthly invoice breakdown columns (Jan–Dec). These require aggregated `project_invoice_milestones` data per month per project — a separate query not available in the current page state. The current implementation shows total values. Monthly breakdown is documented as future work requiring the Invoicing module.

---

## Part 4 — Hot Projects Report

`HotProjects.tsx` changes:

- Added `useAuth` to get `profile` (for print header) and `role` (for `isBroadView`)
- Added `isBroadView = role === 'admin' || role === 'operations_manager'`
- **Supabase query scoped:** for non-broad-view roles (sales_user), `.eq('sales_owner_id', uid)` is appended to the query
- Added `handleExportCsv()` with columns: Code, Title, Customer, Stage, Probability (%), Estimated Value (SAR), Expected Close Date
- Added `ReportExportBar` below PageHeader (above KPI strip)
- KPI strip and Filters divs marked `no-print`
- Table section wrapped in `<div className="report-print-root">` with print-only header inside

**CSV export:** exports `records` (all loaded, unfiltered by search/stage UI filters)

---

## Part 5 — Projects Report

`Projects.tsx` changes:

- Added `ReportExportBar`, `exportRowsToCsv`, `ReportColumn` imports
- Added `isBroadView = role === 'admin' || role === 'operations_manager'`
- **Supabase query scoped:** for non-broad-view roles, `.eq('sales_owner_id', uid)` is appended
- Changed `useEffect` deps from `[]` to `[isBroadView, profile?.id]` so query re-runs if role or user changes
- Added `handleExportCsv()` after the `useMemo` (important: must be after `filtered` is defined to avoid React Compiler memoization conflict) with columns: Project Code, SO Number, Customer, Status, Location, Delivery Date, Total Value (SAR)
- Added `ReportExportBar` below PageHeader (above filter row)
- Table section wrapped in `<div className="report-print-root">` with print-only header inside

**CSV export:** exports `filtered` (respects current UI filters — status tab, location, medical, search)

---

## Part 6 — Print Layout

All three reports use the existing print CSS from `src/styles/index.css`:

```css
@media print {
  body * { visibility: hidden; }
  .report-print-root, .report-print-root * { visibility: visible; }
  .report-print-root { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
}
```

Pattern used:
- `ReportExportBar` has `no-print` class built in — hidden when printing
- KPI strips and filter controls marked `no-print` on HotProjects
- Print-only header (`hidden print:block`) inside `report-print-root` — shows title, salesperson name, date
- Table rendered inside `report-print-root` — visible when printing
- Navigation links inside cells use `no-print` / `hidden print:inline` pair to show plain text in print

---

## Part 7 — DB / RLS / Migration Changes

**None.** No new migrations, no schema changes, no RLS changes.

The `sales_owner_id` filter added to HotProjects and Projects queries uses existing FK columns (`hot_projects.sales_owner_id`, `projects.sales_owner_id`). RLS policies are unchanged.

---

## Part 8 — Governance Constraints Preserved

| Constraint | Status |
|---|---|
| Route paths unchanged | ✅ All routes identical |
| Route guards unchanged | ✅ No guard changes |
| Approval logic unchanged | ✅ Not touched |
| SO/WO/PN logic unchanged | ✅ Not touched |
| Non-sales modules unchanged | ✅ Only Sales, HotProjects, Projects, navigation |
| No new dependencies | ✅ Only existing utilities used |
| No hardcoded salesperson data | ✅ Uses `profile?.full_name` from auth |
| Live data only | ✅ All exports use live-loaded state |

---

## Part 9 — Validation Results

| Check | Result |
|---|---|
| `npm run build` | ✅ 0 errors |
| `npx tsc --noEmit` | ✅ 0 type errors |
| `npm run lint` | 75 problems — unchanged from baseline, no new issues |
| Routes changed | ✅ None |
| Route guards changed | ✅ None |
| Non-sales modules touched | ✅ None |

---

## Remaining Non-Blocking Debt

| Item | Reason |
|---|---|
| Monthly invoice columns in Invoicing Plan | Requires `project_invoice_milestones` aggregated by month — not available in current Sales.tsx state; needs a dedicated query or Invoicing module |
| Weighted pipeline in print header uses all records (not search-filtered) | `records` vs `filtered` distinction — consistent with CSV export which also exports all records |
| Hot Projects dev mode | No mock fallback for hot_projects in dev mode — existing behavior, not changed |
