import { useAuth } from './useAuth';
import { ROLE_CONFIGS } from '@/lib/roles';
import type { PermissionKey, UserRole } from '@/types';

// ─── Role → Permission mapping ────────────────────────────────────────────────
// Role is the live access-control mechanism; permissions are a stable UI-layer
// abstraction over role capabilities so pages don't hard-code role arrays.

const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  admin: [
    'can_view_costs',
    'can_approve_po',
    'can_approve_templates',
    'can_manage_users',
    'can_export_reports',
    'can_issue_release_note',
    'can_approve_custody',
    'can_manage_sla',
    'can_manage_capa',
  ],
  operations_manager: [
    'can_view_costs',
    'can_approve_po',
    'can_approve_templates',
    'can_export_reports',
    'can_manage_sla',
    'can_manage_capa',
  ],
  sales_user:        ['can_export_reports'],
  sales_coordinator: ['can_export_reports'],
  procurement_user:  ['can_approve_po'],
  factory_user:      [],
  store_user:        ['can_approve_custody'],
  qc_user:           ['can_issue_release_note', 'can_manage_capa'],
  afs_user:          [],
  viewer:            ['can_export_reports'],
};

// ─── Financial visibility ─────────────────────────────────────────────────────

export type FinancialVisibility =
  | 'full'
  | 'partial'
  | 'cost_only'
  | 'quotation_only'
  | 'none';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermission() {
  const { role } = useAuth();

  function hasPermission(key: PermissionKey): boolean {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(key) ?? false;
  }

  function hasAnyPermission(keys: PermissionKey[]): boolean {
    return keys.some(hasPermission);
  }

  function hasAllPermissions(keys: PermissionKey[]): boolean {
    return keys.every(hasPermission);
  }

  const financialVisibility: FinancialVisibility =
    role ? ROLE_CONFIGS[role].financialVisibility : 'none';

  // True if the role has any financial visibility at all (partial/full/cost/quotation).
  const canAccessFinancials = financialVisibility !== 'none';

  // True only for roles that see full cost data (admin, operations_manager).
  const canViewCosts = hasPermission('can_view_costs');

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    financialVisibility,
    canAccessFinancials,
    canViewCosts,
    role,
  };
}

// Convenience hook when only financial visibility level is needed.
export function useFinancialVisibility(): FinancialVisibility {
  const { role } = useAuth();
  return role ? ROLE_CONFIGS[role].financialVisibility : 'none';
}
