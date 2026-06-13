-- ── 074_fix_hot_project_code_generation.sql ───────────────────────────────────
--
-- QA REGRESSION FIX: Hot Project code generation fails for sales_user.
--
-- Root cause (identical to the project_code blocker fixed in 072/073):
--
--   generate_hot_project_code() was SECURITY INVOKER (PostgreSQL default).
--   When a sales_user inserts a hot_project row the trigger fires under the
--   caller's identity.  The SELECT count(*) inside the trigger is subject to
--   the RLS policy "hot_projects: sales_user select own", which filters to
--   rows where created_by = auth.uid().  Two sales_users both see count = 0
--   and both generate HP-2026-0001, hitting the UNIQUE constraint on
--   hot_project_code.
--
-- Fix:
--   1. SECURITY DEFINER — trigger runs as function owner (postgres), bypasses
--      RLS, sees ALL hot_projects for an accurate MAX() calculation.
--   2. MAX(numeric_suffix)+1 — replaces COUNT(*)+1; immune to gaps caused by
--      cancelled or soft-deleted records.
--   3. pg_advisory_xact_lock() — serialises concurrent inserts within the same
--      year so two simultaneous requests cannot both read MAX=N and both emit
--      HP-YYYY-(N+1).
--
-- SAFETY: CREATE OR REPLACE only — no DROP TABLE, no data modification.
-- The trigger hot_projects_generate_code (created in 068_hot_projects.sql)
-- continues to point to the same function name; no trigger recreation needed.
-- Safe to run multiple times (idempotent).

create or replace function public.generate_hot_project_code()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  year_str  text := to_char(now(), 'YYYY');
  seq_num   int;
begin
  -- Pass-through: caller supplied an explicit code.
  if new.hot_project_code is not null and new.hot_project_code <> '' then
    return new;
  end if;

  -- Serialise code generation for this year across concurrent transactions.
  perform pg_advisory_xact_lock(hashtext('ft_hot_project_code_' || year_str));

  -- MAX() of existing numeric suffixes for this year.
  -- SECURITY DEFINER context: sees ALL hot_projects, not just the caller's own.
  select coalesce(
    max(
      cast(
        substring(hot_project_code from '^HP-' || year_str || '-([0-9]+)$')
        as integer
      )
    ),
    0
  ) + 1
  into seq_num
  from public.hot_projects
  where hot_project_code ~ ('^HP-' || year_str || '-[0-9]+$');

  new.hot_project_code := 'HP-' || year_str || '-' || lpad(seq_num::text, 4, '0');
  return new;
end;
$$;

notify pgrst, 'reload schema';
