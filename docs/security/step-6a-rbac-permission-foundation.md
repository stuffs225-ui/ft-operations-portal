# Step 6A — RBAC Permission Foundation and Route Guard Hardening

**Step:** 6A  
**Date:** 2026-06-14  
**Branch:** `feature/rbac-permission-foundation`

---

## Objective

Introduce a stable UI-layer permission abstraction (`usePermission` hook +
`PermissionGate` component) built on top of the existing role system, fix one
confirmed route guard gap (B-013), and pilot the new hook in one low-risk page.

No Supabase RLS changes. No migrations. No schema changes. No business logic
changes. No high-risk page refactors.

---

## Files Changed

### 1. `src/hooks/usePermission.ts` — new file

Central permission hook. Provides:

| Export | Purpose |
|--------|---------|
| `usePermission()` | Hook — returns helpers and financial flags |
| `useFinancialVisibility()` | Convenience hook — returns `FinancialVisibility` level only |
| `FinancialVisibility` type | Re-exported union matching `RoleConfig.financialVisibility` |

`usePermission()` return shape:

```ts
{
  hasPermission(key: PermissionKey): boolean;
  hasAnyPermission(keys: PermissionKey[]): boolean;
  hasAllPermissions(keys: PermissionKey[]): boolean;
  financialVisibility: FinancialVisibility; // full | partial | cost_only | quotation_only | none
  canAccessFinancials: boolean;             // financialVisibility !== 'none'
  canViewCosts: boolean;                    // hasPermission('can_view_costs')
  role: UserRole | null;
}
```

**Role → Permission mapping (`ROLE_PERMISSIONS`):**

| Permission key | Roles granted |
|----------------|---------------|
| `can_view_costs` | admin, operations_manager |
| `can_approve_po` | admin, operations_manager, procurement_user |
| `can_approve_templates` | admin, operations_manager |
| `can_manage_users` | admin |
| `can_export_reports` | admin, operations_manager, sales_user, sales_coordinator, viewer |
| `can_issue_release_note` | admin, qc_user |
| `can_approve_custody` | admin, store_user |
| `can_manage_sla` | admin, operations_manager |
| `can_manage_capa` | admin, operations_manager, qc_user |

Safe default: all `hasPermission*` functions return `false` when `role` is `null`.

### 2. `src/components/auth/PermissionGate.tsx` — new file

Inline conditional rendering by permission key. Wraps children in `<>...</>`,
renders `fallback` (default `null`) when permission is denied.

```tsx
<PermissionGate permission="can_view_costs" fallback={<span>—</span>}>
  <span>{formatSAR(project.total_sales_value)}</span>
</PermissionGate>
```

**Not** a route guard. For route-level access control use `RequireRole` (unchanged).

### 3. `src/app/App.tsx` — B-013 fix (line 153)

**Before:**
```tsx
<Route path="projects/new" element={<ProjectNew />} />
```

**After:**
```tsx
<Route path="projects/new" element={
  <RequireRole roles={['admin', 'operations_manager', 'sales_user']}>
    <ProjectNew />
  </RequireRole>
} />
```

Gap: `factory_user`, `store_user`, `qc_user`, `afs_user`, `viewer`,
`procurement_user`, `sales_coordinator` could previously reach `/projects/new`
by direct URL. Now blocked by `RequireRole` (shows "Access restricted" panel;
admin always passes per existing `RequireRole` logic).

### 4. `src/pages/Projects.tsx` — pilot adoption

Replaced inline `role === 'admin' || role === 'operations_manager'` check for
the financial value column with `canViewCosts` from `usePermission()`.

**Before:**
```ts
const canSeeMoney = role === 'admin' || role === 'operations_manager';
```

**After:**
```ts
const { canViewCosts } = usePermission();
// ...
const canSeeMoney = canViewCosts;
```

Behavior is identical (same two roles in `ROLE_PERMISSIONS['can_view_costs']`).

---

## What Was NOT Changed

- No Supabase queries modified
- No RLS policies added or changed
- No database migrations
- No schema changes
- No business logic changed (approval flows, workflow state machines)
- `RequireRole.tsx` — not modified (logic is correct as-is)
- `ProtectedRoute.tsx` — not modified
- `AuthContext.tsx` / `useAuth.ts` — not modified
- High-risk / forbidden pages untouched (`ProjectDetail`, `ProjectNew` form logic,
  `QuotationDetail`, `WoPnGate`, all approval flows)
- Legacy `ROLE_CONFIGS` in `src/lib/roles.ts` — not modified
- `PERMISSION_KEYS` constant in `src/types/index.ts` — not modified (used as-is)

---

## Validation Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Zero errors |
| `npm run build` | ✅ Clean |
| `npm run lint` | ✅ Zero new errors |

---

## Manual Test Checklist

- [ ] Dev mode (no Supabase): `canSeeMoney` column still visible on `/projects` (dev role = admin → `can_view_costs` = true)
- [ ] Direct URL `/projects/new` as `factory_user` / `qc_user` → shows "Access restricted" panel (B-013 fix)
- [ ] Direct URL `/projects/new` as `admin` / `operations_manager` / `sales_user` → page loads normally
- [ ] `hasPermission('can_view_costs')` → `true` for admin/ops_manager only; `false` for all others
- [ ] `hasPermission('can_manage_users')` → `true` for admin only
- [ ] `canAccessFinancials` → `true` for admin, ops_manager, viewer, sales_user, sales_coordinator, procurement_user; `false` for factory/store/qc/afs
- [ ] `useFinancialVisibility()` → returns correct level per role (see ROLE_CONFIGS)

---

## Remaining Step 6 Work (Step 6B+)

Suggested next tasks, in order of impact:

1. **Step 6B — Apply `PermissionGate` to cost/financial columns** across other pages
   (currently guarded by inline role checks — e.g., `AdminApprovals`, `Quotations`)
2. **Step 6C — Apply RLS to high-gap tables** identified in
   `docs/architecture/06-rbac-and-permissions-architecture.md`
3. **Step 6D — Wire `can_manage_users` / `can_approve_templates` to admin UI** guards
4. Optional: add `hasRoles(roles[])` shorthand to `usePermission` once pattern is proven

The current implementation intentionally keeps `ROLE_PERMISSIONS` as a pure
client-side map. When server-side per-user permissions are needed, swap out
`ROLE_PERMISSIONS` for a Supabase-backed permission record without changing
any call sites.
