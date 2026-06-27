# Page Priority Matrix

All redesign-relevant pages across all roles, prioritised. Use this to decide **what to send to
Artifacts first**. Priorities: **P0** = improve/review first · **P1** = important · **P2** =
secondary · **P3** = low / already mature.

> "Owning role" = the role whose brief carries the **full** page detail. Pages reachable by admin /
> operations_manager are cross-referenced from those files to the owning role's brief to avoid
> duplication (admin always passes every guard; ops_manager has broad read access).

Suggested Design Status legend: **Needs Artifact** · **Already Mature** (works well; Artifact
optional polish) · **Needs Screenshot First** · **Needs Business Confirmation** · **Implementation
Ready After Artifact**.

---

## P0 — do first

| Priority | Role | Page | Route | Reason | Brief File | Suggested Design Status |
|----------|------|------|-------|--------|-----------|-------------------------|
| P0 | sales_user | Sales Dashboard | `/sales` | Commercial command center; invoicing schedule newly active (mig 100); 6 KPIs + plan + targets — most value, most density | `roles/sales_user.md` | Needs Artifact |
| P0 | admin | Admin Invoicing Schedule | `/admin/invoicing-schedule` | Newly DB-active; dense table + KPIs + reschedule/amount modals + alerts | `roles/admin.md` | Needs Artifact |
| P0 | admin | Admin Sales Targets | `/admin/sales-targets` | Newly DB-active; per-user annual targets + missing-target list | `roles/admin.md` | Needs Artifact |
| P0 | sales_coordinator | Coordinator Dashboard | `/sales-coordinator` | Quotation throughput command center; priority sections + KPI deep links | `roles/sales_coordinator.md` | Already Mature → polish |
| P0 | operations_manager | Operations Control Tower | `/control-tower` | Cross-module executive oversight; exceptions + CSV export | `roles/operations_manager.md` | Needs Artifact |
| P0 | viewer | Management Dashboard | `/management-dashboard` | Read-only executive clarity | `roles/viewer.md` | Needs Artifact |

## P1 — important

| Priority | Role | Page | Route | Reason | Brief File | Suggested Design Status |
|----------|------|------|-------|--------|-----------|-------------------------|
| P1 | sales_user | Projects / SO List | `/projects` | Portfolio with KPI strip; broad-read | `roles/sales_user.md` | Already Mature → polish |
| P1 | sales_user | New SO / Project Wizard | `/projects/new` | Multi-step creation; high-stakes data entry | `roles/sales_user.md` | Already Mature → polish |
| P1 | sales_user | Hot Projects | `/hot-projects` | Pipeline list | `roles/sales_user.md` | Needs Artifact |
| P1 | sales_user | New Quotation Request | `/quotations/new` | Two-step submission; document gates | `roles/sales_user.md` | Needs Artifact |
| P1 | sales_coordinator | Coordinator Queue | `/coordinator-queue` | Full tabbed workflow queue | `roles/sales_coordinator.md` | Already Mature → polish |
| P1 | sales_coordinator | Quotation Detail | `/quotations/:id` | Coordinator actions; estimation/clarification/return | `roles/sales_coordinator.md` | Needs Artifact |
| P1 | procurement_user | Procurement Dashboard | `/procurement` | KPIs + work queues + module nav | `roles/procurement_user.md` | Already Mature → polish |
| P1 | procurement_user | Purchase Orders | `/procurement/purchase-orders` | High-value PO approval visibility; `?status=` deep links | `roles/procurement_user.md` | Needs Artifact |
| P1 | procurement_user | Purchase Requests | `/procurement/requests` | PR intake list | `roles/procurement_user.md` | Needs Artifact |
| P1 | procurement_user | Suppliers | `/procurement/suppliers` | Approved supplier register | `roles/procurement_user.md` | Needs Artifact |
| P1 | store_user | Store Dashboard | `/store` | Receiving/custody/serial KPIs + queues (real counts) | `roles/store_user.md` | Already Mature → polish |
| P1 | store_user | QC Handoff | `/store/qc-handoff` | QC accept/reject queue | `roles/store_user.md` | Needs Artifact |
| P1 | factory_user | Factory Dashboard | `/factory` | WO gate + production KPIs + queues | `roles/factory_user.md` | Already Mature → polish |
| P1 | factory_user | Factory Requirements | `/factory/requirements` | BOQ/BOM/drawings | `roles/factory_user.md` | Needs Artifact |
| P1 | qc_user | QC Dashboard | `/qc` | Inspection/NCR/release KPIs + queues | `roles/qc_user.md` | Already Mature → polish |
| P1 | qc_user | QC Release Notes | `/project-qc/release-notes` | Release gate readiness | `roles/qc_user.md` | Needs Artifact |
| P1 | afs_user | Dubai / AFS Dashboard | `/dubai-afs` | PN gate + delivery readiness KPIs | `roles/afs_user.md` | Already Mature → polish |
| P1 | afs_user | After Sales Dashboard | `/after-sales` | Maintenance KPIs + deep links | `roles/afs_user.md` | Already Mature → polish |
| P1 | operations_manager | Reports Hub | `/reports` | Role-filtered report navigation | `roles/operations_manager.md` | Already Mature → polish |
| P1 | admin | Admin Dashboard | `/admin-dashboard` | Console; quick actions incl. commercial controls | `roles/admin.md` | Needs Artifact |

