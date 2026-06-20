# Step 18.6A — Role-Based IA, Sidebar, Dashboard, Visual Foundation, and Assign Role Fix

**Date:** 2026-06-20  
**Branch:** `feature/step-18-6a-role-ia-visual-foundation`  
**Scope:** Foundation for role-based UX — Assign Role fix, centralized role matrix, sidebar IA cleanup, role-specific My Work cards, role-specific governance rules. No module rebuilds, no schema changes, no route guard changes, no workflow changes.

---

## Executive Summary

This PR fixes the Assign Role flow (which was a no-op), centralizes the role configuration matrix, cleans up sidebar visibility so operational roles no longer see irrelevant pages, enriches the Dashboard with role-specific My Work shortcuts, and replaces the generic Governance Golden Rules banner with a per-role rules card. Foundation patterns are established for per-role module rebuilds in Step 19+.

---

## Current Role UX Issues Addressed

| Issue | Severity | Fix in this PR |
|---|---|---|
| Assign Role button did not save — no Supabase write | Critical | Fixed: upserts into `user_roles` |
| Roles read from `profiles.role` which doesn't exist | Critical | Fixed: merged from `user_roles` table |
| `projects` visible to all authenticated users (including qc/store/factory/afs) | High | Fixed: restricted to oversight roles |
| Generic Reports hub leads to "Access Restricted" for operational roles | High | Fixed: restricted hub; per-role direct links added |
| Document Templates visible to operational roles with no filtering | Medium | Fixed: restricted to sales/management |
| Generic Governance Golden Rules shown to all roles indiscriminately | Medium | Fixed: replaced with `RoleRulesCard` |
| No centralized role configuration matrix | Medium | Fixed: `src/lib/roleMatrix.ts` created |
| Dashboard My Work cards too sparse for operational roles | Medium | Fixed: per-role My Work cards added |

---

## Assign Role Root Cause and Fix

### Root Cause
1. `AdminUsers` loaded users from `profiles` only and read `row.role as UserRole` — the `role` column does not exist on `profiles`. The displayed role was always `undefined` (falling back to `'viewer'`).
2. `AssignRoleModal` "Save Role" button called `onClose()` directly — no Supabase write, no state update. Role assignment was entirely non-functional.

### Fix Applied (`src/pages/AdminUsers.tsx`)

**Data loading:**
```typescript
// Before: single profiles query reading non-existent role column
const { data } = await supabase.from('profiles').select('*');
// row.role was undefined every time

// After: parallel profiles + user_roles queries, merged by user_id
const [profilesRes, rolesRes] = await Promise.all([
  supabase.from('profiles').select('*'),
  supabase.from('user_roles').select('user_id, role'),
]);
const rolesMap = new Map(rolesRes.data.map(r => [r.user_id, r.role as UserRole]));
// role: rolesMap.get(userId) ?? 'viewer'
```

**Save function:**
```typescript
async function handleAssignRole(userId: string, role: UserRole): Promise<{error: string | null}> {
  if (!isSupabaseConfigured || !supabase) {
    // dev mode: update local state
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    return { error: null };
  }
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id' });
  if (error) return { error: error.message };
  setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  return { error: null };
}
```

**Modal save UX:** Loading state during save, inline error display on failure, only closes on success.

**Security:** Uses anon key Supabase client only. No service role key. RLS on `user_roles` must allow the admin role to upsert — this is already in place per the existing schema.

---

## Role Navigation Matrix

Created `src/lib/roleMatrix.ts`:

| Role | Type | Landing Route | Accent Color | Badge |
|---|---|---|---|---|
| admin | admin | / | purple | bg-purple-100 text-purple-800 |
| operations_manager | management | / | indigo | bg-indigo-100 text-indigo-800 |
| sales_user | operational | /sales | emerald | bg-emerald-100 text-emerald-800 |
| sales_coordinator | operational | /sales-coordinator | teal | bg-teal-100 text-teal-800 |
| procurement_user | operational | /procurement | amber | bg-amber-100 text-amber-800 |
| factory_user | operational | /factory | orange | bg-orange-100 text-orange-800 |
| store_user | operational | /store | cyan | bg-cyan-100 text-cyan-800 |
| qc_user | operational | /material-qc | purple | bg-violet-100 text-violet-800 |
| afs_user | operational | /dubai-afs | sky | bg-sky-100 text-sky-800 |
| viewer | management | / | slate | bg-gray-100 text-gray-700 |

---

## Before/After Sidebar Behavior

### `projects` (Projects / SO)

| Before | After |
|---|---|
| Visible to ALL authenticated users (no roles field) | Restricted to `admin, operations_manager, sales_user, viewer` |

Operational roles now access project context through their own module pages (factory through WO/PN gate, QC through QC module, etc.).

### `reports` (Reports Hub)

| Before | After |
|---|---|
| Visible to all operational roles → leads to 7/8 inaccessible cards | Restricted to `admin, operations_manager, viewer, sales_coordinator` |

Operational roles get direct role-specific report links instead (see below).

### New per-role direct report links (REPORTING section)

