# Integration Smoke Test — Phase 9.5

Last updated: 2026-05-31
Covers: Phases 0–9.5 (Foundation through Dubai / AFS / After Sales Integration Stabilization)

---

## Route Checklist

### Core
| Route | Page Component | Status |
|---|---|---|
| `/` | Dashboard | ✅ Built |
| `/inbox` | ActionInbox | ✅ Built |
| `/settings` | Settings | ✅ Built |
| `/admin/users` | AdminUsers | ✅ Built |
| `/audit-log` | AuditLog | ✅ Built |

### Sales & Quotations (Phase 4 + 5.5)
| Route | Page Component | Status |
|---|---|---|
| `/sales` | Sales | ✅ Built — full KPI strip + tables |
| `/quotations` | Quotations | ✅ Built |
| `/quotations/new` | QuotationNew | ✅ Built |
| `/quotations/:id` | QuotationDetail | ✅ Built |
| `/sales-coordinator` | SalesCoordinator | ✅ Built |

### Projects / SO (Phase 2–3)
| Route | Page Component | Status |
|---|---|---|
| `/projects` | Projects | ✅ Built |
| `/projects/new` | ProjectNew | ✅ Built |
| `/projects/:id` | ProjectDetail | ✅ Built — 12 tabs (Overview, SO Details, Vehicle Lines, Documents, Procurement, Factory, Store, QC & Release, Dubai / AFS, Approval & Routing, Timeline, Audit) |
| `/admin-approvals` | AdminApprovals | ✅ Built |
| `/wo-pn-gate` | WoPnGate | ✅ Built |

### Procurement (Phase 5)
| Route | Page Component | Status |
|---|---|---|
| `/procurement` | Procurement | ✅ Built |
| `/procurement/requests` | ProcurementRequests | ✅ Built |
| `/procurement/requests/:id` | ProcurementRequestDetail | ✅ Built |
| `/procurement/purchase-orders` | ProcurementPurchaseOrders | ✅ Built |
| `/procurement/purchase-orders/:id` | ProcurementPODetail | ✅ Built |
| `/procurement/suppliers` | ProcurementSuppliers | ✅ Built |
| `/procurement/suppliers/:id` | ProcurementSupplierDetail | ✅ Built |
| `/procurement/eta-history` | ProcurementEtaHistory | ✅ Built |

### Factory / Production (Phase 6)
| Route | Page Component | Status |
|---|---|---|
| `/factory` | Factory | ✅ Built |
| `/factory/projects` | FactoryProjects | ✅ Built |
| `/factory/projects/:projectId` | FactoryProjectWorkspace | ✅ Built |
| `/factory/requirements` | FactoryRequirements | ✅ Built |
| `/factory/raw-material-requests` | FactoryRawMaterialRequests | ✅ Built |
| `/factory/raw-material-requests/new` | FactoryRawMaterialRequestNew | ✅ Built |
| `/factory/monthly-updates` | FactoryMonthlyUpdates | ✅ Built |
| `/factory/pending-raw-materials` | FactoryRawMaterialRequests | ✅ Mapped |

### Store / Warehouse (Phase 7)
| Route | Page Component | Status |
|---|---|---|
| `/store` | Store | ✅ Built — 8 KPI cards, quick actions, governance rules |
| `/store/receipts` | StoreReceipts | ✅ Built — filter tabs, search, table |
| `/store/receipts/new` | StoreReceiptNew | ✅ Built — 3-step wizard |
| `/store/receipts/:id` | StoreReceiptDetail | ✅ Built — items + serial numbers tabs |
| `/store/vehicle-receiving` | StoreVehicleReceiving | ✅ Built — photo completeness badges |
| `/store/vehicle-receiving/new` | StoreVehicleReceivingNew | ✅ Built — 3-step wizard |
| `/store/vehicle-receiving/:id` | StoreVehicleReceivingDetail | ✅ Built — photo grid, completeness banner |
| `/store/inventory` | StoreInventory | ✅ Built — cross-receipt inventory, filters |
| `/store/unallocated` | StoreUnallocated | ✅ Built — unallocated items, assign action |
| `/custody` | MaterialCustody | ✅ Built — KPI strip, status tabs, full table |
| `/custody/new` | CustodyNew | ✅ Built — 3-step wizard |
| `/custody/:id` | CustodyDetail | ✅ Built — approval, receiver, actions, timeline |
| `/vehicle-receiving` | VehicleReceiving | ✅ Redirect → /store/vehicle-receiving |

