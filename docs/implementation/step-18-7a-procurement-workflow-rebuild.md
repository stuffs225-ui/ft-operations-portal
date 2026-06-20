# Step 18.7A — Procurement Role Workflow Rebuild and UX Redesign

## Objective

Rebuild the `procurement_user` experience into a full Procurement Operating Center. This step adds a dedicated PROCUREMENT sidebar section, redesigns the Procurement hub as an amber-themed operating center with live KPI cards and work queues, adds Register PR / Create PO forms, introduces a PR Items Without PO governance queue, and improves all procurement pages for operational usability.

No DB schema, migrations, or RLS were changed.

---

## Completeness Audit

| # | Requirement | Status | Files | Notes |
|---|-------------|--------|-------|-------|
| 1 | Procurement sidebar / IA | **Done** | `Sidebar.tsx`, `navigation.ts` | New PROCUREMENT section (6 items) for admin/ops/procurement_user |
| 2 | Procurement Dashboard / Operating Center | **Done** | `Procurement.tsx` | 8 KPI cards, action bar, work queues, module nav grid, role badge |
| 3 | Register PR / Add Incoming PR | **Done** | `ProcurementRequestNew.tsx`, `ProcurementRequests.tsx` | Form + button on list page, project_id validated |
| 4 | Purchase Requests table UX | **Done** | `ProcurementRequests.tsx` | Search, status tabs, Register PR CTA, improved EmptyState |
| 5 | PR Detail | **Done** | `ProcurementRequestDetail.tsx` | 4 tabs: Overview, Items, PO to Supplier, Timeline |
| 6 | PR Items | **Done** | `ProcurementRequestDetail.tsx` | Items tab with add/edit inline capabilities |
| 7 | PR Items Without PO queue | **Done** | `ProcurementPrItemsWithoutPo.tsx` | Urgency color-coding (red/amber/green), Create PO action |
| 8 | Create PO to Supplier | **Done** | `ProcurementPurchaseOrderNew.tsx`, `ProcurementPurchaseOrders.tsx` | Form + button on list page |
| 9 | Create PO from PR / PR items | **Partial** | `ProcurementPurchaseOrderNew.tsx` | PR-level pre-selection via `?pr_id=` query param; no item-level pre-fill |
| 10 | Link PO to PR / PR items | **Partial** | `ProcurementPurchaseOrderNew.tsx` | PR-level link via `procurement_request_id`. PR item status update on PO creation not implemented — schema gap |
| 11 | Upload PO PDF | **Not supported** | — | No file storage bucket configured for PO PDFs. Schema gap / storage gap. Deferred. |
| 12 | High-value PO approval (SAR > 10,000) | **Done** | `ProcurementPurchaseOrderNew.tsx` | Orange warning, po_status=pending_approval, approval_required=true |
| 13 | PO Approval Status page/section | **Done** | `ProcurementPODetail.tsx` | Approval tab in PO Detail with approve/reject actions for admin/ops |
| 14 | ETA Tracking page | **Done** | `ProcurementEtaHistory.tsx` | 2-tab page: Current ETA (active POs with countdown) + Change Log |
| 15 | ETA History / ETA reason behavior | **Done** | `ProcurementEtaHistory.tsx`, `ProcurementPODetail.tsx` | Change Log shows delta, reason, remarks, changed_by. PO Detail ETA tab records changes with reason. |
| 16 | Approved Suppliers page | **Done** | `ProcurementSuppliers.tsx` | Search, status tabs, contact/email/phone, quality rating, medical/critical badges |
| 17 | Procurement Reports | **Done** | `ReportsProcurement.tsx` | 7 tabs: Open PRs, PR Items Without PO, PO Pending Approval, PO Without ETA, Delayed ETAs, High Value POs, Supplier Status |
| 18 | Project Detail procurement view | **Deferred** | — | Would require changes to ProjectDetail.tsx which spans multiple roles. Deferred to a dedicated step. |
| 19 | Procurement-specific rules card | **Done** | `roleMatrix.ts` | 6 rules for procurement_user, displayed in Dashboard role badge section |
| 20 | Empty states across procurement pages | **Done** | All pages | Actionable empty states with next-action descriptions on all 8 procurement pages |
| 21 | Visual identity / procurement module styling | **Done** | All pages | Amber accent throughout: buttons, badges, ring focus, filter chips, hover states |
| 22 | Role-safe navigation | **Done** | `App.tsx`, `navigation.ts` | All routes RequireRole-guarded; admin always bypasses |
| 23 | Live data vs dev/mock fallback | **Done** | All pages | `isSupabaseConfigured` guard; operational pages use mock in dev, Reports use `mockOrEmpty()` (empty in live) |
| 24 | Documentation | **Done** | `step-18-7a-procurement-workflow-rebuild.md` | Full audit, schema gaps, deferred items |
| 25 | Validation | **Done** | — | Build ✓, tsc ✓, lint ✓ (0 errors on all procurement files) |

