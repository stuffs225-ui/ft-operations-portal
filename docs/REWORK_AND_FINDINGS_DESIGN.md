# Rework and Findings Design

## Purpose

Findings are defect records raised during a Project QC inspection. They document what failed, who is responsible for correcting it, and track the rework-and-closure cycle. Open findings block the project's Release Note.

---

## Finding Number Format

```
FND-YYYY-NNNN
```

- Auto-generated at finding creation
- Year is the calendar year of creation
- Sequence resets each year, zero-padded to 4 digits
- Example: `FND-2025-0018`

---

## Finding Types

| Type | Description |
|------|-------------|
| `dimensional` | Measurement or tolerance out of spec |
| `surface_finish` | Cosmetic defect — scratches, paint, finish quality |
| `functional` | Component or system does not operate correctly |
| `documentation` | Missing, incorrect, or incomplete documentation |
| `safety` | Non-conformance that presents a safety risk |
| `other` | Does not fit above categories; requires description |

---

## Severity

| Severity | Description | UI Treatment |
|----------|-------------|--------------|
| `low` | Minor; cosmetic or documentation only | Standard display |
| `medium` | Moderate impact; must be resolved before release | Standard display |
| `high` | Significant defect; escalation recommended | Orange/amber highlight |
| `critical` | Safety risk or regulatory non-conformance | Red highlight |

---

## Finding Lifecycle

```
open → assigned → rework_in_progress → pending_reinspection → closed
                                                             → cancelled
```

| Status | Description |
|--------|-------------|
| `open` | Finding raised; not yet assigned |
| `assigned` | Owner assigned; awaiting action |
| `rework_in_progress` | Factory is executing rework (only valid if `rework_required = true`) |
| `pending_reinspection` | Rework complete; awaiting QC review |
| `closed` | Finding resolved and accepted by QC |
| `cancelled` | Finding voided; requires reason |

Transition rules:
- `open → assigned`: requires `owner_id` (and optionally `owner_role`) to be set
- `assigned → rework_in_progress`: only when `rework_required = true`; triggered by factory marking rework started
- `rework_in_progress → pending_reinspection`: factory marks rework completed (sets `rework_completed_by` and `rework_completed_at`)
- `pending_reinspection → closed`: QC reviews and accepts; `closure_notes` required
- `assigned → closed` (non-rework path): QC closes directly; `closure_notes` required
- `closed` is terminal; cannot re-open a closed finding
- `cancelled` requires reason; can be applied from any non-terminal status by admin/ops

---

## Rework Required Flag

`rework_required` (boolean) is set at finding creation or when the inspection result is `rework_required`.

### Rework Required = true: Closure Path

The finding must follow this sequence:

1. Factory user marks rework started → status moves to `rework_in_progress`
2. Factory user marks rework completed:
   - `rework_completed_by` = user ID of factory user
   - `rework_completed_at` = timestamp
   - Status moves to `pending_reinspection`
3. QC reviews the rework result
4. QC closes the finding with `closure_notes`
   - Status moves to `closed`

QC cannot close a `rework_required = true` finding if `rework_completed_at` is null. The system enforces this with a validation error and the UI disables the "Close" action.

### Rework Required = false: Closure Path

1. QC user reviews the finding
2. QC closes directly with `closure_notes`
   - Status moves to `closed`
   - No factory involvement required

---

## Owner Assignment

| Field | Description |
|-------|-------------|
| `owner_id` | FK to `users`; the person responsible for resolving the finding |
| `owner_role` | Role of the owner (e.g., `factory_user`, `qc_user`) |
| `due_date` | Target resolution date; tracked for overdue alerts |

Overdue logic: if `due_date < today` and status is not `closed` or `cancelled`, finding is flagged as `overdue = true` in list views.

---

## Closure Rules

A finding cannot be closed unless:

1. `closure_notes` is populated (non-empty)
2. If `rework_required = true`: `rework_completed_at` must be set (non-null)

Validation is enforced server-side. The UI disables "Close Finding" and shows inline validation messages for unmet conditions.

---

## Release Note Blocking

The Release Note is blocked if any of the following are true for the linked project or vehicle line:

- Any finding has status not in `(closed, cancelled)`
- Any finding with `rework_required = true` has `rework_completed_at = null`

The readiness check queries:

```sql
-- Block condition 1: open findings
SELECT COUNT(*) FROM project_qc_findings
WHERE project_id = :project_id
  AND status NOT IN ('closed', 'cancelled')

-- Block condition 2: incomplete rework
SELECT COUNT(*) FROM project_qc_findings
WHERE project_id = :project_id
  AND rework_required = true
  AND rework_completed_at IS NULL
```

If either count > 0, the Release Note status is `blocked`. See `RELEASE_NOTE_GOVERNANCE_DESIGN.md`.

---

## Role Matrix

| Role | Permissions |
|------|-------------|
| `qc_user` | Create findings, update all fields, close findings, cancel findings |
| `factory_user` | View findings on their factory records; mark rework started and completed |
| `admin` | Full access; can cancel from any status, override fields |
| `ops_manager` | Full access; can cancel from any status |
| `sales_user` | Read-only; count and severity summary only |
| `procurement_user` | No access |
| `afs_user` | Read-only; status only |

---

## Audit Trail

Every status transition on a finding writes an audit entry:

| Event | Fields Captured |
|-------|----------------|
| Finding created | All initial field values |
| Status transition | Old status, new status, user, timestamp |
| Field update | Field name, old value, new value, user, timestamp |
| Rework completed | `rework_completed_by`, `rework_completed_at` |
| Finding closed | `closure_notes`, closing user, timestamp |
| Finding cancelled | Cancellation reason, user, timestamp |

---

## Data Model References

Key tables involved:

- `project_qc_findings` — finding header record
- `project_qc_inspections` — parent inspection
- `projects` — parent project
- `project_vehicle_lines` — optional line scoping
- `users` — owner and actor references
- `project_qc_finding_audit` — audit log entries
