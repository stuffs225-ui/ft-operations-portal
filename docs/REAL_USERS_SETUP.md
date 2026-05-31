# Real Users Setup

How to create the full set of role users and assign roles on a real Supabase
project. Prerequisite: migrations `001`→`059` applied and the first admin created
(`FIRST_ADMIN_BOOTSTRAP.md`).

## The model

- **Auth identity** lives in `auth.users` (Supabase Auth).
- **Profile** (`public.profiles`) is auto-created per auth user by the
  `handle_new_user` trigger.
- **Role** (`public.user_roles`) — exactly one role per user, from the 10-value
  `user_role` enum.

## Step 1 — Create the users

Pick one path:

- **Dashboard:** Authentication → Users → Add user (auto-confirm) for each
  person. Best for a small, real team.
- **Self sign-up:** if you enable email sign-up, users create themselves; you
  then assign roles in Step 2.
- **Script:** `scripts/create-dev-users.ts` (local only) creates one user per
  role in a single run — handy for staging/QA. See `scripts/README.md`.

## Step 2 — Assign roles

Edit `supabase/seed_real_roles.sql`, replacing every `'<...>@example.com'` with
real emails, then run it in the SQL Editor (or `supabase db execute`). It upserts
one role per user and is safe to re-run.

```sql
-- pattern used for each role
insert into public.user_roles (user_id, role)
select id, 'qc_user'::public.user_role from public.profiles where email = 'qc@yourcompany.com'
on conflict (user_id) do update set role = excluded.role, assigned_at = now();
```

## Step 3 — Verify

```sql
select p.email, ur.role, ur.assigned_at
from public.user_roles ur join public.profiles p on p.id = ur.user_id
order by ur.role;
```
Every intended user should appear with exactly one role. Users without a role row
have **no** access beyond their own profile (RLS denies everything else).

## Step 4 — Test access

Log in as each role and follow `ROLE_TESTING_GUIDE.md` to confirm navigation and
access restrictions behave as expected.

## The 10 roles

| Role | Primary scope |
|---|---|
| `admin` | Everything |
| `operations_manager` | All operational modules + approvals |
| `sales_user` | Own quotations & projects |
| `sales_coordinator` | Quotation processing |
| `procurement_user` | Procurement / PR / PO to Supplier |
| `factory_user` | Saudi factory records (after WO) |
| `store_user` | Store receiving, vehicle receiving, custody |
| `qc_user` | Material/Project QC, NCR, findings, release notes |
| `afs_user` | Dubai / AFS / after-sales maintenance |
| `viewer` | Read-only high-level visibility |

> Reminder (see `RLS_SECURITY_REVIEW.md`): cost-column protection is currently
> frontend-only. Until the DB-level fix lands, do not rely on RLS alone to hide
> purchase costs from factory/store/qc/afs/viewer/sales via the API.