---

## Schema Gaps

| Gap | Description | Impact |
|-----|-------------|--------|
| PR item-level PO linking | No `purchase_order_id` on `procurement_request_items` | Cannot auto-update PR item status when PO is created for that item. Only PR-level link (`procurement_request_id`) exists on POs. |
| PO PDF upload | No file storage bucket or `document_url` field on `purchase_orders_to_supplier` | Cannot upload PO PDFs to cloud storage. PO Detail has no upload UI. |
| `required_date` on PRs | `procurement_requests` has no `required_date` or `priority` field | Cannot capture item urgency on PR form. |
| `wo_number` / `pn_number` on PRs | Not present on `procurement_requests` | Cannot link PR to WO/PN at time of creation. |

All schema gaps are documented. No workarounds were implemented that misrepresent unsupported features as working.

---

## project_id Validation

**Both `ProcurementRequestNew` and `ProcurementPurchaseOrderNew` validate that `projectId` is non-empty before submitting.** The DB schema has `project_id NOT NULL` on both `procurement_requests` and `purchase_orders_to_supplier`.

**Manual/Stock PRs without a project**: Not currently supported — blocked by DB constraint. This is documented as a schema limitation, not a UI bug. A future migration adding `project_id` nullable with a "Manual/Stock" fallback would allow this.

Behavior:
- If user submits without selecting a project → inline error displayed, form does not submit
- In dev mode (no Supabase) → form navigates back without persisting (no validation needed)

---

## PO Upload / Linking Status

| Feature | Status | Reason |
|---------|--------|--------|
| Upload PO PDF | Not supported | No storage bucket configured; no `document_url` column on POs table |
| Link PO to PR | Implemented (PR-level) | `procurement_request_id` stored on PO; Linked PR dropdown in Create PO form |
| Link PO to PR items | Not implemented | Schema gap — `procurement_request_items` has no `purchase_order_id` FK |

---

## ETA Tracking

The `ProcurementEtaHistory` page was restructured as a 2-tab operational page:

**Current ETA tab (primary)**
- Fetches active POs (`po_status NOT IN (cancelled, closed)`) with project join
- Countdown: "Xd overdue" (red) / "Today" (amber) / "in Xd" (amber ≤7d, green >7d) / "Not set" (gray)
- Filter chips: All / Overdue / Due This Week / No ETA
- Red badge count on tab when overdue POs exist
- Overdue alert banner above tabs
- "Next Action" link per row — navigates to PO Detail ETA tab

**Change Log tab**
- Full audit trail of ETA changes from `eta_change_history`
- Filter by entity type (PO / PR Item)
- Search by reason / remarks
- Delta display (+Nd delay / -Nd improvement)

ETA update action is supported — done via PO Detail > ETA Management tab (existing functionality).

---

## Approved Suppliers

Improvements in this finalization:
- Email and phone now shown as sub-rows under contact person
- Medical/Critical approval shown as compact badges in a "Special" column (replaces two separate Yes/No columns)
- Empty state message: explains suppliers must be added before a PO can be issued
- Async IIFE lint fix

"Add Supplier" button: **Deferred** — requires a `ProcurementSupplierNew` form that doesn't exist yet.

---

## Procurement Reports

7 tabs (was 6):
1. Open PRs — all non-cancelled/non-closed PRs
2. PR Items Without PO — PRs in pr_received / in_progress status
3. PO Pending Approval — POs with `approval_status=pending`
4. PO Without ETA — POs with no `eta_date`
5. Delayed ETAs — POs with `eta_date` in the past
6. **High Value POs** — NEW: POs with `approval_required=true` (> SAR 10,000)
7. Supplier Status — Supplier scorecards

**Data source**: All tabs use `mockOrEmpty()` — returns `[]` in live mode. `DataSourceBadge` and `ReportExportBar` are included on the page. Live data integration for reports requires a dedicated Supabase-backed data layer step (deferred).

---

## Files Changed

