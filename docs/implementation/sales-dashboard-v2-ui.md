# Sales Dashboard v2 — Commercial/Invoicing Control UI

**Branch:** `feature/sales-dashboard-v2-ui`  
**Status:** UI complete — no admin target management  
**Depends on:** PR #138 (migration 099), PR #139 (data aggregation hook)

---

## Design Goal

Transform the Sales page from a task-focused work queue into a commercial/invoicing control dashboard. The new view surfaces the KPIs a Sales User or manager cares about at a board level: project portfolio value, pipeline, pending invoicing, and progress against annual targets. Task workflows (quotations, approvals, drafts) remain accessible via action buttons and their own dedicated routes — they are simply deprioritized from the dashboard view.

**Design language:** Clean enterprise SaaS. Calm off-white background, white cards with subtle border and shadow, restrained NAFFCO red for primary CTA only, compact uppercase KPI labels, modern table with horizontal scroll.

---

## Data Hook Used

`useSalesDashboardV2Data()` from `src/hooks/useSalesDashboardV2Data.ts`.

Parameters passed:
- `salesUserId`: `profile?.id` — scopes non-broad-view queries to the logged-in user
- `selectedYear`: from a year select dropdown (defaults to current year)
- `isBroadView`: `role === 'admin' || role === 'operations_manager'`
- `enabled`: `!authLoading` — prevents fetching before auth resolves

---

## Metrics Displayed

### KPI Cards (6 cards, 2×3 grid)

| Card | Source field | Label |
|------|-------------|-------|
| Number of Projects | `summary.projectsCount` | Projects |
| Total Project Value | `summary.totalProjectValue` | Total Project Value |
| Pipeline Projects | `summary.pipelineProjectsCount` | Pipeline Projects |
| Pipeline Value | `summary.totalPipelineValue` | Pipeline Value |
| Projects At Risk | `summary.projectsAtRiskCount` | Projects At Risk |
| **Pending Invoicing** | `summary.pendingInvoicingValue` | **Pending Invoicing** |

**Important:** The sixth card is labeled "Pending Invoicing" — not "Total Outstanding." This reflects unbilled milestones (`status IN planned, ready_to_invoice`), not billed-but-unpaid receivables. The hook separates these correctly. See Terminology section.

### Invoicing Plan Table

One row per project with at least one non-cancelled milestone. Columns:
- Customer (sticky first column for horizontal scroll usability)
- Order / PO (`projects.so_number`)
- Qty (always `—` — deferred; requires join to `project_vehicle_lines`)
- Total Value (`projects.total_sales_value`)
- Pending (`SUM(amount)` for `planned`/`ready_to_invoice` milestones)
- Jan–Dec (per-month milestone totals for selected year)
- TTL (row year total)
- Year column (same as TTL — included for UI flexibility)

Month cells with values are highlighted soft green (`bg-emerald-50`). Empty/zero cells show `—` in muted grey. Footer row shows column totals.

Values in the table use abbreviated format (`K`/`M` suffix) to fit 18 columns.

### Target Sections (3 cards)

#### Invoicing
- Target (from `sales_user_targets.invoicing_target`)
- Invoiced up to date (`invoicingUpToDate`)
- Year plan remaining (`invoicingYearPlan`)
- Expected total (`invoicingExpectedTotal`)
- Actual % up to now (`invoicingActualPercentUpToNow`)
- Progress bar: expected vs target

#### Sales Orders
- Target (from `sales_user_targets.sales_order_target`)
- Achieved — approved in year (`salesOrderAchieved`)
- Year plan portfolio (`salesOrderYearPlan`)
- Total expected SO (`salesOrderExpectedTotal`)
- Progress bar: achieved vs target

#### Collection
- Collection target (from `sales_user_targets.collection_target`)
- Collected to date (`collectedToDate`)
- Outstanding receivables (`summary.outstandingReceivablesValue`)
- Collection % (`collectionPercent`)
- Progress bar (only shown when target is set)

