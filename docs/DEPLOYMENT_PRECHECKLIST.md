# Deployment Pre-Checklist

**Applicable to:** First production deployment of FT Operations Portal  
**Last updated:** 2026-05-31 (Real Supabase Readiness review)

> **Companion docs:** `SUPABASE_REAL_SETUP.md` (master guide),
> `MIGRATION_EXECUTION_ORDER.md`, `MIGRATION_RISK_REVIEW.md`,
> `RLS_SECURITY_REVIEW.md`, `FIRST_ADMIN_BOOTSTRAP.md`, `REAL_USERS_SETUP.md`,
> `STORAGE_SETUP.md`, `ENVIRONMENT_VARIABLES.md`, `REAL_SUPABASE_SMOKE_TEST.md`,
> `PRODUCTION_READINESS_GAPS.md`.

> **Migration count update:** the schema is now `001`→`059` (was `001`–`057`).
> `058` creates storage buckets + object RLS; `059` adds indexes + missing
> `updated_at` triggers. Three fresh-run blockers were fixed (see
> `MIGRATION_RISK_REVIEW.md`).

> **Go/No-Go gate (must read):** before exposing cost data to any non-admin role,
> resolve GAP-01 (DB-level cost protection) and GAP-02 (PO self-approval guard)
> in `PRODUCTION_READINESS_GAPS.md` — these are currently frontend-only.

---

## Phase 1 — Environment Setup

- [ ] Create a new Supabase project (region: Middle East / `ap-southeast-1` recommended)
- [ ] Copy `VITE_SUPABASE_URL` from project settings → API → URL
- [ ] Copy `VITE_SUPABASE_ANON_KEY` from project settings → API → anon key
- [ ] Set both variables in your hosting platform (Vercel / Netlify / Cloudflare Pages)
- [ ] **Never** set `SUPABASE_SERVICE_ROLE_KEY` as a Vite env variable (it would be exposed to the browser)

---

## Phase 2 — Database Migrations

Run all migrations in order:

```bash
supabase db push
```

Or apply manually in sequence:

```
001_profiles.sql          ← user profiles + role column
002_roles.sql             ← user_roles table
003_rls_profiles.sql      ← RLS on profiles
004_audit_log.sql         ← global audit log
005_timeline_events.sql   ← global timeline
006_master_data.sql       ← vehicle types, material categories, etc.
007_seed_data.sql         ← master data seed rows
008_dev_users.sql         ← dev users (skip in production)
009–013                   ← projects + RLS
014–018                   ← quotations
019–024                   ← procurement
025–028                   ← factory
029–034                   ← store
035–040                   ← QC
041–048                   ← Dubai / AFS / After-Sales
049–057                   ← Phase 10: Reports, SLA, Health Scores, Issues, CAPA
```

> **Note:** Migration 008 creates dev/test users with hardcoded UUIDs. Skip it or review carefully before running in production.

---

## Phase 3 — Auth Configuration

- [ ] Enable Supabase Auth → Email provider
- [ ] Configure "Site URL" to your production domain
- [ ] Configure "Redirect URLs" to `https://your-domain.com/**`
- [ ] Set `JWT expiry` to 3600 (1 hour) minimum
- [ ] Create initial admin user via Supabase Dashboard → Auth → Users
- [ ] Insert admin profile row:
  ```sql
  INSERT INTO profiles (id, email, full_name, role)
  VALUES ('<user-uuid>', 'admin@example.com', 'System Admin', 'admin');
  ```

---

## Phase 4 — Storage Setup

- [ ] Create a `documents` storage bucket
- [ ] Set bucket access to **Private** (authenticated users only)
- [ ] Apply RLS policy: users can upload to their own project folder
- [ ] Set max file size to 50 MB
- [ ] Enable image transformation (optional — for thumbnail previews)

---

## Phase 5 — Verify Master Data

After running 007_seed_data.sql:

- [ ] Confirm `vehicle_types` has ≥7 rows (Fire Truck, Ambulance, SUV, etc.)
- [ ] Confirm `material_categories` has ≥4 rows
- [ ] Confirm `supplier_categories` has ≥3 rows
- [ ] Confirm `document_types` has ≥5 rows
- [ ] Confirm `sla_rule_templates` has the 8 legacy rules (used by Settings admin UI)
- [ ] Seed `sla_rules` with Phase 10 module-level rules (see `mockReports.ts` for reference values)

---

## Phase 6 — RLS Smoke Test

Run each test as a role-appropriate user:

- [ ] `sales_user` cannot read projects owned by other users (status = draft)
- [ ] `sales_user` can read all approved projects
- [ ] `procurement_user` cannot read `purchase_orders.unit_cost` (financial field — hide via view in Phase 11)
- [ ] `factory_user` cannot see procurement cost columns
- [ ] `admin` can read all rows in all tables
- [ ] `viewer` can only SELECT; all INSERT/UPDATE/DELETE are denied

---

## Phase 7 — SLA Engine Setup (post-Phase 11)

These steps require Edge Functions (Phase 11):

- [ ] Deploy `trigger-sla-on-status-change` Edge Function
- [ ] Deploy `health-score-refresh` scheduled function (pg_cron every 6h)
- [ ] Deploy `sla-escalation-check` scheduled function (pg_cron every 1h)
- [ ] Test SLA breach → inbox task creation flow

---

## Phase 8 — Final Go-Live Check

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] All 86 routes load without a blank screen
- [ ] Login → Dashboard → Projects list loads
- [ ] Create new SO → Submit for Approval → Approve flow completes end-to-end
- [ ] Settings page loads all master data from Supabase (not static fallback)
- [ ] Control Tower loads (may show empty state until health scores are seeded)
- [ ] Role-switch smoke test: confirm financial fields hidden for non-admin roles
- [ ] Confirm no `console.error` for missing Supabase config (banner should be gone)

---

## Rollback Plan

If a migration fails:

1. Identify the failing migration number
2. Run `supabase db reset` on staging only
3. Fix the migration SQL
4. Re-run from the failing migration forward
5. **Never** run `supabase db reset` in production — restore from backup instead
