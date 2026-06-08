-- ── 067_convert_quotation_to_so.sql ──────────────────────────────────────────
-- Atomic, authorization-checked conversion of a "Returned to Sales" quotation
-- into a draft Sales Order / project.
--
-- WHY A SECURITY DEFINER FUNCTION (and why this is NOT a security hole):
--   * The previous client-side flow inserted directly into `projects`. The
--     `generate_project_code()` BEFORE INSERT trigger counts existing project
--     codes, but when the insert runs as a `sales_user` the projects RLS SELECT
--     policy only exposes that user's own rows. The count therefore undercounts
--     and regenerates an existing `FT-YYYY-NNNN`, violating the unique constraint
--     and failing the whole insert with a generic error.
--   * Running the conversion in a SECURITY DEFINER function lets the project-code
--     generation count across ALL projects (correct sequencing) and makes the
--     "insert project + link + update quotation" steps atomic.
--   * Authorization is enforced INSIDE the function (role check + ownership check).
--     The service role key is never used and RLS is never disabled. Only the
--     `authenticated` role may execute it.
--
-- Idempotent: CREATE OR REPLACE; if the quotation is already converted the
-- existing project link is returned instead of creating a duplicate.

create or replace function public.convert_quotation_to_so(p_quotation_id uuid)
returns table (project_id uuid, project_code text, so_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_role         public.user_role;
  v_q            public.quotation_requests%rowtype;
  v_project_id   uuid;
  v_project_code text;
  v_so_number    text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select role into v_role from public.user_roles where user_id = v_uid limit 1;
  if v_role is null or v_role not in ('admin', 'operations_manager', 'sales_user') then
    raise exception 'Your role is not permitted to convert quotations to SO'
      using errcode = '42501';
  end if;

  select * into v_q from public.quotation_requests where id = p_quotation_id;
  if not found then
    raise exception 'Quotation not found' using errcode = 'P0002';
  end if;

  -- A sales_user may only convert quotations they own.
  if v_role = 'sales_user' and v_q.requested_by is distinct from v_uid then
    raise exception 'You can only convert your own quotations'
      using errcode = '42501';
  end if;

  -- Idempotent: already converted → return the existing link, do not duplicate.
  if v_q.converted_to_project_id is not null then
    select p.id, p.project_code, p.so_number
      into v_project_id, v_project_code, v_so_number
      from public.projects p
      where p.id = v_q.converted_to_project_id;
    return query select v_project_id, v_project_code, v_so_number;
    return;
  end if;

  -- Eligibility: the quotation response must be complete and returned to Sales.
  if v_q.quotation_status <> 'returned_to_sales' then
    raise exception
      'Quotation must be in "Returned to Sales" status to convert (current status: %)',
      v_q.quotation_status
      using errcode = 'P0001';
  end if;

  v_so_number := 'SO-' || v_q.quotation_code;

  -- Empty project_code triggers FT-YYYY-NNNN generation. Running as definer the
  -- trigger now counts ALL projects, so no unique-code collision occurs.
  insert into public.projects (
    project_code, so_number, customer_name, sales_owner_id,
    customer_delivery_date, project_status, total_sales_value, notes, created_by
  ) values (
    '',
    v_so_number,
    v_q.customer_name,
    coalesce(v_q.requested_by, v_uid),
    coalesce(v_q.required_delivery_expectation, (now() + interval '180 days')::date),
    'draft',
    coalesce(v_q.quotation_total_value, 0),
    'Converted from quotation ' || v_q.quotation_code,
    v_uid
  )
  returning id, project_code into v_project_id, v_project_code;

  update public.quotation_requests
    set quotation_status        = 'converted_to_so',
        converted_to_project_id = v_project_id,
        updated_at              = now()
    where id = p_quotation_id;

  return query select v_project_id, v_project_code, v_so_number;
end;
$$;

-- Only signed-in users may call it; authorization is enforced inside the function.
revoke all on function public.convert_quotation_to_so(uuid) from public;
grant execute on function public.convert_quotation_to_so(uuid) to authenticated;
