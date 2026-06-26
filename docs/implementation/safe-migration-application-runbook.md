# Safe Migration Application Runbook

**Branch:** `feature/full-system-qa-migration-audit-golive-readiness`
**Base main SHA:** `4cc3d534844fe7b34142100e64ddc9c9f2e0c793`

> **This is a runbook for a LATER, supervised execution — NOT for this task.**
> This sprint applied nothing. Companion docs: `supabase-migration-gap-audit.md`,
> `deferred-database-migrations-register.md`, `future-safe-migration-application-plan.md`,
> `docs/sql/read-only-migration-verification.sql`.

---

## 1. Prerequisites

- A named operator with Supabase project access and an approver (see §10).
- A maintenance window agreed with stakeholders.
- The repo at the target SHA; `supabase/migrations/` 001–100 available.
- The read-only verification script ready.

## 2. Backup requirement (mandatory)

- Take a **full Supabase backup** (dashboard backup or `pg_dump`) **before any write**.
- Confirm the backup is **restorable** (test restore to a scratch project if possible).
- Record backup ID + timestamp in the run log.

## 3. Read-only verification FIRST

- Run `docs/sql/read-only-migration-verification.sql` in the Supabase SQL editor.
- Record, per object, `present = true/false`.
- Build the actual gap list: any object with `present = false` is a candidate to apply.
- **Do not proceed to writes** until the gap list is reviewed and approved.

## 4. Migration ordering

- Apply **strictly in ascending numeric order** (`001 → 100`). Never skip a prerequisite.
- Known dependencies: `100` depends on `009` + `069`; `074` depends on `068`;
  RLS-hardening (082–094) depends on their base tables.

## 5. Batching strategy

Apply in small, verifiable batches (stop and verify after each):

1. **Batch A — confirm core** (verify-only; expected already applied): 001–098.
2. **Batch B — annual targets**: **099** (`sales_user_targets`).
3. **Batch C — invoicing schedule**: **100** (`project_invoicing_schedule` + history + alerts view
   + 2 RPCs + trigger + backfill).
4. **Batch D — documents/storage** (if missing): 096–098.

## 6. What to apply first

- The highest-value, go-live-critical batch is **C (migration 100)** — it removes the `/sales`
  fatal dependency and activates the Admin Invoicing Schedule page. Apply **B (099)** alongside to
  activate Admin Sales Targets.

## 7. What NOT to apply until reviewed

- Any **High-risk** migration (RPCs/guards/gates/code-gen/RLS hardening: 061, 067, 072–073,
  076–078, 086–094) **if** verification shows it already present — re-applying could conflict.
  Only apply objects that verification shows are **missing**.

## 8. Verification after each migration/batch

- Re-run the relevant section of the read-only SQL; confirm new objects are `present = true`.
- Run the UI checks in §11–§13 for the affected feature.
- Record results in the run log before continuing.

## 9. Rollback / stop criteria

- **Stop** if any expected object is still missing after applying, or any dependent page errors.
- **Rollback** to the pre-batch backup if a migration partially applies or leaves inconsistent
  state.
- Never force past a failed prerequisite. Resolve the dependency first.

## 10. Who approves

- Application proceeds only with **explicit written approval** from the designated DB owner /
  release approver. The operator and approver must be different people where possible.

## 11. How to verify migration 099 (`sales_user_targets`)

1. SQL: `sales_user_targets` table `present = true`; policies present (§6 of the SQL script).
2. Admin: `/admin/sales-targets` loads **without** the "migration 99 pending" notice.
3. Admin can add/edit a target; sales_user sees only their own target (RLS).
4. Sales Dashboard targets section shows configured targets (not "—").

## 12. How to verify migration 100 (`project_invoicing_schedule`)

1. SQL: `project_invoicing_schedule`, `project_invoicing_schedule_history`,
   `project_invoicing_schedule_alerts_view`, `reschedule_project_invoicing_schedule`,
   `update_project_invoicing_schedule_amount`, and the trigger function
   `create_default_invoicing_schedule` all `present = true`; trigger present (§4); policies present.
2. **Trigger check (non-production first):** create a test project → confirm exactly **one** default
   schedule line is auto-created; confirm the idempotent backfill did **not** duplicate lines for
   pre-existing projects.
3. Admin: `/admin/invoicing-schedule` loads with data (no "migration 100 pending" notice); overdue
   alerts populate.
4. **`/sales` continues working** — renders the dashboard (not the red error panel).
5. Reschedule RPC: reschedule a line with reason → history row written.
6. Amount RPC: update an amount with reason → history row written.

## 13. Post-application UI checks

- Run the relevant rows of `full-system-smoke-test-checklist.md` for Admin + Sales.
- Confirm no page that previously worked now errors.

## 14. Post-application screenshot baseline

- Re-run the **Role/Page Screenshot Baseline** GitHub Action (see
  `full-system-screenshot-baseline-plan.md`).
- Diff against the pre-application baseline; confirm `/sales`, `/admin/invoicing-schedule`,
  `/admin/sales-targets` now render data instead of error/pending states.

## 15. Final go/no-go decision

- **Go** only when: backup verified, gap list applied in order, every §11–§13 check passes, the
  post-application screenshot baseline is clean, and the approver signs off.
- **No-go** if any verification fails or a rollback was required — restore backup, document, and
  reschedule.

> **Reminder:** This sprint did not execute any step here. Migration application is a separate,
> approved, supervised operation.
