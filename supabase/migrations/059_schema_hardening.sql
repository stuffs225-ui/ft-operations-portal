-- Phase: Real Supabase Readiness — Schema hardening (indexes + missing triggers)
--
-- Additive, idempotent hardening. Safe to run on a fresh database. Addresses
-- gaps found in the production-readiness migration review:
--   1. projects has no index on the columns its RLS policies filter on.
--   2. project_documents has no indexes at all.
--   3. saved_report_views, operational_issues, capa_records have an updated_at
--      column but no trigger to maintain it.

-- ── 1. projects indexes (RLS filters on project_status / created_by) ─────────
create index if not exists idx_projects_status      on public.projects (project_status);
create index if not exists idx_projects_created_by  on public.projects (created_by);
create index if not exists idx_projects_sales_owner on public.projects (sales_owner_id);
create index if not exists idx_projects_created_at  on public.projects (created_at desc);

-- ── 2. project_documents indexes (FK lookups + RLS subqueries on project_id) ──
create index if not exists idx_project_documents_project_id on public.project_documents (project_id);
create index if not exists idx_project_documents_status     on public.project_documents (status);

-- ── 3. Missing updated_at triggers (handle_updated_at defined in 001) ────────
drop trigger if exists saved_report_views_updated_at on public.saved_report_views;
create trigger saved_report_views_updated_at
  before update on public.saved_report_views
  for each row execute function public.handle_updated_at();

drop trigger if exists operational_issues_updated_at on public.operational_issues;
create trigger operational_issues_updated_at
  before update on public.operational_issues
  for each row execute function public.handle_updated_at();

drop trigger if exists capa_records_updated_at on public.capa_records;
create trigger capa_records_updated_at
  before update on public.capa_records
  for each row execute function public.handle_updated_at();
