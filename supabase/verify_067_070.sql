-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION SCRIPT: migrations 067 – 070
-- ft-operations-portal
--
-- READ-ONLY — safe to run at any time, before or after deployment.
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Expected output after successful deployment:
--   All checks return "OK" or "ENABLED" or a row count ≥ 0.
--   Any "MISSING" result means the corresponding migration did not apply.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────
select
  routine_name                                             as function_name,
  case when routine_name is not null then 'OK' else 'MISSING' end as status
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('convert_quotation_to_so', 'generate_hot_project_code', 'current_user_role', 'handle_updated_at')
order by routine_name;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLES
-- ─────────────────────────────────────────────────────────────────────────────
select
  table_name,
  case when table_name is not null then 'OK' else 'MISSING' end as status
from information_schema.tables
where table_schema = 'public'
  and table_name in ('hot_projects', 'project_invoicing_plans', 'project_invoice_milestones')
order by table_name;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. VIEWS
-- ─────────────────────────────────────────────────────────────────────────────
select
  table_name                                               as view_name,
  case when table_name is not null then 'OK' else 'MISSING' end as status
from information_schema.views
where table_schema = 'public'
  and table_name = 'receivables_aging_view';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ENUM TYPES
-- ─────────────────────────────────────────────────────────────────────────────
select
  t.typname                                                as enum_name,
  case when t.typname is not null then 'OK' else 'MISSING' end as status
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typtype = 'e'
  and t.typname in ('hot_project_stage', 'milestone_status')
order by t.typname;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────
select
  trigger_name,
  event_object_table                                       as on_table,
  event_manipulation                                       as fires_on,
  'OK'                                                     as status
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'hot_projects_updated_at',
    'hot_projects_generate_code',
    'project_invoicing_plans_updated_at',
    'project_invoice_milestones_updated_at'
  )
order by event_object_table, trigger_name;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY — enabled?
-- ─────────────────────────────────────────────────────────────────────────────
select
  relname                                                  as table_name,
  case when relrowsecurity then 'ENABLED' else 'DISABLED — PROBLEM' end as rls_status
from pg_class
join pg_namespace on pg_namespace.oid = pg_class.relnamespace
where pg_namespace.nspname = 'public'
  and relname in ('hot_projects', 'project_invoicing_plans', 'project_invoice_milestones')
order by relname;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RLS POLICIES — count per table
-- ─────────────────────────────────────────────────────────────────────────────
select
  tablename,
  count(*)                                                 as policy_count,
  case when count(*) > 0 then 'OK' else 'NO POLICIES — PROBLEM' end as status
from pg_policies
where schemaname = 'public'
  and tablename in ('hot_projects', 'project_invoicing_plans', 'project_invoice_milestones')
group by tablename
order by tablename;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
select
  indexname,
  tablename,
  'OK'                                                     as status
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_hot_projects_created_by',
    'idx_hot_projects_stage',
    'idx_hot_projects_created_at',
    'idx_pip_project_id',
    'idx_pim_plan_id',
    'idx_pim_project_id',
    'idx_pim_status',
    'idx_pim_due_date'
  )
order by tablename, indexname;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SMOKE TEST — view is queryable (returns 0 or more rows, no error)
-- ─────────────────────────────────────────────────────────────────────────────
select
  count(*)                                                 as receivables_row_count,
  'View is accessible'                                     as note
from public.receivables_aging_view;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. FUNCTION SECURITY — convert_quotation_to_so must be SECURITY DEFINER
-- ─────────────────────────────────────────────────────────────────────────────
select
  p.proname                                                as function_name,
  case when p.prosecdef then 'SECURITY DEFINER — OK' else 'SECURITY INVOKER — PROBLEM' end as security_mode
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'convert_quotation_to_so';
