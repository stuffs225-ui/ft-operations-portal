# Migration Risk Review — Real Supabase Readiness

**Date:** 2026-05-31
**Reviewed:** `supabase/migrations/001` → `059`
**Premise:** First-time deployment to a real Supabase project. No live database exists yet, so fixing CREATE-time failures in the original migration files is safe (a corrective later migration cannot help — the run aborts at the failing statement).

---

## Summary

| Severity | Finding | Status |
|---|---|---|
| 🔴 BLOCKER | FK to non-existent `execution_references` (025, 027) | ✅ FIXED |
| 🔴 BLOCKER | RLS policies query non-existent `profiles.role` (049–057) | ✅ FIXED |
| 🟠 HIGH | Broken `auth.jwt() ->> 'role'` role idiom (035–048) | ✅ FIXED |
| 🟡 MEDIUM | Missing indexes (projects, project_documents) | ✅ FIXED (059) |
| 🟡 MEDIUM | Missing `updated_at` triggers (050, 056, 057) | ✅ FIXED (059) |
| 🟡 MEDIUM | Migrations 035–057 not re-runnable (no IF NOT EXISTS guards) | 📄 DOCUMENTED |
| 🟢 LOW | Dangling `*_id` columns without FK | 📄 DOCUMENTED |
| 🟢 LOW | Three timeline models (global / project / quotation) | 📄 DOCUMENTED |

---

## Fixed in this branch

### 1. 🔴 FK typo — `execution_references` → `project_execution_references`
- `025_factory_records.sql:17` and `027_raw_material_requests.sql:20` referenced
  `execution_references(id)`, a table that does not exist. The real table is
  `project_execution_references` (created in `014`).
- **Effect if unfixed:** `CREATE TABLE` aborts with *relation "execution_references" does not exist* — the entire migration run halts at file 025.
- **Fix:** renamed the FK target to `project_execution_references(id)` in both files.

### 2. 🔴 RLS referencing non-existent `profiles.role` (049–057)
- `profiles` has no `role` column (role lives in `user_roles`; see `001:30` comment).
  Migrations `049, 050, 052, 053, 054, 055, 056, 057` used
  `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (...))`.
- **Effect if unfixed:** `CREATE POLICY` fails at creation (*column "role" does not exist*), halting the run.
- **Fix:** replaced with the canonical `public.current_user_role()` helper
  (defined in `003`, reads `user_roles`), e.g.
  `public.current_user_role() IN ('admin','operations_manager')`.

### 3. 🟠 Broken JWT role idiom (035–048)
- All QC, Dubai, and AFS tables used `auth.jwt() ->> 'role' IN (...)`. The app
  does **not** populate a `role` claim in the JWT (no custom access-token hook),
  so this expression resolves to the Postgres role `authenticated` — never
  `qc_user`, `afs_user`, etc.
- **Effect if unfixed (run succeeds, logic broken):** every write policy on
  QC/Dubai/AFS tables denies all non-service writes; the `NOT IN (...)` "others"
  SELECT policies are always true, over-exposing those rows to every
  authenticated user.
- **Fix:** replaced `auth.jwt() ->> 'role'` with `public.current_user_role()`
  across all 14 files, making the authorization mechanism consistent with
  migrations 003–034.

### 4. 🟡 Indexes + triggers — `059_schema_hardening.sql` (new, additive)
- Added indexes: `projects(project_status, created_by, sales_owner_id, created_at)`
  and `project_documents(project_id, status)`.
- Added missing `updated_at` triggers for `saved_report_views`,
  `operational_issues`, `capa_records`.
- All statements use `IF NOT EXISTS` / `DROP ... IF EXISTS` and are idempotent.

---

## Documented (not auto-fixed — low risk or by-design)

### Re-runnability of 035–057
Migrations `035`–`057` use bare `CREATE TYPE/TABLE/INDEX/POLICY/TRIGGER` without
`IF NOT EXISTS` guards, and `051` performs a destructive `ALTER TABLE ... RENAME`.
The set is **forward-only on a clean database** — do not re-run individual files.
For a clean re-apply, use `supabase db reset` on a non-production project.
Hardening these to be idempotent is a low-priority follow-up (large mechanical
edit; no impact on a first clean run).

### Dangling `*_id` columns without FK
- `supplier_scorecards.supplier_id` (055) — likely → `approved_suppliers`.
- `capa_records.ncr_id` (057) — likely → `material_ncrs`.
- `afs_missing_items.store_request_id` (044), `material_ncrs.closure_evidence_document_id` (036).
These were intentionally left FK-less in places (per inline comments) for
flexibility. Adding constraints is deferred pending confirmation of intent, to
avoid over-constraining polymorphic references.

### Three timeline models
`timeline_events` (005, global/polymorphic), `project_timeline_events` (012),
and `quotation_timeline_events` (018) coexist. No DDL conflict; redundant by
design. Consolidation is a future refactor, not a deployment blocker.

---

## Verification after fixes

```sql
-- After running 001→059 on a fresh project, confirm no broken idioms remain:
-- (should all return ZERO rows)
select count(*) from pg_policies where qual like '%profiles%role%';      -- expect issues only if intended
-- Confirm FK target exists and is wired:
select conname, confrelid::regclass from pg_constraint
where conrelid = 'public.factory_records'::regclass and contype = 'f';
-- Confirm storage buckets created:
select id, public from storage.buckets order by id;
```
