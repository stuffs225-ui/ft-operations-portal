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
