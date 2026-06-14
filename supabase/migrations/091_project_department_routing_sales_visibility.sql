-- ── Migration 091: Project Department Routing — Sales Visibility (Step 9D) ───
--
-- Closes Step 9C limitation L-001:
--   sales_user had no SELECT access to project_department_routing in Step 9C.
--
-- Decision: add a scoped policy — sales_user can SELECT routing rows for
-- projects they own (sales_owner_id = auth.uid()), matching the identical
-- ownership pattern used in:
--   • dubai_project_followups (migration 041) — dpf_sales_select
--   • other module tables with sales_user own-project access
--
-- sales_coordinator is excluded: coordinators process quotations and have no
-- direct project ownership relationship (no sales_owner_id = auth.uid() link
-- on the projects table).
--
-- No INSERT / UPDATE / DELETE access is granted to sales_user.
-- No existing policies from migration 090 are changed.
-- No schema changes.
--
-- Rollback:
--   DROP POLICY IF EXISTS pdr_sales_select ON public.project_department_routing;

DROP POLICY IF EXISTS pdr_sales_select ON public.project_department_routing;

CREATE POLICY pdr_sales_select ON public.project_department_routing
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'sales_user'
    AND project_id IN (
      SELECT id FROM public.projects WHERE sales_owner_id = auth.uid()
    )
  );
