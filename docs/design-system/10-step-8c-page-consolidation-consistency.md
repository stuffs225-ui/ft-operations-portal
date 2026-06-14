# Step 8C — Page Consolidation, Legacy PageHeader Migration, and UX Consistency Pass

## Overview

Step 8C completes the legacy `PageHeader` migration started in Step 8A, fixes a stale navigation route, and standardises module overview page headers across the portal.

---

## Changes Made

### Part A — VehicleReceiving Route Fix

**File:** `src/data/navigation.ts`

The `Vehicle Receiving` sidebar item previously linked to `/vehicle-receiving`, which required a component-level redirect hop through `VehicleReceiving.tsx` → `<Navigate to="/store/vehicle-receiving" replace />`.

**Fix:** Updated the nav item path directly to `/store/vehicle-receiving`. The `VehicleReceiving.tsx` redirect component is retained as a backward-compat fallback for any deep-links.

---

### Part B — Legacy PageHeader Migration

#### Migration Rules

| Legacy (`src/components/ui/PageHeader`) | New (`@/components/common/page-header`) |
|---|---|
| `import { PageHeader } from '../components/ui/PageHeader'` | `import { PageHeader } from '@/components/common/page-header'` |
| `icon={<Icon />}` | Drop — no icon prop (cosmetic drop, per Step 5B) |
| `action={...}` | Rename to `actions={...}` |
| `breadcrumb={[{ label, path }]}` | Rename `path` → `href` |

#### Migrated in Step 8A/8B (prior steps)
- `Dashboard.tsx`, `ActionInbox.tsx`, `Store.tsx`, `AfterSales.tsx`

#### Migrated in Step 8C — Primary overviews
- `Factory.tsx` — two PageHeader usages (unauthorized block + main render), dropped `icon=`
- `Procurement.tsx` — renamed `action=` → `actions=`, dropped `icon=`
- `DubaiAFS.tsx` — import change only

#### Migrated in Step 8C — Module sub-pages (list/index pages)
Dubai / AFS sub-pages:
- `DubaiAfsProjects.tsx`, `DubaiAfsEta.tsx`, `DubaiAfsArrivalReports.tsx`
- `DubaiAfsMissingItems.tsx`, `DubaiAfsPredeliveryReports.tsx`, `DubaiAfsConditionReports.tsx`

Factory sub-pages:
- `FactoryProjects.tsx`, `FactoryRequirements.tsx`, `FactoryRawMaterialRequests.tsx`, `FactoryMonthlyUpdates.tsx`

QC sub-pages:
- `MaterialQC.tsx`, `MaterialQcInspections.tsx`, `ProjectQC.tsx`
- `ProjectQcFindings.tsx`, `ProjectQcInspections.tsx`, `ProjectQcReleaseNotes.tsx`

Store sub-pages:
- `StoreVehicleReceiving.tsx`, `StoreReceipts.tsx`, `StoreInventory.tsx`, `StoreUnallocated.tsx`
- `MaterialCustody.tsx`

After Sales / Dubai AFS:
- `AfterSalesMaintenance.tsx`

Sales & Projects:
- `HotProjects.tsx`, `HotProjectNew.tsx`, `Receivables.tsx`, `ProjectInvoicing.tsx`

Procurement sub-pages:
- `ProcurementEtaHistory.tsx`, `ProcurementPurchaseOrders.tsx`
- `ProcurementRequests.tsx`, `ProcurementSuppliers.tsx`, `ProcurementSupplierDetail.tsx`

Admin & Settings:
- `AdminUsers.tsx`, `AdminNotificationRules.tsx`
- `AdminReportSubscriptions.tsx`, `AdminReportSubscriptionDetail.tsx`
- `Notifications.tsx`, `NotificationSettings.tsx`, `Settings.tsx`
- `ControlTower.tsx`

Templates:
- `Templates.tsx`, `TemplateApprovals.tsx`, `TemplateGenerate.tsx`, `GeneratedDocumentDetail.tsx`

Reports (all 13 sub-pages):
- `ReportsAFS.tsx`, `ReportsCapa.tsx`, `ReportsDataQuality.tsx`, `ReportsExecutive.tsx`
- `ReportsFactory.tsx`, `ReportsHealthScores.tsx`, `ReportsIssues.tsx`, `ReportsProcurement.tsx`
- `ReportsProjects.tsx`, `ReportsQC.tsx`, `ReportsSLA.tsx`, `ReportsSales.tsx`
- `ReportsStore.tsx`, `ReportsSuppliers.tsx`

#### Intentionally deferred (high-risk workflow pages)
These pages contain complex submit/approval/form flows and are left for a dedicated future step:

- `QuotationNew.tsx`, `QuotationDetail.tsx`, `Quotations.tsx`
- `ProjectNew.tsx`, `ProjectDetail.tsx`
- `WoPnGate.tsx`, `AdminApprovals.tsx`
- `ProcurementPODetail.tsx`, `ProcurementRequestDetail.tsx`
- `FactoryProjectWorkspace.tsx`, `FactoryRawMaterialRequestNew.tsx`
- `CustodyDetail.tsx`, `CustodyNew.tsx`
- `StoreReceiptNew.tsx`, `StoreReceiptDetail.tsx`
- `StoreVehicleReceivingNew.tsx`, `StoreVehicleReceivingDetail.tsx`
- `MaterialQcInspectionDetail.tsx`, `MaterialNcrDetail.tsx`
- `DubaiAfsArrivalReportDetail.tsx`, `DubaiAfsProjectDetail.tsx`, `DubaiAfsPredeliveryReportDetail.tsx`
- `AdminAccessRequestDetail.tsx`
- `TemplateNew.tsx`, `TemplateDetail.tsx`
- `ProjectQcFindingDetail.tsx`, `ProjectQcInspectionDetail.tsx`, `ProjectQcReleaseNoteDetail.tsx`
- `AfterSalesMaintenanceNew.tsx`, `AfterSalesMaintenanceDetail.tsx`
- `HotProjectDetail.tsx`
- `Sales.tsx`, `SalesCoordinator.tsx`

---

## Page Consolidation Map

| Route | Status | Notes |
|---|---|---|
| `/vehicle-receiving` | Keep (redirect) | `VehicleReceiving.tsx` redirects to `/store/vehicle-receiving`; nav now points directly |
| `/store/vehicle-receiving` | Live | Canonical route |
| `/control-tower` | Live | Retained as management-only view |
| `/reports/*` | Live | 13 report sub-pages retained, headers migrated |

---

## Constraints Maintained

- No governance rules altered
- No Supabase schema or RLS changes
- No role guards or permissions modified
- No SO/WO/PN/module business logic changed
- No high-risk workflow pages modified
