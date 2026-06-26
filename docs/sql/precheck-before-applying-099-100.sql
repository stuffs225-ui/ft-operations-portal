-- ============================================================================
-- PRE-CHECK (READ-ONLY) — before applying migrations 099 + 100
-- FT Operations Portal. Run in the Supabase SQL Editor. SELECT-only.
-- ============================================================================
-- SAFETY: SELECT only. No CREATE / ALTER / UPDATE / DELETE / DROP / INSERT.
-- Goal: confirm 099/100 are still missing and every dependency is present
--       BEFORE running apply-migrations-099-100-supervised.sql.
-- ============================================================================

-- 1. Confirm 099 + 100 objects are STILL MISSING (expected: all false / null)
select '1. target objects (expect all MISSING)' as section;
select 'sales_user_targets'                        as object, to_regclass('public.sales_user_targets')                        as present
union all select 'project_invoicing_schedule',          to_regclass('public.project_invoicing_schedule')
union all select 'project_invoicing_schedule_history',  to_regclass('public.project_invoicing_schedule_history')
union all select 'project_invoicing_schedule_alerts_view', to_regclass('public.project_invoicing_schedule_alerts_view');

select 'functions (expect 0 rows)' as note, proname
from pg_proc
where proname in ('create_default_invoicing_schedule',
                  'reschedule_project_invoicing_schedule',
                  'update_project_invoicing_schedule_amount');

-- 2. Required dependency TABLES exist (expect all non-null)
select '2. dependency tables (expect all PRESENT)' as section;
select 'profiles'    as object, to_regclass('public.profiles')    as present
union all select 'projects',     to_regclass('public.projects')
union all select 'user_roles',   to_regclass('public.user_roles');

-- 3. Required dependency COLUMNS on projects (expect 4 rows)
select '3. projects columns (expect customer_delivery_date, total_sales_value, sales_owner_id, created_by)' as section;
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'projects'
  and column_name in ('customer_delivery_date','total_sales_value','sales_owner_id','created_by','id')
order by column_name;

-- 4. user_roles columns (expect user_id, role)
select '4. user_roles columns (expect user_id, role)' as section;
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'user_roles'
  and column_name in ('user_id','role')
order by column_name;

-- 5. Required HELPER FUNCTIONS exist (expect both rows)
select '5. helper functions (expect handle_updated_at, current_user_role)' as section;
select proname from pg_proc
where proname in ('handle_updated_at','current_user_role')
order by proname;

-- 6. Required ENUM TYPE for RPC role check (expect user_role)
select '6. role enum type (expect user_role)' as section;
select typname from pg_type where typname = 'user_role';

-- 7. Existing projects count
select '7. projects count' as section;
select count(*) as projects_total from public.projects;

-- 8. Projects eligible for a default schedule line (delivery date AND value > 0)
--    = how many backfill rows migration 100 will create.
select '8. backfill-eligible projects (will get 1 default schedule line each)' as section;
select count(*) as eligible_projects
from public.projects
where customer_delivery_date is not null and total_sales_value > 0;

-- 9. Sales users count (role source of truth = user_roles)
select '9. sales_user count' as section;
select count(*) as sales_users from public.user_roles where role = 'sales_user';

-- 10. Existing POLICIES that may conflict on the target tables (expect 0 rows)
select '10. conflicting policies (expect none)' as section;
select tablename, policyname from pg_policies
where schemaname = 'public'
  and tablename in ('sales_user_targets','project_invoicing_schedule','project_invoicing_schedule_history');

-- 11. Existing FUNCTIONS with the same names that may conflict (expect 0 rows)
select '11. conflicting functions (expect none)' as section;
select proname, pg_get_function_identity_arguments(oid) as args
from pg_proc
where proname in ('create_default_invoicing_schedule',
                  'reschedule_project_invoicing_schedule',
                  'update_project_invoicing_schedule_amount',
                  'sales_user_targets_updated_at','pis_updated_at');

-- 12. Existing TRIGGERS on projects that may conflict (expect the migration-100
--     trigger to be ABSENT; other project triggers are fine and listed for awareness)
select '12. triggers on public.projects (expect projects_create_default_invoicing_schedule ABSENT)' as section;
select tg.tgname as trigger_name
from pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
where not tg.tgisinternal and c.relname = 'projects'
order by tg.tgname;

-- ============================================================================
-- INTERPRETATION
--   §1 must show all MISSING (null / 0 rows). If anything is PRESENT, STOP —
--      099/100 may be partially applied; do not run the apply pack blindly.
--   §2–§6 must all be PRESENT. If any dependency is missing, STOP and resolve
--      the earlier migration first.
--   §8 tells you how many backfill schedule lines will be created.
--   §10–§12 should be empty / not list the 099/100 objects.
-- ============================================================================
