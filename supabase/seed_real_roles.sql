-- ============================================================================
-- FT Operations Portal — Real Role Assignment Seed
-- ============================================================================
-- Run this AFTER the users below already exist in Supabase Auth (auth.users).
-- The on_auth_user_created trigger (migration 001) auto-creates a matching
-- public.profiles row for each auth user, so we only need to assign roles in
-- public.user_roles here.
--
-- HOW TO USE:
--   1. Create each user first (Supabase Dashboard → Authentication → Users →
--      "Add user", OR via scripts/create-dev-users.ts, OR via your sign-up flow).
--   2. REPLACE every '<...>@example.com' below with the user's REAL email.
--   3. Run this file in the Supabase SQL Editor (or via the CLI).
--
-- This is idempotent: re-running updates the role (single-role model — one row
-- per user, enforced by user_roles_user_id_unique). Lookups that match no
-- profile insert nothing (so unreplaced placeholders are simply skipped).
--
-- The role enum values (do NOT change): admin, operations_manager, sales_user,
-- sales_coordinator, procurement_user, factory_user, store_user, qc_user,
-- afs_user, viewer.
-- ============================================================================

-- Reusable assignment pattern (repeated per role below):
--   insert into public.user_roles (user_id, role)
--   select id, '<role>'::public.user_role from public.profiles where email = '<email>'
--   on conflict (user_id) do update set role = excluded.role, assigned_at = now();

-- ── admin ────────────────────────────────────────────────────────────────────
insert into public.user_roles (user_id, role)
select id, 'admin'::public.user_role from public.profiles where email = 'admin@example.com'
on conflict (user_id) do update set role = excluded.role, assigned_at = now();

-- ── operations_manager ────────────────────────────────────────────────────────
insert into public.user_roles (user_id, role)
select id, 'operations_manager'::public.user_role from public.profiles where email = 'ops.manager@example.com'
on conflict (user_id) do update set role = excluded.role, assigned_at = now();

-- ── sales_user ─────────────────────────────────────────────────────────────────
insert into public.user_roles (user_id, role)
select id, 'sales_user'::public.user_role from public.profiles where email = 'sales@example.com'
on conflict (user_id) do update set role = excluded.role, assigned_at = now();

-- ── sales_coordinator ──────────────────────────────────────────────────────────
insert into public.user_roles (user_id, role)
select id, 'sales_coordinator'::public.user_role from public.profiles where email = 'sales.coordinator@example.com'
on conflict (user_id) do update set role = excluded.role, assigned_at = now();

-- ── procurement_user ───────────────────────────────────────────────────────────
insert into public.user_roles (user_id, role)
select id, 'procurement_user'::public.user_role from public.profiles where email = 'procurement@example.com'
on conflict (user_id) do update set role = excluded.role, assigned_at = now();

-- ── factory_user ───────────────────────────────────────────────────────────────
insert into public.user_roles (user_id, role)
select id, 'factory_user'::public.user_role from public.profiles where email = 'factory@example.com'
on conflict (user_id) do update set role = excluded.role, assigned_at = now();

-- ── store_user ─────────────────────────────────────────────────────────────────
insert into public.user_roles (user_id, role)
select id, 'store_user'::public.user_role from public.profiles where email = 'store@example.com'
on conflict (user_id) do update set role = excluded.role, assigned_at = now();

-- ── qc_user ────────────────────────────────────────────────────────────────────
insert into public.user_roles (user_id, role)
select id, 'qc_user'::public.user_role from public.profiles where email = 'qc@example.com'
on conflict (user_id) do update set role = excluded.role, assigned_at = now();

-- ── afs_user ───────────────────────────────────────────────────────────────────
insert into public.user_roles (user_id, role)
select id, 'afs_user'::public.user_role from public.profiles where email = 'afs@example.com'
on conflict (user_id) do update set role = excluded.role, assigned_at = now();

-- ── viewer ─────────────────────────────────────────────────────────────────────
insert into public.user_roles (user_id, role)
select id, 'viewer'::public.user_role from public.profiles where email = 'viewer@example.com'
on conflict (user_id) do update set role = excluded.role, assigned_at = now();

-- ── Verify assignments ──────────────────────────────────────────────────────────
-- select p.email, ur.role, ur.assigned_at
-- from public.user_roles ur join public.profiles p on p.id = ur.user_id
-- order by ur.role;