### Material QC (Phase 8)
| Route | Page Component | Status |
|---|---|---|
| `/material-qc` | MaterialQC | ✅ Built — 6 KPI cards, NCR summary, governance rules |
| `/material-qc/inspections` | MaterialQcInspections | ✅ Built — status tabs, result filter, inspection table |
| `/material-qc/inspections/:id` | MaterialQcInspectionDetail | ✅ Built — item details, QC actions, NCR creation |
| `/material-qc/ncrs` | MaterialNcrs | ✅ Built — status tabs, severity filter, NCR table |
| `/material-qc/ncrs/:id` | MaterialNcrDetail | ✅ Built — corrective action, closure workflow |

### Project QC & Release Notes (Phase 8)
| Route | Page Component | Status |
|---|---|---|
| `/project-qc` | ProjectQC | ✅ Built — 7 KPI cards, findings summary, release notes |
| `/project-qc/inspections` | ProjectQcInspections | ✅ Built — status tabs, result filter, readiness badges |
| `/project-qc/inspections/:id` | ProjectQcInspectionDetail | ✅ Built — QC actions, inline Add Finding form |
| `/project-qc/findings` | ProjectQcFindings | ✅ Built — status tabs, rework highlighting |
| `/project-qc/findings/:id` | ProjectQcFindingDetail | ✅ Built — assignment, rework, closure workflow |
| `/project-qc/release-notes` | ProjectQcReleaseNotes | ✅ Built — status tabs, blocked highlighting |
| `/project-qc/release-notes/:id` | ProjectQcReleaseNoteDetail | ✅ Built — readiness checklist, issue action |

### Dubai / AFS (Phase 9)
| Route | Page Component | Status |
|---|---|---|
| `/dubai-afs` | DubaiAFS | ✅ Built — 8 KPI cards, follow-up list, governance rules |
| `/dubai-afs/projects` | DubaiAfsProjects | ✅ Built — status tabs, follow-up list |
| `/dubai-afs/projects/:id` | DubaiAfsProjectDetail | ✅ Built — ETA update, ETA history |
| `/dubai-afs/eta` | DubaiAfsEta | ✅ Built — ETA tracking table |
| `/dubai-afs/arrival-reports` | DubaiAfsArrivalReports | ✅ Built — status tabs, arrival list |
| `/dubai-afs/arrival-reports/:id` | DubaiAfsArrivalReportDetail | ✅ Built — missing items, add item form |
| `/dubai-afs/missing-items` | DubaiAfsMissingItems | ✅ Built — status tabs, missing items list |
| `/dubai-afs/predelivery-reports` | DubaiAfsPredeliveryReports | ✅ Built — ready/not-ready tabs |
| `/dubai-afs/predelivery-reports/:id` | DubaiAfsPredeliveryReportDetail | ✅ Built — readiness checklist, delivery approve |
| `/dubai-afs/condition-reports` | DubaiAfsConditionReports | ✅ Built — condition report list |

### After Sales Maintenance (Phase 9)
| Route | Page Component | Status |
|---|---|---|
| `/after-sales` | AfterSales | ✅ Built — 6 KPI cards, recent requests |
| `/after-sales/maintenance` | AfterSalesMaintenance | ✅ Built — status tabs, maintenance list |
| `/after-sales/maintenance/new` | AfterSalesMaintenanceNew | ✅ Built — 4-step wizard |
| `/after-sales/maintenance/:id` | AfterSalesMaintenanceDetail | ✅ Built — inspection, parts, resolution actions |

