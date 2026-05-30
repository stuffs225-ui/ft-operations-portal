# Vehicle Receiving Design

## 1. Overview

Vehicle receipts handle the intake of vehicles into the facility. They share the top-level `store_receipts` table (`receipt_type = 'vehicle'` or `'mixed'`) but require additional validation beyond a standard material receipt: a chassis number and a complete photo set are mandatory before any delivery or assignment can proceed.

The vehicle receiving flow exists because vehicles are high-value, individually identifiable assets. Each vehicle must be uniquely identified by chassis number, photographically documented at arrival, and condition-reviewed before it can be allocated to a production or AFS team.

---

## 2. Vehicle Receipt Lifecycle

### State Machine

```
draft
  └─▶ received
        └─▶ pending_condition_review
                  ├─▶ accepted
                  │     ├─▶ assigned_to_production
                  │     │     └─▶ closed
                  │     ├─▶ assigned_to_afs
                  │     │     └─▶ closed
                  │     └─▶ closed
                  └─▶ damaged
                        └─▶ closed
```

### State Descriptions

| State | Meaning |
|---|---|
| `draft` | Vehicle receipt created. Chassis number and photos are being gathered. Completeness check has not yet passed. |
| `received` | Store user confirms physical arrival. Completeness check (chassis + 5 photos) must pass before this transition. |
| `pending_condition_review` | Vehicle is on-site and documented. Admin or operations manager reviews condition photos and notes. |
| `accepted` | Condition review passed. Vehicle is cleared for assignment to a team or project. |
| `damaged` | Condition review found damage. Damage photos and notes are on record. Vehicle may still be assigned but the damage record must be acknowledged first. |
| `assigned_to_production` | Vehicle allocated to the factory/production team for fitout or modification. |
| `assigned_to_afs` | Vehicle allocated to the AFS (After-Factory Services) team. |
| `closed` | Vehicle has been fully processed. Terminal state — no further transitions permitted. |

### Transition Rules

| Transition | Who Can Trigger | Prerequisites |
|---|---|---|
| `draft` → `received` | store_user, ops_manager, admin | Chassis number populated AND all 5 required photos uploaded. Missing either blocks with a validation error listing what is absent. |
| `received` → `pending_condition_review` | store_user, ops_manager, admin | Automatic on transition to `received`, or store user manually advances. |
| `pending_condition_review` → `accepted` | admin, operations_manager | Condition review complete. |
| `pending_condition_review` → `damaged` | admin, operations_manager | At least one `damage_*` photo uploaded and `damage_notes` non-empty. |
| `accepted` → `assigned_to_production` | admin, operations_manager | Vehicle linked to a project or production work order. |
| `accepted` → `assigned_to_afs` | admin, operations_manager | Vehicle linked to an AFS project. |
| Any → `closed` | admin, operations_manager | All downstream actions resolved. |

- **Damaged vehicles**: A `damaged` vehicle may still be assigned to production or AFS, but the damage acknowledgement step must be completed first. Damage does not create a hard block on assignment — it creates a documentation requirement.
- **Chassis number immutability**: Once a receipt reaches `received`, the chassis number field is locked. An admin must revert the receipt to `draft` (audit-logged action) to correct it.

---

## 3. Required Fields

| Field | Type | Mandatory | Notes |
|---|---|---|---|
| `chassis_number` | string | **Yes** | Unique vehicle identifier. Unique constraint across `store_vehicle_receipt_items`. Duplicate chassis number returns a conflict error on save. |
| `vehicle_type` | enum | **Yes** | `sedan`, `suv`, `pickup`, `truck`, `ambulance`, `bus`, `van`, `other` |
| `received_date` | date | **Yes** | Date the vehicle physically arrived at the facility. |
| `condition_status` | enum | **Yes** | `good`, `minor_damage`, `major_damage`, `unknown` — set during condition review, not on receipt creation. |
| `supplier_id` | uuid | **Yes** | Supplier or vendor delivering the vehicle. |
| `project_id` | uuid (nullable) | No | Project the vehicle is allocated to. May be null on receipt and assigned later. |
| `storage_location` | string (nullable) | No | Parking bay or zone reference (e.g., `Bay 3`, `Outdoor Lot B`). |
| `damage_notes` | text (nullable) | Conditional | **Required** when `condition_status` is `minor_damage` or `major_damage`. Describe nature, location, and estimated severity. |
| `notes` | text (nullable) | No | General notes from store staff. |

---

## 4. Photo Documentation

### Required Photos (5)

All five of the following photo types must be uploaded before a vehicle receipt can transition from `draft` to `received`. Missing any one of them blocks the transition.

| Photo Key | Description |
|---|---|
| `front` | Front-facing view of the entire vehicle |
| `rear` | Rear-facing view of the entire vehicle |
| `left_side` | Left side full profile |
| `right_side` | Right side full profile |
| `chassis_plate` | Close-up of the chassis / VIN plate showing the chassis number clearly |

### Optional Photos

