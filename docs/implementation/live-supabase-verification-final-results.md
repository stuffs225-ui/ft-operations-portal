# Live Supabase Verification — Final Results

**Branch:** `feature/missing-migrations-099-100-activation-pack`
**Base main SHA:** `2f6c1529f12fc40480d33e0c3c6786eee4cb6ad9`
**Source:** user ran the read-only verification SQL manually against live Supabase.

> Read-only verification only. No migrations applied, no writes.

---

## Verified live status

| Object / migration | Live status |
|--------------------|-------------|
| **068** `hot_projects` | ✅ **Present** |
| **069** `project_invoice_milestones` | ✅ **Present** |
| **070** `receivables_aging_view` | ✅ **Present** |
| Storage bucket `afs-attachments` | ✅ Present |
| Storage bucket `project-documents` | ✅ Present |
| Storage bucket `qc-documents` | ✅ Present |
| Storage bucket `quotation-documents` | ✅ Present |
| Storage bucket `raw-material-files` | ✅ Present |
| Storage bucket `vehicle-photos` | ✅ Present |
| **099** `sales_user_targets` | ❌ **Missing (before activation)** |
| **100** `project_invoicing_schedule` | ❌ **Missing (before activation)** |
| **100** `project_invoicing_schedule_history` | ❌ **Missing (before activation)** |
| **100** `project_invoicing_schedule_alerts_view` | ❌ **Missing (before activation)** |
| **100** `create_default_invoicing_schedule` | ❌ **Missing (before activation)** |
| **100** `reschedule_project_invoicing_schedule` | ❌ **Missing (before activation)** |
| **100** `update_project_invoicing_schedule_amount` | ❌ **Missing (before activation)** |

---

## Interpretation

- The **entire foundational schema (001–098) is applied** — confirmed indirectly because 068/069/070
  and all storage buckets are present, and every 099/100 dependency lives in 001–009.
- **Only migrations 099 and 100 are missing.** They are additive (new tables/view/functions/trigger
  + an idempotent backfill) with all dependencies present, so they can be activated safely with the
  supervised pack.
- `/sales` currently works because **PR #149 added a safety guard** (a missing
  `project_invoicing_schedule` degrades gracefully). Full commercial functionality (invoicing plan,
  pending-invoicing KPI, invoicing targets, admin invoicing controls, sales-target controls) still
  requires applying 099 + 100.

## Activation readiness

| Item | Status |
|------|--------|
| Source review | ✅ `migration-099-100-source-review.md` |
| Pre-check SQL | ✅ `docs/sql/precheck-before-applying-099-100.sql` |
| Apply pack | ✅ `docs/sql/apply-migrations-099-100-supervised.sql` |
| Post-check SQL | ✅ `docs/sql/postcheck-after-applying-099-100.sql` |
| UI smoke test | ✅ `post-migration-099-100-ui-smoke-test.md` |
| Dependencies present | ✅ verified (001/002/003/009) |
| Migrations applied by Claude | ❌ No (supervised; user runs the pack) |

## Go-live status

**CONDITIONAL HOLD** until 099 + 100 are applied and post-checks + UI smoke test pass. See
`go-no-go-decision-matrix.md`.
