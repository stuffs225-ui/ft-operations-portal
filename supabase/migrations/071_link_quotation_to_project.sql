-- ── 071_link_quotation_to_project.sql ─────────────────────────────────────────
-- SECURITY DEFINER function that atomically links an existing project back to
-- the quotation it was created from, updates the quotation status, and advances
-- the originating hot project (if any) to the "won" stage.
--
-- WHY SECURITY DEFINER:
--   The RLS policy qr_sales_update on quotation_requests only allows sales_user
--   to update rows where quotation_status IN ('draft', 'need_clarification').
--   When converting to SO the quotation is in 'returned_to_sales', so a direct
--   UPDATE from the client would be blocked by RLS.  Running the linkage inside
--   a SECURITY DEFINER function (which runs with the function owner's privileges)
--   allows the update while still enforcing authorization inside the function.
--
-- Authorization enforced inside the function:
--   * Caller must be authenticated
--   * Caller must have role admin, operations_manager, or sales_user
--   * sales_user may only link their own quotations
--   * Quotation must be in 'returned_to_sales' status (or already linked — idempotent)
--
-- Idempotent: if the quotation is already linked to the same project, the
-- function returns the existing data without modifying anything.

create or replace function public.link_quotation_to_project(
  p_quotation_id uuid,
  p_project_id   uuid
)
returns table (project_id uuid, project_code text, quotation_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_role     public.user_role;
  v_q        public.quotation_requests%rowtype;
  v_proj     public.projects%rowtype;
begin
  -- ── Auth ─────────────────────────────────────────────────────────────────────
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select role into v_role
    from public.user_roles
   where user_id = v_uid
   limit 1;

  if v_role is null or v_role not in ('admin', 'operations_manager', 'sales_user') then
    raise exception 'Your role is not permitted to link quotations to projects'
      using errcode = '42501';
  end if;

  -- ── Fetch quotation ───────────────────────────────────────────────────────────
  select * into v_q
    from public.quotation_requests
   where id = p_quotation_id;

  if not found then
    raise exception 'Quotation not found' using errcode = 'P0002';
  end if;

  -- sales_user may only link their own quotations
  if v_role = 'sales_user' and v_q.requested_by is distinct from v_uid then
    raise exception 'You can only link your own quotations to a project'
      using errcode = '42501';
  end if;

  -- ── Idempotency: already linked to the same project → return immediately ──────
  if v_q.converted_to_project_id = p_project_id then
    select * into v_proj from public.projects where id = p_project_id;
    return query select v_proj.id, v_proj.project_code, v_q.quotation_code;
    return;
  end if;

  -- Already linked to a *different* project
  if v_q.converted_to_project_id is not null then
    raise exception
      'This quotation is already converted to project %. Cannot link to a different project.',
      v_q.converted_to_project_id
      using errcode = 'P0001';
  end if;

  -- ── Status gate ───────────────────────────────────────────────────────────────
  if v_q.quotation_status <> 'returned_to_sales' then
    raise exception
      'Quotation must be in "Returned to Sales" status to link to an SO (current status: %)',
      v_q.quotation_status
      using errcode = 'P0001';
  end if;

  -- ── Fetch project ─────────────────────────────────────────────────────────────
  select * into v_proj from public.projects where id = p_project_id;
  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  -- ── Update quotation ──────────────────────────────────────────────────────────
  update public.quotation_requests
     set quotation_status        = 'converted_to_so',
         converted_to_project_id = p_project_id,
         updated_at              = now()
   where id = p_quotation_id;

  -- ── Advance hot project to "won" if linked ────────────────────────────────────
  if v_q.linked_hot_project_id is not null then
    update public.hot_projects
       set linked_project_id = p_project_id,
           stage             = 'won',
           updated_at        = now()
     where id = v_q.linked_hot_project_id;
  end if;

  return query select v_proj.id, v_proj.project_code, v_q.quotation_code;
end;
$$;

-- Only signed-in users may call it; per-row authorization is inside the function.
revoke all on function public.link_quotation_to_project(uuid, uuid) from public;
grant execute on function public.link_quotation_to_project(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
