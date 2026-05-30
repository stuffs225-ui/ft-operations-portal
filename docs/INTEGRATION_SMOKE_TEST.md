# Integration Smoke Test — Phase 6.5

Last updated: 2026-05-30
Covers: Phases 0–6 (Foundation through Factory/Production)

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
| `/projects/:id` | ProjectDetail | ✅ Built — 9 tabs |
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

### Future Phases (Placeholder)
| Route | Module | Target Phase |
|---|---|---|
| `/store` | Store / Warehouse | Phase 7 |
| `/custody` | Material Custody | Phase 7 |
| `/vehicle-receiving` | Vehicle Receiving | Phase 7 |
| `/material-qc` | Material QC | Phase 8 |
| `/project-qc` | Project / Vehicle QC | Phase 8 |
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

---

## Key Pages — Manual Test Steps

### Before Phase 7 (Store / Warehouse)

1. **Dashboard** (`/`)
   - Verify all KPI cards render without errors
   - Verify clicking a card navigates to the correct route
   - Confirm governance rules banner displays

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
| `/store` | Store / Warehouse — Phase 7 |
| `/custody` | Material Custody — Phase 7 |
| `/vehicle-receiving` | Vehicle Receiving — Phase 7 |
| `/material-qc` | Material QC — Phase 8 |
| `/project-qc` | Project QC — Phase 8 |
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
| Phase 7 | Store / Warehouse + Vehicle Receiving + Material Custody | 🔲 Next |
| Phase 8 | Material QC + Project QC + Release Note | 🔲 Planned |
| Phase 9 | Dubai / AFS + After Sales Maintenance | 🔲 Planned |
| Phase 10 | Reports / Control Tower / SLA / Data Quality | 🔲 Planned |