### Reports & Control Tower (Phase 10)
| Route | Page Component | Status |
|---|---|---|
| `/reports` | Reports | ✅ Built — hub with 6 grouped sections, role-filtered cards |
| `/control-tower` | ControlTower | ✅ Built — stat bar + 4 sections (lifecycle, exceptions, readiness, health) |
| `/reports/executive` | ReportsExecutive | ✅ Built — same 4 sections as Control Tower |
| `/reports/projects` | ReportsProjects | ✅ Built — status tabs, search, WO/PN status, health score (admin/ops) |
| `/reports/sales` | ReportsSales | ✅ Built — quotation pipeline, active projects, aging placeholder |
| `/reports/procurement` | ReportsProcurement | ✅ Built — 6 tabs, cost gated by role |
| `/reports/factory` | ReportsFactory | ✅ Built — BOQ, GA, monthly updates, ready for QC, RMRs |
| `/reports/store` | ReportsStore | ✅ Built — receipts, vehicles, custody, serials |
| `/reports/qc` | ReportsQC | ✅ Built — material QC, NCRs, project QC, findings, release notes |
| `/reports/afs` | ReportsAFS | ✅ Built — missing PN, ETAs, arrivals, pre-delivery, maintenance |
| `/reports/suppliers` | ReportsSuppliers | ✅ Built — scorecard table, score bars, formula transparency |
| `/reports/sla` | ReportsSLA | ✅ Built — 3 tabs, overdue breaches, escalation levels, rules |
| `/reports/data-quality` | ReportsDataQuality | ✅ Built — 23 checks, module/severity filters, fix links |
| `/reports/health-scores` | ReportsHealthScores | ✅ Built — projects (admin/ops), departments, suppliers tabs |
| `/reports/issues` | ReportsIssues | ✅ Built — expandable rows, closure notes, role-gated close action |
| `/reports/capa` | ReportsCapa | ✅ Built — 5 tabs, effectiveness check UI, role-gated actions |

### Future Phases (Placeholder)
| Route | Module | Target Phase |
|---|---|---|
| `/reports/sales` → Aging tab | Aging / Receivables full report | Phase 11 |

---

## Role Visibility Checklist

| Role | Can See Sales Value | Can See Purchase Cost | Can Approve PO | Can Approve Project |
|---|---|---|---|---|
| admin | ✅ | ✅ | ✅ | ✅ |
| operations_manager | ✅ | ✅ | ✅ | ✅ |
| sales_user | ✅ own only | ❌ | ❌ | ❌ |
| sales_coordinator | ❌ | ❌ | ❌ | ❌ |
| procurement_user | ❌ | ✅ | ❌ | ❌ |
| factory_user | ❌ | ❌ | ❌ | ❌ |
| store_user | ❌ | ❌ | ❌ | ❌ |
| qc_user | ❌ | ❌ | ❌ | ❌ |
| afs_user | ❌ | ❌ | ❌ | ❌ |
| viewer | ❌ | ❌ | ❌ | ❌ |

---

## Project Command Center — Tab Checklist (`/projects/:id`)

| Tab | Content | Phase |
|---|---|---|
| Overview | Status, location, dates, sales owner, value (role-gated) | Phase 2 |
| SO Details | All project fields, editable if draft + owner | Phase 2 |
| Vehicle Lines | Line table with totals; add/edit if editable | Phase 2 |
| Documents | DocumentList component; upload placeholder | Phase 2 |
| Procurement | PR table + PO to Supplier table; cost guarded by canSeeCost | Phase 5 |
| Factory | Production records + RMRs; Saudi only; Dubai shows AFS message | Phase 6 |
| Store | Material receipts, vehicle receipts, custody records for this project | Phase 7 |
| QC & Release | Material QC, NCRs, Project QC, Findings, Release Notes for this project | Phase 8 |
| Dubai / AFS | Dubai follow-ups, arrival reports, pre-delivery reports, maintenance requests | Phase 9 |
| Approval & Routing | Approval history, routing, inline approve/reject for admin | Phase 2 |
| Timeline | Chronological project events | Phase 2 |
| Audit | Audit log entries; admin only | Phase 1 |

---

