# 02 — Page & Route Inventory

**Total pages:** ~110 page components across all modules.
**Route protection:** All routes inside `AppLayout` are wrapped in `ProtectedRoute`. Most are also wrapped in `RequireRole`.

Legend — Status: ✅ Complete | ⚠️ Partial | 🔴 Mock only | ❓ Unclear

---

## Public Routes

| Path | Component | Status | Notes |
|------|-----------|--------|-------|
| `/login` | Login | ✅ | Supabase signIn + dev-mode fallback |
| `/request-access` | RequestAccess | ✅ | Saves to `access_requests` table |

---

## Dashboard & Inbox

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/` | RootRedirect → Dashboard or Sales | All | Foundation | ⚠️ | sales_user redirected to /sales |
| `/inbox` | ActionInbox | All | Foundation | 🔴 | Mock tasks only; not wired to live SLA events |

---

## Quotation Module

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/quotations` | Quotations | All | Quotation | ⚠️ | List page; live query needed |
| `/quotations/new` | QuotationNew | All | Quotation | ✅ | Wizard stepper; spec-file gate enforced |
| `/quotations/:id` | QuotationDetail | All | Quotation | ⚠️ | Detail page; coordinator return gate needs verification |
| `/sales` | Sales | sales_user | Sales Workspace | 🔴 | Mock data; not fully wired |
| `/sales-coordinator` | SalesCoordinator | sales_coordinator, ops_mgr | Sales Coordinator | ⚠️ | Partially wired |
| `/hot-projects` | HotProjects | admin,ops,sales,coord,viewer | Hot Projects | ⚠️ | List page |
| `/hot-projects/new` | HotProjectNew | admin,ops,sales | Hot Projects | ⚠️ | Create form |
| `/hot-projects/:id` | HotProjectDetail | admin,ops,sales,coord,viewer | Hot Projects | ⚠️ | Detail view |

---

## Projects / SO Module

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/projects` | Projects | All | SO Registration | ⚠️ | List exists; filtering limited |
| `/projects/new` | ProjectNew | All | SO Registration | ✅ | Multi-step form; vehicle lines included |
| `/projects/:id` | ProjectDetail | All | SO Registration | ✅ | Richest page; WO/PN gate status visible |
| `/projects/:id/invoicing` | ProjectInvoicing | admin,ops,sales,coord,viewer | Invoicing | ⚠️ | Invoicing plan exists; milestone tracking partial |
| `/admin-approvals` | AdminApprovals | ops_mgr | Admin Approval | ✅ | Route + Medical enforcement present |
| `/wo-pn-gate` | WoPnGate | ops_mgr, factory | WO/PN Gate | ✅ | Gate logic via executionGate.ts |

---

## Receivables

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/receivables` | Receivables | admin,ops,sales,coord,viewer | Invoicing | ⚠️ | Aging view exists; DB view migration present |

---

## Procurement Module

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/procurement` | Procurement | proc, ops | Procurement | ⚠️ | Dashboard/hub page |
| `/procurement/requests` | ProcurementRequests | proc, ops | Procurement | ⚠️ | List |
| `/procurement/requests/:id` | ProcurementRequestDetail | proc, ops | Procurement | ⚠️ | Detail |
| `/procurement/purchase-orders` | ProcurementPurchaseOrders | proc, ops | Procurement | ⚠️ | List; approval status visible |
| `/procurement/purchase-orders/:id` | ProcurementPODetail | proc, ops | Procurement | ✅ | PO approval flow wired; dual RLS+trigger |
| `/procurement/suppliers` | ProcurementSuppliers | proc, ops | Approved Suppliers | ⚠️ | List; status badges present |
| `/procurement/suppliers/:id` | ProcurementSupplierDetail | proc, ops | Approved Suppliers | ⚠️ | Detail |
| `/procurement/eta-history` | ProcurementEtaHistory | proc, ops | Procurement | ⚠️ | ETA change log |

---

## Factory Module

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/factory` | Factory | factory, ops | Saudi Factory | ⚠️ | Hub page |
| `/factory/projects` | FactoryProjects | factory, ops | Saudi Factory | ⚠️ | Filtered to Saudi WO projects |
| `/factory/projects/:id` | FactoryProjectWorkspace | factory, ops | Saudi Factory | ✅ | WO gate enforced; BOQ/BOM/drawing status |
| `/factory/requirements` | FactoryRequirements | factory, ops | Saudi Factory | ⚠️ | Requirements tracking |
| `/factory/raw-material-requests` | FactoryRawMaterialRequests | factory, ops | Raw Material | ⚠️ | List |
| `/factory/raw-material-requests/new` | FactoryRawMaterialRequestNew | factory, ops | Raw Material | ⚠️ | Create; no Excel parser yet |
| `/factory/monthly-updates` | FactoryMonthlyUpdates | factory, ops | Saudi Factory | ⚠️ | Update tracking |
| `/factory/pending-raw-materials` | FactoryRawMaterialRequests | factory, ops | Raw Material | ❓ | Duplicate route — same component as /factory/raw-material-requests |

