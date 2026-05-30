# Store / Warehouse Module Design

## 1. Overview and Purpose

The Store module manages the physical receipt, storage, and issuance of materials and vehicles at the warehouse. It is the gateway between procurement (purchase orders) and consumption (projects, factory, AFS). Every item that enters or leaves the facility passes through the Store module.

Core responsibilities:
- Receive materials and vehicles against purchase orders or as unallocated stock
- Enforce quality-check gates before items are issued
- Track storage locations across the facility
- Feed the Custody module when items leave the warehouse
- Provide end-to-end traceability: PO → receipt → QC → issue → project/install

The module is intentionally scope-limited: it does not handle procurement decisions, pricing negotiations, or project planning. It records what physically arrives, validates it, and makes it available to the rest of the system.

---

## 2. Material Receipt Lifecycle

### State Machine

```
draft
  └─▶ received
        └─▶ pending_material_qc
                  ├─▶ accepted
                  │     └─▶ closed
                  └─▶ rejected
                        └─▶ closed
```

### State Descriptions

| State | Meaning |
|---|---|
| `draft` | Receipt created but not yet confirmed by store staff. Items are expected but not physically verified. |
| `received` | Store user has confirmed all listed items are physically present. |
| `pending_material_qc` | Items submitted to QC for inspection. No issuance permitted during this state. |
| `accepted` | QC passed. Items are available for custody issuance. |
| `rejected` | QC failed. Items are quarantined or staged for return to supplier. |
| `closed` | All items are fully resolved (issued, returned to supplier, or written off). Terminal state — no further transitions. |

### Lifecycle Governance Rules

- **draft → received**: Store user confirms physical presence of all line items. Quantity mismatches must be noted before transition; partial receipts are recorded as a variance.
- **received → pending_material_qc**: Triggered manually by store staff or automatically for item categories flagged for QC (e.g., `medical`). Can also be skipped for low-risk categories if configured by admin.
- **pending_material_qc → accepted / rejected**: Only `qc_user`, `operations_manager`, or `admin` may make this transition. Store users cannot self-approve QC.
- **→ closed**: Admin or operations manager only. Requires all receipt items to be in a terminal sub-state (issued, returned to supplier, or written off). Closing a receipt with outstanding available stock is blocked.
- **Rejected receipts**: A rejection may spawn a return-to-supplier workflow in the Procurement module. The receipt itself remains in `rejected` until resolved, then moves to `closed`.
- **No backward transitions** outside of explicit admin override (e.g., reverting `received` to `draft` to correct a chassis number error — admin-only, audit-logged).

---

## 3. Receipt Fields

| Field | Type | Notes |
|---|---|---|
| `receipt_number` | string | Auto-generated on creation. Format: `REC-YYYY-NNNN` (e.g., `REC-2025-0042`). |
| `receipt_type` | enum | `material`, `vehicle`, `mixed` — see Section 4. |
| `po_id` | uuid (nullable) | Links to the originating purchase order in the Procurement module. Null for walk-in deliveries. |
| `project_id` | uuid (nullable) | Null when receipt is unallocated. See Section 6. |
| `received_date` | date | Date of physical arrival at the facility. |
| `received_by_user_id` | uuid | Store user who confirmed physical receipt. |
| `supplier_id` | uuid | Supplying entity. Required. |
| `status` | enum | Current lifecycle state. |
| `notes` | text (nullable) | Free-form notes from store staff. |
| `purchase_cost` | numeric (nullable) | Total cost on this receipt. **Restricted visibility — see Section 5.** |
| `storage_location` | string (nullable) | Bin, shelf, zone, or bay reference. Free-text in Phase 7. |

Each receipt has one or more `store_receipt_items` rows carrying line-level detail: quantity, unit of measure, material category, serial tracking flags, storage location overrides, and QC outcome per line.

---

## 4. Receipt Types

| Type | Description | Additional Rules |
|---|---|---|
| `material` | Pure goods receipt — raw materials, consumables, medical supplies, equipment, etc. | Standard material lifecycle applies. |
| `vehicle` | One or more vehicles being received. | Triggers vehicle-specific completeness rules: chassis number and 5 required photos mandatory. See `VEHICLE_RECEIVING_DESIGN.md`. |
| `mixed` | Both materials and vehicles on the same receipt. | Both material and vehicle validation rules apply. All vehicle items must meet vehicle completeness before the whole receipt can transition to `received`. |

---

## 5. Role Access Matrix

### Receipt Actions

| Action | admin | operations_manager | store_user | factory_user | qc_user | afs_user | viewer |
|---|---|---|---|---|---|---|---|
| Create receipt | Yes | Yes | Yes | No | No | No | No |
| Edit draft | Yes | Yes | Yes | No | No | No | No |
| Confirm received | Yes | Yes | Yes | No | No | No | No |
| Submit to QC | Yes | Yes | Yes | No | No | No | No |
| Approve / reject QC | Yes | Yes | No | No | Yes | No | No |
| View receipt (general) | Yes | Yes | Yes | Own project only | Own project only | Own project only | Read-only |
| View purchase cost | Yes | Yes | No | No | No | No | No |
| Assign project_id | Yes | Yes | No | No | No | No | No |
| Close receipt | Yes | Yes | No | No | No | No | No |
| Delete draft | Yes | Yes | No | No | No | No | No |

