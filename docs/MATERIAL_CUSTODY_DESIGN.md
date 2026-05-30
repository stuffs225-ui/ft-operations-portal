# Material Custody Design

## 1. Overview

The Custody module governs the movement of items out of the warehouse and into the hands of a person or department. It creates a traceable chain of responsibility from the moment an item leaves the store until it is installed, consumed, returned, or written off.

Every outbound movement — whether a tool borrowed by a technician or a medical device permanently assigned to a vehicle — is recorded as a custody record. The module enforces approval gates for high-risk issues, an SLA for receiver acknowledgement, and a terminal state for every item outcome.

---

## 2. Custody Lifecycle

### State Machine

```
draft
  └─▶ pending_approval          (conditional — see Section 4)
        └─▶ approved_for_issue
              └─▶ issued
                    └─▶ pending_acceptance
                          ├─▶ in_custody               (receiver accepted)
                          │     ├─▶ installed
                          │     ├─▶ returned
                          │     ├─▶ consumed_by_project
                          │     └─▶ lost_or_damaged
                          └─▶ cancelled                (receiver rejected or store cancelled)
```

### State Descriptions

| State | Meaning |
|---|---|
| `draft` | Custody record created by store staff. Not yet submitted for approval or issue. |
| `pending_approval` | Awaiting admin or operations manager approval. Applies to temporary custody to Production or AFS. |
| `approved_for_issue` | Approved and ready for physical handover to the receiver. |
| `issued` | Item has physically left the store. Receiver has been notified. |
| `pending_acceptance` | Receiver notified. Awaiting their explicit acceptance or rejection within the SLA window. |
| `in_custody` | Receiver accepted the item. They are now the responsible party. |
| `installed` | Item installed on a vehicle, project asset, or fixed location. |
| `returned` | Item physically returned to the store. Stock is replenished. |
| `consumed_by_project` | Consumable fully used within a project. No return expected. Terminal state. |
| `lost_or_damaged` | Item lost or damaged while in custody. Notes required. Terminal state. |
| `cancelled` | Issuance cancelled — either by the receiver rejecting, by the approver rejecting, or by store staff cancelling before issue. |

---

## 3. Issue Types

| Type | Description | Approval Required? |
|---|---|---|
| `temporary_custody` | Item is loaned to the receiver. Return is expected. | Yes, when issuing to Production or AFS (see Section 4). No for all other departments. |
| `permanent_assign` | Item is permanently assigned to the receiver. No return expected. | No. |

The `issue_type` is set at the time of record creation and is **immutable** once the record moves past `draft`. If the wrong type was selected, the draft must be deleted and re-created.

---

## 4. Approval Requirement

**Temporary custody issued to the Production or AFS department requires explicit approval from an `admin` or `operations_manager` before the item can be physically handed over.**

### Approval Gate Logic

At the point of submitting a custody record from `draft`:

- `issue_type = 'temporary_custody'` AND `issued_to_department IN ('production', 'afs')` → status transitions to `pending_approval`. An action inbox task is created for all `admin` and `operations_manager` users.
- All other combinations (permanent assign to any department, or temporary custody to any department other than `production`/`afs`) → skip `pending_approval`, advance directly to `approved_for_issue`.

### Approval Actions

| Action | Result | Notes |
|---|---|---|
| Approve | `approved_for_issue` | Store user is notified. Physical handover can proceed. |
| Reject | `cancelled` | Rejection reason is recorded in `approval_notes`. Store user is notified. Item returns to available stock. |

The approver must provide a reason when rejecting. Approving does not require a reason, though notes are allowed.

---

## 5. Receiver SLA

Once a custody record reaches `pending_acceptance`, the receiver has **1 calendar day** to accept or reject.

- If no action is taken within 1 calendar day, the record is flagged: `sla_breached = true`.
- An action inbox task is created for the receiver's manager (`operations_manager` or `admin`).
- The SLA breach does **not** automatically cancel the record. A human must intervene — either chasing the receiver or manually cancelling.
- SLA breach is logged with a timestamp. The record continues to wait for receiver action until manually resolved.

