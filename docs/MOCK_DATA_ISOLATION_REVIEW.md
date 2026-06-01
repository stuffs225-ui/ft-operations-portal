# Mock Data Isolation Review (Wave A)

**Date:** 2026-06-01
**Branch:** `enterprise-polish-real-mode-hardening`
**Scope:** Wave A — real-mode mock-data isolation
**Status:** Implemented

---

## 1. Objective

Before this work, a number of pages rendered hard-coded mock records even when
the application was pointed at a real Supabase backend. This is dangerous in a
pilot or production context: a user could mistake sample data for real records,
or make decisions against fabricated numbers.

The rule established by Wave A is simple and absolute:

> **Mock data must NEVER be rendered when Supabase is configured (live mode).**

In live mode, a page with no wired live query shows a clean empty state plus an
honest "preview / not yet connected" badge. Mock data is reserved exclusively
for local development (`dev-mock` mode), where it is clearly labelled.

---

## 2. Data-mode strategy

### 2.1 Two modes, one source of truth

`src/lib/dataMode.ts` is the single source of truth for how a page sources data:

| Mode       | Condition                          | Behaviour                                                                 |
|------------|------------------------------------|--------------------------------------------------------------------------|
| `live`     | `isSupabaseConfigured === true`    | Pages query Supabase and show clean empty states. Mock NEVER renders.    |
| `dev-mock` | Supabase not configured (local dev)| Pages render labelled sample data so the UI is explorable without a DB.  |

A third presentation, `preview`, is not a global mode but a per-module flag: a
module whose real back-end/aggregation is not wired yet shows sample data **only**
in dev-mock mode, and a clean "not yet connected" state in live mode.

### 2.2 Helpers (`src/lib/dataMode.ts`)

| Export                          | Behaviour                                                              |
|---------------------------------|-----------------------------------------------------------------------|
| `getDataMode()`                 | Returns `'live'` or `'dev-mock'`.                                      |
| `isLiveMode()`                  | `true` when Supabase is configured.                                    |
| `isDevMockMode()`               | `true` when running on mock data.                                      |
| `mockOrEmpty<T>(mock): T[]`     | Returns `mock` in dev-mock mode, `[]` in live mode. For list pages.    |
| `mockOrValue<T>(mock, fallback)`| Returns `mock` in dev-mock mode, `fallback` in live mode. For scalars. |

These helpers make the isolation guarantee declarative: a page wraps its mock
constant in `mockOrEmpty(...)` and is automatically safe in live mode.

### 2.3 DataSourceBadge (`src/components/ui/DataSourceBadge.tsx`)

A small inline badge that tells the user exactly where the data on the page comes
from, so sample data is never mistaken for live records.

| Variant   | Live mode                         | Dev-mock mode                |
|-----------|-----------------------------------|------------------------------|
| `auto`    | "Live data" (emerald)             | "Dev mode — sample data" (amber) |
| `preview` | "Preview — not yet connected" (indigo) | "Dev mode — sample data" (amber) |

The 25 fixed pages use `variant="preview"`, because their live query/aggregation
is not yet wired — the badge promises only "real source pending", never "real".

---

## 3. Pages fixed in Wave A (25)

Each of the following previously rendered mock records in live mode. Each now
wraps its mock source in `mockOrEmpty`/`mockOrValue` and renders a
`<DataSourceBadge variant="preview" />`. In live mode each shows an empty state
(no mock records) plus the preview badge; in dev-mock mode each still shows
labelled sample data.

1. `src/pages/ActionInbox.tsx`
2. `src/pages/AdminNotificationRules.tsx`
3. `src/pages/AdminReportSubscriptionDetail.tsx`
4. `src/pages/AfterSales.tsx`
5. `src/pages/AfterSalesMaintenance.tsx`
6. `src/pages/ControlTower.tsx`
7. `src/pages/Dashboard.tsx`
8. `src/pages/DubaiAFS.tsx`
9. `src/pages/DubaiAfsArrivalReports.tsx`
10. `src/pages/DubaiAfsConditionReports.tsx`
11. `src/pages/DubaiAfsEta.tsx`
12. `src/pages/DubaiAfsMissingItems.tsx`
13. `src/pages/DubaiAfsPredeliveryReports.tsx`
14. `src/pages/DubaiAfsProjects.tsx`
15. `src/pages/MaterialCustody.tsx`
16. `src/pages/MaterialNcrs.tsx`
17. `src/pages/MaterialQcInspections.tsx`
18. `src/pages/ProjectQcFindings.tsx`
19. `src/pages/ProjectQcInspections.tsx`
20. `src/pages/ProjectQcReleaseNotes.tsx`
21. `src/pages/StoreInventory.tsx`
22. `src/pages/StoreReceipts.tsx`
23. `src/pages/StoreVehicleReceiving.tsx`
24. `src/pages/ReportsAFS.tsx`
25. `src/pages/NotificationSettings.tsx`

