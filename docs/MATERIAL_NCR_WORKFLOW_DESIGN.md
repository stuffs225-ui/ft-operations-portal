# Material NCR Workflow Design

## Purpose

A Non-Conformance Report (NCR) documents that a received material has failed QC inspection. It tracks the root cause investigation, corrective action, preventive action, and provides a formal closure mechanism. Open NCRs block downstream project Release Notes.

---

## NCR Number Format

```
NCR-YYYY-NNNN
```

- Auto-generated at NCR creation
- Year is the calendar year of creation
- Sequence resets each year, zero-padded to 4 digits
- Example: `NCR-2025-0012`

---

## Creation

NCRs are created automatically when a `material_qc_inspection` result is set to `rejected`. Manual creation by `qc_user`, `admin`, or `ops_manager` is also permitted where a non-conformance is identified outside a formal inspection.

At creation, the following fields are required:

| Field | Rule |
|-------|------|
| `description` | Mandatory. Free text describing the non-conformance. |
| `severity` | Mandatory. Set by the creating user. |
| `material_qc_inspection_id` | Set automatically on auto-creation; optional on manual creation |
| `store_receipt_id` | Inherited from the linked inspection |
| `store_receipt_item_id` | Inherited from the linked inspection item |

---

## NCR Lifecycle

```
open → assigned → corrective_action_in_progress → pending_evidence → closed
                                                                   → rejected_closure
     → cancelled
```

| Status | Description |
|--------|-------------|
| `open` | NCR raised; not yet assigned |
| `assigned` | Owner assigned; investigation underway |
| `corrective_action_in_progress` | Root cause identified; corrective action being executed |
| `pending_evidence` | Corrective action complete; awaiting closure evidence |
| `closed` | NCR resolved and accepted by admin/ops |
| `rejected_closure` | Proposed closure rejected by admin/ops; NCR re-opened |
| `cancelled` | NCR voided (requires reason; only admin/ops can cancel) |

Transition rules:
- `open → assigned` requires `owner_id` to be set
- `assigned → corrective_action_in_progress` requires `root_cause_category` to be populated
- `corrective_action_in_progress → pending_evidence` requires `corrective_action` to be populated
- `pending_evidence → closed` requires `corrective_action` AND (`closure_evidence_document` OR `closure_remarks`) — see Closure Rules
- `closed → rejected_closure` performed by admin/ops with a mandatory rejection reason
- `rejected_closure` re-enters the workflow at `corrective_action_in_progress`

---

## Severity Levels

| Severity | Description | UI Treatment |
|----------|-------------|--------------|
| `low` | Minor deviation; no immediate impact | Standard display |
| `medium` | Moderate impact; requires resolution within due date | Standard display |
| `high` | Significant non-conformance; escalation likely | Orange/amber highlight |
| `critical` | Safety or regulatory risk; immediate action required | **Red highlight throughout UI** |

Critical NCRs:
- Row background is red in all list views
- Badge/chip shown in red on NCR detail page
- NCR card shown with red border in dashboard widgets
- Admin and ops_manager are notified on creation of a critical NCR

---

## Workflow Fields

| Field | When Populated |
|-------|---------------|
| `root_cause_category` | Required before moving to `corrective_action_in_progress` |
| `corrective_action` | Required before moving to `pending_evidence` |
| `preventive_action` | Optional; best practice to populate before closure |
| `due_date` | Set at assignment; tracked for overdue calculation |
| `owner_id` | Required at assignment |
| `closure_evidence_document` | Document reference; required for closure if `closure_remarks` is empty |
| `closure_remarks` | Free text; required for closure if `closure_evidence_document` is absent |

Root cause categories (enum):
- `supplier_error`
- `specification_mismatch`
- `transport_damage`
- `incorrect_quantity`
- `documentation_error`
- `process_deviation`
- `other`

---

## Closure Rules

An NCR cannot be closed unless ALL of the following are true:

1. `corrective_action` is populated (non-empty)
2. At least one of:
   - `closure_evidence_document` is attached, OR
   - `closure_remarks` is populated (non-empty)

Attempting to close without these conditions returns a validation error. The UI disables the "Close NCR" button and shows inline validation messages for missing fields.

---

## Rejected Closure

When an admin or ops_manager determines that a proposed closure is insufficient:

1. They set status to `rejected_closure`
2. `closure_rejection_reason` field is mandatory
3. The NCR owner is notified
4. Status reverts to `corrective_action_in_progress`
5. A timeline event is written: `ncr_closure_rejected`
6. The previous closure attempt fields are preserved in audit history

---

## Impact on Release Note

Any NCR with status NOT in `(closed, cancelled)` that is linked to a project blocks the issuance of that project's Release Note.

The blocking check:
```
SELECT COUNT(*) FROM material_ncrs
WHERE project_id = :project_id
  AND status NOT IN ('closed', 'cancelled')
```

If count > 0, Release Note status is `blocked` and the readiness checklist item "No open Material NCRs" shows as unresolved.

See `RELEASE_NOTE_GOVERNANCE_DESIGN.md` for the full blocking rule set.

---

## Role Access

| Role | Permissions |
|------|-------------|
| `qc_user` | Create NCR, update fields, move through workflow statuses |
| `admin` | Full access; can reject closure, cancel NCR, override fields |
| `ops_manager` | Full access; can reject closure, cancel NCR |
| `store_user` | Read-only view of NCRs linked to their receipts |
| `procurement_user` | Read-only view of NCRs linked to their POs |
| `factory_user` | No access |
| `afs_user` | No access |
| `sales_user` | No access |

---

## Timeline Events

Written to project timeline (if NCR is project-linked):

| Event | Trigger |
|-------|---------|
| `ncr_opened` | NCR created |
| `ncr_assigned` | Owner assigned |
| `ncr_closed` | NCR closed |
| `ncr_closure_rejected` | Closure rejected by admin/ops |
| `ncr_cancelled` | NCR cancelled |

---

## Data Model References

Key tables involved:

- `material_ncrs` — NCR header record
- `material_qc_inspections` — source inspection (if auto-created)
- `store_receipts` — linked receipt
- `store_receipt_items` — linked receipt item
- `users` — owner assignment
- `documents` — closure evidence attachments
