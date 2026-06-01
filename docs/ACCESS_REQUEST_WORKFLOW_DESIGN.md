# Employee Access-Request Workflow — Design

**Date:** 2026-05-31 · **Phase:** Pre-launch support layer
**Migration:** `063_access_requests.sql`

## Purpose
Manual user creation is slow. Employees submit an access request from a **public,
pre-login** page; Admin/Ops review, then approve (assigning role + department +
status) or reject (with reason).

## Table: access_requests
`employee_number`, `joining_date`, `job_title`, `full_name` (req), `email` (req),
`mobile_number`, `extension_number`, `department`, `direct_manager_name`,
`notes`, `requested_role`, `request_status`
(submitted/under_review/approved/rejected/cancelled), `admin_review_notes`,
`reviewed_by`, `reviewed_at`, `approved_user_id`.

## RLS (deliberate, reviewed)
- `ar_public_insert` — **anon + authenticated** may INSERT with
  `request_status = 'submitted'`. This is the *only* anon-writable table; visitors
  cannot read or modify anything afterward.
- `ar_admin_select` / `ar_admin_update` — admin/ops only.
- `ar_admin_delete` — admin only.

## Pages
- `/request-access` — **public** (mounted outside the protected layout, like
  `/login`). Self-contained form. On submit shows a success panel; does **not**
  create an account.
- `/admin/access-requests` — admin queue (tabs by status).
- `/admin/access-requests/:id` — review + assign role/department/status, or
  reject with reason.

## Approval → user creation (IMPORTANT, manual)
Approving a request **records the decision and intended role only**. The app
**never** creates Supabase Auth users or passwords in the browser. To complete
provisioning, an administrator must:
1. Create (or invite) the user in **Supabase Dashboard → Authentication → Users**
   (or via a server-side script using the service role key — never shipped to the
   client; see `scripts/` and `REAL_USERS_SETUP.md`).
2. Ensure the `profiles` row exists (auto-created by the `handle_new_user`
   trigger) and set the org fields (employee_number, department, etc.).
3. Insert the role into `user_roles` (single-role model).
4. Link back by setting `access_requests.approved_user_id` and
   `profiles.access_request_id` / `account_status = 'active'`.

The detail page surfaces this in a "Manual user creation required" info box.

### Why not auto-create?
Auto-creating auth users requires the **service role key**, which must remain
server-side. A future Supabase Edge Function (admin-authenticated) can automate
steps 1–4 safely. Until then the flow is deliberately manual and auditable.

## Dev mode
Falls back to `src/data/mockAccessRequests.ts`; review actions simulate with
`setTimeout`.
