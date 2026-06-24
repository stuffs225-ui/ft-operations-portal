# Commercial Admin Controls Sprint — Invoicing Schedule + Sales Targets

**Branch:** `feature/commercial-admin-controls-sprint`
**Status:** Admin management UI + migration-safe query helpers. No migrations applied.

---

## Scope

Adds two Admin-only commercial control pages and the safe data layer behind them:

1. **Project Invoicing Schedule** — view/manage project invoicing schedule lines, reschedule
   invoice dates (with reason + history), update invoice amounts (with reason + history), and
   surface overdue lines.
2. **Sales Annual Targets** — set per-Sales-User annual Sales Order, Invoicing, and Collection
   targets for a year; see which sales users are missing a target.

Both pages are **migration-deferred safe**: the underlying tables/views/RPCs live in migrations
099 and 100 which are committed to GitHub but **may not be applied** to the live Supabase
database yet. The pages render a calm "migration pending" state instead of crashing, and never
fabricate data.

---

## Migration Dependencies

| Migration | Objects | Used by |
|-----------|---------|---------|
| **099** | `sales_user_targets` table | Sales Annual Targets page |
| **100** | `project_invoicing_schedule`, `project_invoicing_schedule_history`, `project_invoicing_schedule_alerts_view`, `reschedule_project_invoicing_schedule()`, `update_project_invoicing_schedule_amount()` | Project Invoicing Schedule page |

**Neither migration is applied in this task.** No `supabase db push`, no SQL execution, no new migration.

---

## Routes Added (Admin-only)

| Route | Page | Guard |
|-------|------|-------|
| `/admin/invoicing-schedule` | `AdminInvoicingSchedule` | `<RequireRole roles={['admin']}>` |
| `/admin/sales-targets` | `AdminSalesTargets` | `<RequireRole roles={['admin']}>` |

`RequireRole` already grants `admin` implicit access and shows a 403 panel to any other role.
No other role (sales_user, viewer, ops_manager, procurement, store, factory, qc, afs,
sales_coordinator) can reach these routes. `roleMatrix` and `RequireRole` were **not** modified.

---

## Pages Created

### `src/pages/AdminInvoicingSchedule.tsx`
- Header with migration-pending notice when migration 100 is unavailable.
- **KPI cards** (6): Total Scheduled, Pending Invoicing, Overdue Amount, Overdue Lines, Invoiced,
  Rescheduled Lines — computed client-side from fetched rows.
- **Filters**: Year, Month, Status, Overdue-only, Search (project code / customer).
- **Overdue Alerts** section sourced from `project_invoicing_schedule_alerts_view`; shows a
  migration-pending empty state if the view is unavailable.
- **Schedule table**: Project / Customer / Sales Owner / Line # / Label / Invoice Date / Amount /
  % / Status / Delays / Last Reason / Updated / Actions.
- **Reschedule modal** → `reschedule_project_invoicing_schedule` RPC (new date + reason required).
- **Update amount modal** → `update_project_invoicing_schedule_amount` RPC (amount ≥ 0 + reason).
- **History drawer** → `project_invoicing_schedule_history` (date/amount/status transitions + reason).
- **Split modal**: present but **disabled** (see "Split Support Status").
- Invoiced / cancelled lines are locked from reschedule and amount edit.

### `src/pages/AdminSalesTargets.tsx`
- Header with migration-pending notice when migration 099 is unavailable.
- **KPI cards** (5): With Targets, Missing Targets, Total SO, Total Invoicing, Total Collection.
- **Filters**: Target Year, Search (name / email).
- **Targets table**: Sales User / Year / Sales Order / Invoicing / Collection / Currency / Notes /
  Updated / Edit.
- **Add / Edit modal**: one record per sales user + year (upsert on the
  `sales_user_targets_user_year_unique` constraint). Blank = NULL (not set); `0` = explicit zero;
  collection target is never substituted from another field.
- **Missing-target list**: sales users without a target for the selected year, each with an inline
  "Create Target" action.

Sales users are sourced from `user_roles.role = 'sales_user'` (the role source of truth) joined to
`profiles` for display names — not `profiles.role`.

---

## Query Helpers Created

### `src/lib/deferredMigrationSafety.ts`
Small, focused error classifier — no abstraction layer.
- `isMissingRelationError(error)` — Postgres `42P01`, PostgREST `PGRST205`, "relation/table does not
  exist", "could not find the table", "schema cache".
- `isMissingFunctionError(error)` — Postgres `42883`, PostgREST `PGRST202`, "function does not exist",
  "could not find the function".
- `isDeferredMigrationError(error)` — either of the above.
- `formatDeferredMigrationMessage(name, migrationNumber)` — calm user-facing copy.
- `classifyAvailability(error, feature, migrationNumber)` — returns `{ availability, realError }`;
  deferred-migration errors → `available: false`; **any other error is surfaced, never masked.**

### `src/lib/projectInvoicingScheduleQueries.ts`
All functions migration-safe (return an availability descriptor; never throw on missing
relation/function):
- `getProjectInvoicingScheduleAdminList(params)` — filtered list joined to projects + sales-owner
  profile; client-side search; warnings array.
- `getProjectInvoicingScheduleHistory(scheduleId)` — history rows.
- `getProjectInvoicingScheduleAlerts(params)` — overdue alerts view.
- `rescheduleProjectInvoicingSchedule(params)` — validates inputs, calls RPC; returns
  `unavailable: true` if the RPC is missing.