---

## Store / Warehouse Module

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/store` | Store | store, ops | Store | ⚠️ | Hub page |
| `/store/receipts` | StoreReceipts | store, ops | Material Receiving | ⚠️ | List |
| `/store/receipts/new` | StoreReceiptNew | store, ops | Material Receiving | ⚠️ | Create form |
| `/store/receipts/:id` | StoreReceiptDetail | store, ops | Material Receiving | ⚠️ | Detail; serial tracking status |
| `/store/vehicle-receiving` | StoreVehicleReceiving | store, ops | Vehicle Receiving | ⚠️ | List |
| `/store/vehicle-receiving/new` | StoreVehicleReceivingNew | store, ops | Vehicle Receiving | ⚠️ | Create; chassis required in types |
| `/store/vehicle-receiving/:id` | StoreVehicleReceivingDetail | store, ops | Vehicle Receiving | ⚠️ | Detail |
| `/store/inventory` | StoreInventory | store, ops | Store | ⚠️ | Inventory view |
| `/store/unallocated` | StoreUnallocated | store, ops | Store | ⚠️ | Unallocated materials |
| `/vehicle-receiving` | VehicleReceiving | store, ops | Vehicle Receiving | ❓ | Duplicate route — overlaps /store/vehicle-receiving |
| `/custody` | MaterialCustody | store,factory,afs,ops | Material Custody | ⚠️ | List |
| `/custody/new` | CustodyNew | store,factory,afs,ops | Material Custody | ⚠️ | Create; approval_required logic |
| `/custody/:id` | CustodyDetail | store,factory,afs,ops | Material Custody | ⚠️ | Detail; receiver decision |

---

## Quality Control Module

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/material-qc` | MaterialQC | qc, ops | Material QC | ⚠️ | Hub page |
| `/material-qc/inspections` | MaterialQcInspections | qc, ops | Material QC | ⚠️ | List |
| `/material-qc/inspections/:id` | MaterialQcInspectionDetail | qc, ops | Material QC | ⚠️ | Detail |
| `/material-qc/ncrs` | MaterialNcrs | qc, ops | NCR | ⚠️ | NCR list |
| `/material-qc/ncrs/:id` | MaterialNcrDetail | qc, ops | NCR | ⚠️ | NCR detail; closure evidence |
| `/project-qc` | ProjectQC | qc, ops | Vehicle QC | ⚠️ | Hub page |
| `/project-qc/inspections` | ProjectQcInspections | qc, ops | Vehicle QC | ⚠️ | List |
| `/project-qc/inspections/:id` | ProjectQcInspectionDetail | qc, ops | Vehicle QC | ⚠️ | Detail |
| `/project-qc/findings` | ProjectQcFindings | qc, ops | Vehicle QC / Rework | ⚠️ | Findings list |
| `/project-qc/findings/:id` | ProjectQcFindingDetail | qc, ops | Vehicle QC / Rework | ⚠️ | Finding detail; rework tracking |
| `/project-qc/release-notes` | ProjectQcReleaseNotes | qc, ops | Release Note | ⚠️ | List; `release_status` field exists |
| `/project-qc/release-notes/:id` | ProjectQcReleaseNoteDetail | qc, ops | Release Note | ⚠️ | Detail; DB-level block not verified |

---

## Dubai / AFS Module

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/dubai-afs` | DubaiAFS | afs, ops | Dubai / AFS | ⚠️ | Hub page |
| `/dubai-afs/projects` | DubaiAfsProjects | afs, ops | Dubai Projects | ⚠️ | List |
| `/dubai-afs/projects/:id` | DubaiAfsProjectDetail | afs, ops | Dubai Projects | ⚠️ | Detail; PN gate via executionGate |
| `/dubai-afs/eta` | DubaiAfsEta | afs, ops | Dubai ETA | ⚠️ | ETA tracking |
| `/dubai-afs/arrival-reports` | DubaiAfsArrivalReports | afs, ops | AFS Arrival | ⚠️ | List |
| `/dubai-afs/arrival-reports/:id` | DubaiAfsArrivalReportDetail | afs, ops | AFS Arrival | ⚠️ | Detail |
| `/dubai-afs/missing-items` | DubaiAfsMissingItems | afs, ops | AFS | ⚠️ | Missing items tracking |
| `/dubai-afs/predelivery-reports` | DubaiAfsPredeliveryReports | afs, ops | AFS Pre-delivery | ⚠️ | List |
| `/dubai-afs/predelivery-reports/:id` | DubaiAfsPredeliveryReportDetail | afs, ops | AFS Pre-delivery | ⚠️ | Detail |
| `/dubai-afs/condition-reports` | DubaiAfsConditionReports | afs, ops | AFS Condition | ⚠️ | Condition reports |

---

## After-Sales Maintenance

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/after-sales` | AfterSales | afs, ops | After-Sales | ⚠️ | Hub page |
| `/after-sales/maintenance` | AfterSalesMaintenance | afs, ops | After-Sales | ⚠️ | List |
| `/after-sales/maintenance/new` | AfterSalesMaintenanceNew | afs, ops | After-Sales | ⚠️ | Create form |
| `/after-sales/maintenance/:id` | AfterSalesMaintenanceDetail | afs, ops | After-Sales | ⚠️ | Detail |

