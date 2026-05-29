# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, choose your organisation, enter a project name and strong database password.
3. Select the region closest to your users (e.g. Middle East — Bahrain or EU West).
4. Wait ~2 minutes for the project to provision.

## 2. Get Your API Keys

In the Supabase dashboard:

1. Go to **Project Settings → API**.
2. Copy:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — starts with `eyJ...`

> **Never use the service role key in client code.** The service role key bypasses RLS and must only be used in secure server-side environments.

## 3. Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Populate with your values:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The app will automatically detect these variables. If they are absent or set to placeholder values, it boots in **Dev Mode** (admin access, no real auth required).

## 4. Run Migrations

From the project root, run each migration file in order against your Supabase project.

### Option A — Supabase CLI (recommended)

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

### Option B — Supabase SQL Editor

Open the SQL Editor in the Supabase dashboard and paste + run each file in order:

1. `supabase/migrations/001_profiles.sql`
2. `supabase/migrations/002_roles.sql`
3. `supabase/migrations/003_rls_profiles.sql`
4. `supabase/migrations/004_audit_log.sql`
5. `supabase/migrations/005_timeline_events.sql`

## 5. Configure Authentication Settings

In **Authentication → Providers**:

- Enable **Email** provider.
- Set **Confirm email** to `true` for production; can be `false` during development.

In **Authentication → URL Configuration**:

- Set **Site URL** to `http://localhost:5173` for local dev, or your production domain.
- Add `http://localhost:5173/**` to **Redirect URLs**.

## 6. Create the First Admin User

1. Go to **Authentication → Users** in the Supabase dashboard.
2. Click **Invite user** and enter the admin email.
3. After the user confirms their email, go to the SQL Editor and run:

```sql
insert into public.user_roles (user_id, role, assigned_by)
select id, 'admin', id from public.profiles where email = 'admin@your-company.com';
```

## 7. Verify the Setup

Start the dev server:

```bash
npm run dev
```

Navigate to `http://localhost:5173`. You should be redirected to `/login`. Sign in with your admin credentials. The DEV MODE banner should not appear when Supabase is properly configured.
