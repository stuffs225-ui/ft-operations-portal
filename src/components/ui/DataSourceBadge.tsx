import { Database, FlaskConical, Eye } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

type Variant = 'auto' | 'preview';

interface DataSourceBadgeProps {
  /**
   * - `auto`    : shows "Live data" when Supabase is configured, otherwise
   *               "Dev mode — sample data".
   * - `preview` : the page's live back-end/aggregation is not wired yet. In live
   *               mode shows "Preview — not yet connected"; in dev mode shows
   *               "Dev mode — sample data". Never implies the numbers are real.
   */
  variant?: Variant;
  className?: string;
}

/**
 * Small inline badge that tells the user exactly where the data on the page
 * comes from, so mock/sample data is never mistaken for live records.
 */
export function DataSourceBadge({ variant = 'auto', className = '' }: DataSourceBadgeProps) {
  const live = isSupabaseConfigured;

  if (variant === 'preview') {
    return live ? (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}
      >
        <Eye size={11} /> Preview — not yet connected
      </span>
    ) : (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
      >
        <FlaskConical size={11} /> Dev mode — sample data
      </span>
    );
  }

  return live ? (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
    >
      <Database size={11} /> Live data
    </span>
  ) : (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
    >
      <FlaskConical size={11} /> Dev mode — sample data
    </span>
  );
}
