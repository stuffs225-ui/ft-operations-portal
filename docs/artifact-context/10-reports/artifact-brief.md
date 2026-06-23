# Module 10 — Reports

## Routes Captured

| Route | Name | Roles |
|-------|------|-------|
| `/reports` | Reports Hub | admin, operations_manager |
| `/reports/sales` | Sales Reports | admin, operations_manager |
| `/reports/production` | Production Reports | admin, operations_manager |
| `/reports/financial` | Financial Reports | admin, operations_manager |

## Review Checklist

### Reports Hub
- [ ] Report categories clearly navigable
- [ ] Date range selector prominent
- [ ] Export options visible (PDF / Excel)

### Sales Reports
- [ ] Pipeline value by period
- [ ] Win/loss rates
- [ ] Top clients

### Production Reports
- [ ] WO completion rates
- [ ] Factory throughput
- [ ] QC pass rates

### Financial Reports
- [ ] Invoice totals by period
- [ ] Outstanding receivables
- [ ] Spend by category

## Open Issues

_Fill in after reviewing screenshots._

## Notes

Reports are read-heavy. The primary design concern is data density vs. readability. Chart/table switching and export CTAs must be clearly visible.
