# Supabase Migration Gap Audit (Read-Only)

**Branch:** `feature/full-system-qa-migration-audit-golive-readiness`
**Base main SHA:** `4cc3d534844fe7b34142100e64ddc9c9f2e0c793`

> **No migrations were applied. No `db push`. No write SQL. No production data changed.**
> All applied-states below are **Unknown / deferred verification** until the read-only
> verification script (`docs/sql/read-only-migration-verification.sql`) is run against the live
> database. This document supersedes nothing — it complements the earlier
> `deferred-database-migrations-register.md` with a runtime-dependency map and a critical-object
> focus for go-live.

---

## 1. GitHub Migration Inventory (summary)

Full per-file detail (purpose, module, risk, dependencies) is in
`deferred-database-migrations-register.md`. This audit focuses on the **runtime-critical and
deferred** objects. There are **100** migration files (`001`–`100`).

| # | File | Key objects created | Module | Runtime dep | Applied? | Risk |
|---|------|---------------------|--------|-------------|----------|------|
| 067 | convert_quotation_to_so.sql | `convert_quotation_to_so()` RPC | Sales | Core | Unknown | High |
| 068 | hot_projects.sql | `hot_projects` table | Sales | Core | Unknown | Low |
| 069 | invoicing_plans_milestones.sql | `project_invoice_milestones` table | Commercial | Core | Unknown | Low |
| 070 | receivables_aging_view.sql | `receivables_aging_view` view | Commercial | Core | Unknown | Low |
| 096 | procurement_documents.sql | `procurement-documents` bucket + `purchase_order_documents` | Procurement | Yes | Unknown | Medium |
| 097 | afs_document_tables.sql | `afs_arrival_documents`, `afs_missing_item_attachments` | AFS | Yes | Unknown | Low |
| 098 | qc_documents_file_columns.sql | `file_size`/`mime_type` on `qc_inspection_documents` | QC | Yes | Unknown | Low |
| **099** | **sales_user_targets.sql** | **`sales_user_targets` table + RLS** | Commercial | **Yes (safe-fallback)** | **Unknown** | Low |
| **100** | **project_invoicing_schedule.sql** | **`project_invoicing_schedule`, `_history`, alerts view, 2 RPCs, trigger, backfill** | Commercial | **Yes — FATAL for /sales** | **Unknown** | High |

> Verification queries for every object above are in
> `docs/sql/read-only-migration-verification.sql`.

---

## 2. Runtime Dependency Map (frontend → database object)

Derived by searching `src/` for each object. "Breaks runtime?" = what happens if the object is
**missing** from Supabase.

| Object | Migration | Referenced in (module / page / helper) | Breaks runtime if missing? | Safe fallback? |
|--------|-----------|----------------------------------------|----------------------------|----------------|
| `sales_user_targets` | 099 | `salesTargetsQueries.ts`, `salesDashboardV2Queries.ts`, Admin Sales Targets page | **No** | **Yes** — Admin page via `deferredMigrationSafety` shows "migration 99 pending"; Sales Dashboard treats a *targets* failure as non-fatal (target → null) |
| `project_invoicing_schedule` | 100 | `salesDashboardV2Queries.ts`, `projectInvoicingScheduleQueries.ts`, `AdminInvoicingSchedule.tsx` | **YES for `/sales`** | **Mixed** — Admin page degrades gracefully; **Sales Dashboard v2 is FATAL** (see §4) |
| `project_invoicing_schedule_history` | 100 | `projectInvoicingScheduleQueries.ts` (history drawer) | No | **Yes** — `deferredMigrationSafety` |
| `project_invoicing_schedule_alerts_view` | 100 | `projectInvoicingScheduleQueries.ts` (overdue alerts) | No | **Yes** — `deferredMigrationSafety` |
| `reschedule_project_invoicing_schedule` (RPC) | 100 | `projectInvoicingScheduleQueries.ts` (reschedule modal) | No | **Yes** — `isMissingFunctionError` → "migration pending" message |
| `update_project_invoicing_schedule_amount` (RPC) | 100 | `projectInvoicingScheduleQueries.ts` (amount modal) | No | **Yes** — same |
| `project_invoice_milestones` | 069 | `salesDashboardV2Queries.ts` (receivables/collection), `ProjectInvoicing.tsx` | Degrades (milestones failure is non-fatal in dashboard) | Partial |
| `receivables_aging_view` | 070 | `Receivables.tsx` | Receivables page would error | No explicit fallback |
| `hot_projects` | 068 | Sales Dashboard, Hot Projects pages, Control Tower, Management, Quotation/HotProject new | Multiple pages would error | No explicit fallback |
| storage buckets / doc tables | 096–098 | Procurement/AFS/QC document upload components | Upload features error | Feature-local |

