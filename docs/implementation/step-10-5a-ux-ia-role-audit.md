# Step 10.5A — UX / IA / Role Experience Audit

**Date:** 2026-06-15  
**Branch:** `claude/step-10-5a-ux-audit-d6hp93`  
**Scope:** Documentation-only UX, IA, and Role Experience Audit — no code changes  
**Depends on:** Steps 1–10 (all merged)  
**Author:** Claude Code (claude-sonnet-4-6)

---

## 1. Executive Summary

The FT Operations Portal is a functionally complete (Steps 1–10), governance-enforced, multi-role operational system. Its database and business logic are solid. However, the current **user experience is module-first rather than role-first or task-first**, creating three core problems:

1. **Overcrowded ProjectDetail** — 12 tabs expose all operational modules to all roles equally. A `sales_user` sees Factory, Store, Procurement, QC, Dubai/AFS, and Approval tabs with no role-based filtering.
2. **Generic dashboard** — The same "Operations Control Tower" is shown to every non-sales role, with no "My Work" or role-specific task queue.
3. **Navigation mismatch** — 7 navigation sections with 32 items span all roles. Separators like "OPERATIONS" and "REPORTS & ADMIN" mean nothing to a `factory_user` who only needs one section.

The system's governance gates (WO, PN, PO approval, Release Note, Custody approval) are working correctly and must not be touched. The UX redesign sits entirely at the presentation layer — tab visibility, navigation grouping, dashboard content, and page density — not at the logic layer.

**Recommendation: Proceed to Step 10.5B** — Target IA Blueprint. This audit is complete and provides sufficient evidence to design the new role-based IA.

---

## 2. Current UX Diagnosis

### 2.1 Core Problems

| Problem | Severity | Impact |
|---------|----------|--------|
| ProjectDetail shows 12 tabs to all roles | Critical | Cognitive overload; sales users see factory/QC/store data they don't act on |
| Dashboard is a static module launcher with mock KPIs | High | No "My Work", no pending approvals, no SLA alerts |
| Action Inbox placed under "SALES & QUOTATION" section | High | All 10 roles need an inbox; the placement implies it is sales-only |
| Navigation has 32 items in 7 sections with no role-based grouping | High | `factory_user` sees QUALITY, DUBAI/AFS, MANAGEMENT, SALES sections they cannot access |
| `financialVisibility` in ROLE_CONFIGS never enforced in UI | High | Roles with `financialVisibility: 'none'` may see financial columns |
| `PERMISSION_KEYS` defined but never imported or used anywhere | Medium | Action-level permission checks are all ad-hoc role comparisons |
| Two PageHeader components coexist with different APIs | Medium | Inconsistent visual headers; some pages use legacy `action=` prop |
| Three EmptyState implementations coexist | Medium | Inconsistent empty states across pages |
| Dashboard title is "Operations Control Tower" but nav item is "Home" | Medium | Naming confusion with separate "Control Tower" page |
| Store/QC/Dubai/AFS tabs in ProjectDetail use mock data in live mode | Medium | GAP-03: tabs show data gaps with no clear indicator |

### 2.2 Strategic Assessment

The system has been built **module by module** (Steps 1–10). Each module added a tab to ProjectDetail, a section to the sidebar, and pages to the router. This was the right approach for incremental delivery, but the accumulated result is a module-centric experience that needs a role-based redesign layer.

The redesign does **not** require changing business logic. It requires:
- Tab visibility rules by role in ProjectDetail
- A role-aware sidebar with contextual grouping
- A role-specific dashboard/My Work pattern
- Page density reduction via drawers and summary cards

---

## 3. Current Page / Route Inventory

### 3.1 Full Route Table

