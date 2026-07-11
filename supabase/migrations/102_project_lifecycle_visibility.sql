-- ── 102_project_lifecycle_visibility.sql ──────────────────────────────────────
-- Fix audit finding C2 (docs/system-audit/13-full-critical-audit-2026-07.md):
-- every operational read rule granted visibility ONLY at project_status =
-- 'approved', so a project moved to 'active' (in execution) or 'completed'
-- VANISHED for sales_coordinator / procurement / factory / store / qc / afs /
-- viewer — exactly the people executing it. This also collides with the 2026
-- plan import (25 active + 15 completed projects).
--
-- WHAT THIS DOES (read-side only — NO write rule is touched):
--   1. New helper is_project_readable_status(): approved | active | completed.
--   2. can_read_project() (013) widened to use it.
--   3. WO/PN gating helpers (014) widened to approved | active, so execution
--      gates keep working after a project legitimately enters execution.
--   4. Eight operational read policies recreated with the helper
--      (009 projects, 010 vehicle lines, 011 documents, 012 timeline,
--       014 execution references, 019 procurement requests, 020 PR items).
--   5. The three cost-masking views from 060 recreated with the helper
--      (masking logic byte-identical; only the status condition widened).
--
-- 'draft' / 'submitted_for_approval' / 'sent_back_for_revision' / 'rejected' /
-- 'cancelled' remain invisible to operational roles, exactly as before.
--
-- Apply supervised in the Supabase SQL Editor (pattern of 099/100/101):
-- see docs/implementation/migration-102-activation.md. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. Readable-status helper (single source of truth) ────────────────────────
create or replace function public.is_project_readable_status(s public.project_status)
returns boolean language sql immutable as $$
  select s in ('approved', 'active', 'completed')
$$;

comment on function public.is_project_readable_status is
  'Statuses at which operational roles (coordinator/procurement/factory/store/qc/afs/viewer) may READ a project and its children. Write rules are unaffected.';

-- ── 2. can_read_project (from 013) — widened ──────────────────────────────────
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

  -- Operational roles see approved / active / completed projects
  if v_role in ('sales_coordinator', 'procurement_user', 'factory_user',
                'store_user', 'qc_user', 'afs_user', 'viewer')
     and public.is_project_readable_status(v_status)
  then return true; end if;

  return false;
end;
$$;

-- ── 3. WO/PN execution gates (from 014) — work during execution too ───────────
create or replace function public.can_start_saudi_factory(p_project_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and p.project_status in ('approved', 'active')
      and p.manufacturing_location = 'saudi'
  ) and public.project_has_wo(p_project_id);
$$;

create or replace function public.can_start_dubai_followup(p_project_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and p.project_status in ('approved', 'active')
      and p.manufacturing_location = 'dubai'
  ) and public.project_has_pn(p_project_id);
$$;

-- ── 4. Operational read policies — recreated with the helper ──────────────────
-- Each block: drop the old policy, recreate it identically except the status
-- condition. Names and role lists are verbatim from the original migrations.

-- 4a. projects (009)
drop policy if exists "projects: read approved" on public.projects;
create policy "projects: read approved"
  on public.projects for select
  using (
    public.current_user_role() in (
      'sales_coordinator', 'procurement_user', 'factory_user',
      'store_user', 'qc_user', 'afs_user', 'viewer'
    )
    and public.is_project_readable_status(project_status)
  );

-- 4b. project_vehicle_lines (010)
drop policy if exists "pvl: read approved projects" on public.project_vehicle_lines;
create policy "pvl: read approved projects"
  on public.project_vehicle_lines for select
  using (
    public.current_user_role() in (
      'sales_coordinator', 'procurement_user', 'factory_user',
      'store_user', 'qc_user', 'afs_user', 'viewer'
    )
    and exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_project_readable_status(p.project_status)
    )
  );

-- 4c. project_documents (011)
drop policy if exists "pd: read approved projects" on public.project_documents;
create policy "pd: read approved projects"
  on public.project_documents for select
  using (
    public.current_user_role() in (
      'sales_coordinator', 'procurement_user', 'factory_user',
      'store_user', 'qc_user', 'afs_user', 'viewer'
    )
    and exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_project_readable_status(p.project_status)
    )
  );

-- 4d. project_timeline_events (012)
drop policy if exists "pte: operational read approved" on public.project_timeline_events;
create policy "pte: operational read approved"
  on public.project_timeline_events for select
  using (
    public.current_user_role() in (
      'sales_coordinator', 'procurement_user', 'factory_user',
      'store_user', 'qc_user', 'afs_user', 'viewer'
    )
    and exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_project_readable_status(p.project_status)
    )
  );

-- 4e. project_execution_references (014)
drop policy if exists "exec_ref: operational read" on public.project_execution_references;
create policy "exec_ref: operational read"
  on public.project_execution_references for select
  using (
    public.current_user_role() in (
      'procurement_user', 'store_user', 'qc_user',
      'sales_coordinator', 'viewer'
    )
    and exists (
      select 1 from public.projects p
      where p.id = project_id and public.is_project_readable_status(p.project_status)
    )
  );

-- 4f. procurement_requests (019)
drop policy if exists pr_ops_roles_select on public.procurement_requests;
create policy pr_ops_roles_select on public.procurement_requests for select using (
  exists (select 1 from user_roles where user_id = auth.uid()
    and role in ('factory_user','store_user','qc_user','afs_user','viewer'))
  and exists (select 1 from projects p where p.id = project_id
    and public.is_project_readable_status(p.project_status))
);

