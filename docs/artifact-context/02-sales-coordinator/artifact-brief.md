# Module 02 — Sales Coordinator

## Accounts with Access
`admin`, `coo`, `ops` + any sales_coordinator account detected

## Routes Captured

| Route | Name | Key Roles |
|-------|------|-----------|
| `/sales-coordinator` | Sales Coordinator Dashboard | sales_coordinator, operations_manager |
| `/coordinator-queue` | Coordinator Queue | sales_coordinator, operations_manager |
| `/quotations` | Quotations List | all authenticated users |
| `/quotations/new` | New Quotation | all authenticated users |
| `/reports/projects` | Projects Reports | sales_coordinator, operations_manager, viewer |

## Review Checklist

- [ ] Coordinator dashboard has pending-action count prominently visible
- [ ] Coordinator queue shows SLA timer (24hr clock for new requests)
- [ ] Quotation list has status column with clear colour coding
- [ ] "New Quotation" form shows the two-step R-001 governance flow
- [ ] Coordinator remarks field is visible in quotation views

## Artifact Instructions

Use screenshots as source of truth. Preserve coordinator workflow (assign → process → return to sales).
Do not bypass the R-001 governance gate in any redesign.
