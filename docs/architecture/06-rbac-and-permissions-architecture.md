# 06 — RBAC and Permissions Architecture

**Document:** Step 4C — Architecture Cleanup Review  
**Date:** 2026-06-13  
**Status:** Assessment only — no code changed

---

## Current RBAC Architecture

### Layer 1 — Supabase Auth + RLS

The database enforces role-level access at the row/table level:
- `public.current_user_role()` — SECURITY DEFINER function reads `user_roles.role` for the current `auth.uid()`
- RLS policies on all major tables reference `current_user_role()` — e.g., `TO authenticated USING (public.current_user_role() IN ('admin', 'operations_manager'))`
- Applied to: `projects`, `purchase_orders_to_supplier`, `customers`, `release_notes`, and many others

**Strength:** DB-level enforcement means API calls that bypass the React UI still respect role policies.

**Gap:** Many tables still show `⚠️` RLS status in the audit (see `docs/system-audit/04-database-supabase-audit.md`). Not all tables have RLS applied consistently.

---

### Layer 2 — Route Guards (`RequireRole`)

`src/components/auth/RequireRole.tsx` wraps routes in `App.tsx` with role arrays:

```tsx
<Route path="procurement/purchase-orders/:id"
  element={<RequireRole roles={['procurement_user', 'operations_manager']}>
    <ProcurementPODetail />
  </RequireRole>} />
```

**Usage confirmed by audit:**
- 14 routes guarded by `['afs_user', 'operations_manager']`
- 12 routes guarded by `['qc_user', 'operations_manager']`
- 10 routes guarded by `['store_user', 'operations_manager']`
- Admin always passes (hardcoded in `RequireRole`)

**Pattern:** `admin` is unconditionally authorized. All other roles require explicit inclusion. `viewer` appears on report routes.

**Gaps:**
1. `/projects/new` (SO creation) is NOT guarded by `RequireRole` — any authenticated user can submit an SO (B-013).
2. Some hub pages (`/procurement`, `/factory`, `/store`) may not be guarded or may be under-guarded.

---

### Layer 3 — Sidebar Role Filtering

`src/data/navigation.ts` defines sidebar links with `roles` arrays. Only links matching the user's role are shown. However:
- Sidebar filtering is **UI-only** — it does not affect route access
- A user who knows the URL can navigate to any page their `RequireRole` allows
- No server-side filtering of navigation

This is acceptable because `RequireRole` is the enforcement layer for routes. Sidebar filtering is for usability only.

---

## `PERMISSION_KEYS` — Defined But Not Wired

