import { Navigate, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';
import { ROLE_MATRIX } from '../../lib/roleMatrix';

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

    const matrix = ROLE_MATRIX[role];
    const landingRoute = matrix?.landingRoute ?? '/';
    const roleLabel = matrix?.label ?? role;
    const badgeClass = matrix?.badgeClass ?? 'bg-gray-100 text-gray-700';

    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
          <ShieldAlert size={26} />
        </div>
        <h2 className="text-base font-semibold text-gray-800">Access restricted</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          You don&apos;t have permission to view this page. Contact your administrator if you believe this is a mistake.
        </p>
        <span className={`mt-3 text-[11px] font-semibold px-2.5 py-1 rounded ${badgeClass}`}>
          {roleLabel}
        </span>
        <Link
          to={landingRoute}
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors"
        >
          ← Back to {roleLabel} workspace
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