---

## 6. Receiver Decision

Once a custody record is in `pending_acceptance`, the receiver (the specific user named in `issued_to_user_id`) takes one of the following actions:

| Decision | Resulting State | Requirements |
|---|---|---|
| Accept | `in_custody` | Receiver confirms they have physically received the item. |
| Reject | `cancelled` | Receiver must provide a rejection reason. Item returns to available store stock. |

### Post-Acceptance Actions (from `in_custody`)

Once the receiver holds the item, they can take the following actions from their custody dashboard:

| Action | Resulting State | Requirements |
|---|---|---|
| Mark installed | `installed` | Must provide `installed_on_project_vehicle_line_id` (for vehicle-mounted equipment) or a project reference. `installed_at` timestamp is auto-set. |
| Initiate return | `returned` | Triggers store user notification. Store user confirms physical receipt, and available stock is replenished. |
| Mark consumed | `consumed_by_project` | For consumables only. `project_id` confirmation required. Terminal state. |
| Report lost / damaged | `lost_or_damaged` | `damage_notes` (non-empty) required. An action inbox task is created for `operations_manager`. Terminal state. |

---

## 7. Custody Record Fields

| Field | Type | Notes |
|---|---|---|
| `custody_number` | string | Auto-generated on creation. Format: `CUS-YYYY-NNNN` (e.g., `CUS-2025-0017`). Unique, never reused. |
| `store_receipt_item_id` | uuid | FK to the specific line item being issued. The item's parent receipt must be in `accepted` status. |
| `quantity_issued` | numeric | Quantity being issued on this record. Must be ≤ `store_receipt_items.available_qty`. |
| `issue_type` | enum | `temporary_custody` or `permanent_assign`. Immutable after `draft`. |
| `issued_to_role` | enum | Role of the receiver (e.g., `factory_user`, `afs_user`). |
| `issued_to_department` | enum | Department of the receiver (`production`, `afs`, `qc`, `store`, etc.). |
| `issued_to_user_id` | uuid | FK to `profiles`. The specific individual receiving the item. |
| `project_id` | uuid (nullable) | Project context for the issue. Required for project-specific issuances. |
| `issued_date` | date | Date of physical handover. Set when transitioning to `issued`. |
| `expected_return_date` | date (nullable) | For temporary custody. Set by store user at time of issue. |
| `actual_return_date` | date (nullable) | Populated when item is returned to store. |
| `approval_required` | boolean | Computed at creation. True when `issue_type = 'temporary_custody'` AND `issued_to_department IN ('production', 'afs')`. |
| `approved_by_user_id` | uuid (nullable) | Identity of the approver. |
| `approved_at` | timestamptz (nullable) | Timestamp of approval action. |
| `approval_notes` | text (nullable) | Rejection reason (required on rejection) or optional approval comment. |
| `status` | enum | Current lifecycle state. |
| `notes` | text (nullable) | General notes from store staff at time of issue. |
| `sla_breached` | boolean | Set `true` when acceptance deadline is exceeded without receiver action. |
| `installed_on_project_vehicle_line_id` | uuid (nullable) | FK to `project_vehicle_lines`. Populated when `status = 'installed'`. |
| `installed_at` | timestamptz (nullable) | Timestamp of installation. |
| `damage_notes` | text (nullable) | Required when `status = 'lost_or_damaged'`. |

---

## 8. Return / Install / Consume Workflow

### Return

1. Receiver initiates return from their custody dashboard.
2. Custody status moves to `returned`.
3. `actual_return_date` is populated with the current date.
4. Store user receives an action inbox notification to confirm physical return.
5. Store user confirms receipt → `store_receipt_items.available_qty` is incremented by `quantity_issued`.
6. If the item has serial records, all associated serials move back to `current_status = 'in_store'`.

