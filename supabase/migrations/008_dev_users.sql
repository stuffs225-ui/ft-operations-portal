-- Development / Testing User Plan
-- ─────────────────────────────────────────────────────────────────────────────
-- This file contains COMMENTED-OUT SQL to create test users for each role.
-- It is NOT safe to run in production. Use only in a development Supabase project.
--
-- HOW TO USE:
-- 1. Go to your Supabase dashboard → Authentication → Users.
-- 2. Create each user via "Invite user" (or "Add user" with email + password).
--    Suggested password for dev: FtOps2025!
-- 3. After each user confirms their email, run the corresponding INSERT below
--    in the SQL Editor (Authentication → SQL Editor) to assign their role.
-- 4. Alternatively, create users via the Supabase Auth API and then run all
--    INSERTs in one batch once the auth.users rows exist.
--
-- IMPORTANT: The INSERT into user_roles requires the user's UUID from auth.users.
-- Replace each <USER_UUID_xxx> placeholder with the actual UUID.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Test User Role Assignments ────────────────────────────────────────────
-- Run AFTER creating the users in Supabase Auth and confirming email.

/*

-- 1. Admin (first admin must be assigned via service role — see SUPABASE_SETUP.md)
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID_ADMIN>', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 2. Operations Manager
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID_OPS_MGR>', 'operations_manager')
ON CONFLICT (user_id) DO UPDATE SET role = 'operations_manager';

-- 3. Sales User
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID_SALES>', 'sales_user')
ON CONFLICT (user_id) DO UPDATE SET role = 'sales_user';

-- 4. Sales Coordinator
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID_SALES_COORD>', 'sales_coordinator')
ON CONFLICT (user_id) DO UPDATE SET role = 'sales_coordinator';

-- 5. Procurement User
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID_PROC>', 'procurement_user')
ON CONFLICT (user_id) DO UPDATE SET role = 'procurement_user';

-- 6. Factory User
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID_FACTORY>', 'factory_user')
ON CONFLICT (user_id) DO UPDATE SET role = 'factory_user';

-- 7. Store User
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID_STORE>', 'store_user')
ON CONFLICT (user_id) DO UPDATE SET role = 'store_user';

-- 8. QC User
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID_QC>', 'qc_user')
ON CONFLICT (user_id) DO UPDATE SET role = 'qc_user';

-- 9. AFS User
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID_AFS>', 'afs_user')
ON CONFLICT (user_id) DO UPDATE SET role = 'afs_user';

-- 10. Viewer
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID_VIEWER>', 'viewer')
ON CONFLICT (user_id) DO UPDATE SET role = 'viewer';

*/

-- ── Suggested test accounts (create in Auth dashboard) ───────────────────
-- Email                              Role                 Suggested name
-- admin@ft-ops.test                  admin                Test Admin
-- ops.manager@ft-ops.test            operations_manager   Test Ops Manager
-- sales@ft-ops.test                  sales_user           Test Sales User
-- sales.coord@ft-ops.test            sales_coordinator    Test Sales Coordinator
-- procurement@ft-ops.test            procurement_user     Test Procurement
-- factory@ft-ops.test                factory_user         Test Factory User
-- store@ft-ops.test                  store_user           Test Store User
-- qc@ft-ops.test                     qc_user              Test QC User
-- afs@ft-ops.test                    afs_user             Test AFS User
-- viewer@ft-ops.test                 viewer               Test Viewer

-- ── Quick role check query (run after setup) ─────────────────────────────
-- SELECT p.email, p.full_name, ur.role
-- FROM public.profiles p
-- LEFT JOIN public.user_roles ur ON ur.user_id = p.id
-- ORDER BY ur.role;