- `updateProjectInvoicingScheduleAmount(params)` — validates amount ≥ 0 + reason, calls RPC.
- `computeInvoicingScheduleKpis(rows)` — pure KPI rollup.

### `src/lib/salesTargetsQueries.ts` (extended)
Preserves the original `getSalesTargetForUser` / `getSalesTargetsByYear`. Adds:
- `getSalesUsers()` — sales_user directory from `user_roles` + `profiles`.
- `getSalesTargetsAdminList(year, salesUsers)` — migration-safe enriched list.
- `upsertSalesTarget(params)` — insert/update on `(sales_user_id, target_year)`; migration-safe.
- `validateTargetInput(params)` — pure validation (NULL allowed; values must be finite ≥ 0).
- `computeMissingTargetUsers(salesUsers, targets)` — pure set difference.

---

## TypeScript Type Additions (type-only, no schema change)

`src/types/database.ts` gained, to make the new reads/RPCs type-safe:
- `Views.project_invoicing_schedule_alerts_view` Row shape.
- `Functions.reschedule_project_invoicing_schedule` and
  `Functions.update_project_invoicing_schedule_amount` signatures.

These describe objects already defined in migration 100. No table/column/constraint was changed.

---

## Deferred Migration Safety Behavior

### What happens if `sales_user_targets` (migration 099) does not exist
- The Sales Annual Targets page shows the amber "Migration 99 pending" notice.
- KPI cards render dimmed with `—`.
- The targets table shows "Targets are unavailable until migration 99 is applied."
- "Add Target" is disabled.
- No crash; no red fatal error.

### What happens if `project_invoicing_schedule` (migration 100) does not exist
- The Project Invoicing Schedule page shows the amber "Migration 100 pending" notice.
- KPI cards render dimmed with `—`.
- The schedule table and alerts section show migration-pending empty states.
- Reschedule / amount modals, if opened, return an informational "migration pending" message
  rather than erroring.
- No crash; no red fatal error.

In all cases, **genuine unrelated errors** (permission denied, network, unknown) are still surfaced
through the normal error path — only missing-relation / missing-function errors are treated as the
controlled "migration pending" state.

---

## What Works Before vs After Migrations Are Applied

| Capability | Before (migrations not applied) | After (099 + 100 applied) |
|-----------|---------------------------------|---------------------------|
| Pages load without crashing | ✅ | ✅ |
| Migration-pending notices | ✅ shown | hidden |
| View schedule lines / KPIs | — (empty state) | ✅ |
| Overdue alerts | — (empty state) | ✅ |
| Reschedule / amount RPCs | informational unavailable msg | ✅ writes + history |
| Change history | — (empty state) | ✅ |
| View / add / edit sales targets | — (empty state) | ✅ |
| Missing-target list | — | ✅ |

---

## Split Support Status

**Installment split is intentionally NOT implemented as a mutation.**

A safe split must, in one atomic transaction: reduce the original line's amount, insert one or more
new lines, and write a history row for each change. Migration 100 provides reschedule and
amount-adjust RPCs but **no split RPC**. Doing the split as multiple client-side calls would risk
partial, half-audited state.

Per the sprint's own fallback guidance, the split modal is built but **disabled**, with an in-modal
notice explaining that splitting requires a dedicated
`split_project_invoicing_schedule` RPC in a future migration. No partial inserts, no fabricated
history.

**Future requirement:** add `split_project_invoicing_schedule(p_schedule_id, p_lines[], p_reason, p_details)`
(SECURITY DEFINER, admin-only, transactional, writes history per line) in a later migration, then
enable the modal.

---

## Safety Review

| Area | Changed? |
|------|----------|
| Supabase migrations applied | No |
| Supabase production DB | No |
| New migration created | No |
| DB / RLS | No |
| Sales Dashboard hook (`salesDashboardV2Queries`) | No |
| Sales Dashboard UI (`Sales.tsx`) | No |
| `project_invoice_milestones` / milestone logic | No |
| Quotation conversion | No |
| SO approval / routing | No |
| Project creation | No |
| Procurement / Store / Factory / QC / Dubai / AFS | No |
| `roleMatrix` | No |
| Route guards (`RequireRole` / `ProtectedRoute`) | No (used as-is) |
| Routes | Yes — 2 Admin-only routes added |
| Navigation | Yes — 2 Admin dashboard cards added (admin-only page) |
| Business workflows / mutations on existing tables | No |
| `database.ts` | Type-only additions (view Row + 2 RPC signatures) |

---

## Validation Results

- `npm run build` — zero TypeScript errors; `AdminInvoicingSchedule` and `AdminSalesTargets` chunks emitted ✓
- `npx tsc --noEmit` — clean ✓
- Changed-file lint (new helpers + new pages + AdminDashboard + App) — zero issues ✓
- Full lint — 57 problems (22 errors, 35 warnings); identical to pre-sprint baseline; zero regressions ✓
  (The 22 errors are pre-existing `Views: {}` empty-object-type entries in `database.ts`, unrelated to this work.)

---

## Next Steps

1. **Apply migrations 099 + 100** during the planned full migration audit; the pages activate
   automatically (notices disappear, data populates).
2. **Add a `split_project_invoicing_schedule` RPC** (transactional, history-writing) in a future
   migration, then enable the split modal.
3. (Already on main) Sales Dashboard v2 reads `project_invoicing_schedule` for the invoicing plan —
   once migration 100 is applied, dashboard and these admin controls share one source.
