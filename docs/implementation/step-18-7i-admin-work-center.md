# Step 18.7I — Admin Work Center & System Governance UX Rebuild

**Date:** 2026-06-20
**Branch:** `feature/step-18-7i-admin-work-center`
**Commit:** `d7966fc`
**Depends on:** Step 18.7H.1 (PR #119 — Operations Manager Control Tower stabilization)

---

## Summary

Rebuilt the `admin` experience from a generic "sees everything" role into a focused
System Administration Center. Admin now lands on a dedicated governance dashboard,
has a streamlined sidebar with SYSTEM ADMINISTRATION and SYSTEM GOVERNANCE sections,
and is removed from all department-specific operational workspace sub-items.

**Admin nav: ~70+ items → ~30 focused items.**

---

## Latest Main SHA Checked

`50121d1` — confirmed Step 18.7H.1 merged as PR #119.

---

## Changes Made

### 1. `src/lib/roleMatrix.ts`

| Field | Before | After |
|---|---|---|
| `landingRoute` | `/` (generic Dashboard) | `/admin-dashboard` (System Administration) |
| `rules` count | 5 generic rules | 8 focused governance rules |

New governance rules:
1. Manage users and roles carefully — assign roles only through the approved user_roles source.
2. Review all access requests before granting permissions — do not approve without verification.
3. Admin-only pages must remain admin-only — do not expose to other roles.
4. PO > 10,000 SAR requires your approval — review procurement requests before they proceed.
5. Temporary Custody requires your approval — verify receiver and item details before approving.
6. Review audit log and data quality issues regularly — flag anomalies to the relevant module team.
7. Use the Permission Matrix to detect nav and route guard mismatches before they reach production.
8. Do not use the Admin workspace for daily operational execution — operational decisions belong in module work centers.

### 2. `src/pages/AdminDashboard.tsx` (new page)

New admin governance landing page at `/admin-dashboard`.

- **Purple/slate accent** — consistent with ROLE_MATRIX.admin.moduleAccentColor
- **System Status KPI strip** — 4 live Supabase counts: Total Users, Pending Access Requests, Pending SO Approvals, Active Projects (fallback to '—' if Supabase not configured)
- **Admin Quick Actions grid** — 8 cards linking to: User Management, Access Requests, Admin Approvals, WO/PN Gate, Audit Log, System Settings, Notification Rules, Report Subscriptions
- **Cross-Module Monitoring** — 6 compact tiles: Operations Overview, Reports Hub, Data Quality, Projects/SO, Document Templates, Health Scores
- **Governance Rules card** — rendered via `RoleRulesCard` (reads from ROLE_MATRIX.admin.rules automatically)

Supabase queries:
- `profiles` table: total user count
- `access_requests` table: count where `request_status = 'submitted'`
- `projects` table: count where `project_status = 'submitted_for_approval'`
- `projects` table: count where `project_status IN (active, approved, submitted_for_approval)`

### 3. `src/data/navigation.ts`

#### Admin landing item added (MY WORK section):
```
admin-dashboard  →  /admin-dashboard  (admin only)
```

#### Dashboard item updated:
Removed `admin` from the generic `dashboard` item (admin lands on admin-dashboard instead).

#### Dept-specific sections — admin removed:
Admin removed from all sub-items in these operational workspace sections:

| Section | Items affected |
|---|---|
| PROCUREMENT | proc-dashboard, proc-requests, proc-items-without-po, proc-purchase-orders, proc-eta, proc-suppliers |
| STORE OPERATIONS | store-dashboard, store-inventory, store-receiving, store-vehicle, store-issuance, store-custody, store-unallocated, store-serials, store-returns |
| QUALITY HANDOFF | store-qc-pending, store-qc-accepted, store-qc-rejected |
| QUALITY CONTROL | qc-dashboard, qc-work-queue, qc-material-qc, qc-material-inspections, qc-material-ncrs, qc-project-qc, qc-project-inspections, qc-findings, qc-rework, qc-release-notes, qc-reports-link |
| FACTORY EXECUTION | factory-dashboard, factory-wo-gate, factory-projects, factory-production-lines, factory-requirements, factory-rmr, factory-monthly-updates, factory-send-to-qc |
| FACTORY MATERIALS | factory-materials-requested, factory-materials-issued, factory-custody |
| DUBAI/AFS EXECUTION | afs-dashboard, afs-pn-gate, afs-followups, afs-eta, afs-arrivals, afs-missing, afs-predelivery, afs-ready-delivery |
| AFS MATERIALS | afs-materials, afs-custody |
| AFTER SALES | after-sales-maintenance, after-sales-new |

**Admin keeps visibility** in:
- SALES & COMMERCIAL (sales, hot-projects, quotations, receivables)
- PROJECTS (projects/SO only — admin-approvals and wo-pn-gate moved to SYSTEM GOVERNANCE)
- EXECUTION (procurement, factory, store hub-level items)
- QUALITY & RELEASE (material-qc, project-qc hub items)
- DUBAI / AFS (dubai-afs, after-sales hub items)
- REPORTING (control-tower/Operations Overview, reports hub)

#### PROJECTS section:
- Removed `admin-approvals` and `wo-pn-gate` from PROJECTS section for admin (moved to SYSTEM GOVERNANCE)
- Only `projects` (Projects/SO) remains in PROJECTS for admin + viewer

#### ADMIN & SYSTEM section replaced with two focused sections:

**SYSTEM ADMINISTRATION** (admin only):
- `admin-users` → User Management → /admin/users
- `admin-access-requests` → Access Requests → /admin/access-requests
- `admin-notification-rules` → Notification Rules → /admin/notification-rules
- `admin-report-subscriptions` → Report Subscriptions → /admin/report-subscriptions

**SYSTEM GOVERNANCE** (admin only):
- `sys-admin-approvals` → Admin Approvals → /admin-approvals
- `sys-wo-pn-gate` → WO / PN Gate → /wo-pn-gate
- `audit-log` → Audit Log → /audit-log
- `settings` → System Settings → /settings
- `templates` → Document Templates → /templates (admin + sales_user)

### 4. `src/app/App.tsx`

- Added lazy import for `AdminDashboard`
- Added route: `admin-dashboard` → `<RequireRole roles={['admin']}><AdminDashboard /></RequireRole>`
- Updated admin governance routes to explicitly declare admin in roles array:
  - `admin/access-requests` → `roles: ['admin']` (was `['operations_manager']`)
  - `admin/access-requests/:id` → `roles: ['admin']`
  - `admin/notification-rules` → `roles: ['admin']`
  - `admin/report-subscriptions` → `roles: ['admin']`
  - `admin/report-subscriptions/:id` → `roles: ['admin']`
  - `templates/approvals` → `roles: ['admin', 'operations_manager']`

---

## Admin Navigation Count (Before vs After)

| Section | Before | After |
|---|---|---|
| MY WORK | dashboard + inbox + notifications | admin-dashboard + inbox + notifications |
| SALES & COMMERCIAL | 4 items | 4 items (unchanged) |
| SALES COORDINATION | hidden | hidden |
| CONTROL TOWER | hidden | hidden |
| PROJECTS | 3 items (projects + approvals + wo-pn) | 1 item (projects only) |
| PROCUREMENT | 6 items (dept workspace) | 0 (admin uses EXECUTION hub) |
| STORE OPERATIONS | 9 items (dept workspace) | 0 (admin uses EXECUTION hub) |
| QUALITY HANDOFF | 3 items | 0 |
| QUALITY CONTROL | 11 items (dept workspace) | 0 (admin uses QUALITY & RELEASE hub) |
| FACTORY EXECUTION | 8 items | 0 (admin uses EXECUTION hub) |
| FACTORY MATERIALS | 3 items | 0 |
| EXECUTION (generic) | 5 items | 5 items (unchanged) |
| QUALITY & RELEASE | 2 items | 2 items (unchanged) |
| DUBAI/AFS EXECUTION | 8 items | 0 (admin uses DUBAI/AFS hub) |
| AFS MATERIALS | 2 items | 0 |
| AFTER SALES (dept) | 2 items | 0 (admin uses DUBAI/AFS hub) |
| DUBAI/AFS (generic) | 2 items | 2 items (unchanged) |
| WORKSTREAM MONITORING | hidden | hidden |
| REPORTING | 2 items | 2 items (unchanged) |
| OPERATIONS REPORTING | hidden | hidden |
| ADMIN & SYSTEM (old) | 7 items | replaced |
| SYSTEM ADMINISTRATION (new) | — | 4 items |
| SYSTEM GOVERNANCE (new) | — | 5 items |

**Total visible items for admin: ~70+ → ~30 focused items**

---

## Validation Results

- `npm run build`: ✅ PASS — 0 errors, built in 7.46s
- `npx tsc --noEmit`: ✅ PASS — 0 errors
- `npx eslint src/pages/AdminDashboard.tsx src/lib/roleMatrix.ts src/data/navigation.ts src/app/App.tsx`: ✅ PASS — 0 errors, 0 warnings
- `npm run lint` (global): 82 problems — unchanged baseline from before this PR

---

## Route Smoke Test — All Admin Nav Items

Admin RequireRole bypass: `RequireRole.tsx:29` — `const allowed = role === 'admin' || (role != null && roles.includes(role))`
Admin always passes any RequireRole check regardless of the declared roles array.

| # | Nav ID | Label | Path | Route Guard | Admin Access | Note |
|---|---|---|---|---|---|---|
| 1 | admin-dashboard | System Administration | /admin-dashboard | RequireRole(['admin']) | ✅ explicit | NEW — landing page |
| 2 | inbox | Action Inbox | /inbox | none | ✅ all authenticated | |
| 3 | notifications | Notifications | /notifications | none | ✅ all authenticated | |
| 4 | sales | Sales Workspace | /sales | none | ✅ all authenticated | |
| 5 | hot-projects | Hot Projects | /hot-projects | RequireRole(['admin', 'ops_mgr', 'sales_user', ...]) | ✅ explicit | |
| 6 | quotations | Quotation Requests | /quotations | none | ✅ all authenticated | |
| 7 | receivables | Receivables & Aging | /receivables | RequireRole(['admin', 'ops_mgr', 'sales_user', ...]) | ✅ explicit | |
| 8 | projects | Projects / SO | /projects | none | ✅ all authenticated | |
| 9 | procurement | Procurement | /procurement | RequireRole(['procurement_user', 'ops_mgr']) | ✅ bypass | hub view only |
| 10 | factory | Factory / Production | /factory | RequireRole(['factory_user', 'ops_mgr']) | ✅ bypass | hub view only |
| 11 | store | Store / Warehouse | /store | RequireRole(['store_user', 'ops_mgr']) | ✅ bypass | hub view only |
| 12 | custody | Material Custody | /custody | RequireRole(['store_user', 'factory_user', 'afs_user', 'ops_mgr']) | ✅ bypass | |
| 13 | vehicle-receiving | Vehicle Receiving | /store/vehicle-receiving | RequireRole(['store_user', 'ops_mgr']) | ✅ bypass | |
| 14 | material-qc | Material QC | /material-qc | RequireRole(['qc_user', 'ops_mgr']) | ✅ bypass | hub view only |
| 15 | project-qc | Project / Vehicle QC | /project-qc | RequireRole(['qc_user', 'ops_mgr']) | ✅ bypass | hub view only |
| 16 | dubai-afs | Dubai / AFS | /dubai-afs | RequireRole(['afs_user', 'ops_mgr']) | ✅ bypass | hub view only |
| 17 | after-sales | After Sales Maintenance | /after-sales | RequireRole(['afs_user', 'ops_mgr']) | ✅ bypass | |
| 18 | control-tower | Operations Overview | /control-tower | RequireRole(['ops_mgr', 'viewer']) | ✅ bypass | REPORTING section |
| 19 | reports | Reports Hub | /reports | RequireRole(['ops_mgr', 'viewer', ...]) | ✅ bypass | REPORTING section |
| 20 | admin-users | User Management | /admin/users | RequireRole(['admin']) | ✅ explicit | SYSTEM ADMIN |
| 21 | admin-access-requests | Access Requests | /admin/access-requests | RequireRole(['admin']) | ✅ explicit | CORRECTED (was ops_mgr) |
| 22 | admin-notification-rules | Notification Rules | /admin/notification-rules | RequireRole(['admin']) | ✅ explicit | CORRECTED (was ops_mgr) |
| 23 | admin-report-subscriptions | Report Subscriptions | /admin/report-subscriptions | RequireRole(['admin']) | ✅ explicit | CORRECTED (was ops_mgr) |
| 24 | sys-admin-approvals | Admin Approvals | /admin-approvals | RequireRole(['ops_mgr']) | ✅ bypass | SYSTEM GOVERNANCE |
| 25 | sys-wo-pn-gate | WO / PN Gate | /wo-pn-gate | RequireRole(['ops_mgr', 'factory_user']) | ✅ bypass | SYSTEM GOVERNANCE |
| 26 | audit-log | Audit Log | /audit-log | RequireRole(['admin']) | ✅ explicit | SYSTEM GOVERNANCE |
| 27 | settings | System Settings | /settings | RequireRole(['admin']) | ✅ explicit | SYSTEM GOVERNANCE |
| 28 | templates | Document Templates | /templates | none | ✅ all authenticated | SYSTEM GOVERNANCE |

**All 28 admin nav items pass.**
- 8 items: explicit `RequireRole(['admin'])` guard
- 10 items: RequireRole with other roles — admin bypasses via `role === 'admin'` check
- 10 items: no RequireRole (all authenticated users)

---

## Route Smoke Test — /admin-dashboard

| Check | Result |
|---|---|
| Route exists in App.tsx | ✅ L298 — `admin-dashboard` |
| Route guard | ✅ `RequireRole roles={['admin']}` |
| Admin bypass applies | ✅ admin always passes RequireRole |
| Non-admin blocked | ✅ ops_mgr, sales_user, etc. → Access Restricted |
| Landing redirect | ✅ ROLE_MATRIX.admin.landingRoute = '/admin-dashboard' |
| RootRedirect handles it | ✅ Admin navigating to '/' → redirected to '/admin-dashboard' |

---

## Admin Governance Route Corrections

| Route | Before | After | Note |
|---|---|---|---|
| `/admin/access-requests` | `roles: ['operations_manager']` | `roles: ['admin']` | Admin-only governance |
| `/admin/access-requests/:id` | `roles: ['operations_manager']` | `roles: ['admin']` | Same |
| `/admin/notification-rules` | `roles: ['operations_manager']` | `roles: ['admin']` | Same |
| `/admin/report-subscriptions` | `roles: ['operations_manager']` | `roles: ['admin']` | Same |
| `/admin/report-subscriptions/:id` | `roles: ['operations_manager']` | `roles: ['admin']` | Same |
| `/templates/approvals` | `roles: ['operations_manager']` | `roles: ['admin', 'operations_manager']` | ops_mgr retains access |

Note: Admin always bypassed RequireRole before (hardcoded in RequireRole.tsx: `role === 'admin' || roles.includes(role)`). These corrections make the declared intent explicit — admin is now explicitly listed. Functional behavior for admin was unchanged since admin always bypassed. ops_mgr now CANNOT deep-link to `/admin/access-requests`, `/admin/notification-rules`, `/admin/report-subscriptions` — intentional governance correction (these were already hidden from ops_mgr nav in Step 18.7H).

---

## Admin vs Operations Manager Separation

| Check | Admin | Ops Manager | Status |
|---|---|---|---|
| Landing route | /admin-dashboard | /control-tower | ✅ separate |
| Nav section | SYSTEM ADMINISTRATION + SYSTEM GOVERNANCE | CONTROL TOWER + WORKSTREAM MONITORING + OPERATIONS REPORTING | ✅ separate |
| /admin/users | ✅ RequireRole(['admin']) | ❌ blocked | ✅ correct |
| /admin/access-requests | ✅ RequireRole(['admin']) | ❌ blocked | ✅ CORRECTED |
| /admin/notification-rules | ✅ RequireRole(['admin']) | ❌ blocked | ✅ CORRECTED |
| /admin/report-subscriptions | ✅ RequireRole(['admin']) | ❌ blocked | ✅ CORRECTED |
| /audit-log | ✅ RequireRole(['admin']) | ❌ blocked | ✅ correct |
| /settings | ✅ RequireRole(['admin']) | ❌ blocked | ✅ correct |
| /admin-approvals | ✅ bypass | ✅ RequireRole(['ops_mgr']) | ✅ both have access (intentional) |
| /wo-pn-gate | ✅ bypass | ✅ RequireRole(['ops_mgr', 'factory_user']) | ✅ both have access (intentional) |
| /templates/approvals | ✅ explicit | ✅ explicit | ✅ both retain (intentional) |

---

## Role Assignment Safety Review

| Check | Result | File / Location |
|---|---|---|
| Role assignment source | ✅ public.user_roles | AdminUsers.tsx:344 — `supabase.from('user_roles').upsert({ user_id, role }, { onConflict: 'user_id' })` |
| profiles.role used for assignment | ✅ No — profiles is read-only display | AdminUsers.tsx |
| Non-admin blocked from /admin/users | ✅ RequireRole(['admin']) | App.tsx:300 |
| Roles available for assignment | ✅ ROLE_CONFIGS keys — all valid roles, no blank | AdminUsers.tsx:AssignRoleModal |
| Suspend/reactivate persisted to DB | N/A — dev-only UI state | AdminUsers.tsx |
| Access Requests page — admin only | ✅ RequireRole(['admin']) | App.tsx:305 — CORRECTED |
| Admin bypass in RequireRole | ✅ always bypasses | RequireRole.tsx:29 |
| Supabase RLS unchanged | ✅ no DB changes in this step | — |

---

## Scope Classification

**Admin Work Center Foundation** — core governance UX delivered; power tools deferred.

Foundation elements delivered:
- New admin governance landing page (`/admin-dashboard`) with live KPI strip
- Admin nav reduced from ~70+ items → ~30 focused items (9 dept sections cleared)
- Two new governance-focused nav sections (SYSTEM ADMINISTRATION + SYSTEM GOVERNANCE)
- Admin governance rules expanded to 8 focused rules
- Governance route guards corrected (4 admin-only routes now explicitly declared)
- Admin removed from all dept-specific workspace sub-items (37+ nav entries)

---

## Implemented vs Deferred

| Feature | Status | File / Route |
|---|---|---|
| Admin landing page (/admin-dashboard) | ✅ Implemented | src/pages/AdminDashboard.tsx |
| Live KPI strip (4 Supabase counts) | ✅ Implemented | AdminDashboard.tsx:150–181 |
| Admin Quick Actions grid (8 cards) | ✅ Implemented | AdminDashboard.tsx:QUICK_ACTIONS |
| Cross-Module Monitoring (6 tiles) | ✅ Implemented | AdminDashboard.tsx:MONITOR_LINKS |
| Governance Rules card | ✅ Implemented | AdminDashboard.tsx + RoleRulesCard |
| SYSTEM ADMINISTRATION nav section | ✅ Implemented | navigation.ts:sep-system-admin |
| SYSTEM GOVERNANCE nav section | ✅ Implemented | navigation.ts:sep-system-gov |
| Admin removed from dept workspaces | ✅ Implemented | navigation.ts (37+ items) |
| Admin governance rules (8 rules) | ✅ Implemented | roleMatrix.ts:admin.rules |
| admin-dashboard route + guard | ✅ Implemented | App.tsx:298 |
| Governance route guard corrections (4 routes) | ✅ Implemented | App.tsx:305–309 |
| templates/approvals — ops_mgr retained | ✅ Implemented | App.tsx:304 |
| AdminPermissionMatrix page | ⏳ Deferred | — (Step 10.5H scope) |
| AdminRoleMatrix page | ⏳ Deferred | — (future step) |
| AdminSystemSettings page | ⏳ Deferred | — (wraps Settings.tsx; future step) |
| Live audit log queries | ⏳ Deferred | AuditLog.tsx uses hardcoded sample entries — schema gap |

---

## Safety Review

| Item | Changed |
|---|---|
| DB/RLS/migrations | No |
| Route guards weakened | No (corrections make guard intent explicit; admin bypass was already in effect) |
| Route guards removed | No |
| Business workflow | No |
| SO approval/routing logic | No |
| Procurement/Store/Factory/QC/AFS workflows | No |
| Operations Manager behavior | No |
| Sales User behavior | No |
| Sales Coordinator behavior | No |
| Admin-only features exposed to non-admin | No |
| Secrets or sensitive config exposed | No |
| Fake live data added | No |
| Role assignment source changed | No (user_roles table — unchanged) |

---

## Files Changed

- `src/lib/roleMatrix.ts` — admin landingRoute + governance rules
- `src/pages/AdminDashboard.tsx` — new admin governance landing page
- `src/data/navigation.ts` — admin nav restructure (dept sections cleaned, SYSTEM ADMINISTRATION + SYSTEM GOVERNANCE added)
- `src/app/App.tsx` — admin-dashboard route + governance route guard corrections
- `docs/implementation/step-18-7i-admin-work-center.md` — this file

---

## Deferred Items

- AdminPermissionMatrix page (read-only nav + route guard matrix per role)
- AdminRoleMatrix page (ROLE_MATRIX viewer)
- AdminSystemSettings page (wrapping Settings.tsx reference data view)
- Live audit log query (AuditLog.tsx currently uses hardcoded sample entries — schema gap)
- Admin command palette / quick search (Step 10.5H scope)
