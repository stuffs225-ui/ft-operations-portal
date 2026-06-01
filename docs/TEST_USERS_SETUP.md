# Test Users Setup Guide

This guide explains how to create the 10 test accounts (one per role) needed for
role-by-role testing of the FT Operations Portal.

---

## Prerequisites

- Node.js 18+
- Access to the Supabase project's **service role key** (Dashboard → Settings → API)
- The project cloned locally

Install `tsx` and `dotenv` (needed to run the TypeScript script outside Vite):

```bash
npm install --save-dev tsx dotenv @types/node
```

> **Note:** `@supabase/supabase-js` is already listed as a project dependency.

---

## 1. Create `.env.local.admin`

Create a file at the project root named `.env.local.admin`.
**This file is in `.gitignore` — never commit it.**

```env
# .env.local.admin  —  NEVER commit this file
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # service_role key
TEST_USERS_PASSWORD=ChangeMe2025!  # min 8 chars, shared by all test accounts
```

> **Security:** The service role key bypasses Row-Level Security.
> Never expose it in `src/`, `.env`, `.env.local`, or any committed file.

---

## 2. Run the Script

```bash
npx tsx scripts/createTestUsers.ts
```

The script will:
1. Read credentials from `.env.local.admin`
2. Create each user via the Supabase Admin API (`auth.admin.createUser`)
3. Upsert the correct role into `public.user_roles`
4. Upsert a profile row into `public.profiles`
5. Print a summary table — **the password is never printed**

### Example output

```
🔧  FT Operations Portal — Test User Setup
📡  Supabase URL : https://xxxx.supabase.co
👥  Users to provision: 10

  ⏳  admin.test@ft-operations.local            ✅  created
  ⏳  ops.test@ft-operations.local              ✅  created
  ⏳  sales.test@ft-operations.local            ✅  created
  ...

────────────────────────────────────────────────────────────────────────────────
  SUMMARY
────────────────────────────────────────────────────────────────────────────────
  Email                                         Role                   Status
────────────────────────────────────────────────────────────────────────────────
  admin.test@ft-operations.local                admin                  ✅  created
  ops.test@ft-operations.local                  operations_manager     ✅  created
  sales.test@ft-operations.local                sales_user             ✅  created
  coordinator.test@ft-operations.local          sales_coordinator      ✅  created
  procurement.test@ft-operations.local          procurement_user       ✅  created
  factory.test@ft-operations.local              factory_user           ✅  created
  store.test@ft-operations.local                store_user             ✅  created
  qc.test@ft-operations.local                   qc_user                ✅  created
  afs.test@ft-operations.local                  afs_user               ✅  created
  viewer.test@ft-operations.local               viewer                 ✅  created
────────────────────────────────────────────────────────────────────────────────

  ✅ Created: 10  🔄 Already existed: 0  ❌ Failed: 0

  ⚠️   Password NOT shown. Check TEST_USERS_PASSWORD in your .env.local.admin
  ⚠️   These accounts are for LOCAL TESTING only — delete before production.
```

If a user already exists the script re-applies the role and prints `🔄 already existed (role refreshed)` — safe to run multiple times.

---

## 3. Test Accounts

| Email | Role | Department |
|---|---|---|
| `admin.test@ft-operations.local` | `admin` | IT |
| `ops.test@ft-operations.local` | `operations_manager` | Operations |
| `sales.test@ft-operations.local` | `sales_user` | Sales |
| `coordinator.test@ft-operations.local` | `sales_coordinator` | Sales |
| `procurement.test@ft-operations.local` | `procurement_user` | Procurement |
| `factory.test@ft-operations.local` | `factory_user` | Factory |
| `store.test@ft-operations.local` | `store_user` | Store |
| `qc.test@ft-operations.local` | `qc_user` | Quality Control |
| `afs.test@ft-operations.local` | `afs_user` | After Sales |
| `viewer.test@ft-operations.local` | `viewer` | Management |

All accounts share the password you set in `TEST_USERS_PASSWORD`.

---

## 4. Role Visibility Quick-Reference

| Feature / Data | admin | ops_mgr | sales | coord | proc | factory | store | qc | afs | viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| All projects | ✅ | ✅ | own | approved | approved | approved | approved | approved | approved | approved |
| Financial values | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PO supplier costs | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve projects | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Admin settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve own PO | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. Deleting Test Users (Before Production)

To delete all test accounts:

### Via Supabase Dashboard

1. Go to **Authentication → Users**
2. Search for `@ft-operations.local`
3. Delete each account

### Via SQL (run in Supabase SQL Editor)

```sql
-- Remove roles first (FK constraint)
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email LIKE '%@ft-operations.local'
);

-- Remove profiles
DELETE FROM public.profiles
WHERE email LIKE '%@ft-operations.local';

-- Note: deleting from auth.users requires the Admin API or Dashboard.
-- SQL Editor runs as postgres role and can delete directly:
DELETE FROM auth.users
WHERE email LIKE '%@ft-operations.local';
```

> **Caution:** Confirm the email pattern matches only test accounts before running.

---

## 6. Security Checklist

- [ ] `.env.local.admin` is listed in `.gitignore` ✅
- [ ] Service role key never appears in `src/` ✅
- [ ] Script is in `scripts/` and excluded from `tsconfig.app.json` (`include: ["src"]`) ✅
- [ ] `TEST_USERS_PASSWORD` is not printed by the script ✅
- [ ] Test accounts deleted before production go-live
