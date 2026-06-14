# 04 — Mock Data and Live Data Plan

**Document:** Step 4C — Architecture Cleanup Review  
**Date:** 2026-06-13  
**Status:** Assessment only — no files changed

---

## Summary

`mockOrEmpty()` is called **96 times** across **40+ page files** (confirmed by audit). In live Supabase mode (`isSupabaseConfigured = true`), every one of these calls returns an empty array `[]`. This means approximately half the application shows no data to real users.

The `mockOrEmpty()` pattern itself is architecturally sound — it correctly prevents mock data from leaking into production. The problem is that the live Supabase query has not been implemented for most of these pages.

---

## Mock Data File Inventory

| File | Lines | Purpose | Bundle Chunk |
|------|-------|---------|-------------|
| `src/data/mockStore.ts` | 929 | Store receipts, custody, vehicle receiving, medical serials | 24.09 KB |
| `src/data/mockInbox.ts` | 612 | Action inbox tasks (SLA events, pending approvals) | 21.78 KB (ActionInbox chunk) |
| `src/data/mockProjects.ts` | 517 | Projects/SO records | 15.82 KB |
| `src/data/mockProcurement.ts` | 453 | PRs, POs, suppliers, ETA history | — |
| `src/data/mockDashboard.ts` | 429 | Dashboard KPI cards, project health scores | 16.03 KB (Dashboard chunk) |
| `src/data/mockAfs.ts` | 419 | Dubai followups, AFS arrivals, pre-delivery, condition reports | — |
| `src/data/mockQuotations.ts` | 418 | Quotation requests, lines, documents | 23.04 KB |
| `src/data/mockFactory.ts` | 281 | Factory records, requirements, raw material requests | — |
| `src/data/mockQc.ts` | 225 | Material inspections, NCRs, project findings, release notes | — |
| `src/data/mockTemplates.ts` | 216 | Document templates | — |
| `src/data/mockReports.ts` | 176 | Report data, health scores, operational issues | 27.94 KB |
| `src/data/mockNotifications.ts` | 156 | Notification events, escalation rules | — |
| `src/data/mockAccessRequests.ts` | 136 | Access request records | — |
| `src/data/mockReportSubscriptions.ts` | 88 | Report subscription records | — |
| `src/data/mockExecutionReferences.ts` | 79 | WO/PN execution references | — |
| `src/data/navigation.ts` | 245 | Sidebar navigation links (NOT mock data) | — |
| `src/data/departmentReports.ts` | — | Department report links | — |

**Total mock data lines:** ~4,856 lines shipped in production bundle.

---

## Complete mockOrEmpty Usage Inventory

### Group 1 — Control Tower (CRITICAL — Admin/Ops home page)

| File | Mock Data | Live Status | Risk |
|------|-----------|-------------|------|
| `ControlTower.tsx` | `MOCK_PROJECTS`, `MOCK_EXECUTION_REFERENCES`, `MOCK_OPERATIONAL_ISSUES`, `MOCK_DATA_QUALITY_CHECKS`, `MOCK_PROJECT_HEALTH_SCORES`, `MOCK_DEPARTMENT_HEALTH_SCORES` | All tiles show 0 counts in live mode | 🔴 CRITICAL |

Control Tower is the operations home page. Every metric tile requires a live Supabase aggregation query. This is the single most visible gap for Admin and Operations Manager users.

**Phase:** Phase 10 (requires all underlying modules to be live first)

---

### Group 2 — Dashboard KPI Cards

| File | Mock Data | Live Status | Risk |
|------|-----------|-------------|------|
| `Dashboard.tsx` | `PROJECT_SUMMARY`, `DASHBOARD_KPI_CARDS`, `AFS_KPI_CARDS` | Empty KPI section in live mode; only auth greeting shown | 🟠 High |

**Phase:** Phase 2 (once project + approval flows are live)

---

### Group 3 — Action Inbox (SLA events, pending tasks)

| File | Mock Data | Live Status | Risk |
|------|-----------|-------------|------|
| `ActionInbox.tsx` | `INBOX_TASKS` | Empty inbox in live mode | 🟠 High |

**Phase:** Phase 10 (requires SLA engine + background scheduler)

---

### Group 4 — Sales Module (ALL MOCK)

| File | Mock Data | Live Status | Risk |
|------|-----------|-------------|------|
| `Sales.tsx` (672 lines) | Multiple mock collections | Empty workspace in live mode | 🟠 High |
| `SalesCoordinator.tsx` | MOCK_QUOTATIONS | Partial — some wired | 🟡 Medium |

**Phase:** Phase 2 (Sales Workspace) + Phase 3 (Quotations)