## Governance Rules — Verification Points

### High-Value PO (> 10,000 SAR)
- [ ] `approval_required = true` for POs above threshold
- [ ] `approval_status = 'pending'` until explicitly approved
- [ ] PO cannot move to `sent_to_supplier` while `approval_status = 'pending'`
- [ ] Rejection requires `rejection_reason` (non-empty)
- [ ] Only admin / operations_manager can approve

### WO Gate (Saudi Factory)
- [ ] Saudi projects without confirmed WO block factory execution
- [ ] Factory workspace shows WO gate status prominently
- [ ] No BOQ, BOM, drawings, or RMR actions before WO confirmed
- [ ] WO reference visible in ProjectDetail → Factory tab

### PN Gate (Dubai Follow-Up)
- [ ] Dubai projects without confirmed PN block Dubai tracking
- [ ] Factory tab on Dubai projects shows "Dubai / AFS Route" message
- [ ] PN reference entry available via WO/PN Gate (`/wo-pn-gate`)

### Store / Vehicle Receiving / Custody (Phase 7)
- [ ] Vehicle receipt incomplete without chassis number AND all 5 required photos
- [ ] Medical items auto-set `serial_required = true` when category = 'medical'
- [ ] Temporary custody to Production/AFS requires Admin/Ops approval before issue
- [ ] Receiver must accept or reject issued material within SLA (1 day)
- [ ] Store users do NOT see purchase cost values (no cost columns in store pages)
- [ ] Custody approval actions only visible to admin / operations_manager
- [ ] Custody number auto-formatted as CUS-YYYY-NNNN
- [ ] Receipt number auto-formatted as RCP-YYYY-NNNN

### Material QC / NCR (Phase 8)
- [ ] Rejected material inspection creates NCR automatically
- [ ] NCR number auto-formatted as NCR-YYYY-NNNN
- [ ] QC users and factory users do NOT see purchase cost values
- [ ] Closure of NCR requires corrective_action + closure_notes (non-empty)
- [ ] Admin/Ops can reject a closure (status → rejected_closure)
- [ ] Material inspection number auto-formatted as MQC-YYYY-NNNN

### Project QC / Findings / Release Note (Phase 8)
- [ ] Open NCRs block Release Note issuance (readiness checklist item)
- [ ] Open findings block Release Note issuance (readiness checklist item)
- [ ] Incomplete rework blocks Release Note issuance (readiness checklist item)
- [ ] All QC inspections must be ready_for_release before Release Note can be issued
- [ ] Release Note cannot be issued when release_status = 'blocked'
- [ ] Factory can mark rework completed; QC must then close the finding
- [ ] Only admin/ops/qc_user can issue Release Note
- [ ] Release Note number auto-formatted as RN-YYYY-NNNN
- [ ] Finding number auto-formatted as FND-YYYY-NNNN
- [ ] Project QC inspection number auto-formatted as PQC-YYYY-NNNN

### Dubai / PN Gate (Phase 9)
- [ ] Dubai projects without confirmed PN show blocking banner in DubaiAfsProjectDetail
- [ ] PN gate warning displayed on all Dubai follow-up cards and project detail
- [ ] ETA update form requires both new ETA date AND reason text — button stays disabled if either empty
- [ ] ETA change history logged per followup; all past ETAs visible in history table
- [ ] Only admin/operations_manager can update Dubai ETA or confirm PN

### AFS Readiness Blockers (Phase 9)
- [ ] Pre-delivery readiness checklist enforces 4 blocking items:
  - Release Note issued (blocking)
  - No open missing items (`open_missing_items === 0`) (blocking)
  - No open NCRs (`open_ncrs === 0`) (blocking)
  - No major open condition reports (`major_damage` or `requires_repair`, not resolved/closed/cancelled) (blocking)
- [ ] Delivery approve button only visible to admin/operations_manager AND when all blocking items pass
- [ ] Arrival report + missing items creation logged via afsAudit helpers
- [ ] Missing items linked to arrival report; severity = high/critical triggers checklist failure