### Purchase Cost Visibility

`purchase_cost` is **not visible** to `store_user`, `factory_user`, `qc_user`, `afs_user`, or `viewer`.

Enforcement is two-layered:
1. **UI layer**: The cost field is omitted entirely from the rendered component for restricted roles. It is never fetched into client state.
2. **API / RLS layer**: The Supabase RLS policy and column-level select restriction prevent the value from being returned in any query response for restricted roles. Even a direct API call will not return the field.

This applies to both the receipt-level `purchase_cost` and any per-line unit cost fields on `store_receipt_items`.

---

## 6. Unallocated Materials

A receipt is **unallocated** when `project_id IS NULL`. This is valid and expected in several scenarios:
- Items arrive before the target project is formally created in the system.
- Stock is purchased for general inventory (not project-specific).
- The originating PO was not tied to a specific project.

### Unallocated Assignment Process

1. `admin` or `operations_manager` accesses the unallocated receipts filter in the Store module.
2. They select a receipt and assign a `project_id` from the project picker.
3. The assignment action is audit-logged: user ID, timestamp, previous value (null), new project_id.
4. Once assigned, all receipt items become visible in the target project's Store tab.
5. **Partial assignment is not supported at the receipt level.** If items need to be split across projects, this is handled downstream at the custody issuance level — separate custody records reference the same receipt item with different quantities and project IDs.
6. Unallocated receipts appear on the admin/ops dashboard as a KPI: "Unallocated receipts pending assignment."

---

## 7. Medical Items

Items with `material_category = 'medical'` require serial number tracking. The `serial_required` flag on each `store_receipt_items` row is set to `true` when the category is `medical`. This flag cannot be manually set to `false` for medical items.

### Tracked Fields per Medical Item Serial Record

| Field | Description |
|---|---|
| `serial_number` | Unique device identifier. **Mandatory for medical items.** |
| `batch_number` | Manufacturer batch or lot number. Required for consumables and drugs. |
| `expiry_date` | Expiry date. Required for consumables and drugs with a shelf life. |
| `manufacturer` | Manufacturer name. |
| `supplier_name` | The supplier from whom this specific unit was sourced. |

### Governance

- A medical receipt item **cannot** be moved to `accepted` until serial number records exist for every unit in the received quantity (e.g., if 3 AEDs were received, 3 serial records must exist).
- Attempting to accept a medical item with missing serial records returns a validation error listing the shortfall.
- Serial records are **immutable** once created. To correct an error, a new serial record is created and linked to the original via a `superseded_by` foreign key. The original record is soft-deleted.
- The `pending_material_qc` state for medical items requires QC review of each serial record. QC status per serial: `not_checked → pending_qc → passed / failed`.

See `MEDICAL_SERIAL_TRACKING_DESIGN.md` for full serial record lifecycle and current-status state machine.

---

## 8. Storage Location Tracking

Each receipt and each `store_receipt_items` row can carry a `storage_location` string (e.g., `A-03-B`, `Cold Room 2`, `Vehicle Bay 1`). This is free-text in Phase 7.

Rules:
- Storage location is set by the store user during or after receipt confirmation.
- Item-level `storage_location` overrides the receipt-level `storage_location` for that specific line.
- Visible to all roles that have view access to the receipt.
- Does not affect state transitions — it is informational only.
- Planned for Phase 9+: structured location hierarchy (zone → aisle → shelf → bin) with barcode/QR scan support.

---

## 9. Integration Points

### Procurement Module (PO → Receipt Link)

- A receipt may reference a `po_id`.
- When linked, the receipt wizard pre-populates supplier, expected line items, and quantities from the PO.
- Confirmed receipt quantities are written back to PO line items as `received_qty`.
- A PO line is `fully_received` when `received_qty >= ordered_qty`.
- A PO is `fully_received` when all its lines are fully received.
- Receipts can also be created without a PO (walk-in deliveries); in this case `po_id` is null.

### Projects Module (project_id)

- `project_id` on the receipt determines which project's Store tab shows the items.
- Project-scoped roles (factory, AFS, QC) only see receipts assigned to their project. RLS enforces this.
- Changes to `project_id` are audit-logged (timestamp, old value, new value, actor).

### Custody Module

- Accepted receipt items are eligible for issuance via a custody record.
- A `store_receipt_item` can only be issued once its parent receipt status is `accepted`.
- The custody record carries `store_receipt_item_id` as a foreign key back to the receipt line.
- `store_receipt_items.available_qty` is decremented when a custody record is issued and incremented if the item is returned.
- See `MATERIAL_CUSTODY_DESIGN.md` for full custody lifecycle.
