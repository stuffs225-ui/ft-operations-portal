# Material QC Workflow Design

## Purpose

QC inspects materials received by Store before those materials can be consumed in production or allocated to projects. No material passes to the floor until a QC inspection has been completed with an accepted result.

---

## Trigger

A Material QC inspection becomes available when a `store_receipt` reaches status `received`. At that point, all associated `store_receipt_items` are eligible for inspection. QC users see a pending inspection queue populated from these records.

---

## Inspection Number Format

```
MQC-YYYY-NNNN
```

- Auto-generated at inspection creation
- Year is the calendar year of creation
- Sequence resets each year, zero-padded to 4 digits
- Example: `MQC-2025-0047`

---

## Inspection Lifecycle

```
pending → in_progress → completed
                      → cancelled
```

| Status | Description |
|--------|-------------|
| `pending` | Inspection record created, not yet started |
| `in_progress` | QC user has opened and begun the inspection |
| `completed` | Inspection finished; result recorded |
| `cancelled` | Inspection voided (requires reason) |

Transition rules:
- Only a QC user, admin, or ops_manager can move `pending → in_progress`
- `completed` requires a final inspection result to be set
- `cancelled` requires cancellation reason; cannot cancel a `completed` inspection

---

## Inspection Results

Result is set when transitioning to `completed`.

| Result | Meaning |
|--------|---------|
| `pending` | Default state before inspection completes |
| `accepted` | Material conforms fully; cleared for use |
| `accepted_with_comments` | Minor non-conformances noted; material cleared with remarks |
| `rejected` | Material does not conform; barred from use; NCR required |
| `pending_supplier_clarification` | Awaiting supplier input before final decision |
| `pending_rework` | Material requires rework before re-inspection |

Result transitions:
- `pending` → any result (when completing the inspection)
- `rejected` result **must** trigger NCR auto-creation (see Rejection Flow)
- `accepted_with_comments` requires comments field to be populated
- `pending_supplier_clarification` and `pending_rework` leave the inspection in `completed` but do not clear the material for use

---

## What QC Checks

For each `store_receipt_item` under inspection:

| Check | Notes |
|-------|-------|
| Item specification | Part number, description, and spec match the purchase order |
| Quantity | Received quantity matches ordered and delivery note quantity |
| Condition | Physical state — no damage, corrosion, or contamination |
| Serial numbers | Required for medical items (see Medical Serial Integration below) |

Additional fields captured during inspection:
- `inspection_notes` — free text observations per item
- `defect_description` — populated if result is rejected or accepted_with_comments
- `photos` — document attachments (linked via document management)

---

## Medical Serial Integration

When a `store_receipt_item` has `serial_required = true` (set on the item's product record), the inspection must verify individual serial numbers.

- Each `medical_serial_number` record linked to the receipt item appears in the inspection form
- QC confirms or flags each serial number individually
- If any serial number is flagged as non-conforming, the item result is set to `rejected` or `accepted_with_comments`
- The inspection record stores a foreign key reference to the relevant `medical_serial_number` records
- Serial number verification status is stored on the serial record: `verified` | `flagged` | `unverified`

---

## Rejection Flow

When an inspection result is set to `rejected`:

1. System automatically creates an NCR record (see `MATERIAL_NCR_WORKFLOW_DESIGN.md`)
2. NCR is linked to the inspection via `material_qc_inspection_id`
3. NCR is also linked to the originating `store_receipt` and `store_receipt_item`
4. The rejected `store_receipt_item` is flagged as `quarantined = true` — unavailable for allocation or use
5. A timeline event is written to the project (if the receipt is project-linked): `material_rejected_ncr_raised`

The NCR must be closed before the material can be re-accepted or written off.

---

## Role Matrix

### Create Inspection

| Role | Can Create |
|------|-----------|
| `qc_user` | Yes |
| `admin` | Yes |
| `ops_manager` | Yes |
| `store_user` | No |
| `factory_user` | No |
| `afs_user` | No |
| `sales_user` | No |
| `procurement_user` | No |

### View Inspection

| Role | Visibility |
|------|-----------|
| `qc_user` | Full inspection detail including all fields |
| `admin` | Full access |
| `ops_manager` | Full access |
| `store_user` | Own receipt inspections only; no purchase cost fields |
| `procurement_user` | Own PO-linked inspections; no purchase cost fields |
| `factory_user` | Result and status only (no item-level detail) |
| `afs_user` | Result and status only |
| `sales_user` | No access |

### Cost Visibility

QC users **never** see purchase costs. The `unit_price`, `total_value`, and any cost-related fields on `store_receipt_items` are excluded from all QC inspection views, regardless of role.

---

## Integration with Store

- `material_qc_inspections.store_receipt_id` → `store_receipts.id`
- `material_qc_inspection_items.store_receipt_item_id` → `store_receipt_items.id`
- A single inspection covers one `store_receipt`; multiple `store_receipt_items` are inspected as child records
- `store_receipt_items.qc_status` is updated when the inspection result is set:
  - `accepted` / `accepted_with_comments` → item `qc_status = cleared`
  - `rejected` → item `qc_status = rejected`
  - `pending_supplier_clarification` / `pending_rework` → item `qc_status = on_hold`

---

## Integration with Release Note

Open NCRs originating from material inspections block Release Note issuance for the linked project. See `MATERIAL_NCR_WORKFLOW_DESIGN.md` for NCR lifecycle and `RELEASE_NOTE_GOVERNANCE_DESIGN.md` for the full blocking rule set.

---

## Data Model References

Key tables involved:

- `material_qc_inspections` — header record per receipt
- `material_qc_inspection_items` — one row per inspected receipt item
- `store_receipts` — the parent receipt
- `store_receipt_items` — individual line items on the receipt
- `medical_serial_numbers` — serial number records for medical items
- `material_ncrs` — created on rejection
