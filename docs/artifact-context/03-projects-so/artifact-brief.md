# Module 03 — Projects / Sales Orders

## Routes Captured

| Route | Name | Roles |
|-------|------|-------|
| `/projects` | Projects List | admin, operations_manager, sales_user, sales_coordinator, procurement_user, factory_user, store_user, qc_user |
| `/projects/new` | New Project (SO) | admin, operations_manager, sales_user, sales_coordinator |
| `/projects/:id` | Project Detail | admin, operations_manager, sales_user, ... (dynamic) |
| `/projects/:id/invoicing` | Project Invoicing | admin, operations_manager (dynamic) |

## Review Checklist

### Projects List (`/projects`)
- [ ] Project cards or rows render with key fields (ref, client, status, value)
- [ ] Status filtering works
- [ ] Role-differentiated columns (e.g., finance columns only for admin/ops)
- [ ] Empty state is meaningful
- [ ] "New Project" CTA visibility matches role permissions

### New Project Wizard (`/projects/new`)
- [ ] Multi-step wizard steps are clear
- [ ] Step 1–4 navigation works
- [ ] From-quotation pre-fill visible (if coming from quotation)
- [ ] Validation feedback clear on each step

### Project Detail (dynamic)
- [ ] Summary header with project number, client, status
- [ ] Tab navigation between sections
- [ ] Status timeline or progress indicator
- [ ] Action buttons match current project state and user role

### Project Invoicing (dynamic)
- [ ] Invoice creation form clear
- [ ] Linked payment schedule visible
- [ ] Access restricted to finance-capable roles

## Open Issues

_Fill in after reviewing screenshots._

## Notes

Projects (Sales Orders) are the core entity of the portal. Every downstream module (procurement, factory, store, QC) relates back to a project. The role filter on the list is critical — factory users should only see factory-relevant columns.
