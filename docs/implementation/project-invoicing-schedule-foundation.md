# Project Invoicing Schedule — Delivery-Date Default Foundation

**Branch:** `feature/project-invoicing-schedule-foundation`  
**Migration:** `100_project_invoicing_schedule.sql`  
**Status:** Foundation — no Admin UI, no Sales Dashboard hook update yet

---

## Why a New Table?

`project_invoice_milestones` was built for **workflow execution** — tracking whether an invoice has been submitted, approved, and paid. It carries complex lifecycle state and is tied to `project_invoicing_plans` (one plan per project).

The Sales Dashboard v2 needs a simpler, commercial-planning source:

| Need | Milestones | New Schedule |
|------|-----------|-------------|
| One or many lines per project | Yes (many) | Yes (many) |
| Default date = project delivery date | No (manual) | **Yes (automatic)** |
| Admin reschedule with reason + history | No | **Yes** |
| Month-column pivot for dashboard table | Possible but complex | **Simple: `current_invoice_date` month** |
| Overdue detection | Via status field | **Via view (`current_invoice_date < today`)** |
| Workflow status (submitted/approved/paid) | Yes | Not here (milestones still own that) |

The tables are **additive and complementary** — milestones remain the invoicing workflow source; the schedule is the commercial planning source.

---

## Delivery-Date Default Behavior

When a project is created:
1. The DB trigger `projects_create_default_invoicing_schedule` fires AFTER INSERT
2. If `customer_delivery_date IS NOT NULL` and `total_sales_value > 0`, one schedule line is inserted automatically:
   - `sequence_no = 1`
   - `schedule_label = 'Default invoice on delivery'`
   - `invoice_amount = projects.total_sales_value`
   - `invoice_percentage = 100`
   - `original_delivery_date = customer_delivery_date`
   - `original_invoice_date = customer_delivery_date`
   - `current_invoice_date = customer_delivery_date`
   - `source = 'delivery_date'`
   - `status = 'scheduled'`
   - `sales_user_id = projects.sales_owner_id`

### Why a DB trigger and not an application helper?

Projects are created via **two separate paths**:
1. `ProjectNew.tsx` — direct Supabase insert from frontend
2. `convert_quotation_to_so()` — SECURITY DEFINER DB function (atomic conversion)

A trigger on the `projects` table fires for both paths automatically. If a new creation path is added in the future (e.g., a bulk import), it is also covered without code changes.

The trigger function uses `SECURITY DEFINER` so it can insert into `project_invoicing_schedule` regardless of the role that created the project (including `sales_user` whose direct INSERT RLS would otherwise block).

---

## Installment / Multiple Lines Support

Admin can create additional schedule lines for a project to represent installment billing:

**Example: SAR 1,000,000 project billed in 3 installments**

| Line | Seq | Date | Amount | % |
|------|-----|------|--------|---|
| Default (auto-created) | 1 | Delivery date | 1,000,000 | 100 |

After Admin restructures into installments:

| Line | Seq | Date | Amount | % |
|------|-----|------|--------|---|
| First payment | 1 | March | 300,000 | 30 |
| Second payment | 2 | June | 400,000 | 40 |
| Third payment | 3 | September | 300,000 | 30 |

Rules:
- Each line has its own `current_invoice_date` and `invoice_amount`
- Lines can fall in different months
- Same project + same month → **sum invoice_amount** when displayed in the dashboard table
- `pending invoicing` = SUM(invoice_amount) WHERE status NOT IN ('invoiced', 'cancelled')
- `invoiced amount` = SUM(invoice_amount) WHERE status = 'invoiced'
- `overdue` = current_invoice_date < CURRENT_DATE AND status NOT IN ('invoiced', 'cancelled')

**Note on total validation:** The DB does NOT enforce `SUM(invoice_amount) = projects.total_sales_value`. Projects may have evolving installment structures. A diagnostic SQL query is documented in the migration comment for admin reporting purposes.

---

## Data Model

### `project_invoicing_schedule`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `project_id` | uuid FK | references projects(id) |
| `sales_user_id` | uuid FK | from projects.sales_owner_id |
| `sequence_no` | integer | installment order; unique per project |
| `schedule_label` | text | human-readable name |
| `schedule_description` | text | optional detail |
| `invoice_amount` | numeric(14,2) | amount for this line ≥ 0 |
| `invoice_percentage` | numeric(7,4) | optional % of total; [0, 100] |
| `original_delivery_date` | date | delivery date at creation; immutable |
| `original_invoice_date` | date | invoice date at creation; immutable |
| `current_invoice_date` | date | latest planned date; changes on reschedule |
| `invoice_year` | integer | **GENERATED** from `current_invoice_date` |
| `invoice_month` | integer | **GENERATED** from `current_invoice_date` |
| `status` | enum | scheduled / overdue / rescheduled / invoiced / cancelled |
| `source` | enum | delivery_date / admin_split / admin_manual / migration_backfill |
| `delay_count` | integer | incremented on each reschedule |
| `last_change_reason` | text | from last reschedule/amount change |
| `last_change_details` | text | additional context for last change |
| `last_rescheduled_by` | uuid FK | admin who last rescheduled |
| `last_rescheduled_at` | timestamptz | when last rescheduled |
| `invoiced_at` | timestamptz | when actually invoiced |
| `invoice_reference` | text | external invoice number/reference |
| `created_by` / `updated_by` | uuid FK | audit |
| `created_at` / `updated_at` | timestamptz | auto-managed |