### After Sales Maintenance Governance (Phase 9)
- [ ] Maintenance request closure requires `resolutionNotes.trim()` — close button disabled if empty
- [ ] Status flow: open → assigned → under_inspection → parts_waiting / in_repair → completed → closed
- [ ] Only admin/operations_manager/afs_user can manage maintenance requests
- [ ] Maintenance number auto-formatted as MNT-YYYY-NNNN
- [ ] Critical priority maintenance surfaced separately in Dashboard KPIs

---

## Key Pages — Manual Test Steps

### Phase 7 — Store / Warehouse

1. **Store Dashboard** (`/store`)
   - Verify 8 KPI cards render: Material Receipts, Pending QC, Vehicles Received, Missing Photos, Custody Pending Approval, Custody Pending Acceptance, Materials in Custody, Unallocated Materials
   - Verify clicking each KPI navigates to correct route
   - Verify governance rules card displays

2. **Material Receipts** (`/store/receipts`)
   - Verify filter tabs work: All, Received, Pending QC, Accepted, Closed
   - Click "New Receipt" → verify 3-step wizard loads
   - Step 1: try to proceed without date → button disabled
   - Step 2: add an item → appears in list below
   - Step 3: Dev Mode notice should show when Supabase not configured
   - Confirm save navigates to /store/receipts

3. **Vehicle Receiving** (`/store/vehicle-receiving`)
   - Verify completeness badges show: "Photos Complete" vs count of missing photos
   - Navigate to vrc-002 → should show photos incomplete warning
   - Navigate to vrc-001 → all 5 photos present, should be marked complete
   - Check that chassis_number is required for a receipt to be considered complete

4. **Material Custody** (`/custody`)
   - Verify KPI strip shows Pending Approval, Pending Acceptance, In Custody, Returned counts
   - Verify status filter tabs work
   - Sign in as store_user → "Issue Custody" button visible
   - Sign in as viewer → "Issue Custody" button hidden
   - Navigate to cus-002 → should show pending approval banner

5. **ProjectDetail Store Tab** (`/projects/proj-005`)
   - Click Store tab → verify 3 summary cards, material receipts table, vehicle receipts table, custody records table
   - proj-005 (GACA Saudi) should have store receipts linked
   - Verify "View All" links go to correct routes

6. **Dashboard** (`/`)
   - Verify all KPI cards including Store KPIs render without errors
   - Verify Dashboard ICON_MAP includes: Package, Truck, ShieldAlert, Clock, PackageCheck
   - Confirm Store KPI cards link to /store or /custody routes

7. **Action Inbox** (`/inbox`)
   - Sign in as store_user → store tasks visible (vehicle photos, QC, custody)
   - Sign in as admin → custody pending approval task visible
   - Sign in as factory_user → custody pending acceptance task visible

### Phase 9 — Dubai / AFS + After Sales Maintenance

1. **Dubai AFS Dashboard** (`/dubai-afs`)
   - Verify 8 KPI cards render (Dubai Missing PN, Delayed ETAs, Arrival Reports Pending, Open Missing Items, Pre-Delivery Blocked, Ready for Delivery, AFS Maintenance Open, Critical Maintenance)
   - Verify follow-up list shows dpf-001 and dpf-002 (proj-006)
   - Click each KPI → verify it navigates to correct route

2. **Dubai Follow-up with PN Gate** (`/dubai-afs/projects/dpf-003`)
   - dpf-003 has `pn_reference_id: null` (proj-007, Abu Dhabi Police)
   - Verify red PN gate blocking banner appears at top of page
   - Verify ETA update form requires both date AND reason
   - Try submitting with reason empty → button should remain disabled

3. **Pre-Delivery Readiness** (`/dubai-afs/predelivery-reports/apdr-001`)
   - apdr-001 has: `release_note_issued: false`, `open_missing_items: 2`
   - Verify checklist shows at least 2 red blocking items
   - Navigate to condition reports — acr-001 is `minor_damage`, which should NOT block
   - Verify "Approve Delivery" button is hidden (blocking items not passed)
   - Sign in as afs_user → approve button should also be hidden (wrong role)
   - Sign in as admin → approve button hidden (blocking items not all passed)