| Nav Item | Path | Visible To |
|---|---|---|
| Sales Reports | /reports/sales | sales_user |
| Procurement Reports | /reports/procurement | procurement_user |
| Factory Reports | /reports/factory | factory_user |
| Store Reports | /reports/store | store_user |
| QC Reports | /reports/qc | qc_user |
| AFS Reports | /reports/afs | afs_user |

### `templates` (Document Templates)

| Before | After |
|---|---|
| Visible to 8 roles including all operational roles | Restricted to `admin, operations_manager, sales_user, sales_coordinator` |

Operational roles will get module-specific template access in later role-specific PRs.

---

## Dashboard Landing Behavior

| Role | Landing | Dashboard visible | Change |
|---|---|---|---|
| admin | / (Dashboard) | Yes | No change |
| operations_manager | / (Dashboard) | Yes | No change |
| sales_user | /sales (Sales Workspace) | No (redirected) | No change |
| sales_coordinator | / (Dashboard) | Yes | My Work card added |
| procurement_user | / (Dashboard) | Yes | My Work cards added |
| factory_user | / (Dashboard) | Yes | My Work cards added |
| store_user | / (Dashboard) | Yes | My Work cards added |
| qc_user | / (Dashboard) | Yes | My Work cards added |
| afs_user | / (Dashboard) | Yes | My Work cards added |
| viewer | / (Dashboard) | Yes | No change |

### New per-role My Work cards added to Dashboard

| Role | My Work Cards |
|---|---|
| admin / ops | Action Inbox, Pending Approvals |
| sales_coordinator | Action Inbox, Coordinator Queue |
| procurement_user | Action Inbox, Procurement Requests, Purchase Orders |
| factory_user | Action Inbox, WO/PN Gate, Production Records |
| store_user | Action Inbox, Receiving Queue, Vehicle Receiving |
| qc_user | Action Inbox, Material Inspections, Release Notes Queue |
| afs_user | Action Inbox, Dubai Projects, Maintenance Jobs |

---

## Visual Identity Foundation Changes

### RoleRulesCard (`src/components/ui/RoleRulesCard.tsx`)

Replaces the generic "Governance Golden Rules" dark banner on Dashboard with a role-aware card that shows only the governance rules relevant to the current user's role.

- admin / viewer: generic governance note
- operations_manager: approval and escalation rules
- sales: quotation and delivery commitment rules
- procurement: PO approval threshold rules
- factory: WO gate rules
- store: serial/chassis/custody rules
- qc: NCR and release note gate rules
- afs: PN gate and arrival reporting rules

Visual style: dark-toned card (`bg-gray-900`) for operational roles, indigo-tinted for management, purple-tinted for admin. Two-column rule grid with role accent dot color.

### Dashboard module tile updates

- `Projects / SO` tile restricted to oversight roles (matches sidebar change)
- `Reports Hub` tile restricted to management (matches sidebar change)
- New per-role report tiles added for each operational role pointing to their direct report page

### Dashboard KPI/AFS cards

Previously shown to all roles. Now gated behind `isManagement` check (admin, operations_manager, viewer). Operational roles see My Work quick-access instead — cleaner focus.

---

## Role-Specific Rules Approach

`RoleRulesCard` is the shared component. Per-role rules are defined in `ROLE_MATRIX.rules[]` in `src/lib/roleMatrix.ts`. This PR establishes the pattern; detailed rules can be refined per role in later PRs without changing the component structure.

---

## Files Changed

| File | Type | Change |
|---|---|---|
| `src/pages/AdminUsers.tsx` | Modified | Assign Role fix: parallel load, upsert to user_roles, error handling |
| `src/data/navigation.ts` | Modified | Sidebar IA: projects/reports/templates restricted; 6 per-role report links added |
| `src/pages/Dashboard.tsx` | Modified | Role-specific My Work cards; module tiles visibility; RoleRulesCard; KPI cards management-only |
| `src/lib/roleMatrix.ts` | New | Centralized role matrix with type, landing, accent, badge, rules per role |
| `src/components/ui/RoleRulesCard.tsx` | New | Role-aware governance rules card |
| `docs/implementation/step-18-6a-role-ia-visual-foundation.md` | New | This document |

---

## Intentionally Deferred to Role-Specific PRs

- Per-role module page redesign (Procurement, Store, Factory, QC, AFS, Sales, Admin)
- Sales Coordinator dashboard landing redirect (currently lands on Dashboard)
- Document Templates role-specific filtering (currently hidden from operational roles)
- Live counts in My Work cards (currently static links only)
- Supplier Reports, CAPA, Issues, Health Scores pages (schema blockers remain)
- Full pagination for list pages
- Full visual system redesign

---

## Safety Review

| Check | Status |
|---|---|
| DB schema changed | No |
| Migrations added | No |
| RLS changed | No |
| Route guards changed | No — sidebar visibility only; RequireRole guards unchanged |
| Business workflow changed | No |
| SO approval logic changed | No |
| WO/PN gate logic changed | No |
| Service role key exposed | No |
| New build errors | No |
| New type errors | No |
| New lint violations | No |
