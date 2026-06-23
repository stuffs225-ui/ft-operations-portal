# Module 13 — Viewer / Management Dashboard

## Accounts with Access
`viewer` only for `/management-dashboard`; `viewer` also has limited read access to other routes

## Routes Captured

| Route | Name |
|-------|------|
| `/management-dashboard` | Management Dashboard |
| `/control-tower` | Control Tower (read-only) |
| `/hot-projects` | Hot Projects (read-only) |
| `/receivables` | Receivables (read-only) |
| `/reports/executive` | Executive Reports |
| `/reports/sla` | SLA Reports |
| `/reports/data-quality` | Data Quality |
| `/reports/health-scores` | Health Scores |
| `/reports/projects` | Projects Reports |
| `/reports/sales` | Sales Reports |
| `/reports/issues` | Issues |

## Review Checklist

- [ ] Management dashboard has top-line metrics (revenue, delivery, production)
- [ ] No edit/create/delete/approve actions are visible
- [ ] Charts and trend indicators are clear
- [ ] Clearly marked as read-only (visual cue that no actions are possible)
- [ ] Board-room quality — could be shown in a presentation

## Artifact Instructions

Viewer is read-only — no action buttons, no form inputs, no approve/reject.
This page may be shown to clients or board members — it must be polished and trustworthy.
