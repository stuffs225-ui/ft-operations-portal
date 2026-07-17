-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED MIGRATION — applies everything from 101 to 115 in one script.
--
-- • Idempotent & re-run safe: every object uses IF NOT EXISTS / CREATE OR REPLACE /
--   guarded DO blocks / ADD VALUE IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT.
--   Running it when some (or all) parts are already applied does nothing harmful.
-- • Safe as a single transaction: check_function_bodies is disabled so functions
--   that reference enum values added earlier in this same script still create, and
--   the one runtime use of a new enum value (migration 105 cleanup) is cast to text.
-- • Paste the WHOLE file into the Supabase SQL Editor and run once.
-- ═══════════════════════════════════════════════════════════════════════════════

SET check_function_bodies = off;


-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 101 ▼▼▼   (101_commercial_fields.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 101_commercial_fields.sql ─────────────────────────────────────────────────
-- Commercial fields: Sector, NEG PO, Expected Delay Penalty, Line VAT.
-- ADDITIVE ONLY — no existing column, policy, trigger, or data is modified.
-- All new columns are NULLable (or defaulted) so existing rows and existing
-- app flows are unaffected until the UI starts writing them.
--
-- Apply supervised in the Supabase SQL Editor (pattern of 099/100):
-- see docs/implementation/migration-101-activation.md for pre/post checks.
--
-- NOTE (NEG PO document type): project_documents.document_type is the DB enum
-- project_document_type, which already contains 'customer_po'. The NEG PO PDF
-- is stored as a normal project_documents row with document_type='customer_po';
-- the projects.neg_po_document_id FK below is what identifies THE NEG PO
-- document precisely. No ALTER TYPE is needed (deliberate — avoids the
-- add-enum-value-in-transaction limitation entirely).
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Sector enum (guarded)
do $$ begin
  create type public.sector_enum as enum ('private', 'gov', 'semi_gov');
exception when duplicate_object then null;
end $$;

-- 2. Sector on the three commercial records (nullable — optional everywhere)
alter table public.hot_projects
  add column if not exists sector public.sector_enum null;

alter table public.quotation_requests
  add column if not exists sector public.sector_enum null;

alter table public.projects
  add column if not exists sector public.sector_enum null;

-- 3. NEG PO on projects: optional number + FK to the mandatory PDF document.
--    The number-requires-document rule is enforced at the application layer
--    (the save action is atomic in the UI: upload PDF → insert document row →
--    set both columns). ON DELETE SET NULL keeps the project consistent if a
--    document row is ever removed administratively.
alter table public.projects
  add column if not exists neg_po_number text null;

alter table public.projects
  add column if not exists neg_po_document_id uuid null
    references public.project_documents(id) on delete set null;

-- 4. Expected delay penalty percentage (entered by Operations; 0–100, 2dp)
alter table public.projects
  add column if not exists expected_delay_penalty_percent numeric(5,2) null;

do $$ begin
  alter table public.projects
    add constraint projects_delay_penalty_percent_range
    check (
      expected_delay_penalty_percent is null
      or (expected_delay_penalty_percent >= 0 and expected_delay_penalty_percent <= 100)
    );
exception when duplicate_object then null;
end $$;

-- 5. Per-line VAT applicability. VAT rate (15%) is an application constant;
--    line_total_value stays NET (its existing trigger is untouched) — the UI
--    computes and displays VAT-inclusive totals, and total_sales_value saved
--    from the wizard is VAT-inclusive when VAT lines are used.
alter table public.project_vehicle_lines
  add column if not exists vat_applicable boolean not null default false;

-- 6. Documentation comments
comment on column public.projects.neg_po_number is
  'Customer PO number to NEG (optional; when set, a PDF document row referenced by neg_po_document_id is mandatory — enforced in the app).';
comment on column public.projects.neg_po_document_id is
  'project_documents row holding the NEG PO PDF (file name pattern: PO#<number> To NEG.pdf).';
comment on column public.projects.expected_delay_penalty_percent is
  'Expected delay penalty % applied if delivery slips past the expected delivery date. Entered by Operations/Admin.';
comment on column public.project_vehicle_lines.vat_applicable is
  'When true, 15% VAT applies to this line; VAT amounts are computed in the application (line_total_value remains net).';

-- No RLS changes: existing table policies remain exactly as-is. Penalty editing
-- is UI-gated to operations_manager/admin, which matches the existing
-- can_write_project() rule (only admin/ops can update non-draft projects).

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 102 ▼▼▼   (102_project_lifecycle_visibility.sql)
-- ═══════════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 103 ▼▼▼   (103_financial_truth_views.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 103_financial_truth_views.sql ─────────────────────────────────────────────
-- One financial truth (audit findings H1 + H2,
-- docs/system-audit/13-full-critical-audit-2026-07.md).
--
-- DECISION (documented in docs/implementation/financial-truth.md):
--   • project_invoicing_schedule (100) is THE invoicing-plan source of truth.
--     project_invoicing_plans / project_invoice_milestones (069) are demoted to
--     READ-ONLY LEGACY at the application layer — no new rows are created by
--     the UI. No DB object from 069 is dropped or altered here (non-destructive;
--     removal is a future reviewed down-migration once legacy data is migrated).
--   • CONVENTION: schedule.invoice_amount is NET (excluding VAT). VAT is a
--     derived pass-through computed from the project's vehicle lines
--     (vat_applicable × 15% — must match VAT_RATE in src/lib/commercialFields.ts).
--     The one systematic exception: default lines auto-created by the
--     migration-100 trigger copy projects.total_sales_value, which is GROSS for
--     VAT projects — the reconciliation view below classifies those as
--     'matches_gross' so Admin can see and normalize them explicitly.
--
-- Adds two SECURITY INVOKER views (no table, policy, or trigger changes):
--   1. project_financials             — net / vat / gross per project
--   2. project_schedule_reconciliation — schedule total vs project value, classified
--
-- Revenue visibility in both views mirrors migration 060's rule exactly:
-- admin / operations_manager / the owning sales_user only.
--
-- Apply supervised in the Supabase SQL Editor (pattern of 099–102):
-- see docs/implementation/migration-103-activation.md. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. project_financials ─────────────────────────────────────────────────────
create or replace view public.project_financials as
select
  p.id                                   as project_id,
  p.project_code,
  p.so_number,
  p.customer_name,
  p.project_status,
  p.sales_owner_id,
  p.created_by,
  p.total_sales_value,
  count(pvl.id)::integer                 as line_count,
  coalesce(sum(pvl.line_total_value), 0)::numeric(15,2) as lines_net,
  -- 0.15 must stay in lock-step with VAT_RATE in src/lib/commercialFields.ts.
  coalesce(sum(case when pvl.vat_applicable then round(pvl.line_total_value * 0.15, 2) else 0 end), 0)::numeric(15,2) as lines_vat,
  (coalesce(sum(pvl.line_total_value), 0)
   + coalesce(sum(case when pvl.vat_applicable then round(pvl.line_total_value * 0.15, 2) else 0 end), 0))::numeric(15,2) as lines_gross,
  coalesce(sum(case when pvl.vat_applicable then 1 else 0 end), 0)::integer as vat_line_count
from public.projects p
left join public.project_vehicle_lines pvl on pvl.project_id = p.id
where
  auth.uid() is not null
  and (
    public.current_user_role() in ('admin', 'operations_manager')
    or (public.current_user_role() = 'sales_user' and p.created_by = auth.uid())
  )
group by p.id;

grant select on public.project_financials to authenticated;

comment on view public.project_financials is
  'Net / VAT / gross per project, derived from vehicle lines (vat_applicable × 15%). Revenue-restricted: admin, operations_manager, owning sales_user (mirrors migration 060).';

-- ── 2. project_schedule_reconciliation ────────────────────────────────────────
create or replace view public.project_schedule_reconciliation as
select
  f.project_id,
  f.project_code,
  f.so_number,
  f.customer_name,
  f.project_status,
  f.total_sales_value,
  f.lines_net,
  f.lines_vat,
  f.lines_gross,
  coalesce(s.schedule_total, 0)::numeric(15,2) as schedule_total,
  coalesce(s.schedule_lines, 0)::integer       as schedule_lines,
  case
    when coalesce(s.schedule_lines, 0) = 0            then 'no_schedule'
    when abs(coalesce(s.schedule_total, 0) - f.lines_net)   <= 1 then 'matches_net'
    when abs(coalesce(s.schedule_total, 0) - f.lines_gross) <= 1 then 'matches_gross'
    else 'mismatch'
  end as reconciliation
from public.project_financials f
left join (
  select project_id,
         sum(invoice_amount) as schedule_total,
         count(*)            as schedule_lines
  from public.project_invoicing_schedule
  where status <> 'cancelled'
  group by project_id
) s on s.project_id = f.project_id;

grant select on public.project_schedule_reconciliation to authenticated;

comment on view public.project_schedule_reconciliation is
  'Non-cancelled schedule total vs the project''s net/gross line values. matches_net = follows the NET convention; matches_gross = trigger-default line carrying gross (normalize via the amount-adjust RPC); mismatch = needs attention. Inherits project_financials'' revenue restriction.';

-- Nothing from migration 069 (plans/milestones) is dropped, altered, or written.
-- No RLS policy, trigger, or guard is modified by this migration.

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 104 ▼▼▼   (104_line_invoicing_plan.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 104_line_invoicing_plan.sql ───────────────────────────────────────────────
-- Per-vehicle-line invoicing months, set by the project's own salesman.
--
-- WHAT: a sales_user picks, per vehicle line, "N units in month M" — those
-- allocations become rows in project_invoicing_schedule (the single financial
-- source of truth, see docs/implementation/financial-truth.md) and therefore
-- flow straight into the Sales Dashboard and the Admin schedule page.
--
-- HOW (no RLS weakening): the schedule table stays admin-write-only. Sales
-- input goes through ONE audited SECURITY DEFINER RPC that:
--   • authorizes admin/ops always, sales_user only on their OWN project;
--   • validates months and quantities (Σ allocated ≤ line quantity);
--   • REPLACES that line's previous 'sales_line_plan' rows (idempotent);
--   • removes the project's auto 'delivery_date' default line the first time a
--     real per-line plan exists (it would double-count otherwise);
--   • writes NET amounts (quantity × unit_sales_value) per the convention.
--
-- Apply supervised in the Supabase SQL Editor (pattern of 099–103). Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. Schedule columns: which line + how many units a row invoices ───────────
alter table public.project_invoicing_schedule
  add column if not exists project_vehicle_line_id uuid null
    references public.project_vehicle_lines(id) on delete cascade;

alter table public.project_invoicing_schedule
  add column if not exists planned_quantity integer null;

do $$ begin
  alter table public.project_invoicing_schedule
    add constraint pis_planned_quantity_positive
    check (planned_quantity is null or planned_quantity > 0);
exception when duplicate_object then null;
end $$;

create index if not exists idx_pis_vehicle_line_id
  on public.project_invoicing_schedule(project_vehicle_line_id);

comment on column public.project_invoicing_schedule.project_vehicle_line_id is
  'Vehicle line this schedule row invoices (sales per-line plan rows only; null for admin/manual/default lines).';
comment on column public.project_invoicing_schedule.planned_quantity is
  'Number of units of the linked vehicle line planned for invoicing in this row''s month.';

-- ── 2. New source value for sales-entered per-line plans ──────────────────────
alter type public.pis_source_enum add value if not exists 'sales_line_plan';

-- ── 3. The audited RPC ─────────────────────────────────────────────────────────
create or replace function public.set_line_invoicing_plan(
  p_line_id     uuid,
  p_allocations jsonb  -- e.g. [{"year":2026,"month":9,"quantity":3}, ...]; [] clears the plan
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_role       public.user_role;
  v_line       public.project_vehicle_lines%rowtype;
  v_project    public.projects%rowtype;
  v_rec        record;
  v_year       integer;
  v_month      integer;
  v_qty        integer;
  v_total      integer := 0;
  v_seq        integer;
  v_date       date;
begin
  -- ── Authorization ────────────────────────────────────────────────────────────
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select role into v_role from public.user_roles where user_id = v_uid limit 1;

  select * into v_line from public.project_vehicle_lines where id = p_line_id;
  if not found then
    raise exception 'Vehicle line not found' using errcode = 'P0002';
  end if;
  select * into v_project from public.projects where id = v_line.project_id;

  if not (
    v_role in ('admin', 'operations_manager')
    or (v_role = 'sales_user' and v_project.created_by = v_uid)
  ) then
    raise exception 'Only admin/operations or the project''s own salesman may plan line invoicing'
      using errcode = '42501';
  end if;

  -- ── Validation ───────────────────────────────────────────────────────────────
  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' then
    raise exception 'p_allocations must be a JSON array' using errcode = '22004';
  end if;

  for v_rec in select value from jsonb_array_elements(p_allocations) loop
    v_year  := (v_rec.value->>'year')::integer;
    v_month := (v_rec.value->>'month')::integer;
    v_qty   := (v_rec.value->>'quantity')::integer;
    if v_year is null or v_year not between 2020 and 2100 then
      raise exception 'Invalid year in allocation: %', v_rec.value using errcode = '22007';
    end if;
    if v_month is null or v_month not between 1 and 12 then
      raise exception 'Invalid month in allocation: %', v_rec.value using errcode = '22007';
    end if;
    if v_qty is null or v_qty < 1 then
      raise exception 'Invalid quantity in allocation: %', v_rec.value using errcode = '22003';
    end if;
    v_total := v_total + v_qty;
  end loop;

  if v_total > v_line.quantity then
    raise exception 'Allocated units (%) exceed the line quantity (%)', v_total, v_line.quantity
      using errcode = '23514';
  end if;

  -- ── Replace this line's plan rows (idempotent) ──────────────────────────────
  delete from public.project_invoicing_schedule
  where project_vehicle_line_id = p_line_id
    and source = 'sales_line_plan';

  -- The auto-created "Default invoice on delivery" line double-counts the
  -- moment any real per-line plan exists for the project — retire it.
  if jsonb_array_length(p_allocations) > 0 then
    delete from public.project_invoicing_schedule
    where project_id = v_line.project_id
      and source = 'delivery_date';
  end if;

  select coalesce(max(sequence_no), 0) into v_seq
  from public.project_invoicing_schedule
  where project_id = v_line.project_id;

  for v_rec in
    select value from jsonb_array_elements(p_allocations)
    order by (value->>'year')::integer, (value->>'month')::integer
  loop
    v_year  := (v_rec.value->>'year')::integer;
    v_month := (v_rec.value->>'month')::integer;
    v_qty   := (v_rec.value->>'quantity')::integer;
    v_date  := (make_date(v_year, v_month, 1) + interval '1 month - 1 day')::date;
    v_seq   := v_seq + 1;

    insert into public.project_invoicing_schedule (
      project_id, sales_user_id, project_vehicle_line_id,
      sequence_no, schedule_label, schedule_description,
      invoice_amount, planned_quantity,
      original_delivery_date, original_invoice_date, current_invoice_date,
      status, source, created_by
    ) values (
      v_line.project_id,
      v_project.sales_owner_id,
      p_line_id,
      v_seq,
      v_line.vehicle_type || ' — ' || v_qty || ' unit' || case when v_qty > 1 then 's' else '' end,
      'Per-line plan set by sales',
      round(v_qty * v_line.unit_sales_value, 2),  -- NET, per the convention
      v_qty,
      v_project.customer_delivery_date,
      v_date,
      v_date,
      'scheduled',
      'sales_line_plan',
      v_uid
    );
  end loop;
end;
$$;

revoke all on function public.set_line_invoicing_plan(uuid, jsonb) from public;
grant execute on function public.set_line_invoicing_plan(uuid, jsonb) to authenticated;

comment on function public.set_line_invoicing_plan is
  'Replaces a vehicle line''s sales invoicing plan (month/quantity allocations → NET schedule rows). Admin/ops always; sales_user on own project only. Removes the project''s auto delivery-date default line when a real plan exists.';

-- No RLS policy is changed: the schedule table remains admin-write-only; all
-- sales input flows through this single validated RPC.

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 105 ▼▼▼   (105_invoicing_plan_dedupe.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 105_invoicing_plan_dedupe.sql ─────────────────────────────────────────────
-- Fix B1: "Pending (6.0M) > Total Value (3.0M)" on the Sales Dashboard.
--
-- ROOT CAUSE: a project can keep its auto "delivery_date" default schedule line
-- (= contract value) AND the sales per-line plan rows (source='sales_line_plan').
-- Both are 'scheduled', so Pending sums both and double-counts. Migration 104's
-- RPC already retires the default line when a plan is set, but pre-existing data
-- (and any project planned before 104) still carries the orphan.
--
-- THIS MIGRATION:
--   1. One-time cleanup: for every project that already has a per-line plan,
--      delete its superseded auto rows (source IN ('delivery_date','default') or
--      NULL) so totals reflect one financial truth. Cancelled/invoiced history is
--      left untouched.
--   2. Hardens set_line_invoicing_plan() to retire the same broadened set of auto
--      rows whenever a per-line plan exists (defence in depth for the future).
--
-- The app also guards this on the read side (effectiveSchedules), so the dashboard
-- is correct even before this migration is applied. Apply supervised. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. One-time cleanup of superseded auto rows ───────────────────────────────
with planned_projects as (
  select distinct project_id
  from public.project_invoicing_schedule
  where source::text = 'sales_line_plan'
)
delete from public.project_invoicing_schedule pis
using planned_projects pp
where pis.project_id = pp.project_id
  and coalesce(pis.source::text, 'default') in ('delivery_date', 'default')  -- cast: enum has no 'default'
  and pis.status <> 'invoiced';   -- never delete invoiced history

-- ── 2. Harden the RPC's cleanup (broaden delivery_date → all auto rows) ───────
create or replace function public.set_line_invoicing_plan(
  p_line_id     uuid,
  p_allocations jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_role       public.user_role;
  v_line       public.project_vehicle_lines%rowtype;
  v_project    public.projects%rowtype;
  v_rec        record;
  v_year       integer;
  v_month      integer;
  v_qty        integer;
  v_total      integer := 0;
  v_seq        integer;
  v_date       date;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select role into v_role from public.user_roles where user_id = v_uid limit 1;

  select * into v_line from public.project_vehicle_lines where id = p_line_id;
  if not found then
    raise exception 'Vehicle line not found' using errcode = 'P0002';
  end if;
  select * into v_project from public.projects where id = v_line.project_id;

  if not (
    v_role in ('admin', 'operations_manager')
    or (v_role = 'sales_user' and v_project.created_by = v_uid)
  ) then
    raise exception 'Only admin/operations or the project''s own salesman may plan line invoicing'
      using errcode = '42501';
  end if;

  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' then
    raise exception 'p_allocations must be a JSON array' using errcode = '22004';
  end if;

  for v_rec in select value from jsonb_array_elements(p_allocations) loop
    v_year  := (v_rec.value->>'year')::integer;
    v_month := (v_rec.value->>'month')::integer;
    v_qty   := (v_rec.value->>'quantity')::integer;
    if v_year is null or v_year not between 2020 and 2100 then
      raise exception 'Invalid year in allocation: %', v_rec.value using errcode = '22007';
    end if;
    if v_month is null or v_month not between 1 and 12 then
      raise exception 'Invalid month in allocation: %', v_rec.value using errcode = '22007';
    end if;
    if v_qty is null or v_qty < 1 then
      raise exception 'Invalid quantity in allocation: %', v_rec.value using errcode = '22003';
    end if;
    v_total := v_total + v_qty;
  end loop;

  if v_total > v_line.quantity then
    raise exception 'Allocated units (%) exceed the line quantity (%)', v_total, v_line.quantity
      using errcode = '23514';
  end if;

  -- Replace this line's plan rows (idempotent)
  delete from public.project_invoicing_schedule
  where project_vehicle_line_id = p_line_id
    and source = 'sales_line_plan';

  -- Any per-line plan supersedes the project's auto rows — retire ALL of them
  -- (delivery_date / default / null), not just 'delivery_date', so nothing
  -- double-counts. Invoiced history is preserved.
  if jsonb_array_length(p_allocations) > 0 then
    delete from public.project_invoicing_schedule
    where project_id = v_line.project_id
      and coalesce(source::text, 'default') in ('delivery_date', 'default')  -- cast: enum has no 'default'
      and status <> 'invoiced';
  end if;

  select coalesce(max(sequence_no), 0) into v_seq
  from public.project_invoicing_schedule
  where project_id = v_line.project_id;

  for v_rec in
    select value from jsonb_array_elements(p_allocations)
    order by (value->>'year')::integer, (value->>'month')::integer
  loop
    v_year  := (v_rec.value->>'year')::integer;
    v_month := (v_rec.value->>'month')::integer;
    v_qty   := (v_rec.value->>'quantity')::integer;
    v_date  := (make_date(v_year, v_month, 1) + interval '1 month - 1 day')::date;
    v_seq   := v_seq + 1;

    insert into public.project_invoicing_schedule (
      project_id, sales_user_id, project_vehicle_line_id,
      sequence_no, schedule_label, schedule_description,
      invoice_amount, planned_quantity,
      original_delivery_date, original_invoice_date, current_invoice_date,
      status, source, created_by
    ) values (
      v_line.project_id,
      v_project.sales_owner_id,
      p_line_id,
      v_seq,
      v_line.vehicle_type || ' — ' || v_qty || ' unit' || case when v_qty > 1 then 's' else '' end,
      'Per-line plan set by sales',
      round(v_qty * v_line.unit_sales_value, 2),
      v_qty,
      v_project.customer_delivery_date,
      v_date,
      v_date,
      'scheduled',
      'sales_line_plan',
      v_uid
    );
  end loop;
end;
$$;

revoke all on function public.set_line_invoicing_plan(uuid, jsonb) from public;
grant execute on function public.set_line_invoicing_plan(uuid, jsonb) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 106 ▼▼▼   (106_quotation_clarifications.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 106_quotation_clarifications.sql ──────────────────────────────────────────
-- C1: a real two-way, multi-round, logged clarification thread on a quotation.
--
-- Today the coordinator writes a single `coordinator_remarks` and flips status to
-- 'need_clarification'; the salesman has no structured way to reply with text +
-- an attachment, and there is no history. This adds an append-only thread:
--   • coordinator posts 'coordinator_request' (asking for clarification),
--   • sales posts 'sales_reply' (answering, optionally with a file),
--   • repeat as many rounds as needed — every message is retained.
--
-- Attachments reuse the existing quotation_documents table / quotation-documents
-- bucket (optional document_id per message).
--
-- RLS: a user may read/append thread rows only for a quotation they can already
-- see (delegated to quotation_requests' own RLS via EXISTS). Authors write as
-- themselves. Apply supervised in the SQL Editor. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.quotation_clarifications (
  id             uuid primary key default gen_random_uuid(),
  quotation_id   uuid not null references public.quotation_requests(id) on delete cascade,
  author_id      uuid references auth.users(id),
  author_name    text,
  author_role    public.user_role,
  direction      text not null check (direction in ('coordinator_request', 'sales_reply')),
  body           text not null check (length(btrim(body)) > 0),
  document_id    uuid references public.quotation_documents(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_quotation_clarifications_quotation
  on public.quotation_clarifications(quotation_id, created_at);

comment on table public.quotation_clarifications is
  'Append-only clarification thread between coordinator and sales on a quotation (C1). Multi-round, attachments via quotation_documents.';

alter table public.quotation_clarifications enable row level security;

-- Read: any user who can see the parent quotation (delegated to its RLS).
drop policy if exists qc_select on public.quotation_clarifications;
create policy qc_select on public.quotation_clarifications
  for select to authenticated
  using (
    exists (select 1 from public.quotation_requests q where q.id = quotation_id)
  );

-- Insert: author writes as themselves, on a quotation they can see.
drop policy if exists qc_insert on public.quotation_clarifications;
create policy qc_insert on public.quotation_clarifications
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.quotation_requests q where q.id = quotation_id)
  );

-- Append-only: no update/delete policies (history is immutable).

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 107 ▼▼▼   (107_collection_and_aging.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 107_collection_and_aging.sql ──────────────────────────────────────────────
-- C3: Collection & Aging as two parts driven by finance uploads.
--
-- COLLECTION: a finance report uploaded a few times a year; each upload is a
--   record (collection_uploads) whose file staff can open. The latest upload is
--   "current".
-- AGING: a MONTHLY finance report. Each month is a snapshot (aging_snapshots) of
--   outstanding items (aging_items). The app diffs the newest month against the
--   prior one: an item whose invoice_ref is unseen last month is NEW; one seen
--   before is RECURRING and the owning salesman must add a clarification
--   (aging_clarifications) explaining why it isn't collected yet.
--
-- Ingestion (turning a finance file into aging_items rows) is an Admin/Finance
-- action; the salesman-facing read + clarify loop is enforced here by RLS.
-- Apply supervised in the SQL Editor. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── Collection uploads ────────────────────────────────────────────────────────
create table if not exists public.collection_uploads (
  id             uuid primary key default gen_random_uuid(),
  period_label   text not null,               -- e.g. "H1 2026", "Q3 2026"
  document_id    uuid,                         -- optional link to a stored file
  note           text,
  uploaded_by    uuid references auth.users(id),
  created_at     timestamptz not null default now()
);
comment on table public.collection_uploads is 'C3 Collection: periodic finance collection report uploads (latest = current).';

-- ── Aging snapshots (one per month) ───────────────────────────────────────────
create table if not exists public.aging_snapshots (
  id             uuid primary key default gen_random_uuid(),
  snapshot_month date not null,               -- first day of the month
  note           text,
  uploaded_by    uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  unique (snapshot_month)
);
comment on table public.aging_snapshots is 'C3 Aging: one monthly snapshot of outstanding items from Finance.';

-- ── Aging items (rows of a snapshot) ──────────────────────────────────────────
create table if not exists public.aging_items (
  id                uuid primary key default gen_random_uuid(),
  snapshot_id       uuid not null references public.aging_snapshots(id) on delete cascade,
  invoice_ref       text not null,            -- stable key used for new-vs-recurring diff
  customer_name     text,
  project_code      text,
  amount            numeric(14,2) not null default 0,
  days_overdue      integer,
  sales_owner_id    uuid references auth.users(id),
  is_recurring      boolean not null default false,  -- set by ingestion (seen in a prior snapshot)
  first_seen_month  date,
  created_at        timestamptz not null default now()
);
create index if not exists idx_aging_items_snapshot on public.aging_items(snapshot_id);
create index if not exists idx_aging_items_owner on public.aging_items(sales_owner_id);
create index if not exists idx_aging_items_invoice on public.aging_items(invoice_ref);
comment on table public.aging_items is 'C3 Aging: outstanding items in a monthly snapshot; is_recurring drives the required clarification.';

-- ── Aging clarifications (salesman explains why not collected) ─────────────────
create table if not exists public.aging_clarifications (
  id              uuid primary key default gen_random_uuid(),
  aging_item_id   uuid not null references public.aging_items(id) on delete cascade,
  author_id       uuid references auth.users(id),
  author_name     text,
  body            text not null check (length(btrim(body)) > 0),
  created_at      timestamptz not null default now()
);
create index if not exists idx_aging_clarifications_item on public.aging_clarifications(aging_item_id, created_at);
comment on table public.aging_clarifications is 'C3 Aging: salesman clarification on a recurring uncollected item.';

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.collection_uploads   enable row level security;
alter table public.aging_snapshots       enable row level security;
alter table public.aging_items           enable row level security;
alter table public.aging_clarifications  enable row level security;

-- helper: is the current user admin / ops / finance-capable?
-- (finance is represented by admin/operations_manager here.)
-- Reads: all authenticated may read uploads/snapshots; items are scoped so a
-- salesman sees their own, admin/ops see all.
drop policy if exists cu_select on public.collection_uploads;
create policy cu_select on public.collection_uploads for select to authenticated using (true);
drop policy if exists cu_write on public.collection_uploads;
create policy cu_write on public.collection_uploads for all to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')))
  with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')));

drop policy if exists as_select on public.aging_snapshots;
create policy as_select on public.aging_snapshots for select to authenticated using (true);
drop policy if exists as_write on public.aging_snapshots;
create policy as_write on public.aging_snapshots for all to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')))
  with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')));

drop policy if exists ai_select on public.aging_items;
create policy ai_select on public.aging_items for select to authenticated using (
  sales_owner_id = auth.uid()
  or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager','viewer'))
);
drop policy if exists ai_write on public.aging_items;
create policy ai_write on public.aging_items for all to authenticated
  using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')))
  with check (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')));

-- Clarifications: the owning salesman (of the item) or admin/ops may read/append.
drop policy if exists ac_select on public.aging_clarifications;
create policy ac_select on public.aging_clarifications for select to authenticated using (
  exists (
    select 1 from public.aging_items i
    where i.id = aging_item_id
      and (i.sales_owner_id = auth.uid()
           or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager','viewer')))
  )
);
drop policy if exists ac_insert on public.aging_clarifications;
create policy ac_insert on public.aging_clarifications for insert to authenticated with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.aging_items i
    where i.id = aging_item_id
      and (i.sales_owner_id = auth.uid()
           or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')))
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 108 ▼▼▼   (108_aging_item_followup.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 108_aging_item_followup.sql ───────────────────────────────────────────────
-- Extends C3 Aging (migration 107) with two salesman-facing actions on an item:
--   1. Expected collection date — a single current estimate, set through a
--      SECURITY DEFINER RPC so the salesman can update just that one column
--      without a broad row-level UPDATE grant on aging_items.
--   2. Collection records — an append-only log of amounts collected (full or
--      partial) against an item, mirroring the aging_clarifications pattern.
-- Apply supervised in the SQL Editor. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

alter table public.aging_items
  add column if not exists expected_collection_date date;
comment on column public.aging_items.expected_collection_date is
  'Salesman''s current estimate of when this item will be collected.';

-- ── Collection records (append-only) ──────────────────────────────────────────
create table if not exists public.aging_item_collections (
  id                uuid primary key default gen_random_uuid(),
  aging_item_id     uuid not null references public.aging_items(id) on delete cascade,
  amount            numeric(14,2) not null check (amount > 0),
  collected_at      date not null default current_date,
  note              text,
  recorded_by       uuid references auth.users(id),
  recorded_by_name  text,
  created_at        timestamptz not null default now()
);
create index if not exists idx_aging_item_collections_item on public.aging_item_collections(aging_item_id, collected_at);
comment on table public.aging_item_collections is
  'C3 Aging: append-only log of amounts collected (full or partial) against an aging item.';

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.aging_item_collections enable row level security;

drop policy if exists aic_select on public.aging_item_collections;
create policy aic_select on public.aging_item_collections for select to authenticated using (
  exists (
    select 1 from public.aging_items i
    where i.id = aging_item_id
      and (i.sales_owner_id = auth.uid()
           or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager','viewer')))
  )
);

drop policy if exists aic_insert on public.aging_item_collections;
create policy aic_insert on public.aging_item_collections for insert to authenticated with check (
  recorded_by = auth.uid()
  and exists (
    select 1 from public.aging_items i
    where i.id = aging_item_id
      and (i.sales_owner_id = auth.uid()
           or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')))
  )
);

-- No update/delete policy — collection records are append-only by design; a
-- correction is entered as a new (possibly negative-adjusting) note, not an edit.

-- ── Expected collection date RPC ──────────────────────────────────────────────
-- The owning salesman (or admin/operations_manager) may set the estimate.
-- SECURITY DEFINER so this can write a single column without a broad UPDATE
-- grant on aging_items (which would also expose amount/snapshot_id etc.).
create or replace function public.set_aging_item_expected_date(p_item_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.aging_items i
    where i.id = p_item_id
      and (i.sales_owner_id = auth.uid()
           or exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','operations_manager')))
  ) then
    raise exception 'Not authorized to update this aging item.';
  end if;

  update public.aging_items set expected_collection_date = p_date where id = p_item_id;
end;
$$;

grant execute on function public.set_aging_item_expected_date(uuid, date) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 109 ▼▼▼   (109_quotation_document_type_clarification.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 109_quotation_document_type_clarification.sql ────────────────────────────
-- Bug fix: the Clarifications thread (migration 106 / quotationClarifications.ts)
-- attaches an optional file to quotation_documents with document_type =
-- 'clarification', but the quotation_document_type enum (migration 017) never
-- had that value — every attachment on a clarification message fails with
-- "invalid input value for enum quotation_document_type: clarification".
-- Apply supervised in the SQL Editor. Idempotent (ADD VALUE IF NOT EXISTS).
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TYPE public.quotation_document_type ADD VALUE IF NOT EXISTS 'clarification';

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 110 ▼▼▼   (110_quotation_document_type_customer_docs.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 110_quotation_document_type_customer_docs.sql ────────────────────────────
-- Bug fix: QuotationDetail's "Specification Documents" upload panel offers
-- 'customer_po' and 'customer_contract' as document types (copied from the
-- project_document_type set), but quotation_document_type (migration 017)
-- never had those values — uploading with either fails with
-- "invalid input value for enum quotation_document_type: customer_po/customer_contract".
-- Apply supervised in the SQL Editor. Idempotent (ADD VALUE IF NOT EXISTS).
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TYPE public.quotation_document_type ADD VALUE IF NOT EXISTS 'customer_po';
ALTER TYPE public.quotation_document_type ADD VALUE IF NOT EXISTS 'customer_contract';

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 111 ▼▼▼   (111_split_invoicing_schedule.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 111_split_invoicing_schedule.sql ──────────────────────────────────────────
-- Enables the Admin "Split into Installments" action on the invoicing schedule.
-- Splitting one line into N installments must be atomic and fully audited:
--   1. the source line is cancelled (with a history record), and
--   2. N new 'admin_split' lines are inserted (each with a history record),
-- and the installment amounts must sum to the original line amount so the
-- project total is preserved. Admin-only, mirrors the reschedule/amount RPCs
-- from migration 100. Apply supervised in the SQL Editor. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

create or replace function public.split_project_invoicing_schedule(
  p_schedule_id  uuid,
  p_installments jsonb   -- [{ "invoice_date": "YYYY-MM-DD", "amount": 123.45, "label": "..." }, …]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_role    public.user_role;
  v_src     public.project_invoicing_schedule%rowtype;
  v_sum     numeric(14,2) := 0;
  v_count   integer;
  v_max_seq integer;
  v_seq     integer;
  v_inst    jsonb;
  v_new_id  uuid;
begin
  -- ── Authorization ──────────────────────────────────────────────────────────
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select role into v_role from public.user_roles where user_id = v_uid limit 1;
  if v_role is null or v_role <> 'admin' then
    raise exception 'Only admin may split invoicing schedule lines' using errcode = '42501';
  end if;

  -- ── Validation ─────────────────────────────────────────────────────────────
  if p_schedule_id is null then
    raise exception 'p_schedule_id is required' using errcode = '22004';
  end if;
  if p_installments is null or jsonb_typeof(p_installments) <> 'array' then
    raise exception 'p_installments must be a JSON array' using errcode = '22004';
  end if;
  v_count := jsonb_array_length(p_installments);
  if v_count < 2 then
    raise exception 'A split needs at least 2 installments' using errcode = '22004';
  end if;

  select * into v_src from public.project_invoicing_schedule where id = p_schedule_id;
  if not found then
    raise exception 'Invoicing schedule line not found' using errcode = 'P0002';
  end if;
  if v_src.status = 'invoiced' then
    raise exception 'Cannot split an already invoiced line' using errcode = 'P0001';
  end if;
  if v_src.status = 'cancelled' then
    raise exception 'Cannot split a cancelled line' using errcode = 'P0001';
  end if;

  -- Validate each installment and accumulate the total.
  for v_inst in select * from jsonb_array_elements(p_installments) loop
    if (v_inst->>'invoice_date') is null or (v_inst->>'amount') is null then
      raise exception 'Each installment needs an invoice_date and an amount' using errcode = '22004';
    end if;
    if (v_inst->>'amount')::numeric < 0 then
      raise exception 'Installment amount must be non-negative' using errcode = '22004';
    end if;
    v_sum := v_sum + (v_inst->>'amount')::numeric;
  end loop;

  -- The installments must reconstruct the original amount exactly (to the cent).
  if round(v_sum, 2) <> round(v_src.invoice_amount, 2) then
    raise exception 'Installment amounts (%) must sum to the original line amount (%)',
      round(v_sum, 2), round(v_src.invoice_amount, 2) using errcode = '22000';
  end if;

  -- ── 1. Cancel the source line (history first) ────────────────────────────────
  insert into public.project_invoicing_schedule_history (
    schedule_id, project_id, old_invoice_date, new_invoice_date,
    old_invoice_amount, new_invoice_amount, old_status, new_status,
    change_reason, change_details, changed_by
  ) values (
    v_src.id, v_src.project_id, v_src.current_invoice_date, v_src.current_invoice_date,
    v_src.invoice_amount, 0, v_src.status::text, 'cancelled',
    'Split into ' || v_count || ' installments', null, v_uid
  );
  update public.project_invoicing_schedule set
    status              = 'cancelled',
    last_change_reason  = 'Split into ' || v_count || ' installments',
    updated_by          = v_uid,
    updated_at          = now()
  where id = v_src.id;

  -- ── 2. Insert the new installment lines ──────────────────────────────────────
  select coalesce(max(sequence_no), 0) into v_max_seq
    from public.project_invoicing_schedule where project_id = v_src.project_id;
  v_seq := v_max_seq;

  for v_inst in select * from jsonb_array_elements(p_installments) loop
    v_seq := v_seq + 1;
    insert into public.project_invoicing_schedule (
      project_id, sales_user_id, sequence_no, schedule_label, schedule_description,
      invoice_amount, invoice_percentage, original_delivery_date, original_invoice_date,
      current_invoice_date, status, source, created_by, updated_by
    ) values (
      v_src.project_id, v_src.sales_user_id, v_seq,
      coalesce(nullif(trim(v_inst->>'label'), ''), v_src.schedule_label),
      v_src.schedule_description,
      (v_inst->>'amount')::numeric,
      case when v_src.invoice_amount > 0
        then round(((v_inst->>'amount')::numeric / v_src.invoice_amount) * coalesce(v_src.invoice_percentage, 100), 4)
        else null end,
      v_src.original_delivery_date,
      (v_inst->>'invoice_date')::date,
      (v_inst->>'invoice_date')::date,
      'scheduled', 'admin_split', v_uid, v_uid
    ) returning id into v_new_id;

    insert into public.project_invoicing_schedule_history (
      schedule_id, project_id, old_invoice_date, new_invoice_date,
      old_invoice_amount, new_invoice_amount, old_status, new_status,
      change_reason, change_details, changed_by
    ) values (
      v_new_id, v_src.project_id, null, (v_inst->>'invoice_date')::date,
      null, (v_inst->>'amount')::numeric, null, 'scheduled',
      'Created by split of line #' || v_src.sequence_no, null, v_uid
    );
  end loop;
end;
$$;

grant execute on function public.split_project_invoicing_schedule(uuid, jsonb) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 112 ▼▼▼   (112_vehicle_types_catalog.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 112_vehicle_types_catalog.sql ─────────────────────────────────────────────
-- Adds a `category` column to vehicle_types and seeds the real NAFFCO vehicle
-- catalog (ambulances/medical, firefighting/rescue, command/special-purpose).
-- Idempotent: re-running refreshes name/description/category by code and never
-- duplicates (code is unique). Existing placeholder rows are left untouched —
-- deactivate them in Settings › Vehicle Types if no longer needed.
-- Apply supervised in the SQL Editor.
-- ──────────────────────────────────────────────────────────────────────────────

alter table public.vehicle_types add column if not exists category text;

insert into public.vehicle_types (name, code, description, category, is_active) values
  -- Ambulances & Medical Vehicles
  ('American Type I Ambulance',        'AMB-I',   'Box-body ambulance on pickup or truck chassis for advanced life support and rescue operations.', 'Ambulance & Medical', true),
  ('American Type II Ambulance',       'AMB-II',  'Van-based ambulance with a reinforced raised roof for patient transfer and BLS or ALS operations.', 'Ambulance & Medical', true),
  ('European Type A Ambulance',        'AMB-A',   'Patient transport ambulance configured for one or two patients with limited treatment space.', 'Ambulance & Medical', true),
  ('European Type B Ambulance',        'AMB-B',   'Emergency ambulance designed for basic treatment and independent emergency response.', 'Ambulance & Medical', true),
  ('European Type C Ambulance',        'AMB-C',   'Mobile intensive care ambulance for critical-care transport and advanced medical equipment.', 'Ambulance & Medical', true),
  ('4x4 Ambulance',                    'AMB-4X4', 'Off-road ambulance designed for difficult terrain, remote locations and rapid emergency response.', 'Ambulance & Medical', true),
  ('Minibus / Van Ambulance',          'AMB-VAN', 'Van or minibus ambulance for patient transfer and BLS or ALS applications.', 'Ambulance & Medical', true),
  ('Mass Casualty Ambulance',          'AMB-MC',  'Multi-patient ambulance designed for mass-casualty response and patient transportation.', 'Ambulance & Medical', true),
  ('ALS Response Vehicle',             'ALS-RV',  'Rapid-response vehicle carrying advanced life-support equipment for on-scene intervention.', 'Ambulance & Medical', true),
  ('Mass Casualty Unit',               'MCU',     'Large mobile unit supporting mass-casualty operations for 75, 95 or 150 persons.', 'Ambulance & Medical', true),
  ('Emergency Support Unit',           'ESU',     'Mobile disaster-management vehicle carrying medical supplies and emergency support equipment.', 'Ambulance & Medical', true),
  -- Firefighting, Rescue & Hazmat Vehicles
  ('ARFF - Falcon Series',             'ARFF-F',  'Custom-chassis aircraft rescue and firefighting vehicle for rapid airport emergency response.', 'Firefighting & Rescue', true),
  ('ARFF - Commercial Chassis',        'ARFF-C',  'Airport rescue and firefighting vehicle built on a commercial truck chassis.', 'Firefighting & Rescue', true),
  ('Municipal Firefighting Vehicle',   'MUN-FT',  'City firefighting vehicle available in light, medium and heavy-duty configurations.', 'Firefighting & Rescue', true),
  ('Industrial Firefighting Vehicle',  'IND-FT',  'Industrial fire truck for high-capacity water, foam, dry powder and special-hazard protection.', 'Firefighting & Rescue', true),
  ('Rescue & Rapid Intervention Vehicle', 'RIV',  'Fast intervention vehicle carrying firefighting, extrication, rescue and medical equipment.', 'Firefighting & Rescue', true),
  ('Hydraulic Access Platform',        'HAP',     'Aerial firefighting platform providing elevated access for rescue and firefighting operations.', 'Firefighting & Rescue', true),
  ('Turntable Ladder Vehicle',         'TTL',     'Extendable ladder vehicle for high-rise rescue and elevated firefighting operations.', 'Firefighting & Rescue', true),
  ('Hazmat Response Vehicle',          'HAZ',     'Hazardous-material response vehicle with specialized storage and mitigation equipment.', 'Firefighting & Rescue', true),
  -- Command, Defence & Special-Purpose Vehicles
  ('Command & Control Vehicle',        'CCV',     'Mobile command center equipped with communications, CCTV, workstations and meeting facilities.', 'Command & Special-Purpose', true),
  ('Command / Rescue Vehicle',         'CRV',     'Combined command and rescue vehicle with communications, monitoring and rescue equipment.', 'Command & Special-Purpose', true),
  ('Incident Command Support Vehicle', 'ICSV',    'Field coordination vehicle supporting incident command during emergency operations.', 'Command & Special-Purpose', true),
  ('Canine Carrier Vehicle',           'K9V',     'Specialized vehicle for safe transport and operational support of canine teams.', 'Command & Special-Purpose', true),
  ('Custom Special-Purpose Vehicle',   'SPV',     'Custom-built vehicle for requirements not covered by the standard vehicle categories.', 'Command & Special-Purpose', true)
on conflict (code) do update set
  name        = excluded.name,
  description = excluded.description,
  category    = excluded.category,
  is_active   = true,
  updated_at  = now();

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 113 ▼▼▼   (113_redistribute_invoicing_schedule.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 113_redistribute_invoicing_schedule.sql ──────────────────────────────────
-- Enables the Admin "redistribute invoicing plan" action from the Sales
-- Workspace Invoicing Plan table (double-click a project row → monthly editor).
--
-- Redistributing rewrites the *pending* portion of a project's invoicing schedule
-- across the twelve months of a year plus an optional carry-over into the next
-- year. It must be atomic, fully audited, and must not touch already-invoiced or
-- paid lines:
--   1. Every pending line (status in scheduled/overdue/rescheduled) for the
--      project is cancelled (with a history record).
--   2. New 'admin_redistribution' lines are inserted — one per non-zero month
--      (dated the 15th) and one carry-over line if provided.
-- The new amounts must sum to the pending total being replaced, so the project's
-- outstanding balance is preserved to the cent. Admin-only, mirrors migration 111.
-- Apply supervised in the SQL Editor. Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

-- New schedule-line source for redistributed lines (mirrors 'admin_split').
-- Safe inside the editor's transaction: the value is only DEFINED here and used
-- at function-call time, never within this migration.
alter type public.pis_source_enum add value if not exists 'admin_redistribution';

create or replace function public.redistribute_project_invoicing_schedule(
  p_project_id       uuid,
  p_year             integer,
  p_months           jsonb,            -- [{ "month": 1-12, "amount": 123.45 }, …]
  p_carryover_amount numeric default 0,
  p_carryover_date   date    default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_role      public.user_role;
  v_pending   numeric(14,2) := 0;
  v_new_total numeric(14,2) := 0;
  v_sales_uid uuid;
  v_max_seq   integer;
  v_seq       integer;
  v_month     jsonb;
  v_m         integer;
  v_amt       numeric(14,2);
  v_date      date;
  v_new_id    uuid;
  v_line      public.project_invoicing_schedule%rowtype;
  v_co_date   date;
begin
  -- ── Authorization ──────────────────────────────────────────────────────────
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select role into v_role from public.user_roles where user_id = v_uid limit 1;
  if v_role is null or v_role <> 'admin' then
    raise exception 'Only admin may redistribute invoicing schedules' using errcode = '42501';
  end if;

  -- ── Validation ─────────────────────────────────────────────────────────────
  if p_project_id is null then
    raise exception 'p_project_id is required' using errcode = '22004';
  end if;
  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'p_year is out of range' using errcode = '22004';
  end if;
  if p_months is null or jsonb_typeof(p_months) <> 'array' then
    raise exception 'p_months must be a JSON array' using errcode = '22004';
  end if;

  -- Accumulate the requested new total (months + carry-over) and validate each month.
  for v_month in select * from jsonb_array_elements(p_months) loop
    v_m := (v_month->>'month')::integer;
    v_amt := coalesce((v_month->>'amount')::numeric, 0);
    if v_m < 1 or v_m > 12 then
      raise exception 'month must be between 1 and 12' using errcode = '22004';
    end if;
    if v_amt < 0 then
      raise exception 'month amount must be non-negative' using errcode = '22004';
    end if;
    v_new_total := v_new_total + v_amt;
  end loop;
  if coalesce(p_carryover_amount, 0) < 0 then
    raise exception 'carry-over amount must be non-negative' using errcode = '22004';
  end if;
  v_new_total := v_new_total + coalesce(p_carryover_amount, 0);

  -- Sum of the pending lines this redistribution replaces (must be preserved).
  select coalesce(sum(invoice_amount), 0), min(sales_user_id)
    into v_pending, v_sales_uid
    from public.project_invoicing_schedule
    where project_id = p_project_id
      and status in ('scheduled', 'overdue', 'rescheduled');

  if v_pending = 0 then
    raise exception 'Project has no pending invoicing lines to redistribute' using errcode = 'P0002';
  end if;
  if round(v_new_total, 2) <> round(v_pending, 2) then
    raise exception 'Redistributed total (%) must equal the pending total (%)',
      round(v_new_total, 2), round(v_pending, 2) using errcode = '22000';
  end if;

  -- ── 1. Cancel every pending line (history first) ─────────────────────────────
  for v_line in
    select * from public.project_invoicing_schedule
    where project_id = p_project_id
      and status in ('scheduled', 'overdue', 'rescheduled')
  loop
    insert into public.project_invoicing_schedule_history (
      schedule_id, project_id, old_invoice_date, new_invoice_date,
      old_invoice_amount, new_invoice_amount, old_status, new_status,
      change_reason, change_details, changed_by
    ) values (
      v_line.id, v_line.project_id, v_line.current_invoice_date, v_line.current_invoice_date,
      v_line.invoice_amount, 0, v_line.status::text, 'cancelled',
      'Replaced by ' || p_year || ' invoicing-plan redistribution', null, v_uid
    );
    update public.project_invoicing_schedule set
      status             = 'cancelled',
      last_change_reason = 'Replaced by ' || p_year || ' invoicing-plan redistribution',
      updated_by         = v_uid,
      updated_at         = now()
    where id = v_line.id;
  end loop;

  -- ── 2. Insert the new monthly lines ──────────────────────────────────────────
  select coalesce(max(sequence_no), 0) into v_max_seq
    from public.project_invoicing_schedule where project_id = p_project_id;
  v_seq := v_max_seq;

  for v_month in select * from jsonb_array_elements(p_months) loop
    v_m := (v_month->>'month')::integer;
    v_amt := coalesce((v_month->>'amount')::numeric, 0);
    if v_amt <= 0 then
      continue;  -- skip empty months
    end if;
    v_date := make_date(p_year, v_m, 15);
    v_seq := v_seq + 1;
    insert into public.project_invoicing_schedule (
      project_id, sales_user_id, sequence_no, schedule_label, schedule_description,
      invoice_amount, current_invoice_date, original_invoice_date,
      status, source, created_by, updated_by
    ) values (
      p_project_id, v_sales_uid, v_seq,
      to_char(v_date, 'Mon YYYY') || ' invoicing',
      'Monthly invoicing-plan redistribution',
      v_amt, v_date, v_date,
      'scheduled', 'admin_redistribution', v_uid, v_uid
    ) returning id into v_new_id;

    insert into public.project_invoicing_schedule_history (
      schedule_id, project_id, old_invoice_date, new_invoice_date,
      old_invoice_amount, new_invoice_amount, old_status, new_status,
      change_reason, change_details, changed_by
    ) values (
      v_new_id, p_project_id, null, v_date, null, v_amt, null, 'scheduled',
      'Created by ' || p_year || ' invoicing-plan redistribution', null, v_uid
    );
  end loop;

  -- ── 3. Insert the carry-over line (into the next year) ───────────────────────
  if coalesce(p_carryover_amount, 0) > 0 then
    v_co_date := coalesce(p_carryover_date, make_date(p_year + 1, 1, 15));
    v_seq := v_seq + 1;
    insert into public.project_invoicing_schedule (
      project_id, sales_user_id, sequence_no, schedule_label, schedule_description,
      invoice_amount, current_invoice_date, original_invoice_date,
      status, source, created_by, updated_by
    ) values (
      p_project_id, v_sales_uid, v_seq,
      'Carry-over ' || (p_year + 1),
      'Carry-over from ' || p_year || ' invoicing-plan redistribution',
      p_carryover_amount, v_co_date, v_co_date,
      'scheduled', 'admin_redistribution', v_uid, v_uid
    ) returning id into v_new_id;

    insert into public.project_invoicing_schedule_history (
      schedule_id, project_id, old_invoice_date, new_invoice_date,
      old_invoice_amount, new_invoice_amount, old_status, new_status,
      change_reason, change_details, changed_by
    ) values (
      v_new_id, p_project_id, null, v_co_date, null, p_carryover_amount, null, 'scheduled',
      'Carry-over from ' || p_year || ' invoicing-plan redistribution', null, v_uid
    );
  end if;
end;
$$;

grant execute on function public.redistribute_project_invoicing_schedule(uuid, integer, jsonb, numeric, date) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 114 ▼▼▼   (114_document_number_triggers.sql — from PR #206)
-- ═══════════════════════════════════════════════════════════════════════════
-- ── 114_document_number_triggers.sql ──────────────────────────────────────────
-- System-critique v2 fix: three document numbers were generated CLIENT-SIDE with
-- broken patterns, while every QC entity already generates numbers server-side
-- (migrations 035–038). This migration brings MNT / PO / PR up to the same
-- standard:
--
--   • afs_maintenance_requests.maintenance_request_number was count+1 in the
--     browser against a NOT NULL UNIQUE column → two users submitting together
--     collided ("Failed to submit"), and the sequence counted ALL years while
--     the label used the current year (wrong after a year rollover).
--   • purchase_orders_to_supplier.po_number was Math.random() with 900 possible
--     values per month and NO unique constraint → silent duplicate PO numbers.
--   • procurement_requests.pr_number — same random pattern; UNIQUE(project_id,
--     pr_number) turned collisions into confusing insert errors.
--
-- Each trigger fires BEFORE INSERT only when the client sends NULL/'' — numbers
-- typed by the user (e.g. externally-issued PO numbers) are never overridden.
-- The client now prefills MAX+1 itself (src/lib/docNumbers.ts), so these
-- triggers are the safety net for any other insert path.
--
-- Also adds a GUARDED unique index on po_number: created only if no duplicates
-- already exist (otherwise it raises a NOTICE listing how many duplicates need
-- manual cleanup first — the migration still succeeds).
--
-- Idempotent. Apply supervised in the SQL Editor.
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. Maintenance request numbers: MNT-YYYY-#### (per-year sequence) ─────────
CREATE OR REPLACE FUNCTION generate_mnt_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(maintenance_request_number FROM 10) AS int)), 0) + 1
    INTO seq
    FROM afs_maintenance_requests
    WHERE maintenance_request_number ~ ('^MNT-' || to_char(now(), 'YYYY') || '-\d+$');
  NEW.maintenance_request_number := 'MNT-' || to_char(now(), 'YYYY') || '-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mnt_number ON afs_maintenance_requests;
CREATE TRIGGER trg_mnt_number BEFORE INSERT ON afs_maintenance_requests
  FOR EACH ROW WHEN (NEW.maintenance_request_number IS NULL OR NEW.maintenance_request_number = '')
  EXECUTE FUNCTION generate_mnt_number();

-- ── 2. PO numbers: PO-YYMM-#### (per-month sequence) ──────────────────────────
CREATE OR REPLACE FUNCTION generate_po_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 9) AS int)), 0) + 1
    INTO seq
    FROM purchase_orders_to_supplier
    WHERE po_number ~ ('^PO-' || to_char(now(), 'YYMM') || '-\d+$');
  NEW.po_number := 'PO-' || to_char(now(), 'YYMM') || '-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_po_number ON purchase_orders_to_supplier;
CREATE TRIGGER trg_po_number BEFORE INSERT ON purchase_orders_to_supplier
  FOR EACH ROW WHEN (NEW.po_number IS NULL OR NEW.po_number = '')
  EXECUTE FUNCTION generate_po_number();

-- ── 3. PR numbers: PR-YYMM-#### (per-month sequence) ──────────────────────────
CREATE OR REPLACE FUNCTION generate_pr_number() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE seq int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(pr_number FROM 9) AS int)), 0) + 1
    INTO seq
    FROM procurement_requests
    WHERE pr_number ~ ('^PR-' || to_char(now(), 'YYMM') || '-\d+$');
  NEW.pr_number := 'PR-' || to_char(now(), 'YYMM') || '-' || LPAD(seq::text, 4, '0');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pr_number ON procurement_requests;
CREATE TRIGGER trg_pr_number BEFORE INSERT ON procurement_requests
  FOR EACH ROW WHEN (NEW.pr_number IS NULL OR NEW.pr_number = '')
  EXECUTE FUNCTION generate_pr_number();

-- ── 4. Guarded unique index on po_number ──────────────────────────────────────
-- Only created when the data is already clean; otherwise reports the duplicates
-- and leaves them for manual cleanup (re-run this migration afterwards).
DO $$
DECLARE dup_count int;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT po_number FROM purchase_orders_to_supplier
    GROUP BY po_number HAVING COUNT(*) > 1
  ) d;
  IF dup_count = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_orders_po_number
      ON purchase_orders_to_supplier (po_number);
    RAISE NOTICE 'Unique index on po_number created.';
  ELSE
    RAISE NOTICE 'SKIPPED unique index: % duplicate po_number value(s) exist. Clean them up (SELECT po_number, COUNT(*) FROM purchase_orders_to_supplier GROUP BY po_number HAVING COUNT(*) > 1) and re-run.', dup_count;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- ▼▼▼ MIGRATION 115 ▼▼▼   (115_role_enhancements_pr_store.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- 115_role_enhancements_pr_store.sql
-- Role enhancements: Procurement PR types + Store receipt attachments & WO/PN.
--
-- 1) procurement_requests.pr_type — 'local' (local supplier PR) or 'neg'
--    (inter-company PR from NAFFCO Dubai → Saudi; always accompanied by a
--    NEG PO whose number is stored in neg_po_number).
-- 2) store_receipts.execution_reference_id — WO/PN chosen by Store at receipt
--    time (the same SO can have several WO/PN; Store assigns the receipt to one).
-- 3) store_receipt_documents + store-documents bucket — Supplier Delivery Note,
--    QC report, and SRV attached to a receipt.
--
-- Idempotent: safe to re-run.

-- ── 1. PR type + NEG PO number ────────────────────────────────────────────────

ALTER TABLE procurement_requests
  ADD COLUMN IF NOT EXISTS pr_type text NOT NULL DEFAULT 'local';

ALTER TABLE procurement_requests
  ADD COLUMN IF NOT EXISTS neg_po_number text;

DO $$ BEGIN
  ALTER TABLE procurement_requests
    ADD CONSTRAINT procurement_requests_pr_type_check
    CHECK (pr_type IN ('local', 'neg'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A NEG PR always arrives with its NEG PO — the number is mandatory.
DO $$ BEGIN
  ALTER TABLE procurement_requests
    ADD CONSTRAINT procurement_requests_neg_po_required
    CHECK (pr_type <> 'neg' OR (neg_po_number IS NOT NULL AND neg_po_number <> ''));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_pr_pr_type ON procurement_requests(pr_type);

-- ── 2. WO/PN on store receipts ────────────────────────────────────────────────

ALTER TABLE store_receipts
  ADD COLUMN IF NOT EXISTS execution_reference_id uuid
    REFERENCES project_execution_references(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_store_receipts_exec_ref
  ON store_receipts(execution_reference_id);

-- ── 3. Store receipt documents (Supplier DN / QC report / SRV) ────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-documents',
  'store-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "store_docs_objects_select" ON storage.objects;
CREATE POLICY "store_docs_objects_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'store-documents'
    AND public.current_user_role() IN
      ('admin', 'operations_manager', 'store_user', 'procurement_user', 'qc_user', 'viewer')
  );

DROP POLICY IF EXISTS "store_docs_objects_insert" ON storage.objects;
CREATE POLICY "store_docs_objects_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'store-documents'
    AND public.current_user_role() IN ('admin', 'operations_manager', 'store_user')
  );

CREATE TABLE IF NOT EXISTS store_receipt_documents (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_receipt_id  uuid        NOT NULL REFERENCES store_receipts(id) ON DELETE CASCADE,
  document_type     text        NOT NULL DEFAULT 'other'
                    CHECK (document_type IN ('supplier_dn', 'qc_report', 'srv', 'other')),
  file_name         text        NOT NULL,
  storage_path      text,
  file_size         bigint,
  mime_type         text,
  uploaded_by       uuid        REFERENCES profiles(id),
  uploaded_at       timestamptz NOT NULL DEFAULT now(),
  remarks           text
);

CREATE INDEX IF NOT EXISTS idx_srdoc_receipt ON store_receipt_documents(store_receipt_id);

ALTER TABLE store_receipt_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_receipt_docs_select" ON store_receipt_documents;
CREATE POLICY "store_receipt_docs_select"
  ON store_receipt_documents FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN
      ('admin', 'operations_manager', 'store_user', 'procurement_user', 'qc_user', 'viewer')
  );

DROP POLICY IF EXISTS "store_receipt_docs_insert" ON store_receipt_documents;
CREATE POLICY "store_receipt_docs_insert"
  ON store_receipt_documents FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin', 'operations_manager', 'store_user')
  );

RESET check_function_bodies;
-- ═══════════════════════════ END CONSOLIDATED 101→115 ═══════════════════════
