# Project QC Workflow Design

## Purpose

QC inspects vehicles and project lines after Factory signals production is complete. The inspection verifies that the build meets specification before the project can proceed to Release Note issuance and customer delivery.

---

## Trigger

A Project QC inspection becomes available when a `factory_record` reaches status `sent_to_qc`. At that point:

- A `project_qc_inspection` record is created (manually by QC or automatically on trigger, depending on configuration)
- The inspection appears in the QC inspection queue
- Factory can no longer modify the production record without QC reverting it

---

## Inspection Number Format

```
PQC-YYYY-NNNN
```

- Auto-generated at inspection creation
- Year is the calendar year of creation
- Sequence resets each year, zero-padded to 4 digits
- Example: `PQC-2025-0031`

---

## Inspection Lifecycle

```
pending → in_progress → completed
                      → cancelled
```

| Status | Description |
|--------|-------------|
| `pending` | Inspection record created; not yet started |
| `in_progress` | QC user has opened the inspection |
| `completed` | Inspection finished; result recorded |
| `cancelled` | Inspection voided; requires cancellation reason |

Transition rules:
- `pending → in_progress`: QC user, admin, or ops_manager only
- `in_progress → completed`: requires result to be set
- `in_progress → completed` with result `failed` or `rework_required`: requires at least one finding to be raised (see Findings)
- `cancelled` requires reason; cannot cancel a `completed` inspection

---

## Inspection Results

Result is set when transitioning to `completed`.

| Result | Meaning |
|--------|---------|
| `pending` | Default before inspection completes |
| `passed` | Vehicle/line fully conforms; cleared for Release Note |
| `passed_with_comments` | Minor observations noted; cleared with remarks |
| `failed` | Does not conform; at least one finding required |
| `rework_required` | Specific defects require factory rework before re-inspection |

Result rules:
- `passed_with_comments` requires the `comments` field to be populated
- `failed` and `rework_required` both require at least one `project_qc_finding` record linked to the inspection
- `rework_required` sets `rework_required = true` on the associated findings

---

## Readiness Status

Readiness status is a separate field on the inspection (and rolled up to the project/line level) that tracks whether the vehicle/line is ready for Release Note.

```
not_ready → pending_rework → ready_for_release → released
```

| Status | Description |
|--------|-------------|
| `not_ready` | Default; inspection not yet passed |
| `pending_rework` | Rework required; findings open |
| `ready_for_release` | All findings closed; inspection passed |
| `released` | Release Note issued; project delivered |

Readiness transitions:
- `not_ready → pending_rework`: set when result is `rework_required`
- `pending_rework → ready_for_release`: set automatically when all findings for the inspection reach `closed` or `cancelled` status
- `ready_for_release → released`: set when the Release Note is issued

---

## Line-Level vs. Project-Level Inspection

Inspections can be scoped at two levels:

**Vehicle Line Inspection**
- `project_vehicle_line_id` is populated on the inspection record
- Inspection covers a specific line (e.g., one vehicle type or batch)
- Readiness status rolls up to the line record

**Project-Wide Inspection**
- `project_vehicle_line_id` is null
- Inspection covers the entire project
- Readiness status rolls up to the project record

Both types follow the same lifecycle and result rules. A project may have multiple inspections across multiple lines; all must reach `ready_for_release` before the project Release Note can be issued.

---

## Failed Inspection

When inspection result is `failed`:

1. At least one `project_qc_finding` must be created before completing the inspection
2. Findings document what failed
3. `rework_required` on findings may be true or false depending on the defect type
4. The inspection readiness_status remains `not_ready`
5. A timeline event is written: `qc_inspection_failed`
6. Factory is notified that the inspection has failed and findings are available

---

## Rework Required

When inspection result is `rework_required`:

1. At least one finding is created with `rework_required = true`
2. Inspection readiness_status set to `pending_rework`
3. Factory users can view findings and mark rework completed per finding
4. When all `rework_required = true` findings have `rework_completed_at` set, the system allows QC to re-inspect or close findings
5. A new inspection is typically created for re-inspection; it does not auto-pass the previous inspection

---

## Ready for Release

The inspection `readiness_status` transitions to `ready_for_release` only when:

- All `project_qc_findings` linked to the inspection have status `closed` or `cancelled`
- No finding with `rework_required = true` has `rework_completed_at = null`

This check runs automatically after each finding status update. If conditions are met, `readiness_status` is updated and a timeline event is written: `qc_ready_for_release`.

---

## Role Matrix

### Create Inspection

| Role | Can Create |
|------|-----------|
| `qc_user` | Yes |
| `admin` | Yes |
| `ops_manager` | Yes |
| `factory_user` | No |
| `sales_user` | No |

### View Inspection

| Role | Visibility |
|------|-----------|
| `qc_user` | Full access to all inspections |
| `admin` | Full access |
| `ops_manager` | Full access |
| `factory_user` | Can view findings linked to their factory records; can mark rework completed on findings |
| `sales_user` | Read-only on own projects; result and readiness status only |
| `afs_user` | Read-only; result and readiness status only |

### Finding Access

| Role | Permissions |
|------|-------------|
| `qc_user` | Create, update, close findings |
| `factory_user` | View findings; mark `rework_completed` on rework findings |
| `admin` / `ops_manager` | Full access |
| All others | Read-only or no access |

---

## Timeline Events

Written to project timeline:

| Event | Trigger |
|-------|---------|
| `qc_inspection_created` | Inspection record created |
| `qc_inspection_started` | Status moves to `in_progress` |
| `qc_inspection_passed` | Result set to `passed` or `passed_with_comments` |
| `qc_inspection_failed` | Result set to `failed` |
| `qc_rework_required` | Result set to `rework_required` |
| `qc_ready_for_release` | `readiness_status` moves to `ready_for_release` |

---

## Data Model References

Key tables involved:

- `project_qc_inspections` — header record per inspection
- `project_qc_findings` — finding records linked to inspections
- `factory_records` — the triggering production record
- `project_vehicle_lines` — optional line-level scoping
- `projects` — parent project
- `users` — inspector and finding owner
