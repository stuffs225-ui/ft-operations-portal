-- ── 073_sales_order_creation_final_fix.sql ────────────────────────────────────
--
-- PRODUCTION BLOCKER FIX: sales_user cannot create Sales Order / Project.
--
-- Symptom:
--   Navigating to /projects/new?fromQuotationId=<id> and submitting shows
--   "Project code generation conflict. Please try again."
--
-- Root cause chain:
--   1. generate_project_code() was SECURITY INVOKER (PostgreSQL default).
--      When a sales_user INSERTs into projects, the trigger runs under the
--      caller's identity. The SELECT inside the trigger is subject to RLS.
--      RLS for sales_user: "created_by = auth.uid()" — only their own rows.
--      COUNT(*) therefore returns only the caller's own project count, not the
--      global count. Two sales_users both see count = 0 and both generate
--      FT-2026-0001, hitting the UNIQUE constraint on project_code.
--
--   2. link_quotation_to_project() did not exist on instances where migration
--      071 had not yet been applied. After a successful project INSERT, the
--      linkage RPC call failed silently (or with an unhelpful error).
--
-- This migration is a catch-up for production Supabase instances that were
-- provisioned or last migrated before PR #35 (migrations 071 + 072) was
-- applied. All statements use CREATE OR REPLACE — safe to run multiple times.
--
-- No tables are dropped. No data is modified. RLS is not weakened.

-- ── 1. Fix generate_project_code() ────────────────────────────────────────────
--
-- Changes from the original 009_projects.sql version:
--   • SECURITY DEFINER  — runs as function owner (postgres), bypassing RLS so
--     the SELECT sees ALL projects, not just the caller's own rows.
--   • MAX() instead of COUNT(*)+1  — immune to gaps (cancelled / soft-deleted
--     projects), will never generate a code that already exists.
--   • pg_advisory_xact_lock()  — serialises concurrent inserts within the same
--     year so two simultaneous requests cannot both read MAX = N and both try
--     to emit FT-YYYY-(N+1). Lock releases automatically at transaction end.

create or replace function public.generate_project_code()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  year_str  text := to_char(now(), 'YYYY');
  seq_num   int;
begin
  -- Pass-through: caller supplied an explicit code.
  if new.project_code is not null and new.project_code <> '' then
    return new;
  end if;

  -- Serialise code generation for this year across concurrent transactions.
  perform pg_advisory_xact_lock(hashtext('ft_project_code_' || year_str));

  -- MAX() of existing numeric suffixes for this year.
  -- SECURITY DEFINER: sees ALL projects regardless of RLS on the calling user.
  select coalesce(
    max(
      cast(
        substring(project_code from '^FT-' || year_str || '-([0-9]+)$')
        as integer
      )
    ),
    0
  ) + 1
  into seq_num
  from public.projects
  where project_code ~ ('^FT-' || year_str || '-[0-9]+$');

  new.project_code := 'FT-' || year_str || '-' || lpad(seq_num::text, 4, '0');
  return new;
end;
$$;

-- The trigger projects_generate_code (created in 009_projects.sql) does not
-- need to be recreated — CREATE OR REPLACE updates the function body in place.

-- ── 2. Ensure link_quotation_to_project() exists ──────────────────────────────
--
-- SECURITY DEFINER function required because:
--   RLS policy qr_sales_update only allows sales_user to update quotations
--   where quotation_status IN ('draft', 'need_clarification').
--   When converting to SO, the quotation is in 'returned_to_sales'.
--   A direct client UPDATE would be blocked by RLS. This function runs with
--   the function owner's privileges while enforcing authorization internally.

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
  -- Auth
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

  -- Fetch quotation
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

  -- Idempotency: already linked to the same project → return immediately
  if v_q.converted_to_project_id = p_project_id then
    select * into v_proj from public.projects where id = p_project_id;
    return query select v_proj.id, v_proj.project_code, v_q.quotation_code;
    return;
  end if;

  -- Already linked to a different project
  if v_q.converted_to_project_id is not null then
    raise exception
      'This quotation is already converted to project %. Cannot link to a different project.',
      v_q.converted_to_project_id
      using errcode = 'P0001';
  end if;

  -- Status gate
  if v_q.quotation_status <> 'returned_to_sales' then
    raise exception
      'Quotation must be in "Returned to Sales" status to link to an SO (current status: %)',
      v_q.quotation_status
      using errcode = 'P0001';
  end if;

  -- Fetch project
  select * into v_proj from public.projects where id = p_project_id;
  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  -- Update quotation status and link
  update public.quotation_requests
     set quotation_status        = 'converted_to_so',
         converted_to_project_id = p_project_id,
         updated_at              = now()
   where id = p_quotation_id;

  -- Advance hot project to "won" if one was linked to this quotation
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

-- Only authenticated users may call this function.
-- Authorization (role, ownership) is enforced inside the function body.
revoke all on function public.link_quotation_to_project(uuid, uuid) from public;
grant execute on function public.link_quotation_to_project(uuid, uuid) to authenticated;

-- Reload PostgREST schema cache so the new function signatures are visible.
notify pgrst, 'reload schema';
