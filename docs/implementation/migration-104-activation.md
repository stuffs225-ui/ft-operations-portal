# Migration 104 Activation Pack — Per-Line Invoicing Plan

**File:** `supabase/migrations/104_line_invoicing_plan.sql`
**Status:** WRITTEN, **NOT APPLIED**. Apply in the Supabase SQL Editor (pattern
of 099–103). Idempotent. Requires 100 (schedule) — 103 recommended too.

**What:** salesmen plan, per vehicle line, how many units get invoiced in which
month — straight from the project page. Allocations become NET rows in
`project_invoicing_schedule` (the single source of truth), so they flow into
the Sales Dashboard and Admin schedule automatically. The schedule table stays
admin-write-only: sales input goes through ONE audited SECURITY DEFINER RPC
(`set_line_invoicing_plan`) that authorizes admin/ops always and sales_user on
their OWN project only, validates months/quantities (Σ ≤ line quantity),
replaces the line's previous plan idempotently, and retires the auto
"delivery date" default line once a real plan exists (it would double-count).

## 1. Pre-check (expect `missing` / `f`)

```sql
SELECT 'set_line_invoicing_plan' AS object,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='set_line_invoicing_plan') THEN 'PRESENT' ELSE 'missing' END AS status
UNION ALL
SELECT 'pis.project_vehicle_line_id',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_invoicing_schedule' AND column_name='project_vehicle_line_id') THEN 'PRESENT' ELSE 'missing' END
UNION ALL
SELECT 'pis_source_enum has sales_line_plan',
       CASE WHEN EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='pis_source_enum' AND e.enumlabel='sales_line_plan') THEN 'PRESENT' ELSE 'missing' END;
```

## 2. Apply

Paste the full contents of `supabase/migrations/104_line_invoicing_plan.sql`
and run once.

## 3. Post-check

Re-run the pre-check — all three rows `PRESENT`.

## 4. UI verification

1. As a salesman on his own project → **Invoicing Months per Line** card (the
   old "Invoicing Plan & Milestones" card is gone): pick "3 units in Sep 2026"
   on a line → Save → chips appear (`Sep 2026 × 3` + net amount).
2. `/projects/<id>/invoicing` → the plan rows appear with a Qty column and
   source "Sales line plan"; the auto default line is gone for that project.
3. Sales Dashboard → the salesman's invoicing table reflects the new months.
4. A salesman on someone ELSE's project gets a permission error from the RPC.
5. Allocating more units than the line quantity is rejected.

## 5. Rollback

The RPC and columns are additive. To retire: drop the function and the two
columns after confirming no `sales_line_plan` rows remain (or keep the rows —
they are ordinary schedule lines).
