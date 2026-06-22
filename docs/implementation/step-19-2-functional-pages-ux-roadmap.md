# Step 19.2 — Functional Pages UX Audit and Improvement Roadmap

## 1. Executive Summary

Step 19.1 (Design System Foundation, PR #126, merged SHA `b4a38a5`) upgraded shared tokens,
primitives, app shell, and component library. Every page automatically receives improved spacing,
shadow, border, badge, and table aesthetics without touching page files.

This document audits all 113 functional page files across 13 areas, scores them on value vs risk,
and produces a prioritized, PR-bounded roadmap for Step 19.3 through 19.10. Implementation steps
are kept small (one functional area per PR) to protect high-risk business gates while maximizing
visual and workflow quality improvements.

**Key finding:** Most pages already receive meaningful benefit from Step 19.1. The primary
remaining gaps are: inconsistent loading/error states, mixed mock/live data presentation, heavy
single-file pages with no component extraction, and several read-only list pages that lack
filter/search polish. High-traffic workflow pages (ProjectDetail, WoPnGate, ProcurementPODetail)
have the most opportunity but also the highest regression risk.

---

## 2. Baseline

| Field | Value |
|---|---|
| Latest main SHA | `b4a38a5` |
| Step 19.1 merged | **Yes** — PR #126 `feat(design): Step 19.1 — design system foundation and app shell upgrade` |
| Total page files | 113 |
| Pages with live Supabase data | ~90 |
| Pages with mock-only data | ~23 |
| Pages using `React.lazy` | 121 (all lazy-loaded via App.tsx) |
| Pages using old `ui/PageHeader` (not `common/page-header`) | 15 |
| Pages using `PageLoader` instead of `LoadingState` | 42 |
| Pages using `LoadingState` | 0 (feedback component unused in pages) |
| Placeholder pages | 1 (`PlaceholderPage.tsx` component, used where functionality is deferred) |

---

## 3. Functional Area Inventory

### Area 1 — Commercial / Sales

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `Sales.tsx` | 564 | Live + Mock | KPI strip inline (not MetricCard), mixed live/mock flag display, no error boundary |
| `Quotations.tsx` | 435 | Live + Mock | Card-per-row list (not table), no filter bar, good loading state |
| `QuotationNew.tsx` | 738 | Live only | Complex 2-step form, uses old `ui/PageHeader`, error messages inline |
| `QuotationDetail.tsx` | 941 | Live only | Multi-tab detail, approval gate embedded, R-001 governance visible |
| `HotProjects.tsx` | ~250 | Live only | Light page, simple list |
| `HotProjectNew.tsx` | ~280 | Live only | Form page, uses old `ui/PageHeader` |
| `HotProjectDetail.tsx` | ~320 | Live only | Detail page, live data |
| `Receivables.tsx` | ~180 | Live only | Read-only list, minimal |

**UX problems:**
- `Sales.tsx` builds its own KPI strip with custom `div` borders instead of `MetricCard`
- Quotation list uses card layout — dense info but no search/filter
- `QuotationNew.tsx` / `QuotationDetail.tsx` use old `ui/PageHeader` (15px shorter than `common/page-header`)
- No `ErrorState` components — errors are raw `<p className="text-red-...">`
- `Quotations.tsx` missing search input

**Business gates:** `QuotationDetail.tsx` contains R-001 governance (status transition guard,
coordinator routing). Must not be touched without dedicated audit.

---

### Area 2 — Sales Coordinator

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `SalesCoordinator.tsx` | 391 | Live + Mock | Main work center, inline KPI strip, old patterns |
| `CoordinatorQueue.tsx` | 435 | Live + Mock | Priority queue view, good filter tabs |

**UX problems:**
- KPI strip in `SalesCoordinator.tsx` uses custom colored border divs, not `MetricCard`
- Both pages show `DataSourceBadge` prominently — useful in dev but noisy for end users
- No EmptyState when queue is empty

---

### Area 3 — Projects / Sales Orders

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `Projects.tsx` | ~300 | Live + Mock | List with status tabs — decent, no search bar |
| `ProjectNew.tsx` | 1083 | Live only | 4-step wizard, very complex, old `ui/PageHeader` |
| `ProjectDetail.tsx` | 2047 | Live + Mock | **Largest file**. Multi-tab, 15+ subsections, massive mock import list |
| `AdminApprovals.tsx` | 764 | Live + Mock | SO approval queue, approve/reject/send-back gate |
| `WoPnGate.tsx` | 900 | Live only | WO/PN execution gate, complex modal inline |
| `ProjectQC.tsx` | ~200 | Live + Mock | Project QC hub page |
| `ProjectQcInspections.tsx` | ~280 | Live + Mock | Inspection list |
| `ProjectQcInspectionDetail.tsx` | ~300 | Live + Mock | Detail, document upload |
| `ProjectQcFindings.tsx` | ~260 | Live + Mock | Findings list |
| `ProjectQcFindingDetail.tsx` | ~220 | Live + Mock | Finding detail |
| `ProjectQcReleaseNotes.tsx` | ~250 | Live + Mock | Release note list |
| `ProjectQcReleaseNoteDetail.tsx` | ~280 | Live + Mock | Detail, storage upload |
| `ProjectInvoicing.tsx` | ~200 | Live only | Invoice tracking |
| `AuditLog.tsx` | ~180 | Mock only | Audit trail list |

**UX problems:**
- `ProjectDetail.tsx` (2047 lines) is the most critical page in the system. Has 15+ tab sub-sections
  all rendered in a single file. No component extraction. Heavy re-render on tab switch.
- `ProjectNew.tsx` 4-step wizard uses old `ui/PageHeader`. Step indicators are custom inline.
- `AdminApprovals.tsx` has approve/send-back/reject buttons inline with no confirmation modal
  (dangerous if clicked accidentally)
- `WoPnGate.tsx` inline modals are readable but could be cleaner
- `Projects.tsx` has status tabs but no text search input
- `AuditLog.tsx` is mock-only — no live data

**Business gates:** SO approval/routing in `AdminApprovals.tsx`, WO/PN gate in `WoPnGate.tsx`,
QC release gate in `ProjectQcReleaseNoteDetail.tsx`. All must be treated as read-only polish only.

---

### Area 4 — Procurement

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `Procurement.tsx` | ~200 | Mock only | Hub page, links to sub-areas |
| `ProcurementRequests.tsx` | ~320 | Live + Mock | PR list with status tabs |
| `ProcurementRequestNew.tsx` | ~280 | Live only | PR creation form |
| `ProcurementRequestDetail.tsx` | 449 | Live + Mock | PR detail, multi-tab |
| `ProcurementPurchaseOrders.tsx` | ~320 | Live + Mock | PO list |
| `ProcurementPurchaseOrderNew.tsx` | ~300 | Live only | PO creation form |
| `ProcurementPODetail.tsx` | 856 | Live + Mock | PO detail, 6-tab, ETA management, approval, docs |
| `ProcurementSuppliers.tsx` | ~250 | Live + Mock | Supplier list |
| `ProcurementSupplierDetail.tsx` | 629 | Live + Mock | Supplier detail, contact/history |
| `ProcurementEtaHistory.tsx` | 470 | Live + Mock | ETA change log |
| `ProcurementPrItemsWithoutPo.tsx` | ~280 | Live + Mock | Open PR items needing PO |

**UX problems:**
- `Procurement.tsx` is a hub page with icon cards — visually dated, could use modern card grid
- `ProcurementPODetail.tsx` (856 lines) has 6 tabs and ETA management inline — complex but functional
- `ProcurementEtaHistory.tsx` uses a custom inline table not using `data-table.tsx`
- Several pages lack search inputs
- `ProcurementRequestDetail.tsx` has no error state

**Business gates:** PO approval flow in `ProcurementPODetail.tsx` (approve/reject buttons change
`po_status`). Must not be changed.

---

### Area 5 — Store / Warehouse

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `Store.tsx` | ~200 | Mock only | Hub page |
| `StoreReceipts.tsx` | ~280 | Live + Mock | Receipt list, status tabs |
| `StoreReceiptNew.tsx` | ~300 | Live only | New receipt form |
| `StoreReceiptDetail.tsx` | ~380 | Live only | Receipt detail, items, QC handoff |
| `StoreInventory.tsx` | ~280 | Live + Mock | Item inventory list |
| `StoreIssuance.tsx` | ~200 | Live + Mock | Issuance tracking |
| `StoreSerials.tsx` | ~240 | Live + Mock | Medical serial numbers |
| `StoreUnallocated.tsx` | ~180 | Live + Mock | Unallocated items |
| `StoreQCHandoff.tsx` | ~200 | Live + Mock | QC handoff queue |
| `MaterialCustody.tsx` | ~200 | Live + Mock | Custody list |
| `CustodyNew.tsx` | 395 | Live only | Custody creation form |
| `CustodyDetail.tsx` | ~320 | Live only | Custody detail |
| `StoreVehicleReceiving.tsx` | ~250 | Live + Mock | Vehicle receiving list |
| `StoreVehicleReceivingNew.tsx` | ~280 | Live only | Vehicle receipt form |
| `StoreVehicleReceivingDetail.tsx` | ~300 | Live only | Vehicle receipt detail |
| `VehicleReceiving.tsx` | ~150 | Mock only | Legacy/duplicate vehicle receiving hub |

**UX problems:**
- `Store.tsx` hub page uses icon cards — same dated pattern as `Procurement.tsx`
- `VehicleReceiving.tsx` appears to be a legacy hub page; unclear if actively used
- Several list pages lack text search
- Loading states use raw `Loader2` spinner instead of skeleton
- `CustodyNew.tsx` uses old `ui/PageHeader`

**Business gates:** Store custody/serial tracking, QC handoff status transitions. Must protect
`StoreReceiptDetail.tsx` QC handoff logic and serial assignment.

---

### Area 6 — Factory / Production

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `Factory.tsx` | ~200 | Mock only | Hub page |
| `FactoryProjects.tsx` | ~280 | Live + Mock | Production project list |
| `FactoryProjectWorkspace.tsx` | 714 | Live + Mock | **Key page** — production workspace per project |
| `FactoryRequirements.tsx` | ~280 | Live + Mock | Requirements list |
| `FactoryRawMaterialRequests.tsx` | ~260 | Live + Mock | RMR list |
| `FactoryRawMaterialRequestNew.tsx` | 461 | Live + Mock | RMR creation, complex form |
| `FactoryMonthlyUpdates.tsx` | ~200 | Live + Mock | Monthly status updates |
| `FactorySendToQC.tsx` | ~200 | Live + Mock | Send to QC action hub |

**UX problems:**
- `Factory.tsx` hub page is a placeholder-like icon card grid — no live data
- `FactoryProjectWorkspace.tsx` (714 lines) uses old `ui/PageHeader` and has dense tab layout
- `FactoryRawMaterialRequestNew.tsx` (461 lines) has complex item-line entry without a proper table
- `FactoryMonthlyUpdates.tsx` lacks error/empty states

**Business gates:** `FactoryProjectWorkspace.tsx` includes production status updates and BOQ
upload path. Status transitions affect downstream QC eligibility. Changes here require extra care.

---

### Area 7 — QC / NCR / Release Notes

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `QC.tsx` | ~250 | Live + Mock | QC hub page |
| `QCWorkQueue.tsx` | 558 | Live + Mock | **Key page** — multi-tab QC queue |
| `QCRework.tsx` | ~200 | Live + Mock | Rework list |
| `MaterialQC.tsx` | ~250 | Live + Mock | Material QC hub |
| `MaterialQcInspections.tsx` | ~280 | Live + Mock | Inspection list |
| `MaterialQcInspectionDetail.tsx` | ~320 | Live + Mock | Inspection detail, document upload |
| `MaterialNcrs.tsx` | ~260 | Live + Mock | NCR list |
| `MaterialNcrDetail.tsx` | ~300 | Live + Mock | NCR detail, disposition |

**UX problems:**
- `QCWorkQueue.tsx` (558 lines) has 6 sub-tabs with different data types — complex and confusing
  on first visit; no empty state per tab
- `QC.tsx` hub page is icon cards without live data
- `QCRework.tsx` has no search and no empty state
- `MaterialNcrDetail.tsx` lacks a clear disposition action flow

**Business gates:** NCR disposition and release gate (release notes). `ProjectQcReleaseNoteDetail.tsx`
contains the QC release gate — approve/reject must not be changed.

---

### Area 8 — Dubai / AFS

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `DubaiAFS.tsx` | ~200 | Live + Mock | AFS hub page |
| `DubaiAfsProjects.tsx` | ~260 | Live + Mock | Dubai project followup list |
| `DubaiAfsProjectDetail.tsx` | ~300 | Live + Mock | Dubai project detail |
| `DubaiAfsEta.tsx` | ~220 | Live + Mock | ETA management |
| `DubaiAfsMissingItems.tsx` | ~200 | Live + Mock | Missing items list |
| `DubaiAfsConditionReports.tsx` | ~220 | Live + Mock | Condition report list |
| `DubaiAfsArrivalReports.tsx` | ~250 | Live + Mock | Arrival report list, document upload |
| `DubaiAfsArrivalReportDetail.tsx` | ~280 | Live + Mock | Arrival report detail |
| `DubaiAfsPredeliveryReports.tsx` | ~240 | Live + Mock | Pre-delivery report list |
| `DubaiAfsPredeliveryReportDetail.tsx` | ~280 | Live + Mock | Pre-delivery detail, document upload |
| `AFSMaterials.tsx` | ~180 | Live only | AFS materials tracking |
| `AFSPnGate.tsx` | ~220 | Live + Mock | AFS PN gate |
| `AFSReadyForDelivery.tsx` | ~220 | Live + Mock | Delivery readiness |

**UX problems:**
- `DubaiAFS.tsx` hub page is icon cards without live data
- AFS area has 13 pages — most are thin list/detail pages that would benefit from polish
- `DubaiAfsConditionReports.tsx` and `DubaiAfsMissingItems.tsx` have no search
- Document upload pages already wired via Phase 1A storage — functional but need visual polish

**Business gates:** `AFSReadyForDelivery.tsx` contains delivery readiness gate. `AFSPnGate.tsx`
contains AFS PN gate. Both must be visual-only changes.

---

### Area 9 — After Sales

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `AfterSales.tsx` | ~250 | Live + Mock | Maintenance request list |
| `AfterSalesMaintenance.tsx` | ~250 | Live + Mock | Maintenance list view |
| `AfterSalesMaintenanceDetail.tsx` | ~320 | Live + Mock | Maintenance detail |
| `AfterSalesMaintenanceNew.tsx` | ~280 | Live + Mock | New maintenance form, old `ui/PageHeader` |

**UX problems:**
- After Sales area is relatively thin — 4 pages, all with similar patterns
- `AfterSalesMaintenanceNew.tsx` uses old `ui/PageHeader`
- Priority/status badges are consistent but could be tightened with new Badge styles
- No search in `AfterSalesMaintenance.tsx`

---

### Area 10 — Operations Control Tower

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `ControlTower.tsx` | 616 | Live + Mock | **Key page** — cross-module exception dashboard |
| `ActionInbox.tsx` | ~250 | Mock only | Inbox task list — fully mock |

**UX problems:**
- `ControlTower.tsx` (616 lines) is a high-value strategic page but has inline KPI cards (custom
  divs), a mixed live/mock signal, and 5 sub-tabs. `DataSourceBadge` shown prominently.
- `ActionInbox.tsx` is fully mock — the live equivalent is the sidebar notification count.
  No loading/error states because it never fetches.
- Both pages need the old custom KPI card pattern replaced with `MetricCard`

---

### Area 11 — Admin

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `AdminDashboard.tsx` | ~250 | Live only | Admin overview, live metrics |
| `AdminUsers.tsx` | 449 | Live + Mock | User management list, role assignment |
| `AdminApprovals.tsx` | 764 | Live + Mock | SO approval queue (shared with Projects area) |
| `AdminAccessRequests.tsx` | ~280 | Live + Mock | Access request list |
| `AdminAccessRequestDetail.tsx` | 410 | Live only | Access request detail, approve/deny |
| `AdminNotificationRules.tsx` | ~220 | Mock only | Notification rule management |
| `AdminReportSubscriptions.tsx` | ~240 | Live + Mock | Report subscription list |
| `AdminReportSubscriptionDetail.tsx` | ~260 | Live + Mock | Subscription detail |
| `Settings.tsx` | 695 | Live only | User profile/settings |
| `NotificationSettings.tsx` | ~200 | Live + Mock | Notification preferences |
| `Notifications.tsx` | ~200 | Live + Mock | Notification list |
| `AuditLog.tsx` | ~180 | Mock only | System audit trail |
| `Templates.tsx` | ~240 | Live + Mock | Document template list |
| `TemplateNew.tsx` | ~200 | Live only | Template creation |
| `TemplateDetail.tsx` | ~280 | Live only | Template detail |
| `TemplateGenerate.tsx` | ~220 | Live only | Generate from template |
| `TemplateApprovals.tsx` | ~200 | Live + Mock | Template approval queue |
| `GeneratedDocuments.tsx` | ~200 | Live + Mock | Generated document list |
| `GeneratedDocumentDetail.tsx` | ~220 | Live only | Document detail |

**UX problems:**
- `AdminUsers.tsx` has a complex inline `AssignRoleModal` — role change is permanent but has no
  confirmation step
- `AdminNotificationRules.tsx` and `AuditLog.tsx` are mock-only
- `Settings.tsx` (695 lines) is the profile/preferences page — functional but dense
- `TemplateApprovals.tsx` has no loading state
- `AdminAccessRequestDetail.tsx` uses old `ui/PageHeader`

---

### Area 12 — Viewer / Management

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `ManagementDashboard.tsx` | ~250 | Live only | Management KPI view |
| `Dashboard.tsx` | 534 | Live + Mock | Main role-aware dashboard |

**UX problems:**
- `Dashboard.tsx` (534 lines) builds its own inline KPI cards with custom border colors — does not
  use `MetricCard`. Has role-specific quick-access cards that are manually constructed.
- `ManagementDashboard.tsx` has a live KPI strip using hardcoded fallback values
- Both pages could benefit substantially from `MetricCard` adoption

---

### Area 13 — Reports

| Page | Lines | Data | Key Issues |
|---|---|---|---|
| `Reports.tsx` | ~180 | Static | Report navigation hub — simple card grid |
| `ReportsSales.tsx` | 397 | Live + Mock | Sales pipeline report |
| `ReportsProjects.tsx` | ~280 | Mock only | Projects report |
| `ReportsFactory.tsx` | 505 | Live + Mock | Factory performance report |
| `ReportsQC.tsx` | 578 | Live + Mock | QC metrics report |
| `ReportsAFS.tsx` | 424 | Live + Mock | AFS performance report |
| `ReportsProcurement.tsx` | 540 | Mock only | Procurement report |
| `ReportsStore.tsx` | 766 | Mock only | Store / warehouse report |
| `ReportsSuppliers.tsx` | ~250 | Mock only | Supplier report |
| `ReportsExecutive.tsx` | ~300 | Live + Mock | Executive summary |
| `ReportsCapa.tsx` | ~200 | Mock only | CAPA report |
| `ReportsSLA.tsx` | ~250 | Mock only | SLA tracking report |
| `ReportsIssues.tsx` | ~220 | Mock only | Open issues report |
| `ReportsHealthScores.tsx` | ~230 | Mock only | Project health scores |
| `ReportsDataQuality.tsx` | ~200 | Mock only | Data quality report |

**UX problems:**
- Most report pages are mock-only (9 of 15) — live data wiring is a future task, not a UX task
- Report pages all have tab patterns but inconsistent empty/loading states
- `ReportsStore.tsx` (766 lines) is the largest report page — very dense
- `Reports.tsx` hub card grid could use the new card styling but is otherwise clean
- No export functionality in most report pages (a few have `ReportExportBar`)

---

## 4. Page Scoring Matrix

Scoring 1–5 per dimension (higher = more attention needed):

| Page / Area | Daily Use | User Confusion | Business Criticality | Impl Complexity | Regression Risk | Mock/Live Gap | Visual Gap | **Priority Score** |
|---|---|---|---|---|---|---|---|---|
| **Dashboard** | 5 | 3 | 4 | 3 | 2 | 3 | 4 | **24** |
| **ControlTower** | 4 | 3 | 5 | 3 | 2 | 3 | 4 | **24** |
| **Sales / Quotations** | 5 | 3 | 5 | 3 | 3 | 3 | 3 | **25** |
| **CoordinatorQueue** | 4 | 3 | 4 | 2 | 2 | 3 | 3 | **21** |
| **Projects list** | 5 | 2 | 4 | 2 | 2 | 2 | 3 | **20** |
| **ProjectDetail** | 5 | 4 | 5 | 5 | 5 | 4 | 3 | **31** — isolated PR |
| **ProjectNew** | 4 | 3 | 4 | 4 | 4 | 2 | 3 | **24** — isolated PR |
| **AdminApprovals** | 5 | 3 | 5 | 3 | 4 | 3 | 3 | **26** — gate page |
| **WoPnGate** | 4 | 3 | 5 | 4 | 5 | 2 | 3 | **26** — gate page |
| **Procurement hub + list** | 4 | 2 | 4 | 2 | 2 | 3 | 3 | **20** |
| **ProcurementPODetail** | 4 | 3 | 4 | 4 | 4 | 3 | 3 | **25** |
| **ProcurementSupplierDetail** | 3 | 2 | 3 | 3 | 2 | 2 | 3 | **18** |
| **Store hub + receipts** | 4 | 3 | 4 | 3 | 3 | 3 | 3 | **23** |
| **StoreReceiptDetail** | 4 | 3 | 4 | 3 | 3 | 2 | 3 | **22** |
| **FactoryProjectWorkspace** | 5 | 4 | 5 | 4 | 4 | 3 | 3 | **28** — isolated PR |
| **FactoryRawMaterialRequestNew** | 3 | 3 | 3 | 3 | 3 | 2 | 3 | **20** |
| **QCWorkQueue** | 5 | 4 | 5 | 3 | 4 | 3 | 3 | **27** |
| **MaterialNcrDetail** | 3 | 3 | 4 | 3 | 3 | 2 | 3 | **21** |
| **ProjectQcReleaseNoteDetail** | 3 | 2 | 5 | 3 | 5 | 2 | 2 | **22** — gate page |
| **DubaiAFS area** | 3 | 3 | 4 | 2 | 2 | 3 | 3 | **20** |
| **AfterSales area** | 3 | 2 | 3 | 2 | 2 | 2 | 3 | **17** |
| **AdminUsers** | 3 | 2 | 4 | 2 | 2 | 2 | 3 | **18** |
| **Settings** | 2 | 1 | 2 | 2 | 2 | 1 | 2 | **12** |
| **Reports hub pages** | 2 | 1 | 3 | 2 | 1 | 4 | 3 | **16** |

**Priority classification:**
- **P0 Critical** (score ≥ 28, isolated PR required): ProjectDetail, FactoryProjectWorkspace
- **P1 High** (score 24–27): Sales/Quotations, Dashboard, ControlTower, AdminApprovals, WoPnGate, QCWorkQueue, ProcurementPODetail
- **P2 Medium** (score 18–23): Projects list, Store area, Procurement list, CoordinatorQueue, MaterialNcr, DubaiAFS, StoreReceiptDetail
- **P3 Later** (score < 18): AfterSales, AdminUsers, Settings, Reports, AuditLog

---

## 5. Prioritized Improvement Backlog

### P1 — High Priority

| ID | Area | Page(s) | Improvement Type | Effort | Notes |
|---|---|---|---|---|---|
| B-01 | Commercial | Sales.tsx | Visual polish — replace inline KPI divs with MetricCard | Medium | Do not touch quotation conversion |
| B-02 | Commercial | Quotations.tsx | Visual polish — add search input, use DataTableShell | Low | No business logic change |
| B-03 | Commercial | QuotationNew/Detail | Visual polish — migrate to `common/page-header` | Low | Do not change form logic or status gates |
| B-04 | Coordinator | SalesCoordinator / CoordinatorQueue | Visual polish — MetricCard KPIs, clean DataSourceBadge | Medium | No queue logic change |
| B-05 | Dashboard | Dashboard.tsx | Visual polish — MetricCard, role-aware cards tightened | Medium | Do not change role filtering |
| B-06 | Control Tower | ControlTower.tsx | Visual polish — MetricCard, exception cards, layout | Medium | Do not change live data fetch |
| B-07 | Projects | Projects.tsx | Visual polish — add search, consistent status tabs | Low | No business logic |
| B-08 | QC | QCWorkQueue.tsx | Visual polish — empty states per tab, better card layout | Medium | Do not change QC gate logic |
| B-09 | Procurement | Procurement.tsx hub | Visual polish — modern section cards instead of icon grid | Low | Static navigation only |
| B-10 | Store | Store.tsx hub | Visual polish — modern section cards instead of icon grid | Low | Static navigation only |

### P2 — Medium Priority

| ID | Area | Page(s) | Improvement Type | Effort | Notes |
|---|---|---|---|---|---|
| B-11 | Projects | AdminApprovals.tsx | Visual polish — better card layout, add confirmation for approve/reject | Medium | Gate logic read-only |
| B-12 | Projects | WoPnGate.tsx | Visual polish — cleaner modal, better filter UI | Medium | Gate logic read-only |
| B-13 | Procurement | ProcurementRequests/PODetail | Visual polish — loading/error states, better tabs | Medium | PO approval read-only |
| B-14 | Store | StoreReceipts/Detail | Visual polish — loading/error states, item table | Medium | QC handoff logic read-only |
| B-15 | Factory | Factory.tsx hub | Visual polish — modern section cards | Low | Static navigation only |
| B-16 | Factory | FactoryRequirements/RMR | Visual polish — loading states, search | Medium | No status gate change |
| B-17 | QC | MaterialQcInspections/NCRs | Visual polish — loading/error states, better list | Medium | NCR disposition read-only |
| B-18 | AFS | DubaiAFS hub + lists | Visual polish — search, consistent empty states | Medium | Delivery readiness read-only |
| B-19 | AFS | AfterSales maintenance | Visual polish — migrate old PageHeader, empty states | Low | No workflow change |

### P3 — Later / Deferred

| ID | Area | Improvement Type | Reason to defer |
|---|---|---|---|
| B-20 | All | Live data wiring for mock-only pages | Schema and seed data required |
| B-21 | All | Replace PageLoader with LoadingState skeleton | Cross-cutting, needs separate PR |
| B-22 | ProjectDetail | Component extraction (split 2047-line file) | Highest regression risk in system |
| B-23 | FactoryProjectWorkspace | Component extraction (split 714-line file) | Gate logic embedded |
| B-24 | Admin | AdminNotificationRules live data wiring | Schema dependent |
| B-25 | Reports | Live data wiring for 9 mock-only report pages | Schema and aggregation queries required |
| B-26 | Performance | React Query / pagination / lazy data loading | Step 19.9 |
| B-27 | Components | Consolidate duplicate components (2 Badge, 2 Card, 2 PageHeader, 2 EmptyState) | Step 19.10 |

---

## 6. Recommended Step-by-Step Roadmap

### Step 19.3 — Commercial and Sales Coordinator Pages UX Improvement
**PR scope:** `Sales.tsx`, `Quotations.tsx`, `SalesCoordinator.tsx`, `CoordinatorQueue.tsx`,
`HotProjects.tsx`, `HotProjectNew.tsx`, `HotProjectDetail.tsx`
**Changes:** MetricCard adoption for KPI strips; add search to list pages; migrate old `ui/PageHeader`
to `common/page-header`; consistent EmptyState; remove inline error `<p>` tags → ErrorState
**Must protect:** `Sales.tsx` quotation-to-SO gate, `SalesCoordinator.tsx` routing logic
**Files NOT to touch:** `QuotationNew.tsx`, `QuotationDetail.tsx` (R-001 gate — needs its own PR)
**Effort:** Medium (8–10 files)

---

### Step 19.4 — Projects / Sales Orders Experience Improvement
**PR scope:** `Projects.tsx`, `AdminApprovals.tsx`, `WoPnGate.tsx`, `ProjectQcFindings.tsx`,
`ProjectQcReleaseNotes.tsx`, `ProjectInvoicing.tsx`, `AuditLog.tsx` (mock-label only)
**Excluded from this PR:** `ProjectDetail.tsx`, `ProjectNew.tsx` — isolated PRs required
**Changes:** Search on Projects list; visual card layout for AdminApprovals; clean confirmation
display for approval actions (visual only — no logic); WoPnGate filter polish
**Must protect:** SO approval/routing gate in `AdminApprovals.tsx`, WO/PN gate in `WoPnGate.tsx`,
QC release gate in `ProjectQcReleaseNoteDetail.tsx`
**Effort:** Medium (7–9 files)

---

### Step 19.4a — ProjectDetail Visual Polish (isolated)
**PR scope:** `ProjectDetail.tsx` ONLY
**Changes:** Visual-only improvements — tab layout polish, badge consistency, loading state,
card spacing. No extraction of sub-components. No business logic change.
**Must protect:** Approval/routing logic, ExecutionReference gate, all role-gated tab rendering,
DocumentPanel upload logic, all 15 data subsections
**Effort:** High caution (1 file, 2047 lines)

---

### Step 19.5 — Procurement and Store UX Improvement
**PR scope:** `Procurement.tsx`, `ProcurementRequests.tsx`, `ProcurementPurchaseOrders.tsx`,
`ProcurementSuppliers.tsx`, `ProcurementEtaHistory.tsx`, `ProcurementPrItemsWithoutPo.tsx`,
`Store.tsx`, `StoreReceipts.tsx`, `StoreInventory.tsx`, `StoreIssuance.tsx`, `StoreSerials.tsx`,
`StoreUnallocated.tsx`, `StoreQCHandoff.tsx`, `StoreVehicleReceiving.tsx`
**Changes:** Hub page modernization (section cards vs icon grid); search inputs on list pages;
loading/error states; consistent empty states; old `ui/PageHeader` migration
**Must protect:** PO approval logic in `ProcurementPODetail.tsx` (excluded from this PR);
Store custody/serial tracking; QC handoff transitions
**Excluded:** `ProcurementPODetail.tsx`, `ProcurementRequestDetail.tsx`, `StoreReceiptDetail.tsx`,
`CustodyDetail.tsx`, `CustodyNew.tsx` — detail pages with embedded business logic, separate PR
**Effort:** High (14 files, but mostly visual)

---

### Step 19.6 — Factory and QC UX Improvement
**PR scope:** `Factory.tsx`, `FactoryProjects.tsx`, `FactoryRequirements.tsx`,
`FactoryRawMaterialRequests.tsx`, `FactoryMonthlyUpdates.tsx`, `FactorySendToQC.tsx`,
`QC.tsx`, `QCWorkQueue.tsx`, `QCRework.tsx`, `MaterialQC.tsx`,
`MaterialQcInspections.tsx`, `MaterialNcrs.tsx`
**Changes:** Hub page modernization; empty states per tab in QCWorkQueue; loading states;
search inputs; better status badge layout
**Must protect:** `FactoryProjectWorkspace.tsx` excluded (isolated PR); `FactoryRawMaterialRequestNew.tsx`
excluded (complex form); NCR disposition logic in `MaterialNcrDetail.tsx` excluded;
QC release gate in `ProjectQcReleaseNoteDetail.tsx` excluded
**Effort:** High (12 files)

---

### Step 19.7 — AFS and After Sales UX Improvement
**PR scope:** `DubaiAFS.tsx`, `DubaiAfsProjects.tsx`, `DubaiAfsProjectDetail.tsx`,
`DubaiAfsEta.tsx`, `DubaiAfsMissingItems.tsx`, `DubaiAfsConditionReports.tsx`,
`DubaiAfsArrivalReports.tsx`, `DubaiAfsArrivalReportDetail.tsx`,
`DubaiAfsPredeliveryReports.tsx`, `DubaiAfsPredeliveryReportDetail.tsx`,
`AFSMaterials.tsx`, `AFSPnGate.tsx`, `AFSReadyForDelivery.tsx`,
`AfterSales.tsx`, `AfterSalesMaintenance.tsx`, `AfterSalesMaintenanceDetail.tsx`, `AfterSalesMaintenanceNew.tsx`
**Changes:** Consistent empty/loading states; search on list pages; migrate old `ui/PageHeader`;
document upload UI visual polish (storage already wired)
**Must protect:** `AFSReadyForDelivery.tsx` delivery readiness gate; `AFSPnGate.tsx` PN gate logic
**Effort:** High (17 files, mostly visual polish)

---

### Step 19.8 — Reports, Control Tower, Dashboard, Admin, and Viewer UX Improvement
**PR scope:** `Dashboard.tsx`, `ControlTower.tsx`, `ActionInbox.tsx`, `ManagementDashboard.tsx`,
`Reports.tsx`, `ReportsSales.tsx`, `ReportsFactory.tsx`, `ReportsQC.tsx`, `ReportsAFS.tsx`,
`ReportsExecutive.tsx`, `AdminDashboard.tsx`, `AdminUsers.tsx`, `AdminAccessRequests.tsx`,
`AdminNotificationRules.tsx`, `AdminReportSubscriptions.tsx`, `Settings.tsx`,
`Notifications.tsx`, `NotificationSettings.tsx`, `AuditLog.tsx`,
`Templates.tsx`, `TemplateApprovals.tsx`, `GeneratedDocuments.tsx`
**Changes:** MetricCard adoption in dashboard/control tower; visual polish for report hub cards;
consistent empty/error states; migrate old `ui/PageHeader` where still present;
label mock-only report pages with a `DataSourceBadge("mock")` consistently
**Must protect:** Admin role-assignment logic in `AdminUsers.tsx`; approval logic in `TemplateApprovals.tsx`
**Effort:** High (22 files, mostly visual)

---

### Step 19.9 — Performance and Data Loading Foundation
**PR scope:** `src/hooks/`, `src/lib/`, possibly `src/app/App.tsx`
**Changes:**
- Evaluate React Query (`@tanstack/react-query`) for data fetching standardization
- Replace `PageLoader` skeleton pattern with `LoadingState` component across key pages
- Add pagination to the 3 highest-volume list pages (Projects, ProcurementPurchaseOrders, StoreInventory)
- Audit and reduce excessive re-renders in tabbed detail pages
**Must protect:** All business logic; all Supabase query semantics
**Dependencies:** None — additive only
**Effort:** Very High (cross-cutting)

---

### Step 19.10 — Functional UX Closure and Regression Audit
**PR scope:** Any remaining inconsistencies discovered after Steps 19.3–19.9
**Changes:**
- Consolidate duplicate components (2× Badge, 2× Card, 2× PageHeader, 2× EmptyState)
  by migrating remaining direct usages to canonical imports
- Final visual regression check across all 13 functional areas
- Update all docs and README
**Must protect:** All page imports — import path changes require TypeScript verification
**Effort:** Medium (targeted fixes)

---

## 7. Pages That Must Not Be Touched Without Extra Verification

These pages embed business-critical gate logic. Any change to them must be preceded by a
dedicated gate audit and must touch zero business logic:

| Page | Gate / Risk | Required Pre-check |
|---|---|---|
| `QuotationNew.tsx` | R-001 two-step submission gate | Quotation gate audit |
| `QuotationDetail.tsx` | Status transition guard, coordinator routing | Quotation gate audit |
| `AdminApprovals.tsx` | SO approve/send-back/reject | SO approval audit |
| `ProjectNew.tsx` | SO creation 4-step wizard | Full form audit |
| `ProjectDetail.tsx` | Multi-gate (approval, WO, procurement, QC, AFS tabs) | Full tab audit |
| `WoPnGate.tsx` | WO gate + PN gate (both) | Execution gate audit |
| `ProcurementPODetail.tsx` | PO approval (approve/reject changes `po_status`) | PO gate audit |
| `FactoryProjectWorkspace.tsx` | Production status, BOQ upload path, Send-to-QC | Factory gate audit |
| `StoreReceiptDetail.tsx` | QC handoff status transition | Store gate audit |
| `ProjectQcReleaseNoteDetail.tsx` | QC release gate | QC release audit |
| `AFSReadyForDelivery.tsx` | Delivery readiness gate | AFS gate audit |
| `AFSPnGate.tsx` | AFS PN gate | AFS gate audit |

---

## 8. Known Business Gates to Protect

Every future PR in steps 19.3–19.10 must include an explicit confirmation that none of the
following gates were modified:

| Gate | File(s) | Protection Rule |
|---|---|---|
| SO approval/routing | `AdminApprovals.tsx`, `ProjectDetail.tsx` | No change to approve/send-back/reject logic |
| Quotation conversion to SO/Hot | `QuotationDetail.tsx`, `Sales.tsx` | No change to conversion trigger |
| PO approval (approve/reject) | `ProcurementPODetail.tsx` | No change to `po_status` write logic |
| WO gate | `WoPnGate.tsx`, `lib/executionGate.ts` | No change to WO reference creation logic |
| PN gate | `WoPnGate.tsx`, `lib/executionGate.ts` | No change to PN reference creation logic |
| Store QC handoff | `StoreReceiptDetail.tsx`, `StoreQCHandoff.tsx` | No change to `status` field writes |
| Store serial assignment | `StoreSerials.tsx`, `CustodyNew.tsx` | No change to serial tracking logic |
| QC NCR disposition | `MaterialNcrDetail.tsx` | No change to NCR status transition |
| QC release gate | `ProjectQcReleaseNoteDetail.tsx` | No change to release approval logic |
| AFS delivery readiness | `AFSReadyForDelivery.tsx` | No change to readiness checks |
| AFS PN gate | `AFSPnGate.tsx` | No change to AFS PN logic |

---

## 9. Schema / Storage Dependencies

Items requiring schema or storage work before UX improvements can be completed:

| Area | Dependency | Status |
|---|---|---|
| Document upload — PO | `procurement-documents` bucket, `purchase_order_documents` table | **Done** (migration 096) |
| Document upload — AFS arrival | `afs_arrival_documents` table | **Done** (migration 097) |
| Document upload — AFS missing items | `afs_missing_item_attachments` table | **Done** (migration 097) |
| Document upload — QC inspections | `file_size`, `mime_type` columns on `qc_inspection_documents` | **Done** (migration 098) |
| AFS missing item evidence UI | Detail page not yet built | Deferred (Phase 1A note) |
| AdminNotificationRules | No live table; fully mock | Schema needed before live wiring |
| AuditLog | No live table; fully mock | Schema needed before live wiring |
| ActionInbox | No live table; roles drive mock tasks | Schema or event-driven approach needed |
| Reports (9 mock-only) | No aggregation queries | Data warehouse or materialized views needed |

---

## 10. Performance Opportunities

Identified in Step 19.9 scope (do not start now):

| Opportunity | Impact | Pages |
|---|---|---|
| React Query for data fetching | Eliminates manual loading state boilerplate | All live data pages |
| Table pagination | Prevents large DOM renders | Projects, ProcurementPOs, StoreReceipts, MaterialQcInspections |
| Memo/callback stabilization | Reduces re-render on tab switch | ProjectDetail, QCWorkQueue, ProcurementPODetail |
| Virtual scrolling | Long lists with 100+ rows | StoreInventory, StoreSerials, AuditLog (when live) |
| Image/document lazy loading | Reduces initial payload | Document panels with signed URLs |
| `Suspense` boundaries per tab | Deferred tab content | ProjectDetail, FactoryProjectWorkspace |

---

## 11. Design / Component Consolidation Opportunities

Identified for Step 19.10 (do not start now):

| Duplication | Canonical Target | Pages Affected |
|---|---|---|
| `ui/PageHeader.tsx` vs `common/page-header.tsx` | `common/page-header.tsx` | 15 pages still use old `ui/PageHeader` |
| `ui/Badge.tsx` vs `primitives/badge.tsx` | `ui/Badge.tsx` (domain-semantic) | ~8 pages mix both |
| `ui/Card.tsx` vs `primitives/card.tsx` | `primitives/card.tsx` (via SectionCard) | Most pages use `ui/Card.tsx` |
| `ui/EmptyState.tsx` vs `feedback/empty-state.tsx` | `feedback/empty-state.tsx` | ~30 pages use `ui/EmptyState.tsx` |
| `ui/Button.tsx` vs `primitives/button.tsx` | `ui/Button.tsx` (domain-semantic) | All pages use `ui/Button.tsx`; primitives used internally |
| Inline KPI card divs | `common/metric-card.tsx` | Dashboard, ControlTower, Sales, SalesCoordinator |
| Raw `<Loader2>` spinner | `feedback/loading-state.tsx` | 42 pages use `PageLoader`; 0 use `LoadingState` |
| Raw `<p className="text-red-...">` error | `feedback/error-state.tsx` | ~25 pages |

---

## 12. Recommended Next PR

**Step 19.3 — Commercial and Sales Coordinator Pages UX Improvement**

**Why first:** Sales and SalesCoordinator are the highest-traffic entry points for commercial
users. These pages have the most visible KPI and list layout issues, involve no direct gate logic
in the targeted files, and will provide the clearest "before vs after" demonstration of the
design system improvement. Lowest regression risk of all P1 items.

**Scope (8 files):**
- `src/pages/Sales.tsx`
- `src/pages/Quotations.tsx`
- `src/pages/SalesCoordinator.tsx`
- `src/pages/CoordinatorQueue.tsx`
- `src/pages/HotProjects.tsx`
- `src/pages/HotProjectNew.tsx`
- `src/pages/HotProjectDetail.tsx`
- `src/pages/Receivables.tsx`

**Do not include in Step 19.3:**
- `QuotationNew.tsx`, `QuotationDetail.tsx` (gate pages — plan their own audit PR)
- Any page with embedded approval or status-transition logic

---

## 13. What Was Not Changed

This step is documentation-only. The following were not modified:

- No page files in `src/pages/`
- No routes in `src/app/App.tsx`
- No navigation data in `src/data/navigation.ts`
- No role matrix in `src/lib/roleMatrix.ts`
- No route guards in `src/components/routing/`
- No business logic in `src/lib/`
- No types in `src/types/`
- No Supabase queries
- No migrations in `supabase/migrations/`
- No component files in `src/components/`
- No configuration files
- No tests

---

## 14. Appendix — Pages by Data Mode

### Live-only pages (Supabase, no mock)
AFSMaterials, AdminAccessRequestDetail, AdminDashboard, GeneratedDocumentDetail,
HotProjectDetail, HotProjectNew, HotProjects, Login, ManagementDashboard,
ProcurementPurchaseOrderNew, ProcurementRequestNew, ProjectInvoicing, ProjectNew,
QuotationNew, Receivables, RequestAccess, Settings, StoreReceiptNew,
StoreVehicleReceivingNew, TemplateDetail, TemplateGenerate, TemplateNew, WoPnGate

### Hybrid pages (live + mock fallback)
All remaining functional pages (majority of the system)

### Mock-only pages (no Supabase calls)
ActionInbox, AdminNotificationRules, AdminReportSubscriptionDetail, AuditLog,
NotFound, PlaceholderPage, Reports, ReportsProcurement, ReportsProjects,
ReportsStore, ReportsSuppliers, VehicleReceiving

---

*Document created: 2026-06-21*
*Branch: docs/step-19-2-functional-pages-ux-roadmap*
*Step 19.1 SHA: b4a38a5 (PR #126, merged)*