| Route | Component | Module/Group | Primary Role(s) | Purpose | Type | Sidebar | Deep-link | Status |
|-------|-----------|-------------|-----------------|---------|------|---------|-----------|--------|
| `/` | Dashboard (RootRedirect) | Control Center | all (excl. sales_user) | Operational overview, module tiles | Management | ✅ (as "Home") | No | Keep; redesign content |
| `/inbox` | ActionInbox | Control Center | all roles | Pending actions/tasks queue | Operations | ✅ (as "Action Inbox") | No | Keep; move to top of nav |
| `/quotations` | Quotations | Sales | sales_user, sales_coordinator, ops_mgr | Quotation list | Management | ✅ | Yes | Keep |
| `/quotations/new` | QuotationNew | Sales | sales_user, ops_mgr, admin | New quotation form | Operations | No | No | Keep |
| `/quotations/:id` | QuotationDetail | Sales | sales_user, sales_coordinator, ops_mgr | Quotation detail/review | Operations | No | Yes | Keep |
| `/sales` | Sales | Sales | sales_user, ops_mgr, admin | Sales workspace — KPIs, project list | Management | ✅ (as "Sales Workspace") | No | Keep; redesign as Sales Home |
| `/sales-coordinator` | SalesCoordinator | Sales | sales_coordinator, ops_mgr | Coordinator queue | Operations | ✅ (as "Sales Coordinator") | No | Keep |
| `/hot-projects` | HotProjects | Sales | sales_user, ops_mgr, admin, viewer | Hot/priority projects list | Management | ✅ | Yes | Keep |
| `/hot-projects/new` | HotProjectNew | Sales | sales_user, ops_mgr, admin | New hot project form | Operations | No | No | Keep |
| `/hot-projects/:id` | HotProjectDetail | Sales | sales_user, ops_mgr, admin, viewer | Hot project detail | Operations | No | Yes | Keep |
| `/projects` | Projects | Projects | all roles | All projects/SO list | Management | ✅ (as "Projects / SO") | Yes | Keep |
| `/projects/new` | ProjectNew | Projects | sales_user, ops_mgr, admin | New SO form | Operations | No | No | Keep; add role guard |
| `/projects/:id` | ProjectDetail | Projects | all roles | Full project detail — 12 tabs | Operations | No | Yes | Redesign — role-based tabs |
| `/projects/:id/invoicing` | ProjectInvoicing | Projects | sales_user, sales_coordinator, ops_mgr, viewer | Invoice milestones | Management | No | Yes | Keep; link from ProjectDetail |
| `/admin-approvals` | AdminApprovals | Projects | ops_mgr, admin | SO approval queue | Operations | ✅ (as "Admin Approvals") | No | Keep |
| `/wo-pn-gate` | WoPnGate | Projects | ops_mgr, admin, factory_user | WO/PN management | Governance | ✅ (as "WO / PN Gate") | No | Keep |
| `/procurement` | Procurement | Operations | procurement_user, ops_mgr | Procurement hub | Management | ✅ | No | Keep |
| `/procurement/requests` | ProcurementRequests | Operations | procurement_user, ops_mgr | PR list | Management | No | Yes | Keep |
| `/procurement/requests/:id` | ProcurementRequestDetail | Operations | procurement_user, ops_mgr | PR detail | Operations | No | Yes | Keep |
| `/procurement/purchase-orders` | ProcurementPurchaseOrders | Operations | procurement_user, ops_mgr | PO list | Management | No | Yes | Keep |
| `/procurement/purchase-orders/:id` | ProcurementPODetail | Operations | procurement_user, ops_mgr | PO detail/approval | Operations | No | Yes | Keep |
| `/procurement/suppliers` | ProcurementSuppliers | Operations | procurement_user, ops_mgr | Supplier list | Management | No | Yes | Keep |
| `/procurement/suppliers/:id` | ProcurementSupplierDetail | Operations | procurement_user, ops_mgr | Supplier detail | Operations | No | Yes | Keep |
| `/procurement/eta-history` | ProcurementEtaHistory | Operations | procurement_user, ops_mgr | ETA history list | Reporting | No | Yes | Keep |
| `/factory` | Factory | Operations | factory_user, ops_mgr | Factory hub | Management | ✅ | No | Keep |
| `/factory/projects` | FactoryProjects | Operations | factory_user, ops_mgr | Projects in factory | Management | No | Yes | Keep |
| `/factory/projects/:id` | FactoryProjectWorkspace | Operations | factory_user, ops_mgr | Per-project workspace | Operations | No | Yes | Keep |
| `/factory/requirements` | FactoryRequirements | Operations | factory_user, ops_mgr | Factory requirements list | Management | No | Yes | Keep |
| `/factory/raw-material-requests` | FactoryRawMaterialRequests | Operations | factory_user, ops_mgr | RMR list | Operations | No | Yes | Keep |
| `/factory/raw-material-requests/new` | FactoryRawMaterialRequestNew | Operations | factory_user, ops_mgr | New RMR form | Operations | No | No | Keep |
| `/factory/monthly-updates` | FactoryMonthlyUpdates | Operations | factory_user, ops_mgr | Monthly production updates | Reporting | No | Yes | Keep |
| `/factory/pending-raw-materials` | FactoryRawMaterialRequests | Operations | factory_user, ops_mgr | Duplicate of RMR list | Management | No | Yes | **Overlapping — investigate merge** |
| `/store` | Store | Operations | store_user, ops_mgr | Store hub | Management | ✅ | No | Keep |
| `/store/receipts` | StoreReceipts | Operations | store_user, ops_mgr | Store receipts list | Operations | No | Yes | Keep |
| `/store/receipts/new` | StoreReceiptNew | Operations | store_user, ops_mgr | New receipt form | Operations | No | No | Keep |
| `/store/receipts/:id` | StoreReceiptDetail | Operations | store_user, ops_mgr | Receipt detail | Operations | No | Yes | Keep |
| `/store/vehicle-receiving` | StoreVehicleReceiving | Operations | store_user, ops_mgr | Vehicle receiving list | Operations | ✅ (as "Vehicle Receiving") | Yes | Keep |
| `/store/vehicle-receiving/new` | StoreVehicleReceivingNew | Operations | store_user, ops_mgr | New vehicle receiving | Operations | No | No | Keep |
| `/store/vehicle-receiving/:id` | StoreVehicleReceivingDetail | Operations | store_user, ops_mgr | Vehicle receiving detail | Operations | No | Yes | Keep |
| `/store/inventory` | StoreInventory | Operations | store_user, ops_mgr | Inventory list | Management | No | Yes | Keep |
| `/store/unallocated` | StoreUnallocated | Operations | store_user, ops_mgr | Unallocated items | Operations | No | Yes | Keep |
| `/custody` | MaterialCustody | Operations | store_user, factory_user, afs_user, ops_mgr | Custody list | Operations | ✅ (as "Material Custody") | Yes | Keep |
| `/custody/new` | CustodyNew | Operations | store_user, factory_user, afs_user, ops_mgr | New custody form | Operations | No | No | Keep |
| `/custody/:id` | CustodyDetail | Operations | store_user, factory_user, afs_user, ops_mgr | Custody detail | Operations | No | Yes | Keep |
| `/vehicle-receiving` | VehicleReceiving | Operations | store_user, ops_mgr | **Redirect to /store/vehicle-receiving** | Support | No | No | **Duplicate — keep as redirect only** |
| `/material-qc` | MaterialQC | Quality | qc_user, ops_mgr | Material QC hub | Management | ✅ | No | Keep |
| `/material-qc/inspections` | MaterialQcInspections | Quality | qc_user, ops_mgr | Inspection list | Operations | No | Yes | Keep |
| `/material-qc/inspections/:id` | MaterialQcInspectionDetail | Quality | qc_user, ops_mgr | Inspection detail | Operations | No | Yes | Keep |
| `/material-qc/ncrs` | MaterialNcrs | Quality | qc_user, ops_mgr | NCR list | Operations | No | Yes | Keep |
| `/material-qc/ncrs/:id` | MaterialNcrDetail | Quality | qc_user, ops_mgr | NCR detail | Operations | No | Yes | Keep |
| `/project-qc` | ProjectQC | Quality | qc_user, ops_mgr | Project QC hub | Management | ✅ (as "Project / Vehicle QC") | No | Keep |
| `/project-qc/inspections` | ProjectQcInspections | Quality | qc_user, ops_mgr | QC inspections list | Operations | No | Yes | Keep |
| `/project-qc/inspections/:id` | ProjectQcInspectionDetail | Quality | qc_user, ops_mgr | QC inspection detail | Operations | No | Yes | Keep |
| `/project-qc/findings` | ProjectQcFindings | Quality | qc_user, ops_mgr | QC findings list | Operations | No | Yes | Keep |
| `/project-qc/findings/:id` | ProjectQcFindingDetail | Quality | qc_user, ops_mgr | QC finding detail | Operations | No | Yes | Keep |
| `/project-qc/release-notes` | ProjectQcReleaseNotes | Quality | qc_user, ops_mgr | Release notes list | Governance | No | Yes | Keep |
| `/project-qc/release-notes/:id` | ProjectQcReleaseNoteDetail | Quality | qc_user, ops_mgr | Release note detail | Governance | No | Yes | Keep |
| `/dubai-afs` | DubaiAFS | Dubai/AFS | afs_user, ops_mgr | Dubai/AFS hub | Management | ✅ | No | Keep |
| `/dubai-afs/projects` | DubaiAfsProjects | Dubai/AFS | afs_user, ops_mgr | Dubai projects list | Management | No | Yes | Keep |
| `/dubai-afs/projects/:id` | DubaiAfsProjectDetail | Dubai/AFS | afs_user, ops_mgr | Dubai project detail | Operations | No | Yes | Keep |
| `/dubai-afs/eta` | DubaiAfsEta | Dubai/AFS | afs_user, ops_mgr | ETA tracking | Operations | No | Yes | Keep |
| `/dubai-afs/arrival-reports` | DubaiAfsArrivalReports | Dubai/AFS | afs_user, ops_mgr | Arrival reports list | Operations | No | Yes | Keep |
| `/dubai-afs/arrival-reports/:id` | DubaiAfsArrivalReportDetail | Dubai/AFS | afs_user, ops_mgr | Arrival report detail | Operations | No | Yes | Keep |
| `/dubai-afs/missing-items` | DubaiAfsMissingItems | Dubai/AFS | afs_user, ops_mgr | Missing items list | Operations | No | Yes | Keep |
| `/dubai-afs/predelivery-reports` | DubaiAfsPredeliveryReports | Dubai/AFS | afs_user, ops_mgr | Pre-delivery reports | Operations | No | Yes | Keep |
| `/dubai-afs/predelivery-reports/:id` | DubaiAfsPredeliveryReportDetail | Dubai/AFS | afs_user, ops_mgr | Pre-delivery report detail | Operations | No | Yes | Keep |
| `/dubai-afs/condition-reports` | DubaiAfsConditionReports | Dubai/AFS | afs_user, ops_mgr | Condition reports | Reporting | No | Yes | Keep |
| `/after-sales` | AfterSales | Dubai/AFS | afs_user, ops_mgr | After-sales hub | Management | ✅ (as "After Sales Maintenance") | No | Keep |
| `/after-sales/maintenance` | AfterSalesMaintenance | Dubai/AFS | afs_user, ops_mgr | Maintenance requests list | Operations | No | Yes | Keep |
| `/after-sales/maintenance/new` | AfterSalesMaintenanceNew | Dubai/AFS | afs_user, ops_mgr | New maintenance request | Operations | No | No | Keep |
| `/after-sales/maintenance/:id` | AfterSalesMaintenanceDetail | Dubai/AFS | afs_user, ops_mgr | Maintenance detail | Operations | No | Yes | Keep |
| `/reports` | Reports | Admin/Reporting | all (excl. sales_user) | Reports hub | Reporting | ✅ | No | Keep |
| `/reports/executive` | ReportsExecutive | Admin/Reporting | ops_mgr, viewer | Executive summary | Reporting | No | Yes | Keep |
| `/reports/projects` | ReportsProjects | Admin/Reporting | ops_mgr, viewer, sales_coordinator | Project reports | Reporting | No | Yes | Keep |
| `/reports/sales` | ReportsSales | Admin/Reporting | ops_mgr, viewer, sales_user, sales_coordinator | Sales metrics | Reporting | No | Yes | Keep |
| `/reports/procurement` | ReportsProcurement | Admin/Reporting | ops_mgr, procurement_user | Procurement metrics | Reporting | No | Yes | Keep |
| `/reports/factory` | ReportsFactory | Admin/Reporting | ops_mgr, factory_user | Factory metrics | Reporting | No | Yes | Keep |
| `/reports/store` | ReportsStore | Admin/Reporting | ops_mgr, store_user | Store metrics | Reporting | No | Yes | Keep |
| `/reports/qc` | ReportsQC | Admin/Reporting | ops_mgr, qc_user | QC metrics | Reporting | No | Yes | Keep |
| `/reports/afs` | ReportsAFS | Admin/Reporting | ops_mgr, afs_user | AFS metrics | Reporting | No | Yes | Keep |
| `/reports/suppliers` | ReportsSuppliers | Admin/Reporting | ops_mgr, procurement_user | Supplier metrics | Reporting | No | Yes | Keep |
| `/reports/sla` | ReportsSLA | Admin/Reporting | ops_mgr, viewer | SLA reports | Reporting | No | Yes | Keep |
| `/reports/data-quality` | ReportsDataQuality | Admin/Reporting | ops_mgr, viewer | Data quality | Admin | No | Yes | Keep |
| `/reports/health-scores` | ReportsHealthScores | Admin/Reporting | ops_mgr, viewer | Project health scores | Reporting | No | Yes | Keep |
| `/reports/issues` | ReportsIssues | Admin/Reporting | ops_mgr, viewer, qc_user | Open issues | Reporting | No | Yes | Keep |
| `/reports/capa` | ReportsCapa | Admin/Reporting | ops_mgr, qc_user | CAPA tracking | Operations | No | Yes | Keep |
| `/receivables` | Receivables | Admin/Reporting | sales_user, sales_coordinator, ops_mgr, viewer | Receivables/aging | Reporting | ✅ | Yes | Keep; consider moving to Sales section |
| `/control-tower` | ControlTower | Admin/Reporting | ops_mgr, viewer | Ops control view | Management | ✅ | No | Keep; distinguish from Dashboard |
| `/templates` | Templates | Admin/Reporting | most roles | Document templates | Operations | ✅ (as "Document Templates") | Yes | Keep |
| `/templates/new` | TemplateNew | Admin/Reporting | admin, ops_mgr | New template | Operations | No | No | Keep |
| `/templates/:id` | TemplateDetail | Admin/Reporting | admin, ops_mgr | Template detail | Operations | No | Yes | Keep |
| `/templates/approvals` | TemplateApprovals | Admin/Reporting | ops_mgr | Template approval queue | Governance | No | Yes | Keep |
| `/templates/generated` | GeneratedDocuments | Admin/Reporting | all | Generated docs list | Operations | No | Yes | Keep |
| `/templates/generated/:id` | GeneratedDocumentDetail | Admin/Reporting | all | Generated doc detail | Operations | No | Yes | Keep |
| `/templates/generate/:id` | TemplateGenerate | Admin/Reporting | all | Generate document | Operations | No | No | Keep |
| `/notifications` | Notifications | Admin/Reporting | all roles | Notifications inbox | Support | ✅ | Yes | Keep |
| `/notifications/settings` | NotificationSettings | Admin/Reporting | all roles | Notification prefs | Support | No | No | Keep |
| `/settings` | Settings | Admin | admin only | System settings | Admin | ✅ | No | Keep |
| `/admin/users` | AdminUsers | Admin | admin only | User management | Admin | ✅ (as "Admin / Users") | Yes | Keep |
| `/admin/access-requests` | AdminAccessRequests | Admin | ops_mgr, admin | Access request queue | Admin | ✅ (as "Access Requests") | Yes | Keep |
| `/admin/access-requests/:id` | AdminAccessRequestDetail | Admin | ops_mgr, admin | Access request detail | Admin | No | Yes | Keep |
| `/admin/notification-rules` | AdminNotificationRules | Admin | ops_mgr, admin | Notification rules | Admin | ✅ (as "Notification Rules") | Yes | Keep |
| `/admin/report-subscriptions` | AdminReportSubscriptions | Admin | ops_mgr, admin | Report subscriptions | Admin | ✅ (as "Report Subscriptions") | Yes | Keep |
| `/admin/report-subscriptions/:id` | AdminReportSubscriptionDetail | Admin | ops_mgr, admin | Subscription detail | Admin | No | Yes | Keep |
| `/audit-log` | AuditLog | Admin | admin only | Audit trail | Governance | ✅ | Yes | Keep |
| `/login` | Login | Auth | public | Login page | Auth | No | No | Keep |
| `/request-access` | RequestAccess | Auth | public | Access request form | Support | No | No | Keep |

