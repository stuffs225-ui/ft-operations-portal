# Procurement Workflow Design

## Overview
The procurement module manages the full lifecycle from Purchase Request (PR) to receipt of materials, including PO to Supplier issuance, ETA tracking, and high-value PO approval.

**Important terminology:** Always use "PO to Supplier". Never use "BO".

## PR Lifecycle

```
draft → pr_received → in_progress → partially_ordered → fully_ordered
                                                       ↘ cancelled / closed
```

| Status | Meaning |
|---|---|
| draft | Created but not yet formally submitted to procurement |
| pr_received | Formally received by procurement team |
| in_progress | Procurement team is actively working on items |
| partially_ordered | Some items have POs issued, others pending |
| fully_ordered | All items have corresponding POs |
| cancelled | PR cancelled |
| closed | PR completed and archived |

## PR Item States

```
pending → waiting_for_po_to_supplier → po_to_supplier_created → eta_confirmed → in_transit → partially_received → fully_received
                                                                              ↘ delayed → (back to eta_confirmed after update)
                                                                                         ↘ cancelled
```

## PO to Supplier Lifecycle

```
draft → pending_approval (if >10k SAR) → approved → sent_to_supplier → eta_confirmed → in_transit → partially_received → fully_received
      ↘ (if ≤10k SAR)  → sent_to_supplier (direct)
      ↘ rejected (admin can reject high-value POs)
      ↘ delayed (ETA missed)
      ↘ cancelled
      ↘ closed
```

## High-Value PO Approval Gate

Any PO to Supplier with `purchase_value > 10,000 SAR` requires:
1. `approval_required = true` (set automatically by DB trigger)
2. `approval_status = 'pending'` initially
3. Admin or Operations Manager must approve
4. Only after `approval_status = 'approved'` can the PO be moved to `sent_to_supplier`

## Role Matrix

| Role | View PRs | Manage PRs | View PO Cost | Approve PO | Manage Suppliers |
|---|---|---|---|---|---|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| operations_manager | ✅ | ✅ | ✅ | ✅ | ✅ |
| procurement_user | ✅ | ✅ | ✅ | ❌ | ✅ |
| factory_user | ✅ (status only) | ❌ | ❌ | ❌ | ❌ |
| store_user | ✅ (status only) | ❌ | ❌ | ❌ | ❌ |
| qc_user | ✅ (status only) | ❌ | ❌ | ❌ | QC fields only |
| afs_user | ✅ (status only) | ❌ | ❌ | ❌ | ❌ |
| viewer | ✅ (status only) | ❌ | ❌ | ❌ | ❌ |
| sales_user | ❌ | ❌ | ❌ | ❌ | ❌ |

**Purchase cost data (purchase_value, unit_price, line_total) is hidden from Factory, Store, QC, AFS, and Viewer roles.**

## ETA Tracking

Every ETA update on a PO or PR item is recorded in `eta_change_history` with:
- `old_eta` and `new_eta`
- `reason` (required)
- `remarks` (optional)
- `changed_by` and `changed_at`

See `ETA_CHANGE_HISTORY_DESIGN.md` for full details.

## Supplier Governance

All suppliers must be in `approved_suppliers` before being used on a PO. See `SUPPLIER_GOVERNANCE_DESIGN.md`.
