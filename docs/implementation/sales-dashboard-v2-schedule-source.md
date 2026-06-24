# Sales Dashboard v2 — Project Invoicing Schedule Source

**Branch:** `feature/sales-dashboard-v2-schedule-source`  
**Status:** Data hook integration only — no UI changes

---

## Why Switch Sources?

`project_invoice_milestones` was built for **workflow execution** — tracking whether an invoice has been submitted, approved, and paid. It carries complex lifecycle state and is not designed as a commercial planning surface.

`project_invoicing_schedule` (migration 100) was built specifically for **commercial planning**:

| Dimension | `project_invoice_milestones` | `project_invoicing_schedule` |
|-----------|------------------------------|------------------------------|
| Month column | `due_date` (manual, workflow-driven) | `current_invoice_date` (defaults to delivery date; auto-generated) |
| Value source | `amount` (workflow amount) | `invoice_amount` (commercial schedule amount) |
| Multi-installment | Complex (tied to plan) | Native (multiple lines per project) |
| Same-month sum | Requires extra grouping | Natural grouping by `invoice_month` |
| Overdue detection | Via status field | `current_invoice_date < today` |
| Default date | None — manual entry | `customer_delivery_date` (automatic trigger) |

The invoicing plan table in the Sales Dashboard is a **commercial planning view**, not a workflow tracker. The schedule table is the correct source.

---

## Source Mapping

| Dashboard concept | Old source | New source |
|-------------------|-----------|-----------|
| Month column | `milestone.due_date` month | `schedule.current_invoice_date` month (via `invoice_month` generated column) |
| Cell value | `milestone.amount` | `schedule.invoice_amount` |
| Pending Invoicing | `status IN ('planned','ready_to_invoice')` | `status IN ('scheduled','overdue','rescheduled')` |
| Invoiced | N/A in plan table | `status = 'invoiced'` |
| Year filter | `due_date` year match | `invoice_year = selectedYear` (generated column) |
| Row appears when | project has any non-cancelled milestone | project has any non-cancelled schedule line |

**Outstanding Receivables and Collection to Date remain on `project_invoice_milestones`.** Those are receivables metrics (invoiced but not collected; money collected). The schedule has no concept of "collected" — that stays in milestones.

---

## Grouping Rules

```
One row per project in the invoicing plan table.

Monthly value:
  SUM(invoice_amount)
  WHERE project_id = this project
    AND invoice_year = selectedYear
    AND status != 'cancelled'
  GROUP BY invoice_month

Multiple lines in the same project+month are summed into one cell.

ttl:
  SUM of all month cells for selectedYear (non-cancelled)

pendingInvoicing (per row):
  SUM(invoice_amount)
  WHERE project_id = this project
    AND status IN ('scheduled', 'overdue', 'rescheduled')
  (no year restriction — total unbilled backlog for this project)
```

---

## Status Handling

| Schedule status | Invoicing Plan table | Pending Invoicing | Invoicing Year Plan | Invoiced |
|----------------|---------------------|-------------------|--------------------|---------:|
| `scheduled` | ✓ shown | ✓ counted | ✓ counted | — |
| `overdue` | ✓ shown | ✓ counted | ✓ counted | — |
| `rescheduled` | ✓ shown | ✓ counted | ✓ counted | — |
| `invoiced` | ✓ shown | — | — | ✓ counted |
| `cancelled` | — (excluded at query) | — | — | — |

---

## KPI Definitions (updated)

| Metric | Definition | Source |
|--------|-----------|--------|
| Pending Invoicing | `SUM(invoice_amount)` WHERE `status IN ('scheduled','overdue','rescheduled')` | `project_invoicing_schedule` |
| Invoicing Up To Date | `SUM(invoice_amount)` WHERE `status='invoiced'` AND `invoice_year=selectedYear` | `project_invoicing_schedule` |
| Invoicing Year Plan | `SUM(invoice_amount)` WHERE `invoice_year=selectedYear` AND `status != 'invoiced'` | `project_invoicing_schedule` |
| Outstanding Receivables | `SUM(amount - paid_amount)` WHERE `milestone_status IN ('submitted','approved','overdue')` | `project_invoice_milestones` |
| Collection to Date | `SUM(paid_amount)` WHERE `milestone_status='paid'` AND `paid_at` in year | `project_invoice_milestones` |

---

## Overdue Logic

A schedule line is overdue when:
- `current_invoice_date < CURRENT_DATE`
- `status NOT IN ('invoiced', 'cancelled')`
- `invoiced_at IS NULL`

The `overdueInvoicingScheduleExists` warning flag is set when any such line exists in the fetched schedules. It is available in `SalesDashboardV2Warnings` for future UI use (e.g., an overdue alert chip).

The `project_invoicing_schedule_alerts_view` (SECURITY INVOKER, migration 100) provides the full overdue detail list. The Sales Dashboard does not query this view directly — the flag is derived from the same schedule rows already fetched.

---

## What Remains Unchanged

- `project_invoice_milestones` — not touched; still used for Outstanding Receivables and Collection to Date
- `project_invoicing_plans` — not touched
- Sales Dashboard v2 UI (`src/pages/Sales.tsx`) — not touched; same column layout
- `getSalesDashboardV2Data()` interface — same function signature, same return type
- `useSalesDashboardV2Data()` hook — not changed
- Routes, navigation, roleMatrix, route guards — not changed
- DB/RLS/migrations — not changed
- Project creation logic — not changed
- Quotation conversion — not changed
- Existing workflows — not changed
- Mutations — not changed

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/salesDashboardV2Queries.ts` | Switched invoicing plan query from `project_invoice_milestones` to `project_invoicing_schedule`; added `calcPendingSchedule`, `calcInvoicingUpToDateFromSchedule`, `calcInvoicingYearPlanFromSchedule`; kept milestone helpers for receivables |
| `src/types/salesDashboardV2.ts` | Updated doc comments; added `overdueInvoicingScheduleExists` to `SalesDashboardV2Warnings`; updated `invoicingUpToDate`/`invoicingYearPlan` doc comments |

---

## Validation Results

- `npm run build` — zero TypeScript errors ✓
- `npx tsc --noEmit` — clean ✓
- Changed-file lint (`salesDashboardV2Queries.ts`, `salesDashboardV2.ts`) — zero new issues ✓
- Full lint — 57 problems (22 errors, 35 warnings); same as pre-PR baseline; zero regressions ✓

---

## Next PR Recommendation

**Project Invoicing Schedule Admin Management UI**

Enables Admin to:
- View all schedule lines per project (inline with project detail or standalone page)
- Add installment lines (Admin split)
- Reschedule a line via `reschedule_project_invoicing_schedule()` RPC
- Adjust amounts via `update_project_invoicing_schedule_amount()` RPC
- View reschedule history per line
- View and action overdue alerts from `project_invoicing_schedule_alerts_view`

When Admin marks a line as `invoiced`, the Sales Dashboard will immediately reflect the updated Pending Invoicing value and move the amount out of the monthly pending cell.
