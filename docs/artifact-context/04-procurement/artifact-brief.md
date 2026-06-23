# Module 04 — Procurement

## Routes Captured

| Route | Name | Roles |
|-------|------|-------|
| `/procurement` | Procurement Dashboard | admin, operations_manager, procurement_user |
| `/procurement/pr` | Purchase Requisitions | admin, operations_manager, procurement_user |
| `/procurement/pr/new` | New Purchase Requisition | admin, operations_manager, procurement_user |
| `/procurement/po` | Purchase Orders | admin, operations_manager, procurement_user |
| `/procurement/po/new` | New Purchase Order | admin, operations_manager, procurement_user |
| `/procurement/suppliers` | Suppliers | admin, operations_manager, procurement_user |
| `/procurement/suppliers/new` | New Supplier | admin, operations_manager, procurement_user |

## Review Checklist

### Procurement Dashboard
- [ ] KPIs (pending PRs, open POs, spend summary) visible
- [ ] Quick action links functional
- [ ] Alerts for overdue items

### Purchase Requisitions
- [ ] PR list with status column
- [ ] Approval status clearly indicated
- [ ] PR → PO conversion CTA visible for approved PRs

### Purchase Orders
- [ ] PO list with supplier, value, status
- [ ] Delivery status tracking
- [ ] Link back to originating PR

### Suppliers
- [ ] Supplier list with key metadata
- [ ] Supplier detail access

## Open Issues

_Fill in after reviewing screenshots._

## Notes

Procurement has a PR → PO approval workflow. PRs require approval before a PO can be created. The approval status is central to this module's usability.
