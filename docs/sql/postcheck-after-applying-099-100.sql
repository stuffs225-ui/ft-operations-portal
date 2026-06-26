-- ============================================================================
-- POST-CHECK (READ-ONLY) — after applying migrations 099 + 100
-- FT Operations Portal. Run in the Supabase SQL Editor. SELECT-only.
-- ============================================================================
-- SAFETY: SELECT only. No CREATE / ALTER / UPDATE / DELETE / DROP / INSERT.
--         Does NOT call the mutation RPCs. Does NOT insert a test project.
--         Does NOT update or mutate any data.
-- Goal: confirm 099 + 100 applied correctly.
-- ============================================================================

-- ── MIGRATION 099 ───────────────────────────────────────────────────────────

select '099.1 sales_user_targets table (expect PRESENT)' as section;
select to_regclass('public.sales_user_targets') as present;

select '099.2 expected columns (expect all listed)' as section;
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'sales_user_targets'
order by ordinal_position;

select '099.3 RLS enabled (expect true)' as section;
select relrowsecurity as rls_enabled
from pg_class where relname = 'sales_user_targets';

select '099.4 policies (expect 3: admin full, ops read, sales own read)' as section;
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'sales_user_targets'
order by policyname;

select '099.5 indexes + unique constraint (expect idx_sut_* + user_year_unique)' as section;
select indexname from pg_indexes
where schemaname = 'public' and tablename = 'sales_user_targets'
order by indexname;

select '099.6 no duplicate (user, year) rows (expect 0)' as section;
select sales_user_id, target_year, count(*)
from public.sales_user_targets
group by sales_user_id, target_year
having count(*) > 1;

select '099.7 basic select works (expect a row count, no error)' as section;
select count(*) as sales_user_targets_rows from public.sales_user_targets;

-- ── MIGRATION 100 ───────────────────────────────────────────────────────────

select '100.1 tables + view (expect all PRESENT)' as section;
select 'project_invoicing_schedule'              as object, to_regclass('public.project_invoicing_schedule')              as present
union all select 'project_invoicing_schedule_history',   to_regclass('public.project_invoicing_schedule_history')
union all select 'project_invoicing_schedule_alerts_view', to_regclass('public.project_invoicing_schedule_alerts_view');

select '100.2 functions (expect all 3)' as section;
select proname, pg_get_function_identity_arguments(oid) as args
from pg_proc
where proname in ('create_default_invoicing_schedule',
                  'reschedule_project_invoicing_schedule',
                  'update_project_invoicing_schedule_amount')
order by proname;

select '100.3 trigger on projects (expect projects_create_default_invoicing_schedule)' as section;
select tg.tgname as trigger_name
from pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
where not tg.tgisinternal and c.relname = 'projects'
  and tg.tgname = 'projects_create_default_invoicing_schedule';

select '100.4 RLS enabled on both tables (expect true / true)' as section;
select relname, relrowsecurity as rls_enabled
from pg_class
where relname in ('project_invoicing_schedule','project_invoicing_schedule_history')
order by relname;

select '100.5 policies (expect 3 on schedule, 3 on history)' as section;
select tablename, policyname, cmd from pg_policies
where schemaname = 'public'
  and tablename in ('project_invoicing_schedule','project_invoicing_schedule_history')
order by tablename, policyname;

select '100.6 generated columns invoice_year / invoice_month (expect is_generated = ALWAYS)' as section;
select column_name, is_generated, generation_expression
from information_schema.columns
where table_schema = 'public' and table_name = 'project_invoicing_schedule'
  and column_name in ('invoice_year','invoice_month')
order by column_name;

select '100.7 enums (expect pis_status_enum, pis_source_enum)' as section;
select typname from pg_type where typname in ('pis_status_enum','pis_source_enum') order by typname;

-- Backfill reconciliation
select '100.8 backfilled schedule rows by source (expect migration_backfill > 0 if eligible projects exist)' as section;
select source, count(*) as rows
from public.project_invoicing_schedule
group by source order by source;

select '100.9 backfill-eligible projects (delivery date AND value > 0)' as section;
select count(*) as eligible_projects
from public.projects
where customer_delivery_date is not null and total_sales_value > 0;

select '100.10 schedule rows total' as section;
select count(*) as schedule_rows from public.project_invoicing_schedule;

select '100.11 eligible projects WITHOUT a schedule line (expect 0 after backfill)' as section;
select count(*) as eligible_without_schedule
from public.projects p
where p.customer_delivery_date is not null and p.total_sales_value > 0
  and not exists (
    select 1 from public.project_invoicing_schedule pis where pis.project_id = p.id
  );

select '100.12 overdue alert view row count (read-only; informational)' as section;
select count(*) as overdue_alert_rows from public.project_invoicing_schedule_alerts_view;

-- ============================================================================
-- INTERPRETATION
--   099.1–099.5 and 100.1–100.7 must all be PRESENT / true / expected.
--   100.8 should show source = 'migration_backfill' rows when §100.9 > 0.
--   100.11 must be 0 (every eligible project got exactly one default line).
--   099.6 must return no rows (no duplicate targets).
--   If any check fails, see go-no-go-decision-matrix.md → Production Hold,
--   and rollback per safe-migration-application-runbook.md.
-- ============================================================================
