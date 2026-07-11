# Migration 103 Activation Pack — Financial Truth Views

**File:** `supabase/migrations/103_financial_truth_views.sql`
**Status:** WRITTEN, **NOT APPLIED**. Apply it yourself in the Supabase SQL Editor
(same supervised pattern as 099–102). Idempotent — safe to re-run.
**Convention & rationale:** `docs/implementation/financial-truth.md`.

Adds two read-only views (no table/policy/trigger changes, nothing from 069 is
touched): `project_financials` (net / VAT / gross per project from vehicle
lines) and `project_schedule_reconciliation` (non-cancelled schedule total vs
project values, classified `matches_net` / `matches_gross` / `mismatch` /
`no_schedule`). Both are revenue-restricted to admin / operations_manager / the
owning sales_user (mirrors migration 060).

## 1. Pre-check (expect both `missing`)

```sql
SELECT 'project_financials' AS object,
       CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname='project_financials') THEN 'PRESENT' ELSE 'missing' END AS status
UNION ALL
SELECT 'project_schedule_reconciliation',
       CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname='project_schedule_reconciliation') THEN 'PRESENT' ELSE 'missing' END;
```

## 2. Apply

Paste the full contents of `supabase/migrations/103_financial_truth_views.sql`
and run once. Requires 100 and 101 to be applied first (needs
`project_invoicing_schedule` and `vat_applicable`).

## 3. Post-check

```sql
-- Both PRESENT:
SELECT 'project_financials' AS object,
       CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname='project_financials') THEN 'PRESENT' ELSE 'missing' END AS status
UNION ALL
SELECT 'project_schedule_reconciliation',
       CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname='project_schedule_reconciliation') THEN 'PRESENT' ELSE 'missing' END;

-- Reconciliation snapshot (run as admin — expect the imported book to show
-- matches_net; wizard-created VAT projects show matches_gross by construction):
SELECT reconciliation, count(*), sum(schedule_total)::numeric(15,2) AS scheduled
FROM public.project_schedule_reconciliation
GROUP BY reconciliation ORDER BY reconciliation;
```

## 4. UI verification

1. **Project → Invoicing** (`/projects/<id>/invoicing`): shows the schedule as
   the primary plan with a Net / VAT / Gross summary (admin/ops/owning sales);
   legacy milestones — if the project has any — appear read-only underneath.
2. **Admin → Invoicing Schedule**: new reconciliation strip with counts per
   classification and the list of projects needing attention.
3. As sales_coordinator / viewer: schedule visible, money breakdown absent
   (view restriction) — no errors.

## 5. Rollback

`DROP VIEW public.project_schedule_reconciliation; DROP VIEW public.project_financials;`
— both are pure derivations; no data is stored in them.
