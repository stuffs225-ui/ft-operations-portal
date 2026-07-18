import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Trophy, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_MATRIX } from '../../lib/roleMatrix';
import {
  fetchAchievements, roleHasAchievements,
  type AchievementMetric, type AchievementRange,
} from '../../lib/achievementsQueries';
import type { UserRole } from '../../types';

function formatValue(m: AchievementMetric): string {
  if (m.value == null) return '—';
  if (m.format === 'currency') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(m.value) + ' SAR';
  }
  return new Intl.NumberFormat('en-US').format(m.value);
}

// "My Achievements" — a compact strip on the dashboard showing what the current
// user accomplished this month, with a one-click switch to the full year.
export function MyAchievements() {
  const { role, profile } = useAuth();
  const [range, setRange] = useState<AchievementRange>('month');
  const [metrics, setMetrics] = useState<AchievementMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rows = await fetchAchievements(role as UserRole | null, profile?.id ?? null, range);
      if (cancelled) return;
      setMetrics(rows);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [role, profile?.id, range]);

  if (!roleHasAchievements(role as UserRole | null)) return null;

  const isOrg = role === 'admin' || role === 'operations_manager';

  return (
    <div className="bg-gradient-to-br from-brand-50 to-white rounded-xl border border-brand-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={15} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-gray-900">{isOrg ? 'Organisation Output' : 'My Achievements'}</h3>
          <span className="text-xs text-gray-400">
            {range === 'month' ? 'this month' : 'this year'}
          </span>
        </div>
        <div className="inline-flex rounded-lg bg-white border border-gray-200 p-0.5">
          {(['month', 'year'] as AchievementRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                range === r ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 py-4">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div key={m.key} className="bg-white rounded-lg border border-gray-100 px-3 py-2.5">
              <div className="text-lg font-bold text-gray-900 tabular-nums">{formatValue(m)}</div>
              <div className="text-[11px] text-gray-500 leading-tight mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Renders MyAchievements only on the current role's landing page, so each role
// sees its output strip at the top of their home without editing every page.
export function LandingAchievements() {
  const { role } = useAuth();
  const { pathname } = useLocation();
  if (!role) return null;
  const landing = ROLE_MATRIX[role as UserRole]?.landingRoute;
  if (!landing || pathname !== landing) return null;
  return (
    <div className="mb-6">
      <MyAchievements />
    </div>
  );
}
