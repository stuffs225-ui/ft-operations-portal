# scripts/ — local-only tooling

These scripts are **not** part of the application bundle. They live outside
`src/` and are excluded from `tsconfig.app.json` (`include: ["src"]`) and from
the Vite build, so nothing here is ever shipped to the browser.

## create-dev-users.ts

Bootstraps one Supabase Auth user per role and assigns roles in
`public.user_roles`. Uses the **service role key**, which bypasses RLS — run it
only on a trusted local/CI machine.

```bash
# Secrets — NEVER prefix with VITE_, never commit, never deploy
export SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SEED_USER_PASSWORD="a-strong-password"   # optional; defaults to ChangeMe!2026

npx tsx scripts/create-dev-users.ts
```

Edit the `USERS` array (real emails) before running against a shared project.
Re-running is safe: existing users are detected and only their role is
re-assigned.

> For production, prefer creating the first admin manually via the Supabase
> Dashboard and assigning roles with `supabase/seed_real_roles.sql`. See
> `docs/FIRST_ADMIN_BOOTSTRAP.md` and `docs/REAL_USERS_SETUP.md`.
