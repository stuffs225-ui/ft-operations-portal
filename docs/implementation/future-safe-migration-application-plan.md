# Future Safe Migration Application Plan

**Status:** Plan only. **This sprint did NOT apply any migrations, did NOT run
`supabase db push`, and did NOT execute SQL against any database.** This document describes
how to safely apply the deferred migrations in a later, dedicated, supervised pass.

**Companion document:** `deferred-database-migrations-register.md` (the per-migration register).

---

## 0. Warning and scope

- Do **not** run any step here automatically or unattended.
- Do **not** apply migrations against production without a verified backup and a maintenance window.
- The register lists **100** migrations (`001`–`100`). Most of the early/core migrations are
  almost certainly already applied (the production app depends on them), but **none has been
  verified** in this sprint — treat every applied-state as **Unknown** until checked.
- The only migrations explicitly known to be **deferred** by the current program are **099** and
  **100**; they are the most likely to be unapplied in a given environment.

---

## 1. How to compare GitHub migrations vs Supabase

1. List the repository migrations (source of truth):
   ```bash
   ls supabase/migrations/        # 001_*.sql … 100_*.sql
   ```
2. Get the applied list from Supabase (two possible sources):
   - **CLI-managed history table** (preferred, if present):
     ```sql
     select version, name, executed_at
     from supabase_migrations.schema_migrations
     order by version;
     ```
   - **Object-existence probing** (fallback, always works): use the `to_regclass` /
     `pg_proc` queries in the register's "Verification queries" section.
3. Diff the two lists. Any repository migration whose objects do **not** exist in Supabase is a
   candidate to apply. Pay special attention to **099** and **100**.

---

## 2. How to query Supabase migration history (if available)

```sql
-- Does the CLI migration table exist?
select to_regclass('supabase_migrations.schema_migrations');

-- If non-null, list applied versions:
select version, name, executed_at
from supabase_migrations.schema_migrations
order by version;
```

If `to_regclass(...)` returns `NULL`, the project is **not** CLI-migration-managed (or the
schema is named differently). In that case rely entirely on per-object verification (Section 3).

---

## 3. How to verify each table / view / function

Use read-only catalog probes (safe; no data change):

```sql
-- Tables / views
select to_regclass('public.<object_name>');   -- NULL = missing

-- Functions
select exists (
  select 1 from pg_proc where proname = '<function_name>'
) as fn_present;

-- Columns (for column-adding migrations like 098)
select column_name from information_schema.columns
where table_schema = 'public' and table_name = '<table>';

-- Enums (for 100's pis_status_enum / pis_source_enum)
select typname from pg_type where typname like 'pis_%';

-- RLS enabled?
select relrowsecurity from pg_class where relname = '<table>';
```

Cross-check each result against the register's per-migration "objects" so you know exactly which
migration a missing object belongs to.

---

## 4. How to apply migrations in order

1. **Back up first** (Supabase dashboard backup or `pg_dump`). Confirm the backup is restorable.
2. **Apply strictly in ascending numeric order.** Migrations have ordered dependencies (e.g. 100
   depends on 009 + 069; 074 depends on 068). Never skip a prerequisite.
3. **Apply in small batches** (e.g. one module group at a time per the register's sections), not
   all at once.
4. Preferred mechanisms (choose one, consistently):
   - `supabase db push` (if the project is CLI-managed and history is in sync), **or**
   - manual execution of each `NNN_*.sql` file in order via a reviewed SQL session.
5. For the **deferred pair specifically**, the minimal high-value batch is:
   - **099** `sales_user_targets.sql`
   - **100** `project_invoicing_schedule.sql`
   Applying these two unlocks Sales Dashboard v2 (fully) and the two Admin commercial pages.

---

## 5. How to test after each batch

After each batch, run the register's verification queries for that batch, then smoke-test the
dependent UI:

| Batch | Verify objects | UI smoke test |
|-------|----------------|---------------|
| 099 | `sales_user_targets` table + RLS | `/admin/sales-targets` loads, "migration pending" notice gone; can add/edit a target |
| 100 | `project_invoicing_schedule`, `_history`, alerts view, 2 RPCs, trigger | `/admin/invoicing-schedule` loads with data; **Sales Dashboard v2 loads without fatal error**; reschedule + amount RPCs work and write history |
| 096–098 | buckets + doc tables/columns | Procurement/AFS/QC document uploads succeed |
| any RLS/guard batch (061, 076–094) | RLS enabled; guard triggers present | confirm each governed action still behaves (approval still required, gates still block) |

For 100 specifically, confirm the AFTER INSERT trigger fires by creating a test project in a
**non-production** environment and checking that exactly one default schedule line is created;
confirm the idempotent backfill did not duplicate lines for pre-existing projects.

---

## 6. Rollback / stop criteria

- **Stop immediately** if any batch's verification queries do not return the expected objects, or
  if a dependent page begins to error.
- **Rollback** to the pre-batch backup if a migration partially applies or leaves objects in an
  inconsistent state.
- Never "force" past a failed prerequisite; resolve the missing dependency first.
- Keep a written log of: which batch, applied-at timestamp, verification result, smoke-test result.
- Treat any RLS/guard migration (Risk = High in the register) as requiring an explicit re-test of
  the governed workflow before continuing.

---

## 7. What features depend on migrations 099 and 100

| Feature | Depends on | Behavior if migration NOT applied |
|---------|-----------|-----------------------------------|
| Admin Sales Annual Targets (`/admin/sales-targets`) | **099** | Graceful — "migration 99 pending" notice; cannot add/edit targets |
| Sales Dashboard v2 — targets section | **099** | Graceful — target shows null / not-set |
| Admin Invoicing Schedule (`/admin/invoicing-schedule`) | **100** | Graceful — "migration 100 pending" notice; reads/RPCs return unavailable |
| **Sales Dashboard v2 — invoicing plan + pending-invoicing KPI** | **100** | ⚠️ **FATAL** — `salesDashboardV2Queries` treats the missing `project_invoicing_schedule` as a fatal load error, so the whole Sales Dashboard v2 fails to load. **Apply 100 before depending on Sales Dashboard v2.** |
| Invoicing overdue alerts | **100** (`project_invoicing_schedule_alerts_view`) | Graceful in Admin page; absent elsewhere |

> If Sales Dashboard v2 must remain usable in an environment where migration 100 cannot yet be
> applied, that requires a **separate, explicitly-approved code change** to make the schedule
> query non-fatal in `salesDashboardV2Queries.ts`. That change was intentionally **not** made in
> this sprint (the fatal behavior is by design from PR #142, and the program states Sales
> Dashboard v2 is currently working — implying 100 is applied in the live environment).

---

## 8. Explicit statement

**This task (Master Module Sprint, Phases 7–15) did not apply any migration, did not run
`supabase db push`, did not execute any SQL against any database, and did not create any new
migration.** All applied-states remain **Unknown / deferred verification**. The actual
application must be performed later as a dedicated, supervised, backed-up operation following the
steps above.
