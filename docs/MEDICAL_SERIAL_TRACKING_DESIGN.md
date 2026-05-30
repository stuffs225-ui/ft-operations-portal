# Medical Serial Tracking Design

Phase 7 — Store / Warehouse module

---

## Why Serial Tracking

Medical items (AEDs, oxygen regulators, infirmary supplies, diagnostic equipment) require
full chain-of-custody traceability from receipt through installation or consumption.
Regulations and insurance requirements mandate that each unit can be individually
identified, inspected, and recalled if necessary.

---

## Trigger: How Serial Tracking Is Activated

When a `StoreReceiptItem` is created with `material_category = 'medical'`, the
`serial_required` flag is automatically set to `true`. This happens both in the UI
(category dropdown onChange handler) and must be enforced at the DB layer via a trigger.

A store user cannot manually uncheck `serial_required` on medical items — the checkbox
is read-only when the category is medical.

---

## Serial Number Record — Fields

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `store_receipt_item_id` | uuid | FK → store_receipt_items |
| `project_id` | uuid | Denormalised from item for fast querying |
| `serial_number` | text | Unique identifier, not null |
| `batch_number` | text? | Lot / batch from manufacturer |
| `expiry_date` | date? | For consumables and calibrated equipment |
| `manufacturer` | text? | OEM name |
| `supplier_name` | text? | Supplier who delivered this unit |
| `qc_status` | enum | not_checked → pending_qc → passed / failed |
| `current_status` | enum | in_store → in_custody → installed → returned → consumed → lost_or_damaged |
| `current_holder_type` | text? | Role or department currently holding the item |
| `current_holder_id` | uuid? | Profile ID of current holder |
| `installed_on_project_vehicle_line_id` | uuid? | FK → project_vehicle_lines |
| `installed_at` | timestamptz? | When installed |
| `remarks` | text? | Free-form notes |
| `created_by` | uuid? | FK → profiles |
| `created_at` | timestamptz | Default now() |
| `updated_at` | timestamptz | Updated by trigger |

---

## QC Status State Machine

```
not_checked
    │ QC team inspects (Phase 8)
    ▼
pending_qc
    │ QC pass                │ QC fail
    ▼                        ▼
  passed                   failed
```

- `not_checked`: Default on receipt. Serial exists but hasn't been inspected yet.
- `pending_qc`: QC team has started review but not yet concluded.
- `passed`: Serial cleared for use, storage, or installation.
- `failed`: Unit rejected — must be quarantined. Cannot be issued to custody.

Phase 7 records serials with `qc_status = 'not_checked'`. Phase 8 (Material QC)
will implement the full QC workflow.

---

## Current Status State Machine

```
in_store
    │ Issued to custody
    ▼
in_custody
    │ Installed          │ Returned to store
    ▼                    ▼
installed           in_store (re-entry)
    │
consumed (if consumable)
```

Additional terminal states:
- `lost_or_damaged`: Written off. Triggers audit entry.
- `consumed`: Used up / single-use medical consumable.

---

## Receipt → Serial Entry Flow

1. Store user creates a new material receipt (3-step wizard).
2. When adding an item with `material_category = 'medical'`, `serial_required` is
   automatically checked and locked.
3. After the receipt is saved, the user must enter serial numbers for each medical item.
4. Serial entry is on the StoreReceiptDetail page → Serial Numbers tab.
5. Each unit's serial is entered individually (quantity = 3 → 3 serial records required).
6. System validates that all serial numbers are entered before the receipt can move
   from `received` to `pending_material_qc`.

---

## Custody and Installation

When a medical item is issued via Material Custody:
- The `MaterialCustodyRecord` references the `store_receipt_item_id`.
- The associated `MedicalSerialNumber` record's `current_status` moves to `in_custody`.
- `current_holder_type` and `current_holder_id` are set to the receiver's role/profile.

When installed on a vehicle:
- `installed_on_project_vehicle_line_id` is set.
- `installed_at` is recorded.
- `current_status` = `installed`.

---

## Role Access

| Role | Can View Serials | Can Enter Serials | Can Update QC Status |
|---|---|---|---|
| admin | ✅ | ✅ | ✅ |
| operations_manager | ✅ | ✅ | ✅ |
| store_user | ✅ | ✅ | ❌ |
| qc_user | ✅ | ❌ | ✅ (Phase 8) |
| factory_user | ✅ (items issued to production) | ❌ | ❌ |
| afs_user | ✅ (items issued to AFS) | ❌ | ❌ |
| viewer | ❌ | ❌ | ❌ |

Purchase cost / unit value is never shown to store_user, factory_user, qc_user, afs_user, or viewer.

---

## Phase 8 Integration

Phase 8 (Material QC) will:
- Add a dedicated QC workspace for medical serials
- Allow qc_user to set `qc_status = passed/failed` per serial
- Block custody issuance for serials with `qc_status = failed`
- Require all serials for a receipt to pass QC before the receipt moves to `accepted`
- Generate QC pass/fail certificates