---

## Pending Invoicing Terminology

| Term | Definition | Milestone statuses |
|------|-----------|-------------------|
| **Pending Invoicing** | Scheduled but not yet invoiced | `planned`, `ready_to_invoice` |
| **Outstanding Receivables** | Invoiced but not yet collected | `submitted`, `approved`, `overdue` |
| **Collection to Date** | Paid this year | `paid` (year-scoped) |

The KPI card uses **Pending Invoicing**. Outstanding Receivables appears only in the Collection target section where it provides context alongside `collectedToDate`. These are never aggregated together.

---

## Collection Target NULL Behavior

`collection_target` is nullable by design — the business has not confirmed target values. When null:
- The "Collection target" metric row shows `—`
- The progress bar is hidden
- A subtle inline note reads: "Collection target not configured for [year]."
- The `invoicing_target` value is **never** substituted

---

## Target Progress Bar

A 1.5px-high bar inside each target card. Color logic:
- ≥ 100%: `bg-emerald-500` (achieved)
- ≥ 75%: `bg-brand-600` (on track)
- ≥ 40%: `bg-amber-400` (needs attention)
- < 40%: `bg-gray-300` (behind)

Bar is clamped to 100% width visually (overachievement shown numerically).

---

## Warnings Behavior

The hook always sets two flags: `projectsAtRiskDefinitionPending: true` and `receivablesViewMixedScope: true`. These are shown as subtle inline info chips — not scary banners:

- `projectsAtRiskDefinitionPending` → grey chip: "Projects at risk uses an interim definition (sent back for revision). A refined definition is pending."
- `noTargetsRecord` → grey chip: "No annual targets configured for [year]."
- `collectionTargetNotSet` → shown inside the Collection card only
- `invoicingTargetNotSet` → shown inside the Invoicing card only
- `salesOrderTargetNotSet` → shown inside the Sales Orders card only
- `receivablesViewMixedScope` → not surfaced to user (implementation note only)

---

## Old Dashboard Elements Removed/Deprioritized

The following panels are **removed from the dashboard view**. Their underlying routes, workflows, and data are completely unchanged.

| Removed panel | Route still accessible at |
|--------------|--------------------------|
| Action Required (returned/clarification quotations) | `/quotations` |
| Pending Approval projects | `/projects` |
| Projects At Risk work queue | `/projects` |
| Draft SOs / Projects panel | `/projects/new` |
| Commercial Pipeline strip | Replaced by KPI cards |
| Old 8 KPI task count cards | Replaced by 6 commercial KPI cards |
| KPI detail Drawer | Removed (not needed for commercial KPIs) |

The top action buttons (New Quotation Request, Create SO / Project, Add Hot Project, View Receivables, Sales Reports) are preserved.

---

## Safety Review

| Area | Changed? |
|------|---------|
| Routes | No |
| Navigation | No |
| roleMatrix | No |
| Route guards | No |
| DB / RLS / migrations | No |
| Business logic | No |
| Mutations | No |
| Quotation conversion | No |
| SO approval / routing | No |
| Project creation | No |
| Hot project creation | No |
| Invoicing milestone behavior | No |
| Receivables logic | No |
| Admin target management UI | No |

---

## Validation Results

- `npm run build` — zero TypeScript errors ✓
- `npx tsc --noEmit` — clean ✓
- `src/pages/Sales.tsx` lint — zero violations ✓
- Full lint count — 57 problems (22 errors, 35 warnings); same as pre-PR baseline; no regressions ✓

---

## Screenshots to Capture After Merge

Run the Role/Page Screenshot Baseline workflow after merge to capture:
- `sales_user` → `/sales` — main dashboard view, default year
- `admin` → `/sales` — broad-view version
- `operations_manager` → `/sales` — broad-view version
- `/sales` on 1440px viewport — verify horizontal scroll on Invoicing Plan table
- `/sales` with no targets record — verify "not configured" state renders correctly