---

### Group 5 — AFS / Dubai Module (ALL MOCK)

| File | Mock Data | Live Status | Risk |
|------|-----------|-------------|------|
| `DubaiAFS.tsx` | `MOCK_DUBAI_FOLLOWUPS`, `MOCK_AFS_ARRIVAL_REPORTS`, `MOCK_AFS_MISSING_ITEMS`, `MOCK_AFS_PREDELIVERY_REPORTS` | Empty hub | 🟡 Medium |
| `DubaiAfsProjects.tsx` | `MOCK_DUBAI_FOLLOWUPS` | Empty list | 🟡 Medium |
| `DubaiAfsArrivalReports.tsx` | `MOCK_AFS_ARRIVAL_REPORTS` | Empty list | 🟡 Medium |
| `DubaiAfsConditionReports.tsx` | `MOCK_AFS_CONDITION_REPORTS` | Empty list | 🟡 Medium |
| `DubaiAfsEta.tsx` | `MOCK_DUBAI_FOLLOWUPS` | Empty list | 🟡 Medium |
| `DubaiAfsMissingItems.tsx` | `MOCK_AFS_MISSING_ITEMS` | Empty list | 🟡 Medium |
| `DubaiAfsPredeliveryReports.tsx` | `MOCK_AFS_PREDELIVERY_REPORTS` | Empty list | 🟡 Medium |

**Phase:** Phase 6

---

### Group 6 — Factory Module (MOSTLY MOCK)

| File | Mock Data | Live Status | Risk |
|------|-----------|-------------|------|
| `Factory.tsx` | `MOCK_FACTORY_RECORDS`, `MOCK_FACTORY_REQUIREMENTS`, `MOCK_RAW_MATERIAL_REQUESTS`, `MOCK_PROJECTS` | Empty hub | 🟡 Medium |
| `FactoryProjects.tsx` | `MOCK_FACTORY_RECORDS`, `MOCK_PROJECTS` | Empty list | 🟡 Medium |
| `FactoryProjectWorkspace.tsx` | `MOCK_REQUIREMENT_TYPES` | Partial — some wired | 🟡 Medium |
| `FactoryMonthlyUpdates.tsx` | `MOCK_FACTORY_RECORDS` | Empty list | 🟡 Medium |
| `FactoryRawMaterialRequests.tsx` | Mock data | Empty list | 🟡 Medium |

**Phase:** Phase 6

---

### Group 7 — Store / Custody Module (MOSTLY MOCK)

| File | Mock Data | Live Status | Risk |
|------|-----------|-------------|------|
| `MaterialCustody.tsx` | `MOCK_CUSTODY_RECORDS` | Empty list | 🟡 Medium |
| `CustodyNew.tsx` | `MOCK_STORE_RECEIPTS` | Partial — form loads empty | 🟡 Medium |
| `StoreVehicleReceiving.tsx` | Mock data | Partial | 🟡 Medium |

**Phase:** Phase 7

---

### Group 8 — QC Module (MOSTLY MOCK)

| File | Mock Data | Live Status | Risk |
|------|-----------|-------------|------|
| `MaterialQC.tsx` | Mock data | Partial | 🟡 Medium |
| `MaterialNcrs.tsx` | `MOCK_MATERIAL_NCRS` | Empty list | 🟡 Medium |

**Phase:** Phase 8

---

### Group 9 — After-Sales Module (ALL MOCK)

| File | Mock Data | Live Status | Risk |
|------|-----------|-------------|------|
| `AfterSales.tsx` | `MOCK_AFS_MAINTENANCE_REQUESTS` | Empty hub | 🟡 Medium |
| `AfterSalesMaintenance.tsx` | Same | Empty list | 🟡 Medium |
| `AfterSalesMaintenanceNew.tsx` | `MOCK_PROJECTS` | Empty project dropdown | 🟡 Medium |

**Phase:** Phase 9

---

### Group 10 — Admin / Notification Pages (SOME MOCK)

| File | Mock Data | Live Status | Risk |
|------|-----------|-------------|------|
| `AdminNotificationRules.tsx` | `MOCK_NOTIFICATION_EVENTS`, `MOCK_ESCALATION_RULES` | Empty | 🟡 Medium |
| `AdminReportSubscriptionDetail.tsx` | `MOCK_DELIVERY_LOGS` | Empty delivery log | Low |

**Phase:** Phase 10

---

### Group 11 — Reports (ALL MOCK — 13 pages)

