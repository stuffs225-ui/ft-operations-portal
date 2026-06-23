# Module 03 — Projects / Sales Orders

## Accounts with Access
All roles have at least read access to `/projects`. Create and approval limited to admin/ops/sales.

## Routes Captured

| Route | Name | Key Roles |
|-------|------|-----------|
| `/projects` | Projects List | all roles |
| `/projects/new` | New Project (SO) Wizard | admin, operations_manager, sales_user |
| `/admin-approvals` | Admin Approvals Queue | operations_manager |
| `/wo-pn-gate` | WO / PN Execution Gate | operations_manager, factory_user |

## Review Checklist

- [ ] Project list shows project number, client, status, value, and current stage
- [ ] Role-specific column visibility (factory users shouldn't see financial columns)
- [ ] Project creation wizard has clear step indicators (1 of 4)
- [ ] Admin approvals queue shows pending items with context (who submitted, when, value)
- [ ] WO/PN gate shows blocked vs. cleared state clearly
- [ ] Status badges are visually distinct across all project statuses

## Artifact Instructions

Use screenshots as source of truth. The multi-step wizard must preserve all existing steps.
The WO/PN gate is a critical governance checkpoint — its blocked/cleared state must be unambiguous.
