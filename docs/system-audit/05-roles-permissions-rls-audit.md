# 05 — Roles, Permissions & RLS Audit

---

## Roles Defined

| Role Key | Label | Financial Visibility | Primary Module |
|----------|-------|----------------------|----------------|
| `admin` | Admin | Full | All — full access |
| `operations_manager` | Operations Manager | Partial | All operational modules |
| `sales_user` | Sales | Quotation only | Quotations, Hot Projects, SO |
| `sales_coordinator` | Sales Coordinator | Quotation only | Quotation processing |
| `procurement_user` | Procurement | Cost only | PRs, POs, Suppliers |
| `factory_user` | Factory / Production | None | Factory, WO, Raw Materials |
| `store_user` | Store / Warehouse | None | Store, Vehicle Receiving, Custody |
| `qc_user` | Quality Control | None | Material QC, Project QC, NCR, Release Note |
| `afs_user` | AFS | None | Dubai, AFS, After-Sales |
| `viewer` | Viewer / Management | Partial | Reports, Dashboard (read-only) |

**Assessment:** All 10 required roles are defined and implemented.

---

## Role-to-Route Enforcement (UI Layer)

Implemented via `RequireRole` component in `App.tsx`. Behavior:
- `admin` role always passes — hardcoded bypass in `RequireRole`
- Named roles must be in the `roles[]` array to access the route
- On deny: shows a 403 panel (not a redirect) — good UX
- On no role (unauthenticated): redirects to `/login`

### Unprotected routes (any authenticated user can access):

| Route | Concern |
|-------|---------|
| `/quotations/*` | All roles can read quotations — intentional for now, but `sales_user` should not see coordinator-only data |
| `/projects/*` | All roles can create/view projects — DB RLS governs write access |
| `/templates/*` | All roles can create templates — approval gate exists but creation is wide-open |

### Role gap — Admin approval route

`/admin-approvals` only allows `operations_manager`. Admin cannot reach this page directly (but admin bypasses all RequireRole checks, so this is consistent).

---

## Role Coverage Matrix

| Module | admin | ops_mgr | sales_user | sales_coord | proc | factory | store | qc | afs | viewer |
|--------|-------|---------|------------|-------------|------|---------|-------|----|-----|--------|
| Dashboard | ✅ | ✅ | → /sales | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Quotations | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sales Workspace | ✅ | ✅ | ✅ | — | — | — | — | — | — | — |
| Sales Coordinator | ✅ | ✅ | — | ✅ | — | — | — | — | — | — |
| Admin Approvals | ✅ | ✅ | — | — | — | — | — | — | — | — |
| WO/PN Gate | ✅ | ✅ | — | — | — | ✅ | — | — | — | — |
| Procurement | ✅ | ✅ | — | — | ✅ | — | — | — | — | — |
| Factory | ✅ | ✅ | — | — | — | ✅ | — | — | — | — |
| Store | ✅ | ✅ | — | — | — | — | ✅ | — | — | — |
| Custody | ✅ | ✅ | — | — | — | ✅ | ✅ | — | ✅ | — |
| Material QC | ✅ | ✅ | — | — | — | — | — | ✅ | — | — |
| Project QC | ✅ | ✅ | — | — | — | — | — | ✅ | — | — |
| Dubai/AFS | ✅ | ✅ | — | — | — | — | — | — | ✅ | — |
| After-Sales | ✅ | ✅ | — | — | — | — | — | — | ✅ | — |
| Control Tower | ✅ | ✅ | — | — | — | — | — | — | — | ✅ |
| Reports | ✅ | ✅ | sales only | ✅ | limited | limited | limited | limited | limited | ✅ |
| Admin Settings | ✅ | — | — | — | — | — | — | — | — | — |
| Audit Log | ✅ | — | — | — | — | — | — | — | — | — |

---

## Database / RLS Enforcement

### Key RLS Helper Function

`public.current_user_role()` — a `SECURITY DEFINER` function that returns the role for the calling user from `user_roles`. Used in all RLS policies. Prevents infinite recursion.

