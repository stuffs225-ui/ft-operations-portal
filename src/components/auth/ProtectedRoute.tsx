import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const BLOCKED_STATUSES = ['suspended', 'inactive'];

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { profile, loading, isDevMode, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading…</span>
        </div>
      </div>
    );
  }

  // In dev mode without Supabase, profile is always set
  if (!isDevMode && !profile) {
    return <Navigate to="/login" replace />;
  }

  // Suspended / inactive accounts are locked out of the app entirely. RLS still
  // protects the data; this is the UI half so a disabled user can't keep working
  // in an already-open session.
  if (profile && profile.account_status && BLOCKED_STATUSES.includes(profile.account_status)) {
    const suspended = profile.account_status === 'suspended';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={22} className="text-rose-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-1">
            {suspended ? 'Account suspended' : 'Account inactive'}
          </h1>
          <p className="text-sm text-gray-500 mb-5">
            {suspended
              ? 'Your access has been suspended by an administrator. Contact your administrator if you believe this is a mistake.'
              : 'Your account is not active. Contact your administrator to regain access.'}
          </p>
          <button
            onClick={() => void signOut()}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
