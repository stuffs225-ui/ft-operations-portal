# Operations Execution Sprint — Store, Factory, QC, Dubai/AFS

**Branch:** `feature/operations-execution-sprint-store-factory-qc-afs`
**Base main SHA:** `bfc9f2ed77d0f17067e91a005bf8855c8e113b98`

---

## Executive Summary

This sprint covers the operational execution chain — Store / Warehouse, Factory / Production,
QC / NCR / Release, and Dubai / AFS — with the goal of improving operational clarity without
touching business logic, schema, RLS, workflow gates, or permissions.

On inspection, **all four module dashboards were already mature** (PageHeader, real-data KPI
cards, work queues, module navigation, governance rules, and — for QC, Factory, AFS — loading
states). They came from prior dedicated sprints (Phase 18 Work Centers, Phase 12 Store closure,
Phase 19 UX modernization).

The one genuine, cross-cutting **integrity gap** found was **fabricated work-queue counts**:
several Store and Factory work queues were hardcoded to `count: 0`, so they always rendered a
green **"Clear"** badge regardless of the real data — actively telling operators "nothing to
action" for metrics that were never computed. This violates the sprint's "no fake counts /
omit if cannot be calculated safely" rule.

This PR fixes that gap honestly: it **computes** the counts where the data safely supports it
(Store), and **omits** the one count that cannot be computed without guessing schema semantics
(Factory). QC and Dubai/AFS were already fully real-data and are left unchanged.

---

## Scope

| Module | Outcome |
|--------|---------|
| Store / Warehouse | **Changed** — 3 fabricated queue counts now computed from real data; loading state added |
| Factory / Production | **Changed** — 1 fabricated queue count removed (cannot compute safely) |
| QC / NCR / Release | **Inspected, unchanged** — already fully real-data, no gaps |
| Dubai / AFS | **Inspected, unchanged** — already fully real-data, no gaps |

---

## Files Inspected

- `src/pages/Store.tsx`, `src/pages/Factory.tsx`, `src/pages/QC.tsx`, `src/pages/DubaiAFS.tsx`
- `src/pages/StoreQCHandoff.tsx` (to learn the real `inspection_result` → accepted/rejected mapping)
- `src/data/mockStore.ts`, `src/data/mockQc.ts` (mock vocabularies + custody `approval_status`)
- `src/types/index.ts` (`MaterialCustodyRecord.approval_status`, `CustodyApprovalStatus`)
- `src/app/App.tsx` (module routes + guards)

---

## Store / Warehouse — current state and changes

**Current state:** Mature workspace — PageHeader with icon, quick actions, 8 real-data KPI cards,
8 work queues, module navigation, governance rules.

**Gap:** three work queues had `count: 0` hardcoded and always showed "Clear":
- "QC Accepted — Ready to Issue"
- "Custody Pending Approval"
- "QC Rejected / NCR Items"

**Changes (all read-only, no workflow/mutation changes):**
1. **Computed "QC Accepted" and "QC Rejected" from real QC data.** Added a read-only
   `material_qc_inspections.select('inspection_result')` query (cross-module visibility — the same
   table the Store → QC Handoff page already reads, governed by existing RLS). A small classifier
   maps `inspection_result` to accepted vs rejected, handling **both** the live-DB enum
   (`pass` / `pass_with_observations` / `conditional_pass` / `fail`) and the mock vocabulary
   (`passed` / `accepted` / `rejected`) so counts are correct in dev and production.
2. **Computed "Custody Pending Approval" from real custody data.** Added `approval_status` to the
   existing `material_custody_records` select and counted `approval_status === 'pending_approval'`
   (a real column on `MaterialCustodyRecord`).
3. **Added a loading state** (consistent with Factory/QC/AFS). KPI values and queue badges show a
   neutral `…` while loading instead of flashing `0`/"Clear".
4. **Cleanup:** removed a pre-existing `as any[]` cast on the vehicle-photo query (typed properly),
   which also reduced the repo lint baseline by one warning.

No receiving, custody, serial, or inventory **mutation or rule** was touched. The new reads are
pure aggregation for display.

## Factory / Production — current state and changes

**Current state:** Mature workspace — PageHeader, WO-gate alert banner, overdue-update banner,
quick actions, 8 real-data KPI cards, work queues, module tiles, governance rules, loading state.

