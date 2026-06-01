# User Profile & Role Assignment — Design

**Date:** 2026-05-31 · **Phase:** Pre-launch support layer
**Migration:** `062_user_profile_enhancement.sql`

## Profile extension
`profiles` gains (additive, `ADD COLUMN IF NOT EXISTS`): `employee_number`,
`joining_date`, `job_title`, `mobile_number`, `extension_number`,
`direct_manager_name`, `account_status` (pending/active/suspended/inactive,
default `active`), `access_request_id`, and `permissions_json` (jsonb, default
`{}`). `full_name`, `email`, `department` already existed.

Existing RLS from `001`/`003` is untouched; a new `profiles: manager update`
policy lets admin/ops update lifecycle/org fields for any user (self-update was
already allowed).

## Roles vs permissions
- **Role is the live access mechanism** — single role per user in `user_roles`,
  resolved by `current_user_role()`. 10 roles unchanged.
- **`permissions_json`** is a *foundation* for future fine-grained overrides. The
  permission keys are enumerated in `src/types/index.ts` (`PERMISSION_KEYS`):
  `can_view_costs`, `can_approve_po`, `can_approve_templates`, `can_manage_users`,
  `can_export_reports`, `can_issue_release_note`, `can_approve_custody`,
  `can_manage_sla`, `can_manage_capa`. **No permission engine is enforced yet** —
  this is intentionally deferred to avoid risk. Document-only until a later phase
  wires checks (and corresponding RLS) for these flags.

## Admin Users page (`/admin/users`)
Enhanced to show employee details and filter by **department / role / status**.
Per-user actions: assign role, suspend / reactivate (account_status), and a
detail view (employee_number, job_title, joining_date, mobile, extension, manager,
access-request origin). A banner links to `/admin/access-requests`.

In dev mode the page uses `MOCK_USER_ACCOUNTS`. In real mode role assignment must
write to `user_roles` (admin-only RLS) and status to `profiles.account_status`.

## Account status semantics
- `pending` — created from an approved access request, not yet activated.
- `active` — normal access.
- `suspended` — temporarily blocked (kept for audit; can be reactivated).
- `inactive` — left the organisation.

The app does not yet gate login on `account_status` (auth is governed by
Supabase + `user_roles`); enforcing a status gate is a documented future
enhancement (an RLS predicate or an Edge Function check).