### Tables with Confirmed RLS

| Table | Policy Notes |
|-------|-------------|
| `profiles` | Own read + admin/ops read; own update; admin insert/delete |
| `user_roles` | Own read; admin full |
| `projects` | `can_read_project()` / `can_write_project()` helper functions; role-based access |
| `project_vehicle_lines` | Inherits from project |
| `project_documents` | Project-level access |
| `project_execution_references` | Project-level access |
| `purchase_orders_to_supplier` | Split INSERT/SELECT/UPDATE/DELETE for procurement; trigger guard for approval |
| `storage.objects` | Role-based per bucket |

### Tables Likely Missing RLS (not in migrations reviewed)

| Table | Risk | Notes |
|-------|------|-------|
| `quotation_requests` | High | No RLS migration found in audit; sales_user should only see own quotations |
| `material_custody_records` | High | Custody is sensitive — any store/factory/afs user can see all? |
| `afs_maintenance_requests` | Medium | Should afs_user see all maintenance requests or only their assigned ones? |
| `factory_records` | Medium | factory_user should only see Saudi projects |
| `sla_events` | Medium | Should be readable by owners and ops only |
| `audit_log` | Medium | Admin-only read? Currently unclear |
| `notifications` | Medium | Should be per-user only |

---

## Permission Keys (Defined but Not Enforced)

`PERMISSION_KEYS` is defined in `src/types/index.ts`:

```typescript
export const PERMISSION_KEYS = [
  'can_view_costs',
  'can_approve_po',
  'can_approve_templates',
  'can_manage_users',
  'can_export_reports',
  'can_issue_release_note',
  'can_approve_custody',
  'can_manage_sla',
  'can_manage_capa',
] as const;
```

**Assessment:** These permission keys are defined as a future foundation but are not currently used anywhere in the application. Role-based access (`RequireRole`) is the live mechanism. This is acceptable as a Phase 1 approach, but the permission keys should be wired to actual checks before sensitive actions in future phases.

---

## High-Risk Access Issues

| # | Risk | Detail | Severity |
|---|------|--------|----------|
| HRA-01 | Quotation data visible to all roles | Any authenticated user can access `/quotations` — no RLS or route guard filters by role | High |
| HRA-02 | Project creation open to all roles | `/projects/new` has no `RequireRole` — any authenticated user can create an SO | High |
| HRA-03 | Custody approval bypass possible | `approval_required` flag set in UI; if user can directly POST to `material_custody_records` without RLS, they could self-approve | High |
| HRA-04 | Template creation open to all roles | Any role can create a template; only approval is gated | Medium |
| HRA-05 | Viewer role has no data restrictions at DB level | `viewer` sees reports and control tower but RLS for these tables may allow read by any role | Medium |
| HRA-06 | `admin` bypass in RequireRole is implicit | All admin access is gated only by the `admin` role — no secondary confirmation for destructive admin actions | Low |

---

## Relevant Reference Library Patterns

| Pattern | Source | License | Description |
|---------|--------|---------|-------------|
| RBAC resource guards | **refine** (MIT) | Low | `useCan()` hook for fine-grained permission checks per action (create/read/update/delete) |
| Permission-based UI rendering | **react-admin** (MIT) | Low | `usePermissions()` to conditionally render actions based on role |
| Row-level ownership RLS | **Supabase Next.js Starter** (MIT) | Low | Pattern for `created_by = auth.uid()` row ownership policies |

---

## Recommendations

1. Add RLS to `quotation_requests` — filter by `requested_by = auth.uid()` for sales_user
2. Add RLS to `material_custody_records` — restrict write to involved roles only
3. Add `RequireRole` to `/projects/new` — sales_user and above, not all roles
4. Wire `PERMISSION_KEYS` to at least PO approval, Release Note issuance, and custody approval actions
5. Audit remaining module tables (factory, store, QC, Dubai) for missing RLS policies
6. Add a DB trigger or CHECK to prevent direct custody approval status updates by non-admin/ops users (same pattern as PO approval guard in migration 061)
