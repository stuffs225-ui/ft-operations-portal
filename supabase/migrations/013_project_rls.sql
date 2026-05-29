-- ── 013_project_rls.sql ───────────────────────────────────────────────────────
-- Helper functions for project-level access control.
-- These supplement the per-table policies defined in 009–012.

-- can_read_project: true if the calling user has read access to the given project
create or replace function public.can_read_project(p_project_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_role     text;
  v_status   public.project_status;
  v_owner    uuid;
begin
  v_role := public.current_user_role();

  select project_status, created_by
  into v_status, v_owner
  from public.projects
  where id = p_project_id;

  if not found then return false; end if;

  -- Admin and ops see everything
  if v_role in ('admin', 'operations_manager') then return true; end if;

  -- Sales user sees own projects
  if v_role = 'sales_user' and v_owner = auth.uid() then return true; end if;

  -- Operational roles see approved projects only
  if v_role in ('sales_coordinator', 'procurement_user', 'factory_user',
                'store_user', 'qc_user', 'afs_user', 'viewer')
     and v_status = 'approved'
  then return true; end if;

  return false;
end;
$$;

-- can_write_project: true if the calling user can modify the given project
create or replace function public.can_write_project(p_project_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_role   text;
  v_status public.project_status;
  v_owner  uuid;
begin
  v_role := public.current_user_role();

  select project_status, created_by
  into v_status, v_owner
  from public.projects
  where id = p_project_id;

  if not found then return false; end if;

  if v_role in ('admin', 'operations_manager') then return true; end if;

  if v_role = 'sales_user'
     and v_owner = auth.uid()
     and v_status in ('draft', 'sent_back_for_revision')
  then return true; end if;

  return false;
end;
$$;
