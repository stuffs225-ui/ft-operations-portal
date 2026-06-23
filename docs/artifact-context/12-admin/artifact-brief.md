# Module 12 — Admin

## Accounts with Access
`admin`, `stuffs` only (all RequireRole guards explicitly require admin role)

## Routes Captured

| Route | Name |
|-------|------|
| `/admin-dashboard` | Admin Dashboard |
| `/settings` | System Settings |
| `/admin/users` | User Management |
| `/audit-log` | Audit Log |
| `/admin/access-requests` | Access Requests |
| `/admin/notification-rules` | Notification Rules |
| `/admin/report-subscriptions` | Report Subscriptions |
| `/templates/approvals` | Template Approvals (admin+ops) |

## Review Checklist

- [ ] Admin dashboard has system health overview (user count, error flags)
- [ ] User management shows role, status, last login clearly
- [ ] Activate/deactivate actions are clearly labelled
- [ ] Audit log is filterable (by module, user, action, date)
- [ ] Access requests show pending count prominently
- [ ] Settings page has section-based layout (not a single giant form)

## Artifact Instructions

Admin pages configure the system — clarity and trustworthiness are paramount.
User management must show role assignment clearly (no ambiguous dropdowns).