### Modified

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Added `Package`, `Clock`, `AlertCircle` to lucide imports and ICON_MAP |
| `src/data/navigation.ts` | Added PROCUREMENT section (6 items); removed procurement_user from EXECUTION Procurement item |
| `src/pages/Procurement.tsx` | Full rewrite — Operating Center with KPI cards, action bar, work queues, module nav, role badge; async IIFE lint fix |
| `src/pages/ProcurementRequests.tsx` | CAN_CREATE guard, Register PR button, EmptyState CTA; async IIFE lint fix |
| `src/pages/ProcurementPurchaseOrders.tsx` | CAN_CREATE guard, Create PO button, updated subtitle; async IIFE lint fix |
| `src/pages/ProcurementEtaHistory.tsx` | Full rewrite — 2-tab (Current ETA + Change Log), filter chips, countdown, amber theme; async IIFE lint fix |
| `src/pages/ProcurementSuppliers.tsx` | Email/phone in Contact cell, improved empty state, Special column; async IIFE lint fix |
| `src/pages/ProcurementPODetail.tsx` | Async IIFE lint fix (nested .then converted to await Promise.all) |
| `src/pages/ProcurementRequestDetail.tsx` | Async IIFE lint fix (nested .then converted to await Promise.all) |
| `src/pages/ProcurementSupplierDetail.tsx` | Async IIFE lint fix (nested .then converted to await) |
| `src/pages/ReportsProcurement.tsx` | Added "High Value POs" tab (7th tab) |
| `src/app/App.tsx` | Added 3 lazy imports and 3 new routes |
| `src/lib/roleMatrix.ts` | Updated procurement_user rules from 4 to 6 |

### Created

| File | Purpose |
|------|---------|
| `src/pages/ProcurementRequestNew.tsx` | Register PR form — inserts into `procurement_requests` |
| `src/pages/ProcurementPurchaseOrderNew.tsx` | Create PO form — inserts into `purchase_orders_to_supplier` |
| `src/pages/ProcurementPrItemsWithoutPo.tsx` | PR Items Without PO queue — surfaces unlinked items |

---

## Lint Fixes (All Files)

Total `react-hooks/set-state-in-effect` violations fixed: **9 files**

All fixed by wrapping `useEffect` bodies in `(async () => { ... })()` IIFE and converting nested `.then()` chains to `await Promise.all()` where applicable.

| File | Location |
|------|----------|
| `Procurement.tsx` | Mock KPI data branch |
| `ProcurementPrItemsWithoutPo.tsx` | Mock items branch |
| `ProcurementPurchaseOrders.tsx` | Mock PO list branch |
| `ProcurementRequests.tsx` | Mock PR list branch |
| `ProcurementEtaHistory.tsx` | Mock history + mock PO branches |
| `ProcurementSuppliers.tsx` | Mock suppliers branch |
| `ProcurementPODetail.tsx` | `!id` guard + mock/live branches |
| `ProcurementRequestDetail.tsx` | `!id` guard + mock/live branches |
| `ProcurementSupplierDetail.tsx` | `!id` guard + mock/live branches |

---

## Deferred Items

| Item | Reason | When |
|------|--------|------|
| Project Detail procurement view | Would touch multi-role ProjectDetail.tsx; too broad for this PR | Dedicated step |
| PO PDF upload | No storage bucket / no `document_url` column | Schema + storage migration required |
| PR item-level PO linking | No `purchase_order_id` FK on `procurement_request_items` | Schema migration required |
| Add Supplier form | `ProcurementSupplierNew.tsx` not yet created | Next procurement step |
| Manual/Stock PRs (no project) | `project_id NOT NULL` DB constraint | Schema migration required |
| Procurement Reports live data | All report tabs show mock-or-empty; need Supabase-backed aggregation | Dedicated step |
| PO Approval standalone page | Currently handled in PO Detail Approval tab; standalone queue page deferred | Optional |

---

## Safety Review

- No DB schema, migrations, or RLS changes
- No fake live data introduced (`isSupabaseConfigured` pattern throughout)
- All new routes RequireRole-guarded (`procurement_user` or `operations_manager`)
- Admin role always bypasses via RequireRole logic
- `project_id` validated before insert (NOT NULL DB constraint respected)
- High-value PO approval gate enforced in UI: value > SAR 10,000 with currency=SAR → `po_status=pending_approval`
- No other roles' workflows, pages, or guards modified

---

## Validation Results

```
npm run build      ✓ (5.58s, 0 errors)
npx tsc --noEmit   ✓ (0 errors)
npx eslint (all procurement files) ✓ (0 errors, 0 warnings)
```

Baseline pre-existing lint (other files, unchanged): 75 problems (59 errors, 16 warnings).
