# Integration Smoke Test — Phase 8

Last updated: 2026-05-31
Covers: Phases 0–8 (Foundation through Material QC / Project QC / Release Note)

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
| `/projects/:id` | ProjectDetail | ✅ Built — 11 tabs (Overview, SO Details, Vehicle Lines, Documents, Procurement, Factory, Store, QC & Release, Approval & Routing, Timeline, Audit) |
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

### Future Phases (Placeholder)
| Route | Module | Target Phase |
|---|---|---|
| `/dubai-afs` | Dubai / AFS | Phase 9 |
| `/after-sales` | After Sales Maintenance | Phase 9 |
| `/reports` | Reports / Control Tower | Phase 10 |

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
| `/dubai-afs` | Dubai / AFS — Phase 9 |
| `/after-sales` | After Sales Maintenance — Phase 9 |
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
| Phase 9 | Dubai / AFS + After Sales Maintenance | 🔲 Planned |
| Phase 10 | Reports / Control Tower / SLA / Data Quality | 🔲 Planned |
