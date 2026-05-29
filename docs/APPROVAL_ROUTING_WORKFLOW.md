# Approval & Routing Workflow

## Approval Queue

The **Admin Approvals** page (`/admin-approvals`) shows all projects requiring action, grouped by:

| Tab | Statuses | Purpose |
|-----|---------|---------|
| Pending Approval | submitted_for_approval | Projects awaiting review |
| Sent Back | sent_back_for_revision | Projects returned to sales for correction |
| Rejected | rejected | Permanently rejected projects |

---

## Approval Decision

When reviewing a pending project, the approver must set:

### 1. Manufacturing Location
- **Saudi Arabia** — triggers WO gate requirement
- **Dubai / UAE** — triggers PN gate requirement

### 2. Medical Items Flag
- **Yes** — medical serial number tracking required at delivery; Material QC is auto-checked
- **No** — standard non-medical process

### 3. Department Routing (checkboxes)
Select which departments this project flows through:

| Department | Auto-checked when |
|-----------|------------------|
| Procurement | Always (default) |
| Factory / Production | Always (default) |
| Store / Warehouse | Always (default) |
| Material QC | Medical Items = Yes |
| Project QC | Always (default) |
| Dubai / AFS | Manufacturing Location = Dubai |

---

## Governance Gates

Governance gates are hard requirements that prevent workflow progression.

### WO Gate (Saudi Route)
- **Trigger**: Manufacturing Location = Saudi Arabia
- **Requirement**: A Work Order (WO) must be created and entered before factory execution can begin
- **Blocked if**: No WO is registered against the project
- **Phase**: WO creation and management (Phase 3)

### PN Gate (Dubai Route)
- **Trigger**: Manufacturing Location = Dubai
- **Requirement**: A Part Number (PN) must be created before Dubai/AFS follow-up activities
- **Phase**: PN management (Phase 3)

### Medical Serial Tracking
- **Trigger**: Medical Items = Yes
- **Requirement**: Each medical item must have a serial number recorded at delivery
- **Phase**: QC and delivery (Phase 4+)

### Release Note Gate
- **Requirement**: Release Note is blocked until Project QC is formally closed
- **Phase**: QC closure (Phase 4+)

### High-Value PO Gate
- **Trigger**: PO to Supplier > SAR 10,000
- **Requirement**: Admin or Operations Manager must approve before sending to supplier
- **Phase**: Procurement approval (Phase 3)

---

## Send Back for Revision

When details are incomplete or incorrect:
1. Approver clicks **Send Back**
2. Enters a mandatory revision reason
3. Project status → `sent_back_for_revision`
4. Sales User is notified (future: email notification)
5. Sales User edits and resubmits

---

## Rejection

For permanently invalid projects:
1. Approver clicks **Reject**
2. Enters a mandatory rejection reason
3. Project status → `rejected`
4. Project remains visible in history but cannot be resubmitted

---

## Audit Trail

All approval actions are recorded in:
- **project_timeline_events** — human-readable event log
- **audit_log** — structured before/after data for compliance

Both are immutable (insert-only).