**Total routes inventoried: 103**  
**Unique page components: ~98**  
**Sidebar items: 32 (including 7 section separators)**  
**Deep-link accessible pages: ~75**  
**Duplicate/redirect routes: 2** (`/vehicle-receiving`, `/factory/pending-raw-materials`)

---

## 4. Current Navigation Audit

### 4.1 Navigation Groups

| Group Label | Items | Notes |
|-------------|-------|-------|
| CONTROL CENTER | Home, Action Inbox | Good section; but "Home" misleads — is actually "Operations Control Tower" |
| SALES & QUOTATION | Quotation Requests, Sales Workspace, Hot Projects, Sales Coordinator | Reasonable grouping for sales; "Sales Coordinator" is a role-specific tool placed in a shared section |
| PROJECTS | Projects / SO, Admin Approvals, WO/PN Gate | Correct grouping; but Admin Approvals and WO/PN Gate are ops-manager tools, not universal |
| OPERATIONS | Procurement, Factory/Production, Store/Warehouse, Material Custody, Vehicle Receiving | Correct; but Custody and Vehicle Receiving could nest under Store |
| QUALITY | Material QC, Project/Vehicle QC | Correct; clean and focused |
| DUBAI / AFS | Dubai/AFS, After Sales Maintenance | Correct; clean section |
| REPORTS & ADMIN | Receivables, Control Tower, Reports, Document Templates, Notifications, Settings, Admin/Users, Access Requests, Notification Rules, Report Subscriptions, Audit Log | **Overloaded** — 11 items, mixing reporting, admin, governance, and user tools |

### 4.2 Navigation Issues Found

| Issue | Severity | Recommendation |
|-------|----------|---------------|
| "Action Inbox" is in no section (appears before SALES) — actually between CONTROL CENTER and SALES | Medium | Promote into CONTROL CENTER as the second item |
| "Home" nav label → "Operations Control Tower" page title → confusion with separate `/control-tower` "Control Tower" page | High | Rename Dashboard nav item to "Dashboard" or rename ControlTower to "Operations Overview" |
| "REPORTS & ADMIN" is a grab-bag of 11 items — Receivables belongs in Sales section | High | Split into "REPORTING" and "ADMIN & SYSTEM" |
| "Receivables" is in REPORTS & ADMIN but is a Sales tool | Medium | Move to SALES & QUOTATION section |
| "Sales Coordinator" nav item is in SALES & QUOTATION but is role-specific; non-coordinator roles see it filtered out already | Low | Acceptable; sidebar filtering handles this |
| "Vehicle Receiving" duplicates `/store/vehicle-receiving` — Step 8C fixed the nav link, but the section placement is confusing (OPERATIONS, not inside Store sub-section) | Medium | Consider collapsing under Store hub |
| "Material Custody" is standalone in OPERATIONS — is also accessible via Store; role overlap with factory_user and afs_user | Medium | Keep standalone; but add breadcrumb context |
| "Document Templates" is in REPORTS & ADMIN; it is a cross-role operational tool | Low | Move to a new "TOOLS & DOCS" section |
| "Notifications" is in REPORTS & ADMIN; it is a personal utility | Low | Move to bottom of sidebar as always-visible utility |
| Admin-only items (Settings, Admin/Users, Audit Log) are listed alongside reporting items | Medium | Create separate "ADMIN & SYSTEM" section |
| Mobile: sidebar is overlay-based (hamburger); no collapsed icon-only state on desktop | Medium | Add collapsible icon-only sidebar mode for desktop density |
| No badge counts on navigation items (inbox, approvals) — badge field exists in NavItem type but is never populated | High | Connect inbox count and pending approvals count to nav badges |

### 4.3 Navigation Architecture Assessment

**Current architecture type: Module-first and inconsistent.**

- The top two sections (CONTROL CENTER, SALES) are somewhat role-aware.
- PROJECTS through DUBAI/AFS sections are module-first: one section per department module.
- REPORTS & ADMIN is a catch-all that breaks any role-based logic.
- There is no "My Work" or workbench concept — every user sees a module launcher, not their task queue.

**Target architecture: Role-first with task-first entry points.**

- Every role should land on "My Work" (their pending tasks) first.
- Module sections should be secondary — reached when a user needs to look beyond their work queue.
- Admin/system items should be visually separated at the bottom, not mixed with operational content.

### 4.4 Sidebar Visibility by Role (Current State)

| Nav Item | admin | ops_mgr | sales_user | sales_coord | procurement | factory | store | qc | afs | viewer |
|----------|-------|---------|-----------|------------|-------------|---------|-------|-----|-----|--------|
| Home (Dashboard) | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Action Inbox | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Quotation Requests | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Sales Workspace | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Hot Projects | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Sales Coordinator | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Projects / SO | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin Approvals | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| WO / PN Gate | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Procurement | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Factory / Production | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Store / Warehouse | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Material Custody | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Vehicle Receiving | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Material QC | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Project / Vehicle QC | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Dubai / AFS | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| After Sales Maintenance | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Receivables | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Control Tower | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Reports | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Document Templates | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Admin / Users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Access Requests | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Notification Rules | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Report Subscriptions | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit Log | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Observed navigation item count by role:**
- admin: 29 items (all)
- ops_mgr: 24 items
- sales_user: 10 items
- sales_coordinator: 11 items
- procurement_user: 8 items
- factory_user: 9 items
- store_user: 9 items
- qc_user: 8 items
- afs_user: 8 items
- viewer: 11 items

---

## 5. ProjectDetail Tab / Section Audit

### 5.1 Tab Inventory

ProjectDetail.tsx implements **12 tabs** (with Audit tab conditionally hidden from non-admin):