| Photo Key | Description |
|---|---|
| `damage_*` | One or more damage photos (e.g., `damage_1`, `damage_2`). **Required** when `condition_status` is `minor_damage` or `major_damage`. |
| `other_*` | Any additional reference photos (interior, odometer, etc.). |

### Photo Storage

Photos are stored in Supabase Storage under the `vehicle-photos` bucket. Each uploaded photo creates a record in the `vehicle_receipt_photos` table:

| Field | Description |
|---|---|
| `vehicle_receipt_id` | FK to the parent vehicle receipt |
| `photo_key` | One of the keys listed above |
| `storage_path` | Path within the `vehicle-photos` bucket |
| `uploaded_by_user_id` | User who uploaded the photo |
| `uploaded_at` | Upload timestamp |

### Completeness Check Logic

A vehicle receipt is **complete** when both of the following are true:

1. `chassis_number` is non-null and non-empty (after trimming whitespace).
2. All five required photo keys (`front`, `rear`, `left_side`, `right_side`, `chassis_plate`) have at least one record in `vehicle_receipt_photos` for this receipt.

**UI behaviour**: The receipt form shows a live completeness checklist. Each required item is shown as pending or complete in real time as the store user fills in data and uploads photos.

**API behaviour**: The `received` transition endpoint re-validates completeness server-side. If either condition is unmet, it returns HTTP 422 with a structured error body listing the specific missing items. The UI does not rely solely on client-side checks.

---

## 5. Governance Rules

- **No delivery without completeness.** A vehicle may not be assigned to production or AFS until chassis number and all 5 required photos are recorded. This is enforced at the state-transition level, not just the UI.
- **Chassis number uniqueness.** The `chassis_number` field has a unique constraint across `store_vehicle_receipt_items`. Attempting to receive a vehicle with a duplicate chassis number returns a conflict error before save.
- **Damage must be documented.** If condition review results in `damaged`, at least one `damage_*` photo and a non-empty `damage_notes` field are required before the reviewer can confirm the status.
- **Immutable chassis number after `received`.** Once a receipt reaches `received`, the chassis number field is read-only. Correction requires an admin to revert the receipt to `draft` — this action is audit-logged with a mandatory reason.
- **Condition status must be set during review.** The `condition_status` field defaults to `unknown` and must be explicitly set to `good`, `minor_damage`, or `major_damage` during the `pending_condition_review` step. A reviewer cannot advance past `pending_condition_review` with `condition_status = 'unknown'`.

---

## 6. Role Access Matrix

| Action | admin | operations_manager | store_user | factory_user | afs_user | qc_user | viewer |
|---|---|---|---|---|---|---|---|
| Create vehicle receipt | Yes | Yes | Yes | No | No | No | No |
| Edit draft | Yes | Yes | Yes | No | No | No | No |
| Upload photos | Yes | Yes | Yes | No | No | No | No |
| Confirm received | Yes | Yes | Yes | No | No | No | No |
| Conduct condition review | Yes | Yes | No | No | No | No | No |
| Accept / mark damaged | Yes | Yes | No | No | No | No | No |
| Assign to production | Yes | Yes | No | No | No | No | No |
| Assign to AFS | Yes | Yes | No | No | No | No | No |
| View assigned vehicles | Yes | Yes | Yes | Yes (own project) | Yes (own project) | No | Read-only |
| View all vehicle receipts | Yes | Yes | Yes | No | No | No | No |
| Close receipt | Yes | Yes | No | No | No | No | No |
| Revert to draft (chassis correction) | Yes | No | No | No | No | No | No |

**factory_user** and **afs_user** can view vehicles that have been assigned to their project. They cannot see receipts in `draft`, `received`, or `pending_condition_review`.

---

## 7. Storage Location and Damage Notes

**Storage location**: Set by the store user. Identifies where in the facility the vehicle is physically parked (e.g., `Bay 3`, `Outdoor Lot B`, `Workshop Floor`). Free-text in Phase 7. Visible to all roles that have view access to the receipt.

**Damage notes**: Free-text field populated by the reviewer during the condition review step. Should cover:
- Nature of the damage (scratch, dent, broken glass, mechanical fault, etc.)
- Location on the vehicle (front bumper, left rear door, etc.)
- Estimated severity
- Whether damage appears pre-existing or transit-related

Both fields are visible to all roles with view access to the receipt.

---

## 8. Integration with project_vehicle_lines

When a vehicle is assigned to a project (via `assigned_to_production` or `assigned_to_afs`):

1. A record is created in `project_vehicle_lines` linking `store_vehicle_receipt_item_id` to the project.
2. The vehicle becomes visible in the project's vehicle list tab.
3. The `project_vehicle_line_id` is the reference used by the Medical Serial Tracking module when recording installation of medical equipment (e.g., AED, oxygen system) onto a specific vehicle.
4. Production and AFS users see the vehicle's condition status, all photos, chassis number, and storage location through the project view.
5. All vehicle assignment changes are audit-logged: who made the change, when, from which state, to which project.
6. A vehicle can only be assigned to one project at a time. Reassignment requires the current project vehicle line to be closed first.
