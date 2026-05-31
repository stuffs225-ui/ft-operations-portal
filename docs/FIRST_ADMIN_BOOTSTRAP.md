# First Admin Bootstrap

Creating the very first admin is a chicken-and-egg problem: RLS requires a role
to write, but no one has a role yet. The app solves this with a
`SECURITY DEFINER` trigger that auto-creates a `profiles` row for every new auth
user (`handle_new_user`, migration `001`). You then assign the admin role
directly.

## Option A — Supabase Dashboard (recommended for the first admin)

1. **Supabase Dashboard → Authentication → Users → Add user.**
   - Email: your real admin email.
   - Password: a strong password.
   - ✅ Auto-confirm user.
2. The `on_auth_user_created` trigger automatically inserts a matching
   `public.profiles` row. Confirm:
   ```sql
   select id, email from public.profiles where email = 'admin@yourcompany.com';
   ```
3. Assign the admin role (SQL Editor):
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin'::public.user_role
   from public.profiles where email = 'admin@yourcompany.com'
   on conflict (user_id) do update set role = excluded.role;
   ```
4. Log in to the app with that email/password. You should land on the Dashboard
   with full admin navigation and **no** dev-mode banner.

## Option B — Local admin script

If you prefer scripted bootstrap (creates all 10 role users at once), use
`scripts/create-dev-users.ts` with the service role key on a local machine. See
`scripts/README.md`. This is optional and must never run in a deployed runtime.

## Verify the bootstrap

```sql
-- exactly one admin should exist
select p.email, ur.role
from public.user_roles ur join public.profiles p on p.id = ur.user_id
where ur.role = 'admin';
```

## Notes

- `migration 008_dev_users.sql` is a commented-out no-op — it does **not** create
  users. Use Option A or B.
- The single-role model (`user_roles_user_id_unique`) allows exactly one role per
  user. Re-running the assignment updates the role in place.
- After the first admin exists, create remaining users and assign roles via
  `supabase/seed_real_roles.sql` (see `REAL_USERS_SETUP.md`).