### Install

1. Receiver marks item as `installed` from their custody dashboard.
2. Required: `installed_on_project_vehicle_line_id` for vehicle-mounted equipment, or a project reference for non-vehicle installations.
3. `installed_at` is auto-set to the current timestamp.
4. Medical serial records linked to this custody record are updated to `current_status = 'installed'` and `installed_at` is set.
5. `installed` is a terminal state for the item — no further custody actions are taken on it.

### Consume

1. Receiver marks a consumable item as `consumed_by_project`.
2. `project_id` must be confirmed on the action (it should already be on the custody record; this is a confirmation step).
3. `store_receipt_items.available_qty` is not restored — the quantity is written off.
4. Terminal state.

### Lost or Damaged

1. Receiver reports loss or damage from their custody dashboard.
2. `damage_notes` must be non-empty before submission.
3. Status set to `lost_or_damaged`.
4. An action inbox task is created for `operations_manager` and `admin`.
5. Serial records for medical items are updated to `current_status = 'lost_or_damaged'`.
6. Disposition (write-off, insurance claim, replacement order) is handled outside the custody record by operations management.

---

## 9. Role Access Matrix

| Action | admin | operations_manager | store_user | factory_user | afs_user | qc_user | viewer |
|---|---|---|---|---|---|---|---|
| Create custody record | Yes | Yes | Yes | No | No | No | No |
| Edit draft | Yes | Yes | Yes | No | No | No | No |
| Submit for approval / issue | Yes | Yes | Yes | No | No | No | No |
| Approve / reject pending approval | Yes | Yes | No | No | No | No | No |
| Mark issued | Yes | Yes | Yes | No | No | No | No |
| Accept custody (as named receiver) | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Reject custody (as named receiver) | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Mark installed | Yes | Yes | No | Yes | Yes | No | No |
| Initiate return | Yes | Yes | No | Yes | Yes | No | No |
| Mark consumed | Yes | Yes | No | Yes | Yes | No | No |
| Report lost / damaged | Yes | Yes | No | Yes | Yes | No | No |
| View all custody records | Yes | Yes | Yes | No | No | No | No |
| View own custody records | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Cancel a custody record | Yes | Yes | Yes | No | No | No | No |

**factory_user** and **afs_user** can only accept/reject, and take post-acceptance actions, on custody records where they are the named `issued_to_user_id`. They cannot browse or create custody records.

---

## 10. Integration Points

### store_receipt_items

- Each custody record references a `store_receipt_item_id`.
- The item's parent receipt must be in `accepted` status for the item to be eligible for issuance. Items in `pending_material_qc` or `rejected` receipts cannot be issued.
- `store_receipt_items.available_qty` is decremented on `issued` and incremented on `returned`. On `consumed_by_project` or `lost_or_damaged`, the quantity is written off and not restored.

### Projects

- `project_id` on the custody record links it to the relevant project.
- Project stakeholders can see custody records for their project in the project Store tab.
- `consumed_by_project` requires a valid `project_id`.

### Profiles (Users)

- `issued_to_user_id` is a FK to the `profiles` table.
- The receiver is notified via action inbox when the custody record reaches `pending_acceptance`.
- The approver (when approval is required) receives an action inbox task at `pending_approval`.
- SLA breach notifications go to the `operations_manager` and `admin` roles, not to the receiver directly.

### Medical Serial Tracking

- When a medical item is issued via custody, all associated serial number records for that item are updated:
  - `current_status` → `in_custody`
  - `current_holder_type` → the receiver's role/department
  - `current_holder_id` → `issued_to_user_id`
- On `installed`: serial records → `current_status = 'installed'`, `installed_at` set.
- On `returned`: serial records → `current_status = 'in_store'`, holder fields cleared.
- On `lost_or_damaged`: serial records → `current_status = 'lost_or_damaged'`.
- See `MEDICAL_SERIAL_TRACKING_DESIGN.md` for the full serial state machine.
