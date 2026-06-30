# Procurement Workspace Artifact Polish

**Branch:** `feature/procurement-workspace-artifact-polish`
**Base main SHA:** `ed45c4ff24d0082f1414c8a238bda2db486722d9`
**Scope:** **UI-only** polish of the Procurement User workspace from the approved
Artifact. No business workflow, DB/RLS, migration, permission, `roleMatrix`,
route-guard, or report-calculation changes. No mock/demo data added. Cost-gating,
supplier-register-before-PO, high-value-PO approval authority, and ETA
reason-on-change rules are all preserved.

---

## Artifact summary

The Artifact reviewed the whole Procurement workspace (not one screen) and proposed:
reduce dashboard duplication into a compact KPI band + a single urgency-ordered
Priority Queues block + a smaller module nav; add **counts** to the status tabs and
**priority lenses** + a **≥ SAR 10,000 threshold flag** on PO to Supplier; make the
PR-items page an action-oriented worklist; make the supplier approved-register rule
explicit and add counted status filters; strengthen ETA delay emphasis; and tidy
the report pages with consistent empty states. Across all pages: replace the
decorative module-amber accents with restrained NAFFCO red for primary emphasis and
**semantic-only** status colors. The Artifact's page-selector and current/improved
toggle were design-review devices and are **not** implemented in production.

---

## Inspected routes / files

| Route | File | Data source |
|-------|------|-------------|
| `/procurement` | `src/pages/Procurement.tsx` | live counts: `procurement_requests`, `procurement_request_items`, `purchase_orders_to_supplier`, `approved_suppliers` |
| `/procurement/requests` | `src/pages/ProcurementRequests.tsx` | `procurement_requests` |
| `/procurement/requests/new` | `src/pages/ProcurementRequestNew.tsx` | form (not modified) |
| `/procurement/pr-items-without-po` | `src/pages/ProcurementPrItemsWithoutPo.tsx` | `procurement_request_items` |
| `/procurement/purchase-orders` | `src/pages/ProcurementPurchaseOrders.tsx` | `purchase_orders_to_supplier` |
| `/procurement/purchase-orders/new` | `src/pages/ProcurementPurchaseOrderNew.tsx` | form (not modified) |
| `/procurement/eta-history` | `src/pages/ProcurementEtaHistory.tsx` | `purchase_orders_to_supplier`, `eta_change_history` |
| `/procurement/suppliers` | `src/pages/ProcurementSuppliers.tsx` | `approved_suppliers` |
| `/reports/procurement` | `src/pages/ReportsProcurement.tsx` | preview/mock-or-empty + `ReportExportBar` |
| `/reports/suppliers` | `src/pages/ReportsSuppliers.tsx` | preview/mock-or-empty |

Shared components reused: `PageHeader`, `Card`, `Badge`, `Skeleton`, `EmptyState`,
`PageLoader`, `StatusBadge`, `DataSourceBadge`, `ReportExportBar`, `Button`.

New local helper: `src/components/procurement/ProcurementUI.tsx` —
`StatusTabsWithCounts`, `ThresholdFlag`, `PriorityLensBar` (procurement-only,
presentational).

---

## What was implemented

**Shared (Part B):** `ProcurementUI.tsx` with counted status tabs, a display-only
`≥ SAR 10K` threshold flag (driven by the existing `approval_required` boolean — it
never reads/exposes the cost value and grants no approval power), and a priority
lens bar that maps onto existing status filters.

**Dashboard (Part C):** removed the duplication between 8 KPIs, 8 work queues, and 6
module cards. Now: a **compact KPI band** (neutral, red only when critical, all
links/counts preserved); a single **Priority Queues** block ordered
**Pending Approval → Items Without PO → Delayed ETA → New PRs**; and a **compact
module nav** row. Governance banner retained. Decorative amber replaced with
restrained brand/neutral.

**PO to Supplier (Part D):** status tabs now show **counts**; added **priority
lenses** (Pending Approval, Delayed) that jump to the existing filters; added a
**≥ SAR 10K** row flag on flagged POs; primary "Create PO" button switched from
decorative amber to brand. Status/approval badges, cost-gating, ETA dates, deep
links, and the **view-only** approval column are unchanged (no approve action
added).

**Purchase Requests (Part E):** status tabs now show **counts**; "Register PR"
button switched to brand. Statuses, filters, query params, and the Register PR
action are unchanged.

**PR Items Without PO (Part F):** kept the action-oriented worklist
(item → PR → project → qty → waiting → next action), neutralized decorative amber,
and preserved the honest all-clear empty state ("All PR items are linked to
supplier POs") and the governance note. CTA still routes to the existing
`/procurement/purchase-orders/new`.

**Approved Suppliers (Part G):** added an explicit **approved-register rule** note,
**counted** status tabs, retained procurement/QC `StatusBadge`s and the existing
empty states. No new approval power.

**ETA Tracking (Part H):** kept Current ETA + Change Log tabs, the overdue alert,
countdown/delta badges, and the reason column; strengthened consistency by moving
decorative amber to brand while keeping **red** delay emphasis. ETA calculations and
update behavior unchanged; reason-on-change untouched.

**Procurement Reports (Part I):** 7 tabs, per-tab empty rows, and the existing
`ReportExportBar` preserved; one decorative amber row-hover neutralized. No
calculation or export-data change.

**Supplier Reports (Part J):** added a contained empty state to the scorecard table;
kept the performance bands, the "How this score is calculated" explanation, and the
formula untouched.

---

## What was intentionally NOT implemented

- **`/procurement/requests/new` and `/procurement/purchase-orders/new`** — left
  untouched. Polishing multi-field forms risks validation/submit behavior; deferred
  as future page polish per the task's "if not safe, document and do not modify."
- **Artifact page-selector / current-improved toggle** — design-review only.
- **No new export/print features** — only the existing `ReportExportBar` is kept.
- **No row drawer on POs** — the existing row→detail navigation is retained; a
  drawer was not added to avoid new data wiring.
- **No data-source, query, calculation, permission, guard, or route changes.**

---

## Safety boundaries

- Routes, route guards, `roleMatrix`, and permissions: unchanged.
- High-value PO approval remains **view-only** for Procurement User (no approve
  button exists or was added).
- Cost-gating preserved (`canSeeCost` logic untouched; threshold flag uses
  `approval_required`, not the cost value).
- Supplier-register-before-PO rule: only made **more explicit** (a note); workflow
  unchanged.
- ETA reason-on-change: unchanged.
- No service-role usage in the frontend; no new mutations on read-only reports.
- No sidebar/navigation data changed (no duplicate-nav risk).

---

## Validation checklist

- [x] `npx tsc --noEmit` — clean.
- [x] changed-file ESLint — clean.
- [x] `npm run lint` — 56 problems (22 errors / 34 warnings), unchanged baseline.
- [x] `npm run build` — clean.

**Manual/static review (static only — no live data run in this environment):**
- [ ] All 10 routes render; tabs render with counts; no broken links.
- [ ] Dashboard shows compact KPI band + 4 Priority Queues + compact modules; all
      KPI/queue links resolve with their query params.
- [ ] PO page: counts on tabs, priority lenses jump correctly, `≥ SAR 10K` flag
      appears on approval-required rows; no approve button; cost column still gated.
- [ ] Suppliers: approved-register note visible; tab counts correct.
- [ ] ETA: Current ETA + Change Log tabs work; overdue rows red; reason column
      present.
- [ ] Reports: tabs + empty states render; existing export bar present.
- [ ] Semantic colors only; no heavy dark/playful UI.
