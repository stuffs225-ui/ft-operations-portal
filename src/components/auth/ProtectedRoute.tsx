import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { profile, loading, isDevMode } = useAuth();

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

  return <>{children}</>;
}