---

## 3. Special-Focus Objects (go-live critical)

- **`project_invoicing_schedule` (100)** — the single highest-risk runtime dependency. See §4.
- **`sales_user_targets` (099)** — safe everywhere (graceful fallback). Low risk.
- **`hot_projects` (068)** and **`project_invoice_milestones` (069)** and
  **`receivables_aging_view` (070)** — broadly used by Sales/Management/Control-Tower pages with
  **no explicit deferred-migration fallback**; because the working app already renders these
  pages, they are almost certainly **already applied**, but this must be **verified** (they are
  pre-`099` migrations and not part of the "deferred" pair).
- **storage/document objects (096–098)** — feature-local; missing buckets/tables only break the
  specific upload feature, not whole pages.

---

## 4. Sales Dashboard v2 — Migration 100 Risk Check (Part F)

**Evidence (current code):**
`src/lib/salesDashboardV2Queries.ts` lines 288–319:

```ts
const scheduleQuery = supabase
  .from('project_invoicing_schedule')
  .select('id, project_id, invoice_amount, current_invoice_date, invoice_year, invoice_month, status, sales_user_id')
  .neq('status', 'cancelled');
// ...
// Projects and schedule are fatal; milestones failure degrades gracefully
const fatalError = projectsRes.error?.message ?? scheduleRes.error?.message ?? null;
if (fatalError) return { data: null, error: fatalError };
```

`/sales` (`src/pages/Sales.tsx`) consumes this via `useSalesDashboardV2Data` and renders
(lines 240–254): a skeleton while loading, then **an inline red error panel** when `error` is set,
otherwise the dashboard.

**Findings:**

1. **Does `/sales` hard-depend on `project_invoicing_schedule`?** **Yes.** The schedule query
   error is treated as **fatal** (intentional design from PR #142 — schedule is the primary
   invoicing-plan source).
2. **What happens if migration 100 is missing?** `getSalesDashboardV2Data` returns
   `{ data: null, error }`, and `/sales` shows a **controlled error panel** with the error text.
   It does **not** white-screen / throw — but the **dashboard is non-functional** (no KPIs, no
   invoicing plan, no targets).
3. **Is there a safe fallback?** **No** — unlike the Admin Invoicing Schedule page (which uses
   `deferredMigrationSafety`), the Sales Dashboard has **no** graceful "migration pending" state;
   it surfaces the raw error.
4. **Does the working `/sales` imply migration 100 is applied?** **Yes, very likely.** The program
   states `/sales` currently renders the dashboard (not the error panel), which is only possible if
   `project_invoicing_schedule` exists and returns rows. This strongly implies migration 100 **is
   applied in the live environment** — but it is **not yet verified** in this audit.
5. **How to verify safely?** Run sections 1–4 of
   `docs/sql/read-only-migration-verification.sql` (table/view/function/trigger existence for
   migration 100). Read-only.
6. **What to do before go-live?**
   - **Severity: High** (dashboard unusable if 100 absent; but degrades to a controlled error, not
     a crash).
   - **Recommended:** **Option A — confirm/apply migration 100 before go-live** (preferred; the
     working `/sales` indicates it is already applied — just verify).
   - **Alternative: Option B — a separate, explicitly-approved safety-guard PR** that makes the
     schedule query non-fatal in `salesDashboardV2Queries.ts` (mirroring the Admin page's
     `deferredMigrationSafety` pattern) **only if** there is any environment where 100 cannot be
     applied at go-live.
   - **Per this sprint's governance, no dashboard code was changed here.** This is documented for a
     decision, not silently altered.

---

## 5. Migration Application Readiness Classification

| Class | Migrations | Notes |
|-------|-----------|-------|
| **Likely already applied** (verify) | 001–098 core schema | The working production app depends on them; verify a representative sample via the SQL script. |
| **Must verify (deferred pair)** | **099, 100** | The two migrations the program treats as deferred; verify object-by-object. |
| **Runtime-critical before go-live** | **100** (Sales Dashboard fatal dep), 068/069/070 (Sales/Management/Control-Tower), 096–098 (uploads) | 100 is the top priority. |
| **High-risk to (re)apply** | 061, 067, 072–073, 076–078, 086–094, 100 | RPCs, guards, gates, code-generation, RLS hardening — re-applying out of order or on an already-migrated DB needs care (see runbook). |
| **Low-risk** | additive tables/views/columns (068, 069, 070, 097, 098, 099) | New objects; low blast radius. |
| **Dependency order required** | all | Apply strictly ascending; 100 depends on 009 + 069; 074 depends on 068. |

**Nothing is marked "applied".** Confirm with the read-only script before any application pass.
