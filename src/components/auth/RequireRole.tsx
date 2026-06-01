import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';

interface RequireRoleProps {
  /** Roles permitted to view the wrapped route. `admin` is always allowed. */
  roles: UserRole[];
  children: React.ReactNode;
}

/**
 * Route-level role enforcement (defense-in-depth on top of DB RLS).
 *
 * The sidebar already hides links a role shouldn't see, but that is cosmetic —
 * a user could still deep-link to an admin URL. This guard blocks the render and
 * shows a clear "no access" panel instead of exposing the admin UI structure.
 *
 * Must be used inside the authenticated AppLayout (so `loading`/`profile` are
 * resolved by ProtectedRoute first). In dev mode the role is always `admin`.
 */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const { role, loading } = useAuth();

  if (loading) return null;

  // admin always passes; otherwise the role must be explicitly allowed
  const allowed = role === 'admin' || (role != null && roles.includes(role));

  if (!allowed) {
    // No valid session role at all → send to login. Wrong role → show 403.
    if (!role) return <Navigate to="/login" replace />;

    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
          <ShieldAlert size={26} />
        </div>
        <h2 className="text-base font-semibold text-gray-800">Access restricted</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          You don&apos;t have permission to view this page. If you believe this is a
          mistake, contact your administrator.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
