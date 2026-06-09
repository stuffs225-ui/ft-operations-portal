-- ── 072_fix_project_code_generation.sql ──────────────────────────────────────
--
-- ROOT CAUSE OF "Project code generation conflict":
--
--   generate_project_code() was a SECURITY INVOKER trigger function (the
--   PostgreSQL default). When a sales_user inserts a project row, the trigger
--   fires under the sales_user's identity. The SELECT count(*) FROM projects
--   inside the trigger is filtered by RLS — a sales_user can only see rows
--   where created_by = auth.uid(). The count therefore undercounts all projects
--   and generates an already-existing FT-YYYY-NNNN code, hitting the UNIQUE
--   constraint on project_code.
--
--   The convert_quotation_to_so RPC (067) worked around this by doing the
--   INSERT inside a SECURITY DEFINER function — but the new guided wizard
--   inserts directly from the client and the workaround no longer applies.
--
-- FIX:
--
--   1. Replace generate_project_code() with a SECURITY DEFINER version.
--      Running as the function owner (postgres) means the SELECT bypasses RLS
--      and counts ALL projects regardless of the calling user.
--
--   2. Use MAX() of existing numeric suffixes instead of COUNT(*) + 1.
--      COUNT-based logic creates duplicate codes when rows have gaps (e.g.
--      after a soft-delete or cancelled project). MAX-based logic always
--      picks the next number above the highest existing one.
--
--   3. Serialise concurrent inserts with pg_advisory_xact_lock().
--      Without a lock, two simultaneous inserts both read MAX = N and
--      both try to generate FT-YYYY-(N+1). The advisory lock queues them
--      so each reads the committed state. The lock is released automatically
--      when the transaction ends.
--
-- SAFETY:
--   CREATE OR REPLACE FUNCTION only — no DROP TABLE, no DROP TRIGGER,
--   no data modification. Existing project_code values are untouched.
--   The trigger (projects_generate_code, created in 009) automatically picks
--   up the new function body. Safe to run multiple times.

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
  -- pg_advisory_xact_lock is released automatically at transaction commit/rollback.
  perform pg_advisory_xact_lock(hashtext('ft_project_code_' || year_str));

  -- MAX() of existing numeric suffixes for this year.
  -- SECURITY DEFINER context: sees ALL projects, not just the caller's own.
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

-- Note: the trigger projects_generate_code (created in 009_projects.sql) does
-- not need to be recreated — CREATE OR REPLACE updates the function body in
-- place and the trigger continues to point to the same function name.

notify pgrst, 'reload schema';