### 3.1 Dashboard & Control Tower

Both `Dashboard` and `ControlTower` aggregate KPIs. Their real aggregation is not
wired to live data yet. Rather than display fabricated KPI numbers in live mode,
both now show an explicit **"aggregation not yet connected to live data"** notice
in live mode, and reserve the sample KPIs for dev-mock mode only.

### 3.2 ProjectDetail in-component sub-tabs

`ProjectDetail.tsx`'s in-component **Store** and **QC** sub-tabs previously
injected mock rows via `getMock*` helpers. They now render **empty in live mode**
pending real reads. (This is tracked as GAP-03 — see Remaining Items.)

---

## 4. Cost-view protection fix

`src/pages/ProjectDetail.tsx` now reads vehicle lines from the
`project_vehicle_lines_safe` view instead of the base `project_vehicle_lines`
table:

```
supabase.from('project_vehicle_lines_safe').select('*').eq('project_id', id).order('line_number')
```

The base table exposes `unit_sales_value` / `line_total_value` (revenue) to every
role with project-participant access — including factory, store, QC, AFS and
viewer roles that must never see revenue. The `_safe` view strips those columns
for non-privileged roles, so cost/revenue figures are no longer leaked through
the project detail page. This complements the existing RLS/column protections.

---

## 5. Pages that were already correct (REAL-GUARDED)

The audit confirmed these pages already queried Supabase and showed clean empty
states in live mode — no change required:

Projects, Quotations, QuotationDetail, Sales, SalesCoordinator, Procurement and
sub-pages, the Factory suite (FactoryProjects, FactoryWorkspace,
FactoryRequirements, RawMaterial*, MonthlyUpdates), Store / StoreReceiptDetail /
StoreUnallocated / StoreVehicleReceivingDetail, MaterialQC, MaterialNcrDetail,
MaterialQcInspectionDetail, ProjectQC and its detail pages, Templates and
Template* pages, Notifications, the Admin suite (AdminUsers, AdminApprovals,
AdminAccessRequests and detail, AdminReportSubscriptions), ProjectDetail
(top-level), CustodyDetail / CustodyNew, Dubai*Detail pages, GeneratedDocuments*.

---

## 6. Remaining items (deferred)

### 6.1 Reports pages still mock-only (GAP-05 — Wave F)

The following 13 reports pages are **mock-only by design today** and still render
sample analytics in live mode. They were intentionally left for a later wave
(Wave F — reports overhaul) and should receive the same `mockOrEmpty` + preview
badge treatment, or be wired to real aggregation:

ReportsExecutive, ReportsProjects, ReportsSales, ReportsProcurement,
ReportsFactory, ReportsStore, ReportsQC, ReportsSuppliers, ReportsSLA,
ReportsDataQuality, ReportsHealthScores, ReportsIssues, ReportsCapa.

> Note: `ReportsAFS` was a true leak (not by-design) and **was fixed in Wave A**.

### 6.2 ProjectDetail Store/QC sub-tabs (GAP-03)

The in-component Store and QC sub-tabs now render empty in live mode. They need
real reads (and ultimately real writes) wired before pilot. Tracked as GAP-03.

---

## 7. Verification

- **Build:** `npm run build` passes (Vite build succeeds; output is a single
  ~1.5 MB JS chunk — code-splitting is a separate deferred item).
- **Helper coverage:** `grep -rl "mockOrEmpty\|mockOrValue" src/pages` returns
  exactly the **25** pages listed in section 3.
- **Live isolation:** with Supabase configured, the 25 pages render empty states
  + preview badges and surface no mock records. See
  `docs/FINAL_ROUTE_TEST_PLAN.md` for the manual confirmation checklist.
