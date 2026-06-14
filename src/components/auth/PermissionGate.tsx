import type { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import type { PermissionKey } from '@/types';

interface PermissionGateProps {
  /** Render children only when the current user has this permission. */
  permission: PermissionKey;
  /** Rendered when permission is denied. Defaults to nothing. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children based on a single permission key.
 * Defaults to deny (renders fallback) when role is unknown.
 *
 * For route-level guards use RequireRole instead.
 */
export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { hasPermission } = usePermission();
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}
