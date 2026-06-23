# Module 06 — Factory / Production

## Accounts with Access
`factory`, `coo`, `ops`, `admin`, `stuffs`

## Routes Captured

| Route | Name | Key Roles |
|-------|------|-----------|
| `/factory` | Factory Dashboard | factory_user, operations_manager |
| `/factory/projects` | Factory Projects | same |
| `/factory/requirements` | Factory Requirements | same |
| `/factory/raw-material-requests` | Raw Material Requests | same |
| `/factory/raw-material-requests/new` | New RMR | same |
| `/factory/monthly-updates` | Monthly Updates | same |
| `/factory/send-to-qc` | Send to QC | same |
| `/factory/pending-raw-materials` | Pending Raw Materials | same |
| `/wo-pn-gate` | WO / PN Gate | factory_user, operations_manager |
| `/reports/factory` | Factory Reports | same |

## Review Checklist

- [ ] Factory dashboard shows WO count and production progress
- [ ] WO requirement is surfaced before any project action (no WO = blocked)
- [ ] Raw material requests are clearly linked to a project and WO
- [ ] Monthly updates form has clear due date and overdue warning
- [ ] "Send to QC" is a clear handoff action (not just a list view)
- [ ] WO/PN gate blocked state is visually distinct (red/warning treatment)

## Artifact Instructions

WO is a mandatory gate — any redesign must preserve the "no WO = no action" enforcement.
Do not create new workflow steps; only improve existing visual design.
