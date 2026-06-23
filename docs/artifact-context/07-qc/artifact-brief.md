# Module 07 — Quality Control

## Routes Captured

| Route | Name | Roles |
|-------|------|-------|
| `/qc` | QC Dashboard | admin, operations_manager, qc_user |
| `/qc/inspections` | QC Inspections | admin, operations_manager, qc_user |
| `/qc/inspections/new` | New Inspection | admin, operations_manager, qc_user |

## Review Checklist

### QC Dashboard
- [ ] Pending inspections count
- [ ] Pass/fail rate metrics
- [ ] Overdue inspections highlighted

### QC Inspections
- [ ] Inspection list with project reference, status, date
- [ ] Pass / Fail / Pending status clearly colour-coded
- [ ] Filter by project or date range

### New Inspection
- [ ] Inspection form clear
- [ ] Checklist items (if present)
- [ ] Pass/fail/observation input clear

## Open Issues

_Fill in after reviewing screenshots._

## Notes

QC sign-off is required before factory work orders can be closed. The inspection result feeds back into the WO/PN gate. Pass/fail status must be visually unambiguous.