4. **Maintenance Closure** (`/after-sales/maintenance/amr-001`)
   - amr-001 is `under_inspection` (GACA, high priority)
   - Advance status to `completed` → "Close" button appears
   - Try clicking "Close" with empty resolutionNotes → button should be disabled
   - Enter resolution notes → button enables

5. **New Maintenance Request** (`/after-sales/maintenance/new`)
   - Sign in as afs_user → wizard loads
   - Step 1: try "Next" without customer name → blocked
   - Step 4: Dev Mode notice should show when Supabase not configured

6. **ProjectDetail Dubai/AFS tab — Saudi project** (`/projects/proj-005`)
   - proj-005 is Saudi (GACA) — navigate to Dubai/AFS tab
   - Verify blue info banner: "Dubai follow-up does not apply to this project..."
   - Maintenance requests table should still show (after-sales can exist for Saudi projects)

7. **ProjectDetail Dubai/AFS tab — Dubai project** (`/projects/proj-006`)
   - proj-006 is Dubai (Civil Defence) — navigate to Dubai/AFS tab
   - PN gate banner should NOT appear (proj-006 has PN assigned)
   - Verify KPI strip, 4 tables (Follow-ups, Arrival Reports, Pre-delivery, Maintenance)

8. **Dashboard AFS KPIs** (`/`)
   - Scroll to "Dubai / AFS & After Sales" section
   - Verify 8 cards render with icons (Plane, FileSearch must be in ICON_MAP)

9. **Action Inbox role filtering** (`/inbox`)
   - Sign in as afs_user → should see afs-assigned tasks only
   - Sign in as operations_manager → should see ops_manager tasks (including Dubai PN task)
   - Sign in as admin → should see ALL tasks across all roles

### Phase 8.5 — Stabilization Verification

**Issues found and fixed:**
1. **ProjectDetail Factory tab** — Removed outdated "Phase 8 — QC Handover" notice. Replaced with navigation link to QC & Release tab.
2. **mockQc.ts pqc-001, pqc-002** — Updated readiness_status from `not_ready` to `released` for proj-005 inspections. Without this fix, the Release Note detail for rn-002 would show red checklist items despite the note already being issued.

**Verified clean:**
- All 12 Phase 8 routes registered and page files exist
- ProjectDetail has 11 tabs including QC & Release (between Store and Approval & Routing)
- Release Note blocking logic: 4 conditions checked, all logically correct
- Material QC governance: rejection reason required, NCR link shown, medical serial section conditional, no purchase cost shown
- Dashboard: 33 KPI cards, no duplicates, ClipboardCheck + FileCheck in ICON_MAP
- Action Inbox: 5 QC tasks (task-qc-001 to task-qc-005) present alongside all prior tasks
- No outdated "Coming in Phase 8" placeholder text in any src/ file

### Phase 9.5 — AFS / After Sales Integration Stabilization

**Issues found and fixed:**
1. **ActionInbox role-based filtering** — Admin sees all tasks; all other roles see only tasks assigned to their role (`assignedRole === role`). Previously all tasks were visible to all roles.
2. **mockDashboard.ts AFS_KPI_CARDS** — Replaced 8 placeholder cards with spec-correct set: `dubai-missing-pn`, `dubai-eta-delayed`, `afs-arrival-reports-open`, `afs-missing-items-open`, `afs-predelivery-not-ready`, `afs-ready-for-delivery`, `afs-maintenance-open`, `afs-critical-maintenance`. Fixed type annotation (`: KpiCard[]`) to resolve TS2322 trend field mismatch.
3. **mockInbox.ts** — Fixed task-010 path from `/after-sales` to `/after-sales/maintenance/amr-001`. Added 5 new role-appropriate inbox tasks for AFS/maintenance workflows.
4. **DubaiAfsPredeliveryReportDetail.tsx** — Added 4th blocking checklist item: "No major open condition reports" — checks `MOCK_AFS_CONDITION_REPORTS` for `major_damage` or `requires_repair` status that is not resolved/closed/cancelled. Correctly blocks delivery approval.
5. **ProjectDetail.tsx Dubai/AFS tab** — Updated Saudi-project banner text to: "Dubai follow-up does not apply to this project — it is routed through the Saudi factory workflow. After-sales maintenance requests are shown below if any exist."

