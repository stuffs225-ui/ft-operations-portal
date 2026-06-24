# Sales Dashboard v2 — Data Aggregation Hook

**Branch:** `feature/sales-dashboard-v2-data-hook`  
**Status:** Data foundation — no UI implemented  
**Depends on:** Migration 099 (`sales_user_targets` table) from PR #138

---

## Purpose

This PR adds a read-only data aggregation layer for the Sales Dashboard v2. It does not implement any UI, modify Sales.tsx, or change any routes, navigation, roleMatrix, or route guards.

The aggregation layer consolidates four existing data sources — `projects`, `hot_projects`, `project_invoice_milestones`, and `sales_user_targets` — into a single typed `SalesDashboardV2Data` contract. The current Sales.tsx is unchanged; it continues to use its existing queries.

---

## Files Delivered

| File | Purpose |
|------|---------|
| `src/types/salesDashboardV2.ts` | Type contracts for the entire data layer |
| `src/lib/salesDashboardV2Queries.ts` | Main aggregation function + pure calculation helpers |
| `src/hooks/useSalesDashboardV2Data.ts` | React hook wrapping the query helper |

---

## Data Sources

### 1. `projects`

Fields selected: `id`, `project_code`, `so_number`, `customer_name`, `total_sales_value`, `project_status`, `approved_at`, `sales_owner_id`.

Scope: `project_status IN ('approved','active','completed','submitted_for_approval','sent_back_for_revision')`.  
Non-broad-view: additionally filtered by `sales_owner_id = salesUserId`.

### 2. `hot_projects`

Fields selected: `id`, `stage`, `estimated_value`, `sales_owner_id`.  
Scope: open stages only — `stage IN ('lead','qualified','proposal_required','quotation_requested','negotiation')`.  
Non-broad-view: additionally filtered by `sales_owner_id = salesUserId`.

### 3. `project_invoice_milestones`

Fields selected: `id`, `project_id`, `milestone_status`, `amount`, `due_date`, `paid_amount`, `paid_at`.  
Scope: `milestone_status != 'cancelled'`. RLS scopes sales_user to own projects automatically.

**Important:** `receivables_aging_view` (migration 070) conflates unbilled milestones with billed-but-unpaid milestones. It is NOT used here. Milestones are queried directly with explicit status filters.

### 4. `sales_user_targets`

Fields selected: `sales_order_target`, `invoicing_target`, `collection_target`, `target_year`.  
Fetched via `.maybeSingle()` for `salesUserId` + `selectedYear`.  
Returns `null` if no target row exists. RLS: admin full, ops_manager read, sales_user own-read.

---

## Terminology (enforced throughout codebase)

| Term | Definition | Milestone statuses |
|------|-----------|-------------------|
| **Pending Invoicing** | Scheduled but not yet invoiced — amount owed will be billed in future | `planned`, `ready_to_invoice` |
| **Outstanding Receivables** | Invoiced but not yet collected — billed but unpaid | `submitted`, `approved`, `overdue` |
| **Collection to Date** | `SUM(paid_amount)` WHERE `status='paid'` AND `paid_at` in selected year | `paid` (year-scoped) |

These are three distinct financial states. They must NOT be aggregated together.

---

## KPI Calculations

### Summary KPIs

| KPI | Calculation |
|-----|------------|
| `projectsCount` | COUNT of projects WHERE status IN `approved`,`active`,`completed` |
| `totalProjectValue` | SUM(`total_sales_value`) for same filter |
| `pipelineProjectsCount` | COUNT of `hot_projects` rows (open stages already filtered) |
| `totalPipelineValue` | SUM(`estimated_value`) for same |
| `projectsAtRiskCount` | COUNT WHERE `project_status = 'sent_back_for_revision'` — **interim definition** |
| `pendingInvoicingValue` | SUM(`amount`) WHERE `milestone_status IN ('planned','ready_to_invoice')` |
| `outstandingReceivablesValue` | SUM(`amount - paid_amount`) WHERE `milestone_status IN ('submitted','approved','overdue')` |
| `collectionToDateValue` | SUM(`paid_amount`) WHERE `milestone_status='paid'` AND `paid_at` in `selectedYear` |

### Targets

