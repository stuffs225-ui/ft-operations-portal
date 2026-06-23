# Module 06 — Factory

## Routes Captured

| Route | Name | Roles |
|-------|------|-------|
| `/factory` | Factory Dashboard | admin, operations_manager, factory_user |
| `/factory/projects` | Factory Projects | admin, operations_manager, factory_user |
| `/factory/work-orders` | Work Orders | admin, operations_manager, factory_user |
| `/wo-pn-gate` | WO / PN Execution Gate | admin, operations_manager, factory_user |

## Review Checklist

### Factory Dashboard
- [ ] Production KPIs
- [ ] Work orders in progress
- [ ] Alerts for blocked items (missing materials)

### Factory Projects
- [ ] Project list filtered to factory-relevant items
- [ ] Progress indicators per project
- [ ] Link to WOs

### Work Orders
- [ ] WO list with status (pending, in-progress, complete)
- [ ] Associated project reference
- [ ] Materials/components section

### WO / PN Execution Gate
- [ ] Gate logic clear — what conditions allow progression
- [ ] Blocked state visually distinct
- [ ] Action to resolve blockage surfaced

## Open Issues

_Fill in after reviewing screenshots._

## Notes

The WO/PN gate is a critical workflow checkpoint. Factory users cannot progress work orders unless all prerequisite conditions (materials available, QC sign-off, etc.) are met. This gate was stabilised in Phase 0A.