## P2 — secondary

| Priority | Role | Page | Route | Reason | Brief File | Suggested Design Status |
|----------|------|------|-------|--------|-----------|-------------------------|
| P2 | sales_user | Receivables & Aging | `/receivables` | Aging table | `roles/sales_user.md` | Needs Artifact |
| P2 | sales_user | Project Detail | `/projects/:id` | Role-tabbed detail (mature) | `roles/sales_user.md` | Already Mature |
| P2 | sales_user | Project Invoicing | `/projects/:projectId/invoicing` | Milestones view | `roles/sales_user.md` | Needs Business Confirmation |
| P2 | sales_coordinator | Quotation Requests List | `/quotations` | List + filters | `roles/sales_coordinator.md` | Already Mature |
| P2 | procurement_user | PR Items Without PO | `/procurement/pr-items-without-po` | Action queue | `roles/procurement_user.md` | Needs Artifact |
| P2 | procurement_user | ETA History | `/procurement/eta-history` | ETA tracking | `roles/procurement_user.md` | Needs Artifact |
| P2 | procurement_user | PO / PR / Supplier Detail | `/procurement/*/:id` | Detail pages | `roles/procurement_user.md` | Needs Screenshot First |
| P2 | store_user | Inventory / Receipts / Vehicle / Serials / Issuance / Custody / Unallocated | `/store/*`, `/custody` | Receiving & custody workflow pages | `roles/store_user.md` | Needs Artifact |
| P2 | factory_user | Projects / RMR / Monthly Updates / Send-to-QC / Pending RM | `/factory/*` | Production workflow pages | `roles/factory_user.md` | Needs Artifact |
| P2 | qc_user | Material QC / Inspections / NCRs / Project QC / Findings / Rework / Work Queue | `/material-qc/*`, `/project-qc/*`, `/qc/*` | Inspection workflow pages | `roles/qc_user.md` | Needs Artifact |
| P2 | afs_user | AFS Projects / ETA / Arrival / Missing Items / Pre-Delivery / Condition / PN Gate / Ready-for-Delivery / Materials | `/dubai-afs/*`, `/afs/*` | Delivery workflow pages | `roles/afs_user.md` | Needs Artifact |
| P2 | afs_user | Maintenance Requests | `/after-sales/maintenance` | Tabbed list (mature) | `roles/afs_user.md` | Already Mature |
| P2 | admin | User Management / Access Requests / Audit Log / Settings / Notification Rules / Report Subscriptions / WO-PN Gate / Admin Approvals | `/admin/*`, `/settings`, `/audit-log`, `/wo-pn-gate`, `/admin-approvals` | Governance & config | `roles/admin.md` | Needs Artifact |
| P2 | all | Reports (module + ops-excellence) | `/reports/*` | Sales/Projects/Procurement/Factory/Store/QC/AFS/Suppliers/Executive/Health/SLA/Data-Quality/Issues/CAPA | each role file | Mixed (most mature) |

## P3 — low / shared utility

| Priority | Role | Page | Route | Reason | Brief File | Suggested Design Status |
|----------|------|------|-------|--------|-----------|-------------------------|
| P3 | all | Action Inbox | `/inbox` | Shared task inbox | each role (shared appendix) | Needs Artifact |
| P3 | all | Notifications + Settings | `/notifications`, `/notifications/settings` | Shared notifications | each role (shared appendix) | Already Mature |
| P3 | all | Template Library / New / Generated / Detail | `/templates*` | Shared document templates | each role (shared appendix) | Needs Artifact |
| P3 | all | Root / Landing | `/` | Redirect to role landing | — | Already Mature |
| P3 | admin/ops | Template Approvals | `/templates/approvals` | Template governance | `roles/admin.md` | Needs Artifact |

---

## Notes

- "Already Mature → polish" pages were stabilized in prior sprints (Phase 18 Work Centers, Phase 19
  UX, the recent module sprints). Artifact work on them is **optional refinement**, not a fix.
- "Needs Business Confirmation" = a page whose data semantics should be confirmed with an owner
  before redesign (e.g., `/projects/:projectId/invoicing` milestones vs. the new schedule).
- "Needs Screenshot First" = a detail page best captured from the screenshot baseline before
  redesign, since its dense detail layout is hard to fully describe from code alone.