### `project_invoicing_schedule_history`

| Column | Type | Notes |
|--------|------|-------|
| `schedule_id` | uuid FK | references pis(id) |
| `project_id` | uuid FK | references projects(id) |
| `old_invoice_date` | date | before change |
| `new_invoice_date` | date | after change |
| `old_invoice_amount` | numeric | before change |
| `new_invoice_amount` | numeric | after change |
| `old_status` / `new_status` | text | status transition |
| `change_reason` | text NOT NULL | mandatory |
| `change_details` | text | optional context |
| `changed_by` | uuid FK | admin who made the change |
| `changed_at` | timestamptz | auto |

---

## RLS

| Role | Schedule Lines | History |
|------|---------------|---------|
| Admin | Full CRUD | Full read + (SECURITY DEFINER functions write) |
| Operations Manager | Read only (all lines) | Read only (all) |
| Sales User | Read only (own projects only) | Read only (own projects only) |
| Viewer / other roles | No direct access | No direct access |

Sales User scope uses the same ownership check as `project_invoice_milestones`:
```sql
EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.created_by = auth.uid())
```

---

## Backfill

Migration 100 includes a one-time backfill for existing projects:

- Inserts one default schedule line per project that has `customer_delivery_date IS NOT NULL` AND `total_sales_value > 0`
- Uses `source = 'migration_backfill'` to distinguish from new-project trigger-created lines
- Idempotent: guarded by `WHERE NOT EXISTS (SELECT 1 FROM project_invoicing_schedule WHERE project_id = p.id)`

---

## Reschedule Behavior

Admin calls `reschedule_project_invoicing_schedule(p_schedule_id, p_new_invoice_date, p_change_reason, p_change_details)`:

1. Validates admin role, non-null date, non-empty reason
2. Rejects reschedule of `invoiced` or `cancelled` lines
3. Inserts a row into `project_invoicing_schedule_history` with old/new values
4. Updates `project_invoicing_schedule`:
   - `current_invoice_date = p_new_invoice_date`
   - `status = 'rescheduled'`
   - `delay_count += 1`
   - `last_change_reason`, `last_change_details`, `last_rescheduled_by`, `last_rescheduled_at`
5. `invoice_year` / `invoice_month` update automatically (generated columns)

**No reschedule without history.** The function is `SECURITY DEFINER` so it can write history regardless of the caller's RLS.

Amount adjustments use `update_project_invoicing_schedule_amount()` — a separate function that writes its own history row, keeping date and amount change audit trails separate.

---

## Overdue Alert Logic

`project_invoicing_schedule_alerts_view` selects lines where:
- `current_invoice_date < CURRENT_DATE`
- `status NOT IN ('invoiced', 'cancelled')`
- `invoiced_at IS NULL`

The view exposes `days_overdue = (CURRENT_DATE - current_invoice_date)::integer`.

The view uses default `SECURITY INVOKER`, so RLS of `project_invoicing_schedule` applies. Admin sees all overdue lines; Sales User sees only their own project's overdue lines; Viewer sees nothing.

**The view does not update the `status` column.** Marking a line as `overdue` in the status field is the Admin's action (via Admin UI or a future scheduled job). The view provides the alert source regardless of whether `status = 'overdue'` has been set.

---

## Future Sales Dashboard Integration

The Sales Dashboard v2 currently reads `project_invoice_milestones.due_date` via `getSalesDashboardV2Data()`. It should eventually read from `project_invoicing_schedule` instead.

**Future hook logic (not implemented in this PR):**

| Metric | Source |
|--------|--------|
| Invoice month column | `EXTRACT(MONTH FROM current_invoice_date)` |
| Invoice year filter | `invoice_year = selectedYear` |
| Invoice value per cell | `SUM(invoice_amount)` per project/month |
| Pending Invoicing | `SUM(invoice_amount)` WHERE `status NOT IN ('invoiced','cancelled')` |
| Overdue Invoicing | `SUM(invoice_amount)` WHERE `current_invoice_date < today` AND `status NOT IN ('invoiced','cancelled')` |

**This PR does NOT change `getSalesDashboardV2Data()` or the Sales Dashboard UI.**

---

## Future Admin UI (Next PR)

The Admin UI for invoicing schedule management will enable:
- View all schedule lines per project
- Create additional installment lines
- Reschedule a line (calls `reschedule_project_invoicing_schedule`)
- Adjust invoice amount (calls `update_project_invoicing_schedule_amount`)
- View reschedule history per line
- View overdue alerts from `project_invoicing_schedule_alerts_view`

That PR is titled: **Project Invoicing Schedule Admin Management UI**.

---

## What Remains Unchanged

- `project_invoice_milestones` table — not touched
- `project_invoicing_plans` table — not touched
- `ProjectNew.tsx` — not touched (trigger handles auto-creation)
- `convert_quotation_to_so()` — not touched (trigger handles auto-creation)
- All invoicing milestone workflow logic — unchanged
- Sales Dashboard v2 UI and hook — unchanged
- Routes, navigation, roleMatrix, route guards — unchanged
- Receivables logic — unchanged
- Quotation conversion — unchanged

---

## Next PR Sequence

1. **Project Invoicing Schedule Admin Management UI** — Admin UI for viewing, splitting, rescheduling, and adjusting schedule lines
2. **Sales Dashboard v2 — Schedule Integration** — Update `getSalesDashboardV2Data()` to read from `project_invoicing_schedule` instead of `project_invoice_milestones`