**Gap:** one work queue, "Requirements Missing", had `count: 0` hardcoded and always showed
"Clear". Its stated meaning ("BOQ, BOM, GA Drawing, or Detail Drawings **not submitted**") is an
*absence* computation across requirement types that cannot be derived safely from the dashboard's
existing data without guessing schema semantics.

**Change:** per the "omit if cannot be calculated safely" rule, the fabricated "Requirements
Missing" queue was **removed**. No navigation is lost — `/factory/requirements` remains reachable
from the Factory module tiles. No WO gate, production, or RMR logic was touched.

> Future recommendation: add a real "Requirements Pending" metric (e.g. `factory_requirements`
> with `status = 'pending'`) if/when an absence-of-requirement signal is well-defined.

## QC / NCR / Release — current state (unchanged)

Fully mature and **already correct**: every KPI and work queue is computed from real data via
`count`-exact queries (`material_qc_inspections`, `material_ncrs`, `project_qc_inspections`,
`project_qc_findings`, `release_notes`), with loading skeletons, role/alert chips, and a
release-readiness queue. **No fabricated counts. No gaps found. Left unchanged.**

## Dubai / AFS — current state (unchanged)

Fully mature and **already correct**: all KPIs computed from real data
(`dubai_project_followups`, `afs_arrival_reports`, `afs_missing_items`, `afs_predelivery_reports`,
`afs_maintenance_requests`), PN-gate alert, recent follow-ups list, governance rules, loading
guard. **No fabricated counts. No gaps found. Left unchanged.**

---

## Data Sources Used

- `material_qc_inspections.inspection_result` — read-only, for Store "QC Accepted / Rejected".
- `material_custody_records.approval_status` — added to existing Store custody read.
- Mock equivalents (`MOCK_MATERIAL_QC_INSPECTIONS`, `MOCK_CUSTODY_RECORDS`) for dev mode parity.

No new tables, views, functions, or columns. No migration objects referenced.

---

## Role Access / Route / Guard Review

- **Routes changed:** None.
- **Route guards changed:** None.
- **roleMatrix changed:** None.
- **Navigation changed:** None.
- The Store dashboard's new `material_qc_inspections` read is subject to the **existing** RLS for
  that table; no permission was broadened. Store users already reach QC-handoff status via
  `/store/qc-handoff`.

---

## Business Logic Safety Review

| Area | Changed? |
|------|----------|
| Store receiving / custody / serial rules | No |
| Factory WO gate / production rules | No |
| QC pass/fail / NCR / release gate / rework rules | No |
| Dubai/AFS PN gate / delivery readiness rules | No |
| Mutations on any table | No (reads only) |
| DB schema / RLS | No |
| Migrations applied / created | No |
| Procurement / Sales / Projects / SO / quotation logic | No |

---

## Migration Policy Confirmation

No migrations were applied, created, or pushed; no SQL executed. The new Store reads target
tables that the application already uses elsewhere; no unapplied-migration object is referenced,
so there is no new runtime dependency on a deferred migration.

---

## Validation Results

- `npm run build` — zero TypeScript errors; chunks emitted ✓
- `npx tsc --noEmit` — clean ✓
- Changed-file lint (`Store.tsx`, `Factory.tsx`) — zero issues ✓
- Full lint — **56** problems (22 errors, 34 warnings), **down from the 57 baseline** (one
  pre-existing `as any[]` warning removed); zero new issues introduced ✓
- Local route validation — not performed; the remote environment has no seeded auth/data session.
  Changes are read-only/aggregation-only and covered by build + typecheck + lint.

---

## Remaining Risks

- **Non-blocking:** Interactive route validation not possible without a seeded session.
- **Non-blocking:** Store "QC Accepted/Rejected" counts aggregate all `material_qc_inspections`
  rows (matching how the QC Handoff page presents them); if future requirements need
  project-scoped or store-only subsets, the filter can be refined.

---

## Recommended Next Step

- Optionally add a real "Requirements Pending" Factory metric to replace the removed placeholder.
- Continue to the next module group (After Sales, Reports, Control Tower, Admin, Viewer) in a
  separate sprint/PR — explicitly **out of scope** here.
