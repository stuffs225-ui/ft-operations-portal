import { Loader2 } from 'lucide-react';

/**
 * Lightweight fallback shown while a lazily-loaded route chunk is fetched.
 * Kept minimal to avoid layout shift inside the AppLayout content area.
 */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24 text-brand-400" role="status" aria-live="polite">
      <Loader2 size={22} className="animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