| Tab Key | Label | Icon | Purpose | Data Shown | Actions Available |
|---------|-------|------|---------|------------|------------------|
| `overview` | Overview | FolderOpen | Project snapshot + status cards | Project info, dates, financial (role-gated), WO/PN gate, health score, invoicing link | Add WO/PN reference (ops_mgr, admin, factory_user) |
| `details` | SO Details | Edit2 | Full SO field display | All SO fields including financial (role-gated) | Read-only display |
| `lines` | Vehicle Lines | List | Vehicle line table | Line number, type, description, qty, value (role-gated), status | Read-only |
| `procurement` | Procurement | ShoppingCart | PR and PO summary | PR list with links, PO list with value (role-gated) | Links to /procurement/* |
| `factory` | Factory | Wrench | Factory records summary | Production records, RMR list; or "Dubai route" placeholder | Link to factory workspace |
| `store` | Store | Package | Store activity summary | Store receipts, vehicle receipts, custody records | Read-only (partial data) |
| `qc_release` | QC & Release | FileCheck | QC summary with 5 sub-sections | Material QC, NCRs, Project QC, Findings, Release Notes | Links to /qc/* pages |
| `dubai_afs` | Dubai / AFS | Truck | Dubai/AFS summary | Dubai follow-ups, arrival reports, pre-delivery reports, maintenance | Read-only (mock data in live) |
| `approval` | Approval & Routing | CheckSquare | Approval workflow + routing | ApprovePanel (if submittable), RoutingSummaryCard | Approve/SendBack/Reject (CAN_APPROVE roles only) |
| `timeline` | Timeline | Clock | Project event log | All timeline events in reverse-chrono order | Read-only |
| `audit` | Audit | Shield | Audit log entries | Audit entries for this project | Read-only (admin only) |
| `documents` | Documents | FileText | Project documents | Uploaded document list | Upload (admin, ops_mgr, sales_user) |

### 5.2 Tab-by-Tab Role Analysis

| Tab | Sales Need? | Ops Need? | Dept Need? | Sensitivity | Recommended Treatment |
|-----|------------|-----------|------------|-------------|----------------------|
| **Overview** | ✅ Full access — status, dates, health | ✅ Full access + WO/PN gate | ✅ Read-only status | Low | **Keep as-is; make default for all roles** |
| **SO Details** | ✅ Read-only — their commercial data | ✅ Full access | ⚠️ Partial — no financial | Low-Medium | **Keep; hide financial fields from non-sales/non-ops** |
| **Vehicle Lines** | ✅ Read-only — what was sold | ✅ Full access | ⚠️ Relevant for factory and QC | Low-Medium | **Keep; hide unit/total values from factory/store/qc/afs** |
| **Documents** | ✅ Upload/view | ✅ Full access | ✅ Read-only (department-relevant docs) | Low | **Keep; current upload guard by role is correct** |
| **Procurement** | ❌ Not needed — operational detail | ✅ Full access | ⚠️ procurement_user may want context | Medium | **Summarize as status card for non-procurement roles; full tab for ops_mgr/procurement_user** |
| **Factory** | ❌ Not needed — internal operational | ✅ Full access | ✅ factory_user primary | Medium | **Hide from sales_user; show summary card for ops_mgr; full tab for factory_user** |
| **Store** | ❌ Not needed | ✅ Full access | ✅ store_user primary | Medium | **Hide from sales_user; show summary for ops_mgr; full tab for store_user** |
| **QC & Release** | ⚠️ Delivery readiness only (release note status) | ✅ Full access | ✅ qc_user primary | Medium | **Sales: show only release note status; ops_mgr: full summary; qc_user: full tab** |
| **Dubai / AFS** | ❌ Not needed (unless their project is Dubai) | ✅ Full access | ✅ afs_user primary | Medium | **Conditionally show for Dubai projects only; hide for Saudi projects** |
| **Approval & Routing** | ⚠️ Read-only — see approval status and routing | ✅ Full access (can approve) | ⚠️ Routing summary useful | Low-High | **Keep for all; show RoutingSummaryCard read-only to sales; ApprovePanel only for CAN_APPROVE** |
| **Timeline** | ✅ Read-only project history | ✅ Full access | ✅ Useful for context | Low | **Keep for all roles; no change needed** |
| **Audit** | ❌ Not needed | ❌ Not needed (ops_mgr) | ❌ Not needed | High | **Keep admin-only (already implemented)** |

### 5.3 Current Tab Filtering Logic

From `ProjectDetail.tsx` line 823:
```tsx
TABS.filter((t) => {
  if (t.key === 'audit' && !canAudit) return false;
  return true;
})
```

**Only the Audit tab is currently role-filtered.** All other 11 tabs are visible to all authenticated users, including `sales_user`, `viewer`, `factory_user`, etc.

### 5.4 Tab Count by Role (Current vs. Recommended)

| Role | Current Tabs Visible | Recommended Tabs | Delta |
|------|---------------------|-----------------|-------|
| admin | 12 | 12 | 0 |
| operations_manager | 11 | 11 | 0 |
| sales_user | 11 | 5–6 | -5 to -6 |
| sales_coordinator | 11 | 5–6 | -5 to -6 |
| procurement_user | 11 | 7–8 | -3 to -4 |
| factory_user | 11 | 7–8 | -3 to -4 |
| store_user | 11 | 6–7 | -4 to -5 |
| qc_user | 11 | 6–7 | -4 to -5 |
| afs_user | 11 | 6–7 | -4 to -5 |
| viewer | 11 | 6 | -5 |

---

## 6. Sales User ProjectDetail Access Assessment

### 6.1 What Sales Users Do Daily

Sales users interact with the system to:
1. Check project approval status before calling a customer
2. Verify delivery dates and project progress for customer follow-up
3. Upload commercial documents (Customer PO, contracts)
4. Check invoice milestone status
5. Track payment outstanding amounts (Receivables)
6. Know if there are any blockers that affect delivery commitment

### 6.2 What Sales Users Need in ProjectDetail

| Information Need | Current Tab | Available? | Notes |
|-----------------|-------------|-----------|-------|
| Project status (approved/in production/etc.) | Overview | ✅ | Visible |
| Customer name, SO number, delivery date | Overview + SO Details | ✅ | Visible |
| Manufacturing location (Saudi vs Dubai) | Overview | ✅ | Visible |
| Project health score and open blockers | Overview | ✅ | Visible (mock data) |
| Invoicing plan link | Overview | ✅ | Visible |
| Upload customer PO / contract | Documents | ✅ | Visible |
| Whether the project has a Release Note (delivery readiness) | QC & Release | ⚠️ | Buried in QC tab — sales only needs release note status |
| Approval status and who approved | Approval & Routing | ✅ | Visible (read-only RoutingSummaryCard) |
| Project timeline/history | Timeline | ✅ | Visible |

### 6.3 What Sales Users Do NOT Need in ProjectDetail

| Information | Current Tab | Why Not Needed | Risk if Visible |
|-------------|-------------|---------------|----------------|
| PR numbers and procurement status | Procurement | Internal operational detail; sales cannot act on it | Potential confusion; supplier names/PO values visible with cost column |
| PO to Supplier values | Procurement | Financial exposure — costs visible when `canSeeCost` role check exists but full tab is visible | Medium — `canSeeCost` only hides value column, not the tab itself |
| Factory production records, BOQ/BOM | Factory | Strictly internal operational | Low — but adds noise and complexity |
| Raw material requests | Factory | Internal factory logistics | Low |
| Store receipts and vehicle receiving records | Store | Internal logistics | Low |
| Material custody records | Store | Internal logistics | Low |
| Material QC inspection numbers | QC & Release | QC specifics not commercial | Low |
| NCR details | QC & Release | Internal quality details; may create concern if customer-facing | Medium — NCR open/closed status could alarm sales unnecessarily |
| Dubai/AFS follow-ups, arrival reports | Dubai/AFS | Internal Dubai logistics | Low |
| Pre-delivery condition reports | Dubai/AFS | Internal QC data | Low |

### 6.4 Sales User Recommended ProjectDetail Experience

**Sales ProjectDetail should show these tabs only:**
1. **Overview** — Status, customer info, dates, health score, WO/PN status (read-only), invoicing link
2. **SO Details** — Commercial SO fields (no financial columns they don't have access to)
3. **Vehicle Lines** — What was sold (no unit/total values — quotation_only visibility)
4. **Documents** — Upload commercial docs
5. **Project Status** (new — currently no dedicated tab) — Simplified view showing: Approval status, Routing decisions (which departments are active), Release Note status (can deliver or not), Timeline of key milestones
6. **Timeline** — Project history

**What to remove from sales_user view:**
- Procurement tab (operational detail)
- Factory tab (internal)
- Store tab (internal)
- QC & Release tab (replace with release note status in Project Status tab)
- Dubai/AFS tab (replace with location status in Overview)
- Approval & Routing tab (replace with read-only routing card in Project Status tab)

### 6.5 RLS Alignment for Sales Tab Hiding

Hiding tabs at the UI level does NOT require RLS changes for Overview, SO Details, Vehicle Lines, Timeline, and Documents — these are already accessible to `sales_user` by RLS policy.

For the read-only Approval/Routing summary in a future "Project Status" tab: `pdr_sales_select` (migration 091) already allows `sales_user` to SELECT routing rows for their own projects. No new RLS needed.

**Tabs where RLS already restricts deeper access if URL is navigated directly:**
- `/procurement/requests/:id` — RequireRole: `['procurement_user', 'operations_manager']`
- `/procurement/purchase-orders/:id` — RequireRole: `['procurement_user', 'operations_manager']`
- `/factory/projects/:id` — RequireRole: `['factory_user', 'operations_manager']`
- `/project-qc/*` — RequireRole: `['qc_user', 'operations_manager']`

So hiding these tabs from `sales_user` in ProjectDetail is safe — even if a sales user navigates the deep links shown in the tab tables, the route guard blocks them. The data tabs in ProjectDetail also only load data from tables where RLS already scopes by project and role.

**Finding:** UI tab filtering can be done safely without RLS changes. Document this as a future RLS improvement for defense-in-depth (see Section 15).

---

## 7. Role-by-Role Experience Audit

### 7.1 admin

| Aspect | Current State | Recommendation |
|--------|--------------|---------------|
| Pages visible | All 103 routes | Correct — admin sees everything |
| ProjectDetail tabs | All 12 | Correct |
| Main tasks | User management, audit log, system settings, approvals, all governance | Correct access |
| Daily work | Approve projects, manage users, monitor system health | Add admin-specific dashboard panel: pending user access requests, recent audit events |
| Workbench concept | None — uses same dashboard | Add "Admin Command Center" panel on dashboard with: pending access requests count, audit log alerts, system health |
| Nav simplification | None needed | Minor: separate Admin/System items to bottom section |

### 7.2 operations_manager

| Aspect | Current State | Recommendation |
|--------|--------------|---------------|
| Pages visible | 24 nav items | Too many — REPORTS & ADMIN section is cluttered |
| ProjectDetail tabs | 11 (no Audit) | Correct — full operational view needed |
| Main tasks | Project approval, PO approval, escalation, WO/PN oversight, routing decisions | Correct |
| Daily work | Admin Approvals queue, PO approval queue, WO/PN status monitoring | Dashboard should show: pending approvals count, pending PO approvals, missing WO/PN projects, SLA breach alerts |
| Workbench concept | None | "My Approvals" section on dashboard: pending SO approvals, pending PO approvals, pending custody approvals |
| Nav simplification | Move REPORTS & ADMIN items to better grouping | Keep 24 items but improve section labels |

### 7.3 sales_user

| Aspect | Current State | Recommendation |
|--------|--------------|---------------|
| Pages visible | 10 nav items | Reasonable count; but Receivables is in wrong section |
| ProjectDetail tabs | 11 | **Critical problem** — reduce to 5-6 role-appropriate tabs |
| Main tasks | Create quotations, track hot projects, follow up on SOs, invoicing | Correct access |
| Daily work | Check quotation status, update hot projects, check SO delivery dates | Dashboard: My Quotations pipeline, My Projects status, Receivables outstanding |
| Workbench concept | Sales Workspace (`/sales`) exists but is generic | Convert Sales Workspace to "My Sales Dashboard" with: my quotation pipeline, my projects with status, aging receivables by customer |
| Nav simplification | Move Receivables to SALES section | Yes |
| Root redirect | sales_user is already redirected to /sales instead of Dashboard | Correct — keep this |
| Financial visibility | `quotation_only` in ROLE_CONFIGS — not enforced in ProjectDetail | **Gap** — SO Details tab shows financial fields based on `canSeeMoney` (ops_mgr/admin only), so sales_user correctly does NOT see total_sales_value in SO Details. But the Vehicle Lines tab shows line totals with `canSeeMoney` — correct. Financial visibility is partially enforced. |

### 7.4 sales_coordinator

| Aspect | Current State | Recommendation |
|--------|--------------|---------------|
| Pages visible | 11 nav items | Reasonable |
| ProjectDetail tabs | 11 | Reduce to 5-6 (same as sales_user — coordinators don't need operational depth) |
| Main tasks | Process quotation requests, upload PDFs, enter line values | Correct |
| Daily work | Quotation queue, coordinator workspace | Dashboard: pending quotation submissions, quotations awaiting coordinator action |
| Workbench concept | SalesCoordinator page exists | Convert to focused "Coordinator Workbench" |
| Nav simplification | Consistent with sales_user | Minor improvement |

### 7.5 procurement_user

| Aspect | Current State | Recommendation |
|--------|--------------|---------------|
| Pages visible | 8 nav items (Procurement, Factory via custody, Reports) | Reasonable |
| ProjectDetail tabs | 11 | **Reduce to 7**: Overview, SO Details, Vehicle Lines (no values), Procurement (full), Documents, Approval (read-only), Timeline |
| Main tasks | Create PRs, manage POs, track ETA, manage suppliers | Correct access |
| Daily work | Procurement hub is their primary workspace | Dashboard: My open PRs, pending PO approvals, ETAs due this week, delayed POs |
| Workbench concept | Procurement hub (`/procurement`) serves as workbench | Add actionable KPIs to Procurement hub |
| Nav simplification | Minor — Procurement section is well organized | No change needed |

### 7.6 factory_user

| Aspect | Current State | Recommendation |
|--------|--------------|---------------|
| Pages visible | 9 nav items (Projects, WO/PN Gate, Factory, Custody, Reports) | Reasonable |
| ProjectDetail tabs | 11 | **Reduce to 7**: Overview, Vehicle Lines (no values), Documents, Factory (full), Store (summary only), Approval (routing summary only), Timeline |
| Main tasks | View WO, manage BOQ/BOM, track production, request raw materials | Correct access |
| Daily work | Factory workspace per project | Dashboard: my active projects with WO status, pending raw material requests, production milestones |
| Workbench concept | Factory hub + FactoryProjectWorkspace | Factory hub needs "My Projects in Production" section |
| Nav simplification | WO/PN Gate is visible — correct | Minor |
| Financial visibility | `none` — no cost columns shown | Correct |

### 7.7 store_user

| Aspect | Current State | Recommendation |
|--------|--------------|---------------|
| Pages visible | 9 nav items (Projects, Store, Custody, Vehicle Receiving, Reports) | Reasonable |
| ProjectDetail tabs | 11 | **Reduce to 6**: Overview, Vehicle Lines (no values), Documents, Store (full), Approval (routing summary), Timeline |
| Main tasks | Receive materials/vehicles, issue from store, manage custody | Correct access |
| Daily work | Store hub for receipts and inventory | Dashboard: pending vehicle receipts, pending material receipts, open custody requests |
| Workbench concept | Store hub (`/store`) | Add actionable pending items to Store hub |
| Financial visibility | `none` — no cost columns | Correct |

### 7.8 qc_user

| Aspect | Current State | Recommendation |
|--------|--------------|---------------|
| Pages visible | 8 nav items (Projects, Material QC, Project QC, Reports) | Reasonable |
| ProjectDetail tabs | 11 | **Reduce to 6**: Overview, Vehicle Lines (no values), Documents, QC & Release (full), Approval (routing summary), Timeline |
| Main tasks | Material inspections, project QC, NCRs, release notes | Correct access |
| Daily work | QC hubs as primary workbenches | Dashboard: inspections pending, open NCRs count, findings pending closure, projects blocked from release |
| Workbench concept | MaterialQC and ProjectQC hubs | Add KPI section to QC hub pages |
| Financial visibility | `none` | Correct |

### 7.9 afs_user

| Aspect | Current State | Recommendation |
|--------|--------------|---------------|
| Pages visible | 8 nav items (Projects, Custody, Dubai/AFS, After Sales, Reports) | Reasonable |
| ProjectDetail tabs | 11 | **Reduce to 6**: Overview, Vehicle Lines (no values), Documents, Dubai/AFS (full — only for Dubai projects), Approval (routing summary), Timeline |
| Main tasks | Dubai project follow-up, vehicle arrival, pre-delivery reports, after-sales maintenance | Correct access |
| Daily work | DubaiAFS hub | Dashboard: Dubai projects with PN status, pending arrival reports, open maintenance requests |
| Workbench concept | DubaiAFS hub (`/dubai-afs`) | Add active projects widget |
| Financial visibility | `none` | Correct |

### 7.10 viewer

| Aspect | Current State | Recommendation |
|--------|--------------|---------------|
| Pages visible | 11 nav items (broad read access) | Reasonable for management viewer |
| ProjectDetail tabs | 11 | **Reduce to 6**: Overview, SO Details (no financial), Vehicle Lines (no values), Procurement (summary), QC (summary), Timeline |
| Main tasks | Read-only reporting and monitoring | Correct access |
| Daily work | Reports and Control Tower | Dashboard: high-level KPI summary, links to reports |
| Workbench concept | Reports Hub + Control Tower | No change needed |
| Financial visibility | `partial` — defined but not enforced in UI | Gap: `financialVisibility: 'partial'` is not wired to any component |

---

## 8. Dashboard / My Work Audit

### 8.1 Current Dashboard State

**Page:** `/` → `Dashboard.tsx` → "Operations Control Tower"

| Section | Current Content | Useful? | Notes |
|---------|----------------|---------|-------|
| Project Summary Strip | 8 mini stats: Active, Saudi, Dubai, With WO, With PN, In Production, In QC, Ready to Deliver | ✅ Useful for ops_mgr | All mock data in live mode |
| Critical Operational Indicators (KPI Cards) | 6 KPI cards (procurement, store, QC, custody) | ✅ Useful | Hidden in live mode (mock only) |
| Dubai/AFS & After Sales KPIs | 4 KPI cards | ✅ Useful | Hidden in live mode |
| Your Modules | Role-filtered module tiles grid | ⚠️ Useful launcher only | No task context, no pending counts |
| Governance Golden Rules | NAFFCO brand banner with 8 governance rules | ⚠️ Informational only | Good for onboarding, low daily value |

**Key missing elements:**
- No "My Pending Actions" section
- No "Pending Approvals" for ops_mgr/admin
- No "My Overdue Items" or SLA breach alerts
- No "Recently Updated Projects" list
- No role-based dashboard variants
- KPI data is mock-only in live mode — empty in production

### 8.2 Current Action Inbox State

**Page:** `/inbox` → `ActionInbox.tsx`

The Action Inbox exists as a standalone page and uses mock data. It shows tasks filtered loosely by context but not by the current user's actual role. All roles see the same shared inbox with all task categories visible.

**Issues:**
- No real task data from Supabase (uses `mockOrEmpty(INBOX_TASKS)`)
- No role-specific filtering of tasks
- No count badge on sidebar nav item
- Placement in nav is inconsistent — listed between CONTROL CENTER and SALES sections

### 8.3 Future Dashboard Recommendations by Role

| Role | Recommended Home Experience |
|------|-----------------------------|
| **admin** | Admin Command Center: pending access requests, recent audit events, system health stats, module status |
| **operations_manager** | My Approvals: pending SO approvals, pending PO approvals >10k SAR, projects missing WO/PN, SLA breaches, Control Tower summary |
| **sales_user** | Sales Home (already `/sales`): my quotation pipeline stages, my approved projects with delivery countdown, receivables summary, hot projects alert count |
| **sales_coordinator** | Coordinator Queue: quotations awaiting my processing, returned quotations needing action, recently processed |
| **procurement_user** | Procurement Workbench: PRs requiring my action, POs pending approval, ETAs due this week, delayed POs flagged |
| **factory_user** | Factory Workbench: my projects in production with WO status, pending raw material requests, production stage summary |
| **store_user** | Store Workbench: incoming deliveries expected, pending vehicle receiving tasks, open custody requests |
| **qc_user** | QC Workbench: pending inspections, open NCRs, open findings blocking release, projects ready for QC |
| **afs_user** | AFS Workbench: Dubai projects awaiting PN, pending arrival reports, open maintenance requests |
| **viewer** | Reports Dashboard: KPI summary, links to relevant reports, project health overview |

---

## 9. Tables / Forms / Filters Audit

### 9.1 Table Pattern Assessment

| Page | Current Pattern | Filter? | Empty State? | Loading? | Issue |
|------|----------------|---------|-------------|---------|-------|
| Projects | Custom HTML table | Basic search | ✅ EmptyState | ✅ PageLoader | No column sort; no status filter |
| Quotations | Custom HTML table | Basic search | ✅ | ✅ | No status column filter |
| HotProjects | Custom HTML table | None | ✅ EmptyState | ✅ | No filter at all |
| ProcurementRequests | Custom HTML table | Basic search | ✅ | ✅ | Status filter would help |
| ProcurementPurchaseOrders | Custom HTML table | Basic search | ✅ | ✅ | No ETA/delay filter |
| ProcurementSuppliers | Custom HTML table | Basic search | ✅ | ✅ | Acceptable |
| FactoryProjects | Custom HTML table | None | ✅ | ✅ | Should filter by WO status |
| FactoryRawMaterialRequests | Custom HTML table | None | ✅ | ✅ | No status filter |
| MaterialCustody | Custom HTML table | None | ✅ | ✅ | No type filter |
| MaterialQcInspections | Custom HTML table | None | ✅ | ✅ | No status/result filter |
| ProjectQcReleaseNotes | Custom HTML table | None | ✅ | ✅ | No status filter |
| AdminApprovals | Custom HTML table | Status tabs | ✅ | ✅ | Good pattern |
| WoPnGate | Custom HTML table | Filter by status | ✅ | ✅ | Reasonable |
| AuditLog | Uses DataTableShell | Search + filters | ✅ feedback/empty | ✅ feedback/loading | Best current example |

**Finding:** TanStack Table (`@tanstack/react-table` v8.21.3) is **already installed** as a production dependency. `DataTableShell` in `src/components/ui/DataTableShell.tsx` uses it, but only 6 pages currently use this component.

### 9.2 Form Pattern Assessment

| Form | Current Pattern | Validation | Sectioning | Issues |
|------|----------------|-----------|-----------|--------|
| QuotationNew | Custom controlled form | Manual checks | None | Large single-page form; no step indicator |
| ProjectNew (SO form) | Custom controlled form | Manual checks | Sections via headers | Long form; no step flow |
| ProcurementRequestDetail | Custom controlled form | Manual | None | Mixed view/edit modes |
| StoreReceiptNew | Custom controlled form | Manual | None | Acceptable for scope |
| CustodyNew | Custom controlled form | Manual | None | Needs custody type branching |
| FactoryRawMaterialRequestNew | Custom controlled form | Manual | None | Acceptable |

**Libraries already installed:**
- `react-hook-form@7.79.0` — installed but usage is sparse
- `@hookform/resolvers@5.4.0` — installed (Zod integration)
- `zod@4.4.3` — installed but not widely used in forms

**Finding:** The form infrastructure (RHF + Zod) is **already installed** but not adopted. Forms currently use raw `useState` + manual validation.

### 9.3 Page Density Issues

| Page | Density Issue | Recommendation |
|------|--------------|---------------|
| ProjectDetail | 12 tabs, each with dense sub-tables | Role-based tab filtering; drawers for sub-detail |
| QuotationDetail | Long single-column form/view | Sectioned layout with sticky sidebar summary |
| AdminApprovals | Approval action + routing decision inline | Acceptable — keep compact |
| WoPnGate | Two-panel list with inline add form | Acceptable |
| Receivables | Dense aging table | Add column grouping and filter |
| ControlTower | Mock data placeholder | Needs real data before density assessment |
| ReportsExecutive | Dense stats grid | Acceptable for management reporting |

---

## 10. Visual Identity Audit

### 10.1 Component Usage Assessment

| Component | Pattern | Used By | Quality |
|-----------|---------|---------|---------|
| `PageHeader` (common) | Title + subtitle + breadcrumb + actions | Most pages post-Step-8C | ✅ Good |
| `PageHeader` (ui/legacy) | Legacy version still used by some deferred pages | WoPnGate, AdminApprovals, high-risk pages | ⚠️ Two versions coexist |
| `Card` | White bordered container | Universal | ✅ Consistent |
| `Badge` | Status indicator | Universal | ✅ Consistent variant system |
| `Button` | Action trigger | Universal | ✅ Consistent sizes/variants |
| `EmptyState` (ui/) | No-data placeholder | Most list pages | ✅ Good |
| `EmptyState` (feedback/) | CSS-variable token version | AuditLog only | ⚠️ Two versions coexist |
| `PageLoader` | Centered loading spinner | Most async pages | ✅ Consistent |
| `DataTableShell` | Table with TanStack Table | 6 pages only | ⚠️ Underused |
| `LoadingState` (feedback/) | Skeleton table/cards/detail | 4 detail pages | ⚠️ Not consistent across pages |
| Inline `<Loader2>` | Raw spinner (bypasses PageLoader) | Some older pages | ⚠️ Inconsistent |
| `DataSourceBadge` | Dev/live mode indicator | Dashboard header | ✅ Good utility |

### 10.2 Design System Assessment

| Area | Current State | Issue | Priority |
|------|--------------|-------|----------|
| **NAFFCO Red / Brand color** | `brand-*` Tailwind palette used consistently | Brand color is used as accent correctly | ✅ Good |
| **Typography** | System font stack via Tailwind defaults | No custom font loaded (Inter/IBM Plex not configured) | Low |
| **Spacing** | 4px base grid via Tailwind | Consistent | ✅ Good |
| **Border radius** | `rounded-xl` (12px) for cards; `rounded-lg` for smaller elements | Slightly large for a dense operational app | Minor |
| **Shadows** | `shadow-sm` on cards, `shadow-md` on hover | Light and appropriate | ✅ Good |
| **Status badges** | 6 variants: neutral, warning, info, success, critical, default | Good coverage; custom Badge.tsx not using Radix | ⚠️ Accessibility gap |
| **Empty states** | Three implementations coexisting | Creates inconsistency in tone and layout | Medium |
| **Loading states** | PageLoader + raw Loader2 + LoadingState skeleton | Three implementations; no unified pattern | Medium |
| **Error states** | Mostly inline amber/red alert boxes | No standardized ErrorState component | Medium |
| **Icon system** | `lucide-react@0.469.0` | Consistent; 70+ icons used across pages | ✅ Good |
| **Tab navigation** | Custom tab bar in ProjectDetail | No shared Tab component; tabs are one-off per page | High |
| **Page density** | Varies significantly by page | Operations pages are dense; management pages are sparse | Medium |
| **Visual hierarchy** | Inconsistent — some pages lead with KPI strip, others with table | No standard "page structure" beyond PageHeader | Medium |
| **Mobile** | Responsive Tailwind classes used | Desktop-primary; mobile hamburger sidebar | Low |
| **RTL** | Not implemented | No `dir` attribute, no RTL modifiers in Tailwind | Medium-future |

### 10.3 What Feels Clean

- Card-based layout with consistent shadow and border
- Brand color application (red accent bars, brand-50/700/800 for highlights)
- PageHeader with breadcrumb + actions pattern
- Badge variant system (consistent across pages)
- Sidebar icon + label alignment

### 10.4 What Feels Basic

- Dashboard is a tile launcher with no live data in production
- Empty states are text-only (no illustration/icon branding in most pages)
- Status progress (where is the project in its lifecycle?) shown only as a Badge text
- No visual progress indicator for project lifecycle stages
- No drag-and-drop, no keyboard shortcuts, no command palette

### 10.5 What Feels Crowded

- ProjectDetail with 12 tabs visible to all roles
- QC & Release tab with 5 sub-tables stacked vertically
- Store tab with 3 sub-tables stacked vertically
- REPORTS & ADMIN sidebar section with 11 items

### 10.6 What Feels Inconsistent

- Two PageHeader components with different APIs
- Three EmptyState implementations
- Some pages use `PageLoader`, others use raw `<Loader2>`
- Tab navigation is implemented ad-hoc per page vs. a shared component
- Error banners: some use `bg-red-50 border-red-200`, others use `bg-amber-50`
- Page-level inline loading vs. PageLoader component vs. `LoadingState` skeleton

### 10.7 Premium/Enterprise Feel Gaps

- No skeleton loading states on most list pages (jumpy content load)
- No optimistic UI updates on form submission
- No smooth tab transition animation
- No command palette (Ctrl+K) for rapid navigation
- No inline notification toasts (success/error feedback relies on inline banners)
- No right-click context menus on table rows
- No bulk action patterns on list tables
- No sticky table headers for long lists
- No column resizing or reordering

---

## 11. Library / Tooling Recommendations

### 11.1 Currently Installed (Available Now)

| Library | Version | License | Current Use | Recommended Expansion |
|---------|---------|---------|-------------|----------------------|
| `@tanstack/react-table` | 8.21.3 | MIT | DataTableShell (6 pages) | **Expand to all list tables** — sorting, filtering, pagination |
| `react-hook-form` | 7.79.0 | MIT | Sparse | **Adopt for all forms** — replace raw useState patterns |
| `@hookform/resolvers` | 5.4.0 | MIT | Not used | **Use with Zod** for form validation |
| `zod` | 4.4.3 | MIT | Not used in forms | **Adopt for all form schemas** |
| `@radix-ui/react-tabs` | 1.1.14 | MIT | Not used for ProjectDetail tabs | **Use for tab components** — accessible, keyboard-navigable |
| `@radix-ui/react-dialog` | 1.1.16 | MIT | Not used consistently | **Use for approval/confirmation modals** |
| `@radix-ui/react-select` | 2.3.0 | MIT | Limited use | **Adopt for all selects** |
| `@radix-ui/react-tooltip` | 1.2.9 | MIT | Limited use | **Add tooltips to icon-only actions** |
| `@radix-ui/react-dropdown-menu` | 2.1.17 | MIT | Limited use | **Use for row-level action menus in tables** |
| `class-variance-authority` | 0.7.1 | MIT | Used in some components | **Standardize for all component variants** |
| `tailwind-merge` | 3.6.0 | MIT | Used via `cn()` util | ✅ Correct use — continue |
| `clsx` | 2.1.1 | MIT | Used via `cn()` util | ✅ Correct use — continue |
| `tailwindcss-animate` | 1.0.7 | MIT | Available | **Use for tab transitions, modal animations** |
| `lucide-react` | 0.469.0 | ISC/MIT | Universal | ✅ Correct — continue |

### 11.2 Not Yet Installed — Recommendations

| Library | Recommendation | Why | Risk | License | Timing |
|---------|---------------|-----|------|---------|--------|
| **shadcn/ui** (component CLI) | **USE** | Copy-paste accessible components built on Radix UI + Tailwind; aligns perfectly with existing stack | Very Low | MIT | Step 10.5C |
| **cmdk** | **USE LATER** | Command palette — Ctrl+K rapid navigation; ideal for admin/ops_mgr | Low | MIT | Step 10.5H |
| **Framer Motion / motion** | **USE LATER** | Page transitions, tab animations, micro-interactions | Low | MIT | Step 10.5H |
| **recharts or tremor** | **USE** | Chart library for dashboard KPIs; recharts is already referenced in docs | Low | MIT | Step 10.5F |
| **react-window or @tanstack/virtual** | **USE LATER** | Virtual scrolling for long lists (projects, audit log) | Low | MIT | Step 10.5G |
| **date-fns** | **USE** | Consistent date formatting; replace `toLocaleDateString` patterns | Very Low | MIT | Step 10.5G |

### 11.3 Not Recommended

| Library | Decision | Reason |
|---------|----------|--------|
| **MUI / Material UI** | **DO NOT USE** | Conflicts with Tailwind; large bundle; opinionated styling incompatible with current system |
| **Ant Design** | **DO NOT USE** | Same reasons as MUI; Arabic/RTL support is available but not needed at this stage |
| **refine** | **DO NOT USE NOW** | Heavy framework — current custom implementation is sufficient; adopt only if full rebuild |
| **react-admin** | **DO NOT USE** | Same as refine — framework-level adoption not justified for existing codebase |

---

## 12. UX Risk Register

| ID | Risk | Severity | Impact | Mitigation |
|----|------|----------|--------|-----------|
| UX-R-001 | Hiding ProjectDetail tabs by role requires careful filtering logic — a bug could hide tabs from ops_mgr or admin | High | Ops loss | Test filtering with all 10 roles before deployment |
| UX-R-002 | `financialVisibility` enforcement gaps — factory/store/qc/afs users may see cost data in live mode | High | Data exposure | Wire `financialVisibility` from ROLE_CONFIGS to UI guards |
| UX-R-003 | Role-based nav changes may break deep-links that users have bookmarked | Medium | User disruption | Never delete routes; only change nav labels/grouping |
| UX-R-004 | Converting ActionInbox to real data may expose tasks meant for other roles | High | Role contamination | Ensure inbox tasks are strictly scoped by authenticated user role |
| UX-R-005 | Dashboard live data connections may surface sensitive data if role checks are not applied to queries | High | Data exposure | All live queries must include RLS-compatible WHERE clauses |
| UX-R-006 | Step 8C's PageHeader migration is open (not merged into main) — inconsistent headers remain | Medium | Visual inconsistency | Ensure Step 8C is merged before visual identity work begins |
| UX-R-007 | Two EmptyState and two PageHeader components — consolidation PR could break pages if import paths change | Medium | Build errors | Use find-and-replace migration; run build verification |
| UX-R-008 | `PERMISSION_KEYS` system is defined but never used — if wired incorrectly, could block legitimate actions | Medium | Access denial | Implement `usePermission()` hook and test all 10 roles |
| UX-R-009 | `factory/pending-raw-materials` duplicates `/factory/raw-material-requests` — if one page is updated, the other lags | Low | Stale data view | Merge to single route |
| UX-R-010 | Mock data shipped in production bundle — `mockReports`, `mockStore`, etc. increase bundle size | Medium | Performance | Gate mock imports behind `import.meta.env.DEV` |

---

## 13. Page Consolidation Opportunities

| Opportunity | Pages Involved | Type | Risk | Step |
|-------------|---------------|------|------|------|
| Merge `/factory/pending-raw-materials` with `/factory/raw-material-requests` | FactoryRawMaterialRequests x2 | Duplicate route | Low | 10.5B |
| Merge "Material QC" and "Project / Vehicle QC" hub pages into single "QC Hub" | MaterialQC, ProjectQC | Merge | Medium | 10.5D |
| Merge "Dubai / AFS" and "After Sales Maintenance" into single "AFS Hub" | DubaiAFS, AfterSales | Merge | Medium | 10.5D |
| Consolidate EmptyState components (ui/ and feedback/) | EmptyState.tsx x2 | Component | Low | 10.5C |
| Consolidate PageHeader components (ui/ and common/) | PageHeader.tsx x2 | Component | Low | 10.5C |
| Consolidate loading patterns (PageLoader, raw Loader2, LoadingState) | 3 components | Component | Low | 10.5C |
| Convert ProjectDetail sub-module tables to drawer/panel pattern | ProjectDetail.tsx | UX pattern | Medium | 10.5E |
| Add "Project Status" summary tab in ProjectDetail (for sales_user) | ProjectDetail.tsx | New tab | Low | 10.5E |
| Unify Receivables into Sales section (move from REPORTS & ADMIN) | Navigation | Config | Low | 10.5D |

---

## 14. Role-Based Visibility Opportunities

| Opportunity | Current State | Recommended Change | RLS Impact |
|-------------|--------------|-------------------|-----------|
| ProjectDetail: Hide Procurement tab from sales_user | Visible to all | Filter by role | None — link targets are already route-guarded |
| ProjectDetail: Hide Factory tab from sales_user | Visible to all | Filter by role | None |
| ProjectDetail: Hide Store tab from sales_user | Visible to all | Filter by role | None |
| ProjectDetail: Replace QC tab with Release Note status for sales_user | Full QC tab visible | Show summary card | None |
| ProjectDetail: Hide Dubai/AFS tab for Saudi projects | Visible to all | Filter by project.manufacturing_location | None |
| ProjectDetail: Show Approval tab read-only for department users | Full tab visible | Show routing summary card only | None — pdr_sales_select already correct |
| Dashboard: Role-specific panels | Generic for all | Role-based panel rendering | Requires live data queries |
| Action Inbox: Role-scoped task items | All tasks visible | Filter by assignedRole === currentRole | Requires live data query |
| Navigation: Wire inbox count badge | Badge field exists in NavItem, never populated | Connect to real pending task count | Requires live query |
| Enforce `financialVisibility: 'none'` in Vehicle Lines tab | canSeeMoney controls admin/ops_mgr | factory/store/qc/afs should see no values | None — UI-only change |

---

## 15. RLS / Security Alignment Considerations

These are **findings only** — no changes in Step 10.5A.

| Finding | Current State | Risk | Recommendation |
|---------|--------------|------|---------------|
| ProjectDetail has no route guard (`RequireRole`) | `/projects/:id` is accessible to all authenticated users | Low-Medium — RLS on `projects` table should block data; but UI is fully exposed | Add route guard allowing all authenticated roles explicitly, or verify RLS enforces project ownership for sales_user |
| `pdr_sales_select` (migration 091) scopes sales_user to own projects only | Correctly implemented | None | Keep |
| `factory_user` RLS on `project_execution_references` may allow self-confirmation | Documented in Step 10A gap | Medium | Addressed in Step 10B |
| `financialVisibility: 'none'` roles may access financial columns in Procurement tab of ProjectDetail | UI tab visible; DB query uses `purchase_orders_to_supplier_safe` view | Medium — `canSeeCost` check only hides PO value column; PR list with no value column is safe | No RLS change needed; UI tab filtering handles this |
| Projects list (`/projects`) has no route guard — all authenticated users can access | Correct by design (all roles see projects) | None — RLS on projects table scopes data by role | Document: review if RLS scopes factory/store/qc/afs to routed projects only |
| Templates at `/templates` are accessible to all roles | No RequireRole guard | Low — all authenticated users can view templates | Acceptable; template upload/approval is guarded |
| `PERMISSION_KEYS` defined but never used — no action-level permission enforcement | Designed in types; never wired | Medium — future enforcement gap | Implement `usePermission()` hook in Step 10.5B or later |

---

## 16. Redesign Backlog

### Critical UX Fixes

| ID | Item | Priority | Step |
|----|------|----------|------|
| B-UX-001 | Role-filter ProjectDetail tabs (sales_user: 5 tabs; dept users: 7 tabs) | Critical | 10.5E |
| B-UX-002 | Add real data to Action Inbox (currently all mock data) | Critical | Post-10.5 |
| B-UX-003 | Wire navigation badge counts (inbox, pending approvals) | High | 10.5D |
| B-UX-004 | Add role-specific dashboard panels (My Work / My Approvals) | High | 10.5F |
| B-UX-005 | Remove mock data from production bundles | High | 10.5G |

### High-Value Simplification

| ID | Item | Priority | Step |
|----|------|----------|------|
| B-UX-006 | Add "Project Status" summary card/tab for sales_user in ProjectDetail | High | 10.5E |
| B-UX-007 | Restructure REPORTS & ADMIN navigation section into "REPORTING" + "ADMIN & SYSTEM" | High | 10.5D |
| B-UX-008 | Move Receivables to SALES & QUOTATION nav section | Medium | 10.5D |
| B-UX-009 | Add summary KPI cards to all module hub pages (Procurement, Factory, Store, QC, Dubai) | Medium | 10.5F |
| B-UX-010 | Merge /factory/pending-raw-materials duplicate route | Low | 10.5B |

### Role-Based Navigation Changes

| ID | Item | Priority | Step |
|----|------|----------|------|
| B-UX-011 | Rename nav item "Home" to "Dashboard" | Medium | 10.5D |
| B-UX-012 | Rename "Control Tower" to "Operations Overview" to distinguish from Dashboard | Medium | 10.5D |
| B-UX-013 | Create "ADMIN & SYSTEM" section for Settings, Admin/Users, Audit Log, Access Requests | Medium | 10.5D |
| B-UX-014 | Move Document Templates from REPORTS & ADMIN to new "TOOLS" section or PROJECTS | Low | 10.5D |
| B-UX-015 | Add collapsible icon-only sidebar for desktop density | Low | 10.5D |

### ProjectDetail Redesign Changes

| ID | Item | Priority | Step |
|----|------|----------|------|
| B-UX-016 | Implement role-based tab filtering in ProjectDetail | Critical | 10.5E |
| B-UX-017 | Convert QC & Release sub-tables to collapsible sections | Medium | 10.5E |
| B-UX-018 | Convert Store sub-tables to collapsible sections | Medium | 10.5E |
| B-UX-019 | Add Radix UI Tabs to replace custom tab bar | Medium | 10.5E |
| B-UX-020 | Add Dubai/AFS tab visibility gate by manufacturing_location | Medium | 10.5E |
| B-UX-021 | Show release note status card in Overview tab (for all roles) | High | 10.5E |

### Dashboard / My Work Changes

| ID | Item | Priority | Step |
|----|------|----------|------|
| B-UX-022 | Implement role-based dashboard panels with live data | High | 10.5F |
| B-UX-023 | Add "Pending Approvals" widget for ops_mgr/admin | High | 10.5F |
| B-UX-024 | Add "My Projects" widget for sales_user on Sales Workspace | High | 10.5F |
| B-UX-025 | Replace mock Project Summary Strip with live Supabase query | High | 10.5F |
| B-UX-026 | Convert Governance Rules banner to collapsible info card | Low | 10.5F |

### Tables / Forms / Filters Changes

| ID | Item | Priority | Step |
|----|------|----------|------|
| B-UX-027 | Expand TanStack Table to all major list pages (Projects, Quotations, PRs, POs) | High | 10.5G |
| B-UX-028 | Add status filter to Projects list | High | 10.5G |
| B-UX-029 | Adopt React Hook Form + Zod for all new/edit forms | High | 10.5G |
| B-UX-030 | Add bulk action pattern (bulk approve, bulk export) to Admin Approvals | Medium | 10.5G |
| B-UX-031 | Add drawer preview on table row click for list pages | Medium | 10.5G |
| B-UX-032 | Add sticky table headers for tables >10 rows | Low | 10.5G |

### Visual Identity Changes

| ID | Item | Priority | Step |
|----|------|----------|------|
| B-UX-033 | Consolidate PageHeader to single component | High | 10.5C |
| B-UX-034 | Consolidate EmptyState to single component | High | 10.5C |
| B-UX-035 | Consolidate loading pattern to single PageLoader + Skeleton | High | 10.5C |
| B-UX-036 | Adopt Radix UI Tabs for all multi-tab pages | Medium | 10.5C |
| B-UX-037 | Add skeleton loading states to list pages | Medium | 10.5C |
| B-UX-038 | Standardize error state component | Medium | 10.5C |
| B-UX-039 | Apply Inter or IBM Plex Sans font | Low | 10.5C |

### Performance / Interaction Changes

| ID | Item | Priority | Step |
|----|------|----------|------|
| B-UX-040 | Gate mock data imports behind import.meta.env.DEV | High | 10.5G |
| B-UX-041 | Add command palette (cmdk) for rapid navigation | Low | 10.5H |
| B-UX-042 | Add Framer Motion tab transitions in ProjectDetail | Low | 10.5H |
| B-UX-043 | Add virtual scrolling for Projects list and Audit Log | Low | 10.5H |
| B-UX-044 | Add optimistic UI updates for status changes | Medium | 10.5H |

### Accessibility Changes

| ID | Item | Priority | Step |
|----|------|----------|------|
| B-UX-045 | Replace custom Badge with Radix-accessible equivalent | Medium | 10.5C |
| B-UX-046 | Add aria-labels to all icon-only buttons | High | 10.5C |
| B-UX-047 | Add keyboard navigation to custom tab bar | High | 10.5C |
| B-UX-048 | Add focus-visible styles to all interactive elements | Medium | 10.5C |
| B-UX-049 | Implement RTL support via Tailwind rtl: modifier | Low | Future |

### Items Requiring RLS / Security Review

| ID | Item | Step |
|----|------|------|
| B-UX-050 | Review ProjectDetail route guard for all roles | 10.5B |
| B-UX-051 | Enforce `financialVisibility` in UI components | 10.5E |
| B-UX-052 | Implement `usePermission()` hook backed by PERMISSION_KEYS | Post-10.5 |
| B-UX-053 | Scope Action Inbox tasks to authenticated user's role via RLS | 10.5F |
| B-UX-054 | Verify factory/store/qc/afs project access is scoped to routed projects only | 10.5B |

### Items Deferred to Steps 11–17

- Procurement module UX (Step 11)
- Store module UX (Step 12)
- Factory module UX (Step 13)
- Dubai/AFS module UX (Step 14)
- QC module UX (Step 15)
- After Sales module UX (Step 16)
- Reports module UX (Step 17)

---

## 17. Recommended Step 10.5B – 10.5I Roadmap

### Step 10.5B — Target IA Blueprint

**Objective:** Define the target Information Architecture before any implementation.

**Deliverables:**
- Proposed navigation structure by role (table and wireframe description)
- Proposed ProjectDetail tab structure by role (role-tab matrix)
- Proposed dashboard/My Work layout per role
- Proposed page grouping and section consolidation decisions
- Identify all RLS/security review items that must be resolved first
- Merge recommendation for Step 8C (open PageHeader migration branch)

**Scope:** Documentation only. No code changes.

**Inputs:** This audit document (Step 10.5A).

---

### Step 10.5C — Visual Identity System v2

**Objective:** Establish a unified design system foundation before any UX redesign.

**Deliverables:**
- Consolidate PageHeader to single `@/components/common/page-header`
- Consolidate EmptyState to single component
- Consolidate loading pattern (PageLoader + Skeleton variants)
- Adopt Radix UI Tabs as shared tab component
- Standardize error state component
- Apply consistent aria-labels to icon-only buttons
- Add focus-visible styles globally
- Optional: configure Inter or IBM Plex Sans font
- Run build/typecheck/lint after all changes

**Do NOT change:** Business logic, routes, permissions, forms, or page content.

---

### Step 10.5D — App Shell & Navigation Redesign

**Objective:** Implement role-based navigation grouping and sidebar improvements.

**Deliverables:**
- Rename nav items for clarity (Dashboard, Operations Overview)
- Create "ADMIN & SYSTEM" section
- Move Receivables to SALES section
- Move Document Templates to appropriate section
- Wire navigation badge counts from real data (pending approvals, inbox)
- Add collapsed icon-only sidebar mode (optional)
- Update section separator labels
- No route changes — nav item paths only

**Do NOT change:** Route guards, business logic, form behavior, page content.

---

### Step 10.5E — ProjectDetail Redesign

**Objective:** Implement role-based tab filtering and ProjectDetail UX improvements.

**Deliverables:**
- Implement role-based tab filtering matrix (sales_user: 5 tabs; dept users: 7 tabs; ops_mgr: 11; admin: 12)
- Add "Project Status" summary section visible to sales_user
- Gate Dubai/AFS tab by project.manufacturing_location
- Show release note status card in Overview tab
- Convert QC and Store sub-tables to collapsible sections
- Adopt Radix UI Tabs for the tab bar
- Implement `financialVisibility` enforcement in Vehicle Lines tab

**RLS check required before:** Verify sales_user cannot access Procurement/Factory/Store data via direct URL after tab removal. (Route guards already block — document verification.)

---

### Step 10.5F — Dashboard / My Work Redesign

**Objective:** Role-specific dashboard panels with live data.

**Deliverables:**
- Replace mock Project Summary Strip with live Supabase query
- Add role-specific dashboard panels:
  - admin: access requests, audit alerts
  - ops_mgr: pending approvals, PO approvals, SLA breaches
  - sales_user: My quotations pipeline (in Sales Workspace, not Dashboard)
  - dept users: My workbench items (in module hub pages)
- Connect Action Inbox to real Supabase data (scoped by role)
- Add charts for dashboard KPIs (recharts/tremor)

**Do NOT change:** Governance gates, approval logic, RLS policies.

---

### Step 10.5G — Tables / Forms / Filters Redesign

**Objective:** Modernize data tables and forms across the portal.

**Deliverables:**
- Expand TanStack Table to Projects, Quotations, ProcurementRequests, ProcurementPurchaseOrders
- Add status filter to Projects list
- Add column sorting to all major tables
- Adopt React Hook Form + Zod for ProjectNew and QuotationNew
- Remove mock data from production bundles (gate behind import.meta.env.DEV)
- Add drawer preview pattern to at least one list page (proof of concept)

---

### Step 10.5H — Interaction / Performance / Accessibility

**Objective:** Polish interaction quality and accessibility compliance.

**Deliverables:**
- Add command palette (cmdk) for admin/ops_mgr navigation
- Add Framer Motion tab transitions
- Add virtual scrolling for Projects list (if >100 rows)
- Add keyboard navigation audit and fixes
- Add optimistic UI for common status changes
- Accessibility review: aria-labels, focus-visible, screen reader testing

---

### Step 10.5I — UX Final Sign-off

**Objective:** Validate all Step 10.5 changes before proceeding to Step 11.

**Deliverables:**
- Manual QA checklist for all 10 roles
- Build/typecheck/lint confirmation
- Regression check on all governance gates (WO, PN, PO approval, Release Note)
- Final sign-off document
- Confirmation that Step 11 (Procurement) can begin

---

## 18. Items Intentionally Not Changed in Step 10.5A

| Category | Items |
|----------|-------|
| Business logic | All quotation, SO, WO/PN, procurement, factory, store, QC, Dubai/AFS, after-sales logic |
| Database schema | No migrations created or modified |
| RLS policies | No RLS policies added, removed, or modified |
| Route guards | No RequireRole wrappers added, removed, or modified |
| Approval logic | ApprovePanel, AdminApprovals, PO approval — all unchanged |
| Governance gates | WO gate, PN gate, PO 10k gate, Release Note gate — all unchanged |
| Form logic | All form validation and submission logic — unchanged |
| Mock data | Mock data files — unchanged |
| Navigation paths | All route paths — unchanged |
| Supabase functions | No Supabase functions added or modified |

---

## 19. Safety Review

| Check | Result |
|-------|--------|
| Business logic changed | ❌ No |
| Database schema changed | ❌ No |
| Migrations created | ❌ No |
| RLS policies changed | ❌ No |
| Route guards changed | ❌ No |
| Routes added/removed/renamed | ❌ No |
| Approval logic changed | ❌ No |
| Quotation logic changed | ❌ No |
| SO logic changed | ❌ No |
| WO/PN gate changed | ❌ No |
| Production code changed | ❌ No |
| Source files modified | ❌ No (documentation only) |
| New npm dependencies added | ❌ No |

---

## 20. Final Recommendation: Proceed to Step 10.5B

**Assessment: Proceed to Step 10.5B — Target IA Blueprint.**

**Rationale:**
1. This audit has produced a complete inventory of 103 routes, 32 navigation items, 12 ProjectDetail tabs, and role-by-role experience maps for all 10 roles.
2. The biggest UX problem (all 12 ProjectDetail tabs visible to all roles) is clearly documented with a specific solution path that requires no RLS changes.
3. The sales user access problem is well-defined: sales_user needs 5–6 tabs (vs. current 11), and the tabs to hide are already route-guarded at the destination — safe to implement at UI level only.
4. The library stack (TanStack Table, RHF, Zod, Radix UI) is **already installed** — no new dependencies needed for most of the redesign.
5. The build is failing due to pre-existing environment issues (node_modules not fully installed in audit environment), not due to this step. TypeScript check (`npx tsc --noEmit`) passes with zero errors.
6. No governance rules, RLS policies, or business logic were touched.

**Step 10.5B should:** Define the exact target IA (navigation structure per role, ProjectDetail tab matrix per role, dashboard structure per role) as a decision document before any code changes begin in Steps 10.5C–10.5I.

---

## Appendix A — Build / Validation Results

| Check | Result | Notes |
|-------|--------|-------|
| `npm run build` | ⚠️ Pre-existing failures | TypeScript config deprecation warning (`baseUrl`), vite type errors — pre-existing, not introduced by this step. Node modules environment issue in audit container. |
| `npx tsc --noEmit` | ✅ PASS (zero errors) | No TypeScript errors introduced |
| `npm run lint` | ⚠️ Pre-existing failure | `@eslint/js` package not found — environment issue with node_modules. Not introduced by this step. |
| **Baseline documented** | ✅ | Pre-existing failures confirmed pre-date this branch |
| **Code changed** | ❌ None | Documentation-only step |

**Baseline build failures (pre-existing, not caused by this step):**
- `tsconfig.app.json(18,5): error TS5101: Option 'baseUrl' is deprecated` — TypeScript 5.7+ deprecation warning
- `vite.config.ts: Cannot find module 'vite'` — node_modules not installed in audit container
- `ESLint: Cannot find package '@eslint/js'` — node_modules not installed in audit container

All three failures are environment/dependency installation issues, not source code issues. `npx tsc --noEmit` (which uses the installed TypeScript compiler separately) passes with zero errors, confirming the source code is type-correct.

---

*Step 10.5A complete. Documentation-only. No application code changed. Proceed to Step 10.5B.*
