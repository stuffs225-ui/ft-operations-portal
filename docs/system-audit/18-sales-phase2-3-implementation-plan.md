# 18 — Sales Phase 2+3 Implementation Plan (approved batch)
**Date:** 2026-07-12 · **Approved by operations:** (1) fix B1 invoicing double-count, (2) fully block SO creation for sales, (3) build all Phase 3 features in one batch.
**Convention (unchanged):** migrations are **written, not applied** — the SQL is delivered for supervised apply in the Supabase SQL Editor (pattern of 099–104). UI is built against the deferred-migration-safety pattern so it renders cleanly before and after the migration is applied. No RLS weakening; lint baseline (54) must hold.

This plan is executed **in order**; each part is a self-contained commit.

---

## Part 1 — B1: invoicing "Pending > Total" double-count 🔴
**Root cause:** a project keeps its auto `delivery_date` default schedule line (= contract value) *and* the sales per-line plan rows; `calcPendingSchedule` / the plan table sum both → Pending = 2× the plan.

**Fix (two layers):**
1. **Query-side guard (immediate, no migration):** add `source` to the schedule select. When a project has any `source='sales_line_plan'` row, ignore that project's non-plan rows (`delivery_date`/default) for pending, TTL and month cells. One financial truth per project.
   - Files: `src/lib/salesDashboardV2Queries.ts` (ScheduleRow + query + `effectiveSchedules()` helper used by summary + `buildInvoicingPlanRows`).
2. **Migration 105 (data hygiene):** harden the RPC's cleanup (delete superseded auto lines whenever a per-line plan exists) + a one-time cleanup that removes orphaned `delivery_date` lines for any project that already has `sales_line_plan` rows.

**Verify:** for Test Qut 1, Pending must equal the plan (3.0M), not 6.0M.

## Part 2 — Block SO creation for sales (approved: fully block the route)
- `App.tsx`: `projects/new` guard → roles `['admin','operations_manager']` (drop `sales_user`).
- Keep quotation→SO conversion working: `QuotationDetail` "convert" is used by coordinator/admin; verify the convert action is not sales-gated, or route conversion through the allowed roles. Confirm no sales-only path depends on `/projects/new`.
- Buttons already hidden in Phase 1.

## Part 3 — C2: Pipeline Projects split by probability (no DB)
- `HotProjects.tsx`: a segmented control **High (≥80%) / Low (<80%) / All**, applied to the list; KPI already shows weighted.
- Printable report (`departmentReports`/report builder): mirror the High/Low split.

## Part 4 — C1: Quotation clarification thread (migration 106 + UI)
**Migration 106** — `quotation_clarifications`:
```
id uuid pk, quotation_id uuid fk, author_id uuid, author_role user_role,
direction text check in ('coordinator_request','sales_reply'),
body text not null, created_at timestamptz default now()
```
+ storage bucket `quotation-clarifications` (reuse DocumentPanel upload → `quotation_clarification_documents(id, clarification_id, document_id)` or a `document_ids uuid[]`).
- **RLS:** quotation owner (sales) + coordinator + admin/ops read/write on rows for quotations they can see (mirror existing quotation RLS).
- **UI:** a thread panel on `QuotationDetail` — coordinator posts a `coordinator_request` (sets status `need_clarification`), salesman posts a `sales_reply` with optional attachments (sets status back to `submitted_by_sales`/`received_by_coordinator`). Multi-round; full history; everything logged.
- Deferred-safety: if 106 not applied, the panel shows a "clarifications module pending" notice, page still works.

## Part 5 — C3: Collection & Aging module (migration 107 + UI) — largest
Two parts on the `/receivables` page (now "Collection & Aging"):
- **Collection:** `collection_uploads(id, uploaded_by, period_label, file_document_id, created_at)` — a periodic finance file; on upload the shown data refreshes.
- **Aging:** `aging_snapshots(id, month date, uploaded_by, created_at)` + `aging_items(id, snapshot_id, invoice_ref, customer_name, project_code, amount, first_seen_month, sales_owner_id)` + `aging_clarifications(id, aging_item_id, author_id, body, created_at)`.
  - **Diff engine:** on a new monthly snapshot, mark each item **new** (invoice_ref unseen) or **recurring** (seen last month). Recurring items require a salesman clarification ("why not collected yet").
  - **RLS:** finance/admin write snapshots; salesman reads/clarifies own `sales_owner_id` items.
  - **UI:** two tabs — Collection (uploads + current data) and Aging (this month's items, New badge, recurring rows with a required clarification field + history).
- Deferred-safety: module hidden behind a "pending" notice until 107 applies; the existing live `receivables_aging_view` stays as the default view.

---

## Validation gate (every part)
`npx tsc --noEmit` · `npm run lint` (54 baseline) · `tsc -p tsconfig.e2e.json` · live walkthrough as `sales_user` with console-error capture · screenshots of each new surface.

## Delivery
One branch `feat/sales-phase2-3`, commits per part, one PR. Migrations 105/106/107 delivered as chat SQL for supervised apply; UI safe before apply.

## Critic pass (after build)
Re-review the batch for: RLS gaps on the new tables, the diff-engine edge cases (invoice_ref churn, first month with no prior snapshot), attachment-orphan cleanup, status-transition races on the clarification thread, and any new cross-page number inconsistency.