| Field | Calculation |
|-------|------------|
| `salesOrderAchieved` | SUM(`total_sales_value`) WHERE `status IN ('approved','active','completed')` AND `approved_at` in `selectedYear` |
| `salesOrderYearPlan` | SUM(`total_sales_value`) for all active/approved/completed (portfolio total) |
| `salesOrderExpectedTotal` | `salesOrderAchieved` + SUM(`estimated_value`) from pipeline |
| `salesOrderPercent` | `salesOrderAchieved / salesOrderTarget * 100` (null if target not set) |
| `invoicingUpToDate` | SUM(`paid_amount`) for paid milestones in `selectedYear` |
| `invoicingYearPlan` | SUM(`amount`) WHERE `due_date` in `selectedYear` AND `status NOT IN ('cancelled','paid')` |
| `invoicingExpectedTotal` | `invoicingUpToDate + invoicingYearPlan` |
| `invoicingPercent` | `invoicingExpectedTotal / invoicingTarget * 100` |
| `invoicingActualPercentUpToNow` | `invoicingUpToDate / invoicingTarget * 100` |
| `collectedToDate` | Same source as `invoicingUpToDate` (paid milestones in year) |
| `collectionPercent` | `collectedToDate / collectionTarget * 100` |

### Monthly Invoicing Plan

Milestones due in `selectedYear` are pivoted client-side by month using `EXTRACT(month FROM due_date)`. Cancelled milestones are excluded. The result is a `SalesInvoicingPlanRow[]` array — one row per project that has at least one non-cancelled milestone — sorted by `project_code`.

---

## Warning Flags

The `warnings` object is always populated. Consumer UI must check these before rendering:

| Flag | Always true? | Meaning |
|------|-------------|---------|
| `projectsAtRiskDefinitionPending` | **Always `true`** | Current definition (`sent_back_for_revision`) is an admin workflow state, not a commercial risk indicator. A product decision is required to redefine this as delivery/milestone overdue risk. |
| `receivablesViewMixedScope` | **Always `true`** | `receivables_aging_view` mixes unbilled + billed-unpaid. This hook queries milestones directly instead. |
| `collectionTargetNotSet` | When `collection_target IS NULL` | Collection target has not been assigned for this user/year. |
| `invoicingTargetNotSet` | When `invoicing_target IS NULL` | Invoicing target not assigned. |
| `salesOrderTargetNotSet` | When `sales_order_target IS NULL` | SO target not assigned. |
| `noTargetsRecord` | When no row in `sales_user_targets` | No target record exists for this user/year at all. |

---

## Role Scoping

```
isBroadView = true   admin / operations_manager
isBroadView = false  sales_user
```

For non-broad-view, `projects` and `hot_projects` are filtered by `sales_owner_id = salesUserId`. Milestones rely on database RLS to limit scope to the user's own projects. Targets are always filtered by `sales_user_id = salesUserId`.

---

## Hook Usage

```typescript
import { useSalesDashboardV2Data } from '../hooks/useSalesDashboardV2Data';

const { data, loading, error, refetch } = useSalesDashboardV2Data({
  salesUserId: profile?.id ?? null,
  selectedYear: 2025,
  isBroadView: role === 'admin' || role === 'operations_manager',
  enabled: !authLoading,
});
```

The hook refetches automatically when `salesUserId`, `selectedYear`, or `isBroadView` changes. Stale responses from superseded fetches are discarded via a fetch counter guard.

---

## Deferred Items

| Item | Reason |
|------|--------|
| `SalesInvoicingPlanRow.quantity` | Requires join to `project_vehicle_lines`; always returns `null` in this PR |
| Sales Dashboard v2 UI | Out of scope for this PR — no changes to Sales.tsx |
| Targets UI (admin assignment form) | Separate future PR |
| Admin broad-view targets aggregation | `getSalesTargetsByYear()` exists in `salesTargetsQueries.ts`; not wired to V2 data yet |

---

## What Is NOT Changed

- `src/pages/Sales.tsx` — unchanged; continues to use its own queries
- All routes, navigation, roleMatrix, route guards — unchanged
- All business workflows: quotation, SO approval, WO/PN execution — unchanged
- All mutations: project creation, milestone creation/update, invoicing actions — unchanged
- No new migrations (Migration 099 was delivered in PR #138)
- No `.env` files committed
