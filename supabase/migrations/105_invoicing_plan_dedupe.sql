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
  where source = 'sales_line_plan'
)
delete from public.project_invoicing_schedule pis
using planned_projects pp
where pis.project_id = pp.project_id
  and coalesce(pis.source, 'default') in ('delivery_date', 'default')
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
      and coalesce(source, 'default') in ('delivery_date', 'default')
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
