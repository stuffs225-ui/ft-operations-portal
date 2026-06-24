# Module 07 — QC / NCR / Release

## Accounts with Access
`qc`, `coo`, `ops`, `admin`, `stuffs`

## Routes Captured

| Route | Name |
|-------|------|
| `/qc` | QC Dashboard |
| `/qc/work-queue` | QC Work Queue |
| `/qc/rework` | Rework Queue |
| `/material-qc` | Material QC |
| `/material-qc/inspections` | Material QC Inspections |
| `/material-qc/ncrs` | Material NCRs |
| `/project-qc` | Project QC |
| `/project-qc/inspections` | Project QC Inspections |
| `/project-qc/findings` | QC Findings |
| `/project-qc/release-notes` | QC Release Notes |
| `/reports/qc` | QC Reports |
| `/reports/issues` | Issues Reports |
| `/reports/capa` | CAPA Reports |

## Review Checklist

- [ ] QC dashboard has pass/fail rate prominently visible
- [ ] Work queue is action-oriented (clear which items need inspection)
- [ ] NCR list shows open vs. closed status prominently
- [ ] Open NCRs show the blocked-release warning clearly
- [ ] Release notes list shows ready_for_release requirement met/unmet
- [ ] Rework items show severity and what action is needed

## Artifact Instructions

Open NCRs block Release Note issuance — this gate must be visually unambiguous.
Pass/fail status must be colour-coded and instantly readable.
