import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROLE_MATRIX } from '../lib/roleMatrix';

export function NotFound() {
  const { role } = useAuth();
  const landingRoute = role ? (ROLE_MATRIX[role]?.landingRoute ?? '/') : '/';

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="text-8xl font-bold text-gray-200 mb-2 select-none leading-none">404</div>
      <h1 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Page not found</h1>
      <p className="text-sm text-gray-500 max-w-xs mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        to={landingRoute}
        className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        <Home size={14} />
        Back to Dashboard
      </Link>
    </div>
  );
}