`src/types/index.ts:1353`:
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
export type PermissionKey = (typeof PERMISSION_KEYS)[number];
```

**Confirmed by audit:** `PermissionKey` and `PERMISSION_KEYS` are **never imported** anywhere in `src/`. They exist only in the type definition file.

**Current RBAC mechanism:** Role strings are used directly in `RequireRole` components and inline checks like `if (userRole === 'admin')` in page components.

**The gap:** `PERMISSION_KEYS` was designed to provide action-level permission checks beyond route-level role checks. For example:
- `can_issue_release_note` — should be checked when a user clicks "Issue Release Note"
- `can_approve_custody` — should be checked before showing the "Approve Custody" button
- `can_view_costs` — should hide financial columns for roles with `financialVisibility: 'none'`

Without a `usePermission()` hook backed by `PERMISSION_KEYS`, these checks are done inline per page with role comparisons, creating drift risk.

---

## Financial Visibility Architecture

`ROLE_CONFIGS` in `src/lib/roles.ts` defines `financialVisibility`:
```typescript
financialVisibility: 'full' | 'partial' | 'cost_only' | 'quotation_only' | 'none';
```

| Role | Financial Visibility |
|------|---------------------|
| admin | full |
| operations_manager | partial |
| sales_user | quotation_only |
| sales_coordinator | quotation_only |
| procurement_user | cost_only |
| factory_user | none |
| store_user | none |
| qc_user | none |
| afs_user | none |
| viewer | partial |

**Current enforcement:** Unknown. The `financialVisibility` field is defined in `ROLE_CONFIGS` but there is no `useFinancialVisibility()` hook or component that reads it to show/hide cost columns.

**Gap:** Roles with `financialVisibility: 'none'` (factory, store, qc, afs) may be able to see financial values in pages that show `total_sales_value` or `purchase_value` without a visibility guard.

---

## Role-by-Route Coverage Matrix

### Observed Pattern
`operations_manager` appears in virtually every route's `RequireRole`. This is correct — operations manager has broad visibility.

### Identified Gaps

| Route | Current Guard | Issue |
|-------|--------------|-------|
| `/projects/new` | None (or all authenticated) | B-013: All roles can create SOs |
| `/wo-pn-gate` | `['operations_manager']` | Correct; factory_user may need read-only view |
| `/audit-log` | `['admin']` | Correct |
| `/control-tower` | `['operations_manager', 'viewer']` | But page shows mock data — gap in data, not access |
| `/reports/*` | Role-specific per report | Correct pattern |

---

## Recommended RBAC Architecture (Step 6)

### 1. Create `usePermission()` Hook

```typescript
// src/hooks/usePermission.ts
import { useAuth } from './useAuth';
import type { PermissionKey, UserRole } from '../types';

const ROLE_PERMISSION_MAP: Record<UserRole, PermissionKey[]> = {
  admin: ['can_view_costs', 'can_approve_po', 'can_approve_templates',
          'can_manage_users', 'can_export_reports', 'can_issue_release_note',
          'can_approve_custody', 'can_manage_sla', 'can_manage_capa'],
  operations_manager: ['can_view_costs', 'can_approve_po', 'can_export_reports',
                       'can_issue_release_note', 'can_approve_custody', 'can_manage_sla'],
  sales_user: ['can_export_reports'],
  sales_coordinator: [],
  procurement_user: ['can_view_costs'],
  factory_user: [],
  store_user: ['can_approve_custody'],
  qc_user: ['can_issue_release_note', 'can_manage_capa'],
  afs_user: [],
  viewer: ['can_export_reports'],
};

export function usePermission(key: PermissionKey): boolean {
  const { userRole } = useAuth();
  if (!userRole) return false;
  return ROLE_PERMISSION_MAP[userRole]?.includes(key) ?? false;
}
```

### 2. Use `usePermission()` at Action Level

```typescript
// In a component:
const canIssueReleaseNote = usePermission('can_issue_release_note');

<Button
  disabled={!canIssueReleaseNote}
  onClick={handleIssueReleaseNote}
>
  Issue Release Note
</Button>
```

### 3. Enforce Financial Visibility

```typescript
// src/hooks/useFinancialVisibility.ts
export function useFinancialVisibility() {
  const { roleConfig } = useAuth();
  return {
    canViewCosts: roleConfig?.financialVisibility !== 'none',
    canViewSalesValues: ['full', 'partial', 'quotation_only'].includes(
      roleConfig?.financialVisibility ?? ''
    ),
    canViewPurchaseCosts: ['full', 'cost_only'].includes(
      roleConfig?.financialVisibility ?? ''
    ),
  };
}
```

### 4. Fix B-013 — Restrict `/projects/new`

Add `RequireRole` to the SO creation route:
```tsx
<Route path="projects/new"
  element={<RequireRole roles={['admin', 'operations_manager', 'sales_user', 'sales_coordinator']}>
    <ProjectNew />
  </RequireRole>} />
```

(Currently `ProjectNew` has no `RequireRole` wrapper in `App.tsx`.)

---

## RLS Alignment Gaps

The following tables have `⚠️` RLS status and need review:

| Table | Gap | Phase |
|-------|-----|-------|
| `quotation_requests` | B-012: RLS on sales_user — should see own quotations only | Phase 3 |
| `material_custody_records` | B-022: RLS missing | Phase 7 |
| `procurement_requests` | Audit noted `⚠️` | Phase 5 |
| `store_receipts` | Audit noted `⚠️` | Phase 7 |
| `factory_records` | Audit noted `⚠️` | Phase 6 |
| `medical_serial_numbers` | Audit noted `⚠️` | Phase 7 |
| `material_qc_inspections` | Audit noted `⚠️` | Phase 8 |

---

## Recommended Step 6 Implementation Scope

Step 6 (RBAC Implementation) should cover:

1. **Create `usePermission()` hook** backed by `PERMISSION_KEYS` — Phase 1
2. **Create `useFinancialVisibility()` hook** backed by `ROLE_CONFIGS.financialVisibility` — Phase 1
3. **Fix B-013**: Add `RequireRole` to `/projects/new` — Phase 1
4. **Wire `can_view_costs`** to hide `total_sales_value` for roles with `financialVisibility: 'none'` — Phase 2
5. **Wire `can_issue_release_note`** to gate the Issue button on Release Note detail — Phase 8
6. **Wire `can_approve_custody`** to gate Custody approval action — Phase 7
7. **Add RLS to high-gap tables** in dedicated migrations — per phase above
8. **Audit sidebar vs. RequireRole drift** — compare `navigation.ts` role arrays against `App.tsx` route guards to confirm they match — Phase 1 (documentation task)
