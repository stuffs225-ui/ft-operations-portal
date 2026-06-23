# Module 01 — Sales

## Routes Captured

| Route | Name | Roles |
|-------|------|-------|
| `/sales` | Sales Dashboard | admin, operations_manager, sales_user, sales_coordinator |
| `/quotations` | Quotations List | admin, operations_manager, sales_user, sales_coordinator |
| `/quotations/new` | New Quotation | admin, operations_manager, sales_user, sales_coordinator |
| `/hot-projects` | Hot Projects | admin, operations_manager, sales_user, sales_coordinator |

## Review Checklist

### Sales Dashboard (`/sales`)
- [ ] KPI cards render and are readable
- [ ] Pipeline summary section visible
- [ ] Recent activity / quick actions present
- [ ] Empty states handled gracefully

### Quotations List (`/quotations`)
- [ ] Table renders with appropriate columns
- [ ] Status badges are visually distinct
- [ ] Search/filter bar is present
- [ ] Pagination or infinite scroll functional
- [ ] "New Quotation" CTA is prominent

### New Quotation Form (`/quotations/new`)
- [ ] Step indicator visible (if multi-step)
- [ ] Required fields clearly marked
- [ ] R-001 governance gate visible/explained where applicable
- [ ] Submit and cancel actions clear

### Hot Projects (`/hot-projects`)
- [ ] List renders correctly
- [ ] Priority/urgency indicators visible
- [ ] Differentiated from standard projects

## Open Issues

_Fill in after reviewing screenshots._

## Notes

Sales is the entry point for the quotation → project lifecycle. The R-001 governance gate means some quotation creation flows have conditional steps.
