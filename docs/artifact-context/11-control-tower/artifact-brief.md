# Module 11 — Control Tower

## Accounts with Access
`coo`, `ops`, `admin`, `stuffs`, `viewer` (read-only)

## Routes Captured

| Route | Name | Roles |
|-------|------|-------|
| `/control-tower` | Control Tower Dashboard | operations_manager, viewer |
| `/admin-approvals` | Approvals Queue | operations_manager |

## Review Checklist

- [ ] Control Tower shows cross-functional KPIs (sales, production, procurement, QC, AFS)
- [ ] Pending approvals count is prominent (with type breakdown)
- [ ] Bottleneck/blocker items are surfaced proactively
- [ ] Delivery risk and SLA breach alerts are visible
- [ ] Operations manager can navigate to any module from here
- [ ] Viewer sees read-only version (no approve/reject buttons)

## Artifact Instructions

Control Tower is the highest-value page for operations_manager — it must be information-dense but scannable.
Do not reduce the KPI count; improve their visual hierarchy.
Viewer version must have no action buttons — make the distinction obvious.