-- 4g. procurement_request_items (020)
drop policy if exists pri_ops_roles_select on public.procurement_request_items;
create policy pri_ops_roles_select on public.procurement_request_items for select using (
  exists (select 1 from user_roles where user_id = auth.uid()
    and role in ('factory_user','store_user','qc_user','afs_user','viewer','sales_user'))
  and exists (select 1 from projects p where p.id = project_id
    and public.is_project_readable_status(p.project_status))
);

-- NOTE: purchase_orders_to_supplier / purchase_order_items have NO operational
-- SELECT policies — 060 dropped them in favour of the masked views below.

-- ── 5. Cost-masking views (from 060) — status condition widened only ──────────

create or replace view public.purchase_orders_to_supplier_safe as
select
  id,
  project_id,
  procurement_request_id,
  po_number,
  supplier_id,
  supplier_name,
  po_date,
  case
    when public.current_user_role() in ('admin', 'operations_manager', 'procurement_user')
    then purchase_value
    else null
  end as purchase_value,
  currency,
  eta_date,
  po_status,
  approval_required,
  approval_status,
  submitted_for_approval_at,
  approved_by,
  approved_at,
  rejected_by,
  rejected_at,
  rejection_reason,
  remarks,
  created_by,
  created_at,
  updated_at
from public.purchase_orders_to_supplier
where
  auth.uid() is not null
  and (
    public.current_user_role() in ('admin', 'operations_manager')
    or public.current_user_role() = 'procurement_user'
    or (
      public.current_user_role() in (
        'factory_user', 'store_user', 'qc_user', 'afs_user', 'viewer', 'sales_user'
      )
      and exists (
        select 1 from public.projects p
        where p.id = project_id
          and public.is_project_readable_status(p.project_status)
      )
    )
  );

grant select on public.purchase_orders_to_supplier_safe to authenticated;

create or replace view public.purchase_order_items_safe as
select
  poi.id,
  poi.purchase_order_id,
  poi.procurement_request_item_id,
  poi.item_code,
  poi.item_name,
  poi.description,
  poi.quantity_ordered,
  poi.unit,
  case
    when public.current_user_role() in ('admin', 'operations_manager', 'procurement_user')
    then poi.unit_price
    else null
  end as unit_price,
  case
    when public.current_user_role() in ('admin', 'operations_manager', 'procurement_user')
    then poi.line_total
    else null
  end as line_total,
  poi.expected_arrival_date,
  poi.status,
  poi.remarks,
  poi.created_at,
  poi.updated_at
from public.purchase_order_items poi
join public.purchase_orders_to_supplier pos on pos.id = poi.purchase_order_id
where
  auth.uid() is not null
  and (
    public.current_user_role() in ('admin', 'operations_manager')
    or public.current_user_role() = 'procurement_user'
    or (
      public.current_user_role() in (
        'factory_user', 'store_user', 'qc_user', 'afs_user', 'viewer', 'sales_user'
      )
      and exists (
        select 1 from public.projects p
        where p.id = pos.project_id
          and public.is_project_readable_status(p.project_status)
      )
    )
  );

grant select on public.purchase_order_items_safe to authenticated;

create or replace view public.project_vehicle_lines_safe as
select
  pvl.id,
  pvl.project_id,
  pvl.line_number,
  pvl.vehicle_type,
  pvl.description,
  pvl.quantity,
  case
    when public.current_user_role() in ('admin', 'operations_manager')
      or (
        public.current_user_role() = 'sales_user'
        and exists (
          select 1 from public.projects p
          where p.id = pvl.project_id and p.created_by = auth.uid()
        )
      )
    then pvl.unit_sales_value
    else null
  end as unit_sales_value,
  case
    when public.current_user_role() in ('admin', 'operations_manager')
      or (
        public.current_user_role() = 'sales_user'
        and exists (
          select 1 from public.projects p
          where p.id = pvl.project_id and p.created_by = auth.uid()
        )
      )
    then pvl.line_total_value
    else null
  end as line_total_value,
  pvl.line_status,
  pvl.notes,
  pvl.created_at,
  pvl.updated_at
from public.project_vehicle_lines pvl
where
  auth.uid() is not null
  and (
    public.current_user_role() in ('admin', 'operations_manager')
    or (
      public.current_user_role() = 'sales_user'
      and exists (
        select 1 from public.projects p
        where p.id = pvl.project_id and p.created_by = auth.uid()
      )
    )
    or (
      public.current_user_role() in (
        'sales_coordinator', 'procurement_user', 'factory_user',
        'store_user', 'qc_user', 'afs_user', 'viewer'
      )
      and exists (
        select 1 from public.projects p
        where p.id = pvl.project_id and public.is_project_readable_status(p.project_status)
      )
    )
  );

grant select on public.project_vehicle_lines_safe to authenticated;

-- ── 6. Notification recipient resolver ────────────────────────────────────────
-- user_roles is readable only by self + admin (003), so a sales_user cannot
-- discover WHO the admins/ops are in order to notify them on submission.
-- This SECURITY DEFINER function returns only the user ids for the requested
-- roles — no emails, no names — the minimum needed to address a notification.
create or replace function public.notification_recipients_for_roles(p_roles text[])
returns setof uuid
language sql security definer stable set search_path = public as $$
  select ur.user_id
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.role::text = any(p_roles)
    and p.is_active
$$;

revoke all on function public.notification_recipients_for_roles(text[]) from public;
grant execute on function public.notification_recipients_for_roles(text[]) to authenticated;

comment on function public.notification_recipients_for_roles is
  'Returns user ids holding any of the given roles (active profiles only). Used by workflow notifications (e.g. notify admin/ops when an SO is submitted). Exposes ids only.';

-- No write policy, trigger, or guard was modified. Approval gates (078), WO/PN
-- guardrails (089/092), and cost masking (060) behave exactly as before for
-- 'approved' projects; they now additionally behave correctly for 'active' and
-- 'completed' ones.
