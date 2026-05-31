# Release Note Governance Design

## Purpose

A Release Note is the formal document that marks a project or vehicle line as cleared for customer delivery. It can only be issued when all QC and NCR conditions are resolved. Issuance triggers the "Ready for Delivery" indicator visible across the portal.

---

## Release Note Number Format

```
RN-YYYY-NNNN
```

- Auto-generated at Release Note creation
- Year is the calendar year of creation
- Sequence resets each year, zero-padded to 4 digits
- Example: `RN-2025-0009`

---

## Release Note Types

| Type | Description |
|------|-------------|
| `project_release` | Covers the entire project; all lines must be cleared |
| `vehicle_line_release` | Covers a single `project_vehicle_line` |
| `partial_release` | Covers a specified subset of items; partial delivery scenario |

`partial_release` requires a description of what is included and what is deferred.

---

## Release Status Lifecycle

```
draft → blocked
      → ready_to_issue → issued
      → cancelled
```

| Status | Description |
|--------|-------------|
| `draft` | Release Note record created; status not yet evaluated |
| `blocked` | One or more blocking conditions are unresolved |
| `ready_to_issue` | All blocking conditions cleared; can be issued |
| `issued` | Release Note formally issued; project cleared for delivery |
| `cancelled` | Release Note voided; requires reason |

Status is re-evaluated automatically whenever a linked NCR, inspection, or finding changes state.

---

## Blocking Conditions

ALL four conditions must be resolved for status to reach `ready_to_issue`.

| # | Condition | Resolved When |
|---|-----------|---------------|
| 1 | Material NCR check | No open `material_ncrs` linked to the project (status not in `open`, `assigned`, `corrective_action_in_progress`, `pending_evidence`, `rejected_closure`) |
| 2 | Project QC readiness | All `project_qc_inspections` for the project have `readiness_status = ready_for_release` |
| 3 | Open findings | No `project_qc_findings` with status outside `(closed, cancelled)` |
| 4 | Rework completion | No `project_qc_findings` with `rework_required = true` AND `rework_completed_at IS NULL` |

If any condition is unresolved, `release_status = blocked`. The system checks all four conditions on each relevant state change and updates `release_status` accordingly.

---

## Readiness Checklist (UI)

Displayed on the Release Note detail page and in the ProjectDetail QC/Release tab. Four items, each showing a green check or red cross:

| Checklist Item | Maps To |
|----------------|---------|
| No open Material NCRs | Blocking condition 1 |
| All QC inspections ready for release | Blocking condition 2 |
| No open QC findings | Blocking condition 3 |
| All rework completed | Blocking condition 4 |

The checklist refreshes in real time (or on page load) by querying each condition. Items show count of unresolved records alongside the status indicator (e.g., "2 open NCRs").

---

## Issue Process

When all four blocking conditions are resolved, the Release Note status becomes `ready_to_issue`. A QC user can then issue the Release Note:

1. QC user clicks "Issue Release Note" on the Release Note detail page
2. A document upload modal opens — QC uploads or references the physical Release Note document
   - `release_note_document_id` is set (FK to documents table)
   - Document metadata: file name, upload date, uploader
3. QC confirms issuance
4. System performs a final blocking-condition check before committing
5. On success:
   - `release_status` set to `issued`
   - `issued_at` timestamp set
   - `issued_by` set to acting user's ID
   - Timeline event written: `release_note_issued`
   - Audit entry written
6. If final check fails (condition became blocked between check and submit), issuance is rejected with an error message and status reverts to `blocked`

---

## Effect of Issuance

Once a Release Note is issued:

- The linked project (or vehicle line) shows a "Ready for Delivery" indicator in ProjectDetail
- `project.delivery_status` (or `project_vehicle_line.delivery_status`) is updated to `ready_for_delivery`
- The Release Note appears in the project timeline with `release_note_issued` event
- The document is accessible from the project Documents tab
- Sales users can see the "Ready for Delivery" status on their project view

---

## Role Matrix

| Role | Permissions |
|------|-------------|
| `qc_user` | Create Release Note draft; issue Release Note; view full detail |
| `admin` | Full access; can approve or override blocking conditions (audit-logged) |
| `ops_manager` | Full access; can approve or override blocking conditions (audit-logged) |
| `sales_user` | Read-only; sees release status and "Ready for Delivery" indicator |
| `factory_user` | Read-only; sees released status only |
| `afs_user` | Read-only; sees released status only |
| `procurement_user` | No access |
| `store_user` | No access |

Admin/ops override of a blocking condition must supply an override reason. The override is recorded in the audit log and a timeline event is written: `release_note_condition_overridden`.

---

## Timeline Events

Written to project timeline:

| Event | Trigger |
|-------|---------|
| `release_note_created` | Release Note draft created |
| `release_note_blocked` | Status transitions to `blocked` |
| `release_note_ready_to_issue` | Status transitions to `ready_to_issue` |
| `release_note_issued` | Release Note issued |
| `release_note_cancelled` | Release Note cancelled |
| `release_note_condition_overridden` | Admin/ops overrides a blocking condition |

---

## Audit Entries

Written to the Release Note audit log:

| Action | Fields Captured |
|--------|----------------|
| Created | All initial fields, creator, timestamp |
| Status updated | Old status, new status, user, timestamp |
| Issued | `issued_by`, `issued_at`, `release_note_document_id` |
| Blocking condition override | Condition name, reason, user, timestamp |
| Cancelled | Cancellation reason, user, timestamp |

---

## Data Model References

Key tables involved:

- `release_notes` — Release Note header record
- `projects` — linked project
- `project_vehicle_lines` — optional line scoping for `vehicle_line_release`
- `material_ncrs` — blocking condition 1
- `project_qc_inspections` — blocking condition 2
- `project_qc_findings` — blocking conditions 3 and 4
- `documents` — Release Note document attachment
- `project_timeline_events` — timeline entries
- `release_note_audit` — audit log