All report pages (`ReportsExecutive.tsx`, `ReportsProjects.tsx`, `ReportsSales.tsx`, `ReportsProcurement.tsx`, `ReportsFactory.tsx`, `ReportsStore.tsx`, `ReportsQC.tsx`, `ReportsAFS.tsx`, `ReportsSuppliers.tsx`, `ReportsSLA.tsx`, `ReportsDataQuality.tsx`, `ReportsHealthScores.tsx`, `ReportsIssues.tsx`, `ReportsCapa.tsx`) use static mock data embedded in the component files themselves (not `mockOrEmpty` — they use static inline data).

**Live status:** All 13 report pages show static numbers/charts that have no relationship to the actual database state in live mode. This is the most critical reporting issue.

**Phase:** Phase 10 (all reports defer to this phase per B-004)

---

## Pages Fully or Mostly Wired to Live Data (✅ Reference)

For completeness, the following pages do NOT use `mockOrEmpty()` and are wired to live Supabase:

| Page | Data Source | Notes |
|------|------------|-------|
| `Projects.tsx` | Supabase `projects` table | Live ✅ |
| `ProjectDetail.tsx` | Supabase `projects`, `project_vehicle_lines`, etc. | Live ✅ (11 queries) |
| `QuotationNew.tsx` | Supabase `quotation_requests` | Live ✅ |
| `AdminApprovals.tsx` | Supabase `projects` | Live ✅ |
| `WoPnGate.tsx` | Supabase via `executionGate.ts` | Live ✅ |
| `ProcurementPODetail.tsx` | Supabase `purchase_orders_to_supplier` | Live ✅ |
| `AdminAccessRequests.tsx` | Supabase `access_requests` | Live ✅ |
| `AdminAccessRequestDetail.tsx` | Supabase | Live ✅ |

---

## Recommended Isolation / Removal Strategy

### Strategy 1 — Do Not Remove `mockOrEmpty()` Calls (Keep the Pattern)

The `mockOrEmpty()` pattern is architecturally correct and should be preserved. The pattern:
1. Returns `[]` in live mode — prevents mock data leaking into production
2. Returns mock data in dev-mock mode — enables UI development without a live DB

**Do not remove `mockOrEmpty()` calls** — instead, **add live data fetching that runs in parallel**:

```typescript
// Before (mock only):
const records = mockOrEmpty(MOCK_STORE_RECEIPTS);

// After (live + fallback):
const [records, setRecords] = useState(mockOrEmpty(MOCK_STORE_RECEIPTS));
useEffect(() => {
  if (!isSupabaseConfigured) return;
  supabase.from('store_receipts').select('*').then(({ data }) => {
    if (data) setRecords(data as StoreReceipt[]);
  });
}, []);
```

Or better, extract to a service hook:
```typescript
const { records } = useStoreReceipts(); // calls Supabase; falls back to mockOrEmpty in dev
```

### Strategy 2 — Exclude Mock Files from Production Bundle (B-050)

Even though `mockOrEmpty()` returns `[]` in live mode, the mock data files are still bundled and downloaded. Fix with Vite dynamic import:

```typescript
// dataMode.ts — modified mockOrEmpty
export async function mockOrEmptyAsync<T>(
  importer: () => Promise<{ default: T[] }>
): Promise<T[]> {
  if (isLiveMode()) return [];
  const module = await importer();
  return module.default;
}
```

Or more practically, move `src/data/` to `src/test-fixtures/` and configure Vite to exclude them via `build.rollupOptions.external` for production builds.

### Strategy 3 — Control Tower and Reports (Phase 10 — Defer)

Control Tower and all 13 report pages must wait for Phase 10. They require:
- All operational modules live-wired (Phases 2–9)
- Real aggregation queries in place
- Potential materialized views or DB functions for heavy aggregations

**Until Phase 10:** Display a "Connecting to live data..." empty state in live mode (instead of showing empty counts that look like zeros).

---

## Future Phase Mapping

| Group | Pages | Live-Wire Phase | Blocker |
|-------|-------|----------------|---------|
| Control Tower | 1 | Phase 10 | All modules must be live |
| Dashboard KPIs | Dashboard | Phase 2 | SO flow live |
| Action Inbox | ActionInbox | Phase 10 | SLA engine live |
| Sales Module | Sales, SalesCoordinator | Phase 2–3 | Quotation flow live |
| AFS/Dubai | 7 pages | Phase 6 | Dubai module live |
| Factory | 5 pages | Phase 6 | Factory module live |
| Store/Custody | 3 pages | Phase 7 | Store module live |
| QC | 2 pages | Phase 8 | QC module live |
| After-Sales | 3 pages | Phase 9 | AFS maintenance live |
| Admin/Notifications | 2 pages | Phase 10 | SLA engine live |
| Reports (all 13) | 13 pages | Phase 10 | All modules live |
