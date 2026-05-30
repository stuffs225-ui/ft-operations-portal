# PO to Supplier Approval Workflow

## When Approval is Required

A PO to Supplier requires Admin/Operations Manager approval when:
- `purchase_value > 10,000 SAR` (regardless of currency — the 10,000 threshold applies to SAR-denominated POs)

The database trigger `set_po_approval_required` automatically sets `approval_required = TRUE` and `approval_status = 'pending'` when a PO is inserted or updated with a value above the threshold.

## Approval States

| approval_status | Meaning |
|---|---|
| not_required | PO value ≤ 10,000 SAR — no approval needed |
| pending | Awaiting Admin/Ops Manager review |
| approved | Approved — PO can proceed to sent_to_supplier |
| rejected | Rejected — procurement must revise or cancel the PO |

## Who Can Approve

Only users with role `admin` or `operations_manager` can:
- Approve a pending PO
- Reject a pending PO (rejection reason required)

`procurement_user` cannot approve their own POs.

## Approval Flow

```
1. Procurement creates PO > 10,000 SAR
2. DB trigger sets approval_required=true, approval_status='pending'
3. PO status = 'pending_approval'
4. Inbox task created for admin/operations_manager
5a. Approved → approval_status='approved', po_status → 'approved'
    Procurement can then send to supplier (po_status → 'sent_to_supplier')
5b. Rejected → approval_status='rejected', rejection_reason stored
    PO blocked — procurement must revise value or cancel
```

## Rejection Flow

When rejecting:
1. `rejection_reason` text is required
2. `rejected_by` (actor ID) and `rejected_at` (timestamp) are recorded
3. `po_status` moves to 'rejected'
4. Procurement user is notified (via inbox task in future phase)

## UI Enforcement

- The "Send to Supplier" action button is hidden/disabled if `approval_required=true AND approval_status != 'approved'`
- The Approval tab on PO Detail shows the current approval state and action buttons
- A warning badge "Needs Approval" is shown on PO list rows for pending approvals

## Governance Note

This threshold exists to ensure financial oversight on significant procurement spend. The 10,000 SAR threshold may be adjusted by the Operations Manager. Any change to the threshold requires an update to the DB trigger and this document.
