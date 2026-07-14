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
