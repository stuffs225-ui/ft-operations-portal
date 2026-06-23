# Module 01 — Sales

## Accounts with Access
`admin`, `stuffs`, `coo`, `ops`, `sales-test`, `testsales` (and `viewer` for hot-projects/receivables)

## Routes Captured

| Route | Name | Key Roles |
|-------|------|-----------|
| `/sales` | Sales Dashboard | sales_user, operations_manager, admin |
| `/hot-projects` | Hot Projects List | sales_user, sales_coordinator, viewer |
| `/hot-projects/new` | New Hot Project | sales_user, admin |
| `/receivables` | Receivables & Aging | sales_user, sales_coordinator, viewer |
| `/reports/sales` | Sales Reports | sales_user, operations_manager, viewer |

## Review Checklist

- [ ] Sales dashboard has meaningful KPIs (pipeline value, open quotations, hot projects count)
- [ ] Hot projects list shows priority / urgency indicators
- [ ] "New Hot Project" form is minimal and fast to fill
- [ ] Receivables table has clear aging columns and colour-coded overdue states
- [ ] Sales reports show trend charts with date range selector
- [ ] Empty states are informative (not just "No data")

## Artifact Instructions

Use screenshots as source of truth. Preserve all visible data fields and action buttons.
Do not add features that are not visible in the screenshots.
Generate Artifact first, implementation spec second.

## Known Issues to Look For

- Overuse of rounded corners (should be sharper for enterprise feel)
- Badge colours may not be distinct enough (especially status badges)
- Sales dashboard KPI cards may lack visual hierarchy