**Verified clean after Phase 9.5:**
- All 14 Phase 9 routes registered and page files exist
- ProjectDetail has 12 tabs including Dubai / AFS (between QC & Release and Approval & Routing)
- AFS readiness checklist: 4 blocking items including condition report check
- Dashboard: 8 AFS KPI cards render with correct icons (Plane, FileSearch in ICON_MAP)
- Action Inbox: 10 AFS-related tasks present; role filtering active
- `npm run build` passes with zero TypeScript errors
- No outdated "Coming in Phase 9" placeholder text in any src/ file

### Pre-Phase 7 Regression Check

2. **Sales Workspace** (`/sales`)
   - Sign in as sales_user → should see only own quotations and projects
   - Sign in as admin → should see all
   - Verify no "Coming in Phase 2" placeholder text
   - Hot Projects / Invoicing Plan / Aging should show future-phase label

3. **Project Detail** (`/projects/proj-005`)
   - Open Procurement tab → verify PR table and PO to Supplier table load
   - Sign in as factory_user → purchase cost column should NOT appear
   - Open Factory tab → verify production records for Saudi project
   - Open `/projects/proj-006` (Dubai) → Factory tab should show AFS message

4. **Procurement** (`/procurement/purchase-orders/po-002`)
   - PO value = SAR 45,000 → should show `Pending Approval` status
   - Approve button should only appear for admin / operations_manager
   - Verify approval writes timeline event

5. **Factory** (`/factory/projects/proj-005`)
   - Verify WO gate status displays
   - Verify production status per vehicle line
   - Check requirements list renders

6. **Action Inbox** (`/inbox`)
   - Sign in as procurement_user → only procurement tasks visible
   - Sign in as factory_user → only factory/production tasks visible
   - Sign in as admin → all tasks visible

---

## Known Future Placeholders (Correct — Do Not Remove)

| Page | Placeholder Content |
|---|---|
| `/reports` | Reports / Control Tower — Phase 10 |
| Sales → Hot Projects | Hot Projects workflow — future phase |
| Sales → Invoicing Plan | Invoicing Plan — future phase |
| Sales → Aging | Aging / Receivables — future phase |

---

## Phase Completion Status

| Phase | Module | Status |
|---|---|---|
| Phase 0 | Foundation (Vite, Tailwind, Router, Layout) | ✅ Complete |
| Phase 1 | Auth, Roles, Settings, Audit Log | ✅ Complete |
| Phase 1.5 | Supabase Readiness & Dev Mode | ✅ Complete |
| Phase 2 | Project Core / SO / Approval / Routing | ✅ Complete |
| Phase 3 | WO / PN Gate | ✅ Complete |
| Phase 4 | Quotation Management + Sales Coordinator | ✅ Complete |
| Phase 5 | Procurement / PR / PO to Supplier / ETA / Suppliers | ✅ Complete |
| Phase 5.5 | Sales Workspace Completion | ✅ Complete |
| Phase 6 | Factory / Production + Raw Material Requests | ✅ Complete |
| Phase 6.5 | Integration Stabilization | ✅ Complete |
| Phase 7 | Store / Warehouse + Vehicle Receiving + Medical Serials + Material Custody | ✅ Complete |
| Phase 8 | Material QC + Project QC + NCR + Rework + Release Note | ✅ Complete |
| Phase 8.5 | QC / Release Integration Stabilization | ✅ Complete |
| Phase 9 | Dubai / AFS + After Sales Maintenance | ✅ Complete |
| Phase 9.5 | Dubai / AFS / After Sales Integration Stabilization | ✅ Complete |
| Phase 10 | Reports / Control Tower / SLA / Data Quality / Health Scores / Issues / CAPA | ✅ Complete |