---

## Reports

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/reports` | Reports | ops,viewer,proc,factory,store,qc,afs,coord | Reports | 🔴 | Index; likely mock |
| `/reports/executive` | ReportsExecutive | ops, viewer | Reports | 🔴 | Mock |
| `/reports/projects` | ReportsProjects | ops,viewer,coord | Reports | 🔴 | Mock |
| `/reports/sales` | ReportsSales | ops,viewer,sales,coord | Reports | 🔴 | Mock |
| `/reports/procurement` | ReportsProcurement | ops, proc | Reports | 🔴 | Mock |
| `/reports/factory` | ReportsFactory | ops, factory | Reports | 🔴 | Mock |
| `/reports/store` | ReportsStore | ops, store | Reports | 🔴 | Mock |
| `/reports/qc` | ReportsQC | ops, qc | Reports | 🔴 | Mock |
| `/reports/afs` | ReportsAFS | ops, afs | Reports | 🔴 | Mock |
| `/reports/suppliers` | ReportsSuppliers | ops, proc | Reports | 🔴 | Mock |
| `/reports/sla` | ReportsSLA | ops, viewer | Reports | 🔴 | Mock |
| `/reports/data-quality` | ReportsDataQuality | ops, viewer | Reports | 🔴 | Mock |
| `/reports/health-scores` | ReportsHealthScores | ops, viewer | Reports | 🔴 | Mock |
| `/reports/issues` | ReportsIssues | ops,viewer,qc | Reports | 🔴 | Mock |
| `/reports/capa` | ReportsCapa | ops, qc | Reports | 🔴 | Mock |
| `/control-tower` | ControlTower | ops, viewer | Control Tower | 🔴 | Mock only in live mode |

---

## Admin / Settings

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/settings` | Settings | admin | Admin | ⚠️ | Role/system settings |
| `/admin/users` | AdminUsers | admin | Roles & Permissions | ⚠️ | User management |
| `/audit-log` | AuditLog | admin | Timeline / Audit | ⚠️ | Audit log view |
| `/admin/access-requests` | AdminAccessRequests | ops_mgr | Access Requests | ✅ | Wired to Supabase |
| `/admin/access-requests/:id` | AdminAccessRequestDetail | ops_mgr | Access Requests | ✅ | Detail + approve/reject |
| `/admin/notification-rules` | AdminNotificationRules | ops_mgr | Notifications / SLA | ⚠️ | Rule management |
| `/admin/report-subscriptions` | AdminReportSubscriptions | ops_mgr | Reports | ⚠️ | Subscription list |
| `/admin/report-subscriptions/:id` | AdminReportSubscriptionDetail | ops_mgr | Reports | ⚠️ | Detail |

---

## Templates / Documents

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/templates` | Templates | All | Document Engine | ⚠️ | Template list |
| `/templates/new` | TemplateNew | All | Document Engine | ⚠️ | Create |
| `/templates/:id` | TemplateDetail | All | Document Engine | ⚠️ | Detail + generate |
| `/templates/approvals` | TemplateApprovals | ops_mgr | Document Engine | ⚠️ | Approval queue |
| `/templates/generate/:id` | TemplateGenerate | All | Document Engine | ⚠️ | Fill & generate |
| `/templates/generated` | GeneratedDocuments | All | Document Engine | ⚠️ | Generated docs list |
| `/templates/generated/:id` | GeneratedDocumentDetail | All | Document Engine | ⚠️ | Generated doc view |

---

## Notifications

| Path | Component | Roles | Module | Status | Issues |
|------|-----------|-------|--------|--------|--------|
| `/notifications` | Notifications | All | Notifications | ⚠️ | In-app notification list |
| `/notifications/settings` | NotificationSettings | All | Notifications | ⚠️ | User preferences |

---

## Duplicate / Ambiguous Routes

| Issue | Routes | Risk |
|-------|--------|------|
| Duplicate vehicle receiving | `/vehicle-receiving` and `/store/vehicle-receiving` | Medium — confusing navigation |
| Duplicate raw material | `/factory/pending-raw-materials` same component as `/factory/raw-material-requests` | Low — intentional filter? |

---

## Summary Counts

| Category | Count |
|----------|-------|
| Total routes | ~105 |
| ✅ Complete / fully wired | ~12 |
| ⚠️ Partial / partially wired | ~70 |
| 🔴 Mock only in live mode | ~20+ |
| ❓ Unclear / duplicate | ~3 |
