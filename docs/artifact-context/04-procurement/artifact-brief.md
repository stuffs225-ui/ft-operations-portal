# Module 04 — Procurement

## Accounts with Access
`procurement`, `coo`, `ops`, `admin`, `stuffs`

## Routes Captured

| Route | Name | Key Roles |
|-------|------|-----------|
| `/procurement` | Procurement Dashboard | procurement_user, operations_manager |
| `/procurement/requests` | Purchase Requests (PR) | same |
| `/procurement/requests/new` | New PR | same |
| `/procurement/purchase-orders` | Purchase Orders | same |
| `/procurement/purchase-orders/new` | New PO | same |
| `/procurement/pr-items-without-po` | PR Items Without PO | same |
| `/procurement/suppliers` | Suppliers List | same |
| `/procurement/eta-history` | ETA History | same |
| `/reports/procurement` | Procurement Reports | same |
| `/reports/suppliers` | Supplier Reports | same |

## Review Checklist

- [ ] PR list has approval status prominently visible
- [ ] "PR Items Without PO" is clearly a worklist (action-oriented, not passive)
- [ ] PO list shows supplier, value, delivery status, ETA
- [ ] High-value PO (>10,000 SAR) approval requirement is surfaced
- [ ] ETA history shows clear timeline of changes with reason
- [ ] Supplier register has approval status (approved vs. pending)

## Artifact Instructions

Use screenshots as source of truth. The PR → PO approval chain is a governance requirement — preserve it.
The >10,000 SAR threshold approval must remain visible in any PO redesign.
