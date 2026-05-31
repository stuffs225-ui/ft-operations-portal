# Role Visibility Matrix

**Last updated:** 2026-05-31 (Phase 10.5)

---

## Roles

| Code | Display Name |
|---|---|
| `admin` | Administrator |
| `operations_manager` | Operations Manager |
| `sales_user` | Sales User |
| `sales_coordinator` | Sales Coordinator |
| `procurement_user` | Procurement User |
| `factory_user` | Factory User |
| `store_user` | Store User |
| `qc_user` | QC Inspector |
| `afs_user` | AFS / Dubai User |
| `viewer` | Read-Only Viewer |

---

## Navigation Access

| Page | admin | ops_mgr | sales | sales_coord | proc | factory | store | qc | afs | viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Projects | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Quotations | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| Procurement | ✅ | ✅ | — | — | ✅ | — | — | — | — | — |
| Factory | ✅ | ✅ | — | — | — | ✅ | — | — | — | — |
| Store | ✅ | ✅ | — | — | — | — | ✅ | — | — | — |
| QC | ✅ | ✅ | — | — | — | — | — | ✅ | — | — |
| AFS / Dubai | ✅ | ✅ | — | — | — | — | — | — | ✅ | — |
| After-Sales | ✅ | ✅ | — | — | — | — | — | — | ✅ | — |
| Reports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Control Tower | ✅ | ✅ | — | — | — | — | — | — | — | ✅ |
| Admin Approvals | ✅ | ✅ | — | — | — | — | — | — | — | — |
| Settings | ✅ | ✅ | — | — | — | — | — | — | — | — |
| Inbox | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

---

## Financial Visibility

`total_sales_value`, `unit_cost`, `line_cost`, `po_value`, `total_cost` — visible only to:

| Field | admin | ops_mgr | all others |
|---|:---:|:---:|:---:|
| Project total_sales_value | ✅ | ✅ | ❌ |
| Procurement unit/line costs | ✅ | ✅ | ❌ |
| PO to Supplier amounts | ✅ | ✅ | ❌ |
| Supplier scorecard spend | ✅ | ✅ | ❌ |

---

## Project Actions

| Action | admin | ops_mgr | sales_user | others |
|---|:---:|:---:|:---:|:---:|
| Create new SO | ✅ | ✅ | ✅ | ❌ |
| Edit own draft | ✅ | ✅ | ✅ (own) | ❌ |
| Submit for approval | ✅ | ✅ | ✅ (own) | ❌ |
| Approve / Route | ✅ | ✅ | ❌ | ❌ |
| Send back for revision | ✅ | ✅ | ❌ | ❌ |
| Reject | ✅ | ✅ | ❌ | ❌ |
| View approved project | ✅ | ✅ | ✅ | ✅ (own role) |

---

## Module-Level Write Access

| Module | Write Roles |
|---|---|
| Quotations | admin, operations_manager, sales_user |
| Procurement | admin, operations_manager, procurement_user |
| Factory | admin, operations_manager, factory_user |
| Store | admin, operations_manager, store_user |
| QC | admin, operations_manager, qc_user |
| AFS / Dubai | admin, operations_manager, afs_user |
| After-Sales Maintenance | admin, operations_manager, afs_user |
| Issues & Risks | admin, operations_manager |
| CAPA | admin, operations_manager, qc_user |
| SLA Management | admin, operations_manager |

---

## Governance Gates

| Gate | Enforced by |
|---|---|
| WO required before Saudi factory execution | UI warning + DB function `can_start_saudi_factory` |
| PN required before Dubai follow-up | UI warning + DB function `can_start_dubai_followup` |
| PO > 10,000 SAR requires Admin/Ops approval | Procurement approval workflow |
| Release Note required before ready-for-delivery | ReleaseStatus gate check |
| Open missing items block pre-delivery readiness | AFS pre-delivery checklist |
| Maintenance closure requires resolution notes | Maintenance close action validation |
| Medical items require serial number tracking | QC serial number fields (Phase 6+) |
| Every vehicle needs chassis + photos before delivery | AFS pre-delivery checklist (Phase 9+) |
