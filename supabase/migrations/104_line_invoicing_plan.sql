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
