import { useAuthContext } from '../context/AuthContext';

// Convenience re-export so callers import from a single, stable path.
export const useAuth = useAuthContext;
