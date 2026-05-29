# Supabase Setup Guide

Complete step-by-step instructions for connecting the FT Operations Portal to a real Supabase project.

---

## Prerequisites

- A [Supabase](https://supabase.com) account (free tier is sufficient for development)
- Node.js 18+ and `npm` installed
- The repository cloned locally with all dependencies installed (`npm install`)

---

## Step 1 — Create a Supabase Project

1. Sign in to [supabase.com](https://supabase.com) and open your organisation.
2. Click **New project**.
3. Fill in:
   - **Name**: `ft-operations-portal` (or your preferred name)
   - **Database password**: use a strong, generated password and save it somewhere safe
   - **Region**: choose the region closest to your users (e.g. Middle East — Bahrain)
4. Click **Create new project** and wait ~2 minutes for provisioning.

---

## Step 2 — Get Your API Keys

1. In the Supabase dashboard, go to **Project Settings → API**.
2. Copy the following — you will need both:

| Key | Where to find it |
|-----|-----------------|
| **Project URL** | "Project URL" field — looks like `https://abcdefgh.supabase.co` |
| **anon / public key** | Under "Project API keys" → `anon` `public` — starts with `eyJ...` |

> **Never use the service role key in client code.** It bypasses Row Level Security and must only be used in secure server-side environments (CI, backend functions, SQL scripts run from your machine).

---

## Step 3 — Configure Environment Variables

In the project root, create a `.env` file (it is already in `.gitignore`):

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The app detects these at build time. If they are absent or still equal the placeholder values, the app boots in **Dev Mode** (mock admin account, any credentials accepted).

---

## Step 4 — Run Migrations

Run each file in order. You have two options:

### Option A — Supabase SQL Editor (recommended for first-time setup)

1. In your Supabase dashboard, go to **SQL Editor**.
2. Click **New query**.
3. Paste the contents of each file (in order) and click **Run**:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `supabase/migrations/001_profiles.sql` | `profiles` table, auto-create trigger |
| 2 | `supabase/migrations/002_roles.sql` | `user_role` enum, `user_roles` table |
| 3 | `supabase/migrations/003_rls_profiles.sql` | RLS policies, `current_user_role()` helper |
| 4 | `supabase/migrations/004_audit_log.sql` | Immutable audit log |
| 5 | `supabase/migrations/005_timeline_events.sql` | Timeline events (Phase 2+) |
| 6 | `supabase/migrations/006_master_data.sql` | 9 master data tables + RLS |
| 7 | `supabase/migrations/007_seed_data.sql` | Seed all master data tables |

> **File 008 (`008_dev_users.sql`) is documentation only** — it contains only comments and commented-out SQL. You do not need to run it.

### Option B — Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

---

## Step 5 — Create the First Admin User

Because of the bootstrapping constraint (you need a role to assign roles), the first admin user must be created through the Supabase dashboard using the service role.

### 5a — Create the auth user

1. Go to **Authentication → Users** in the Supabase dashboard.
2. Click **Add user** → **Create new user**.
3. Enter the admin's email and a temporary password.
4. Tick **Auto confirm user** so they don't need to confirm by email yet.

### 5b — Assign the admin role

The `handle_new_user` trigger automatically creates a `profiles` row when the auth user is created. Now you need to assign the admin role.

Go to **SQL Editor** and run (replace the email with your actual admin email):

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM public.profiles
WHERE email = 'admin@your-company.com';
```

Verify it worked:

```sql
SELECT p.email, p.full_name, ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id;
```

---

## Step 6 — Configure Supabase Auth Settings

In **Authentication → URL Configuration**:

| Setting | Value |
|---------|-------|
| **Site URL** | `http://localhost:5173` (dev) or your production domain |
| **Redirect URLs** | Add `http://localhost:5173/**` and your production URL |

In **Authentication → Providers**:

- **Email** provider should already be enabled.
- For production, set **Confirm email** to `true` and configure your SMTP settings under **Authentication → SMTP Settings**.

In **Authentication → Policies** (optional hardening):
- You may want to enable **Secure email change** and **Secure password change**.

---

## Step 7 — Test the Connection

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:5173`. You should see:

- **No yellow DEV MODE banner** in the header (banner only shows in dev mode)
- The login page shows **"Supabase Auth"** badge (green, top-right of the sign-in card) instead of "Dev Mode"
- Signing in with the admin credentials you created routes to the Dashboard

After login, navigate to **Settings → System Status** to confirm:

```
Supabase Connection  Connected        ✓ OK
Database Host        abcdefgh****.supabase.co  ✓ OK
Authentication       Supabase Auth (email/password)  ✓ OK
Master Data Source   Live — fetched from Supabase    ✓ OK
Mode                 Production       ✓ OK
```

---

## Step 8 — Add More Users

Use the app's **Admin / Users** page (once the Assign Role feature is wired to Supabase in Phase 2), or do it manually via SQL for now:

1. Create the user in **Authentication → Users** (or send an invite).
2. After the profile row is auto-created, assign their role:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'operations_manager'  -- replace with desired role
FROM public.profiles
WHERE email = 'newuser@your-company.com'
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

Valid roles: `admin`, `operations_manager`, `sales_user`, `sales_coordinator`, `procurement_user`, `factory_user`, `store_user`, `qc_user`, `afs_user`, `viewer`

---

## Troubleshooting

### "Invalid login credentials" on first sign-in
- Check the email is exactly as entered in the Supabase Auth dashboard.
- If you didn't tick "Auto confirm user", go to Authentication → Users, find the user, and click **Send confirmation email** or manually confirm.

### "DEV MODE" banner still appears after setting env vars
- Make sure you restarted the dev server after creating `.env` — Vite reads env vars at startup.
- Confirm the URL in `.env` is not the placeholder `https://your-project-ref.supabase.co`.
- Run `npm run build` to verify the env vars are picked up by TypeScript.

### Profile row not created after sign-up
- The `handle_new_user` trigger fires on `auth.users` INSERT. Check the trigger exists:
  ```sql
  SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';
  ```
- If missing, re-run `001_profiles.sql`.

### Settings page shows "static data" even when connected
- The master data tables may be empty. Run `007_seed_data.sql`.
- Check the browser console for Supabase RLS errors (403 / PGRST116).
- Confirm your user has an `admin` or `operations_manager` role — only authenticated users can SELECT from master data tables.

### RLS error: "new row violates row-level security policy"
- This usually means the user doesn't have a role assigned yet. Run the admin role INSERT from Step 5b.
- For the very first admin, you must use the service role (SQL Editor in dashboard) because RLS prevents a role-less user from writing to `user_roles`.

### Build errors after adding env vars
- Ensure `src/vite-env.d.ts` exists with `/// <reference types="vite/client" />`.
- Run `npm run build` to catch TypeScript errors early.
