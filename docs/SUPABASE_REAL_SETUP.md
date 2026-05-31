# Supabase Real Setup — Master Guide

End-to-end guide to move FT Operations Portal from mock/dev mode to a real
Supabase backend with real users. Read this first; it links to the detailed docs.

---

## Overview of steps

1. Create a Supabase project
2. Set environment variables (`ENVIRONMENT_VARIABLES.md`)
3. Run migrations `001`→`059` (`MIGRATION_EXECUTION_ORDER.md`)
4. Create the first admin (`FIRST_ADMIN_BOOTSTRAP.md`)
5. Create users + assign roles (`REAL_USERS_SETUP.md`, `supabase/seed_real_roles.sql`)
6. Configure storage buckets (`STORAGE_SETUP.md` — buckets created by `058`)
7. Smoke test (`REAL_SUPABASE_SMOKE_TEST.md`)
8. Review remaining gaps before go-live (`PRODUCTION_READINESS_GAPS.md`)

---

## 1. Create the project
Supabase Dashboard → New project. Choose a region near your users (e.g. Middle
East). Note the **Project URL** and **anon key** (Settings → API).

## 2. Environment variables
Local `.env` (copy from `.env.example`) and hosting platform:
```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```
Never set the service role key as a `VITE_` variable. Details: `ENVIRONMENT_VARIABLES.md`.

## 3. Migrations
```bash
supabase link --project-ref <ref>
supabase db push        # applies 001→059 in order
```
Three CREATE-time bugs that previously blocked a fresh run are fixed in this
branch (FK typo in 025/027; `profiles.role` in 049–057; `auth.jwt()` idiom in
035–048). See `MIGRATION_RISK_REVIEW.md`. If `058` (storage) errors under the
CLI, run it in the SQL Editor.

## 4. First admin
Create via Dashboard → Authentication → Users, then assign `admin` in
`user_roles`. Full steps: `FIRST_ADMIN_BOOTSTRAP.md`.

## 5. Users + roles
Create each user, then run `supabase/seed_real_roles.sql` (replace placeholder
emails). Details: `REAL_USERS_SETUP.md`.

## 6. Storage
Buckets and object RLS are created by `058_storage_buckets.sql`. Set per-bucket
size/MIME limits in the Dashboard. **Note:** upload UI is not yet wired in the
app (`DOCUMENT_UPLOAD_GOVERNANCE.md`) — the storage layer is ready but unused.

## 7. Smoke test
Run `REAL_SUPABASE_SMOKE_TEST.md` — auth, all 10 roles, core workflows, security
spot checks, empty-DB rendering, data-quality flags.

## 8. Gaps before go-live
Read `PRODUCTION_READINESS_GAPS.md` and `RLS_SECURITY_REVIEW.md`. The two
must-fix items before exposing cost data to non-admin roles are: DB-level cost
protection and procurement PO self-approval guard (both currently frontend-only).

---

## What "real mode" gives you today

| Area | Real read | Real write |
|---|---|---|
| Auth / roles | ✅ | ✅ |
| Projects / SO / Approval / WO-PN | ✅ | ✅ |
| Quotations | ✅ | ✅ |
| Procurement (core) | ✅ | ✅ |
| Factory raw-material requests | ✅ | ✅ |
| Store / Vehicle / Custody | ✅ | ❌ writes simulated |
| QC / NCR / Release | ✅ | ❌ writes simulated |
| Dubai / AFS / Maintenance | ✅ | ❌ writes simulated |
| Reports / Control Tower / Health / SLA | ❌ mock only | n/a |

The ❌ items are documented in `PRODUCTION_READINESS_GAPS.md`. They do not block a
pilot of the working modules but must be completed before those modules are used
for real data entry / reporting.
