import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { isSupabaseConfigured } from '../lib/supabase';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { MOCK_DATA_QUALITY_CHECKS as MOCK_DATA_QUALITY_CHECKS_RAW } from '../data/mockReports';
import { mockOrEmpty } from '../lib/dataMode';
const MOCK_DATA_QUALITY_CHECKS = mockOrEmpty(MOCK_DATA_QUALITY_CHECKS_RAW);
import type { DataQualityCheck, IssueSeverity } from '../types';

type ModuleFilter = 'All' | 'Projects' | 'Procurement' | 'Factory' | 'Store' | 'QC' | 'AFS';
type SeverityFilter = 'All' | 'Critical' | 'High' | 'Medium' | 'Low';

const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function severityDotColor(severity: IssueSeverity): string {
  if (severity === 'critical') return 'bg-red-500';
  if (severity === 'high') return 'bg-amber-500';
  if (severity === 'medium') return 'bg-yellow-400';
  return 'bg-gray-400';
}

function rowBgColor(check: DataQualityCheck): string {
  if (check.severity === 'critical' && check.count > 0) return 'bg-red-50';
  if (check.severity === 'high' && check.count > 0) return 'bg-amber-50';
  return 'bg-white';
}

function sortChecks(checks: DataQualityCheck[]): DataQualityCheck[] {
  return [...checks].sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sev !== 0) return sev;
    // within same severity: count > 0 first
    if (a.count > 0 && b.count === 0) return -1;
    if (a.count === 0 && b.count > 0) return 1;
    return 0;
  });
}

export function ReportsDataQuality() {
  const [filterModule, setFilterModule] = useState<ModuleFilter>('All');
  const [filterSeverity, setFilterSeverity] = useState<SeverityFilter>('All');

  const modules: ModuleFilter[] = ['All', 'Projects', 'Procurement', 'Factory', 'Store', 'QC', 'AFS'];
  const severities: SeverityFilter[] = ['All', 'Critical', 'High', 'Medium', 'Low'];

  const allChecks: DataQualityCheck[] = MOCK_DATA_QUALITY_CHECKS;

  const filtered = sortChecks(
    allChecks.filter(c => {
      const matchModule = filterModule === 'All' || c.module === filterModule;
      const matchSeverity = filterSeverity === 'All' || c.severity === filterSeverity.toLowerCase();
      return matchModule && matchSeverity;
    })
  );

  const criticalGaps = allChecks.filter(c => c.severity === 'critical' && c.count > 0).length;
  const highGaps = allChecks.filter(c => c.severity === 'high' && c.count > 0).length;
  const passing = allChecks.filter(c => c.count === 0).length;
  const total = allChecks.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Quality Dashboard"
        subtitle="Missing data gaps and recommended fixes across all modules"
        actions={<DataSourceBadge variant="preview" />}
      />

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Dev mode — showing mock data quality check results.
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-red-50 rounded-xl p-4 border border-gray-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Critical Gaps</p>
            <p className="text-2xl font-bold text-red-700">{criticalGaps}</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-gray-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">High Gaps</p>
            <p className="text-2xl font-bold text-amber-700">{highGaps}</p>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-gray-200 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Passing</p>
            <p className="text-2xl font-bold text-green-700">{passing}</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Total Checks</p>
          <p className="text-2xl font-bold text-gray-700">{total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Module:</span>
          <div className="flex gap-1 flex-wrap">
            {modules.map(m => (
              <button
                key={m}
                onClick={() => setFilterModule(m)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  filterModule === m
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Severity:</span>
          <div className="flex gap-1 flex-wrap">
            {severities.map(s => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  filterSeverity === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Check list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card>
            <p className="text-sm text-gray-500 text-center py-6">No checks match the selected filters.</p>
          </Card>
        )}
        {filtered.map(check => (
          <div
            key={check.id}
            className={`${rowBgColor(check)} rounded-xl border border-gray-200 px-4 py-3 flex items-start justify-between gap-4`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${severityDotColor(check.severity)}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-900">{check.check_name}</span>
                  <Badge variant="neutral">{check.module}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{check.suggested_action}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {check.count === 0 ? (
                <Badge variant="success">Passing</Badge>
              ) : (
                <Badge variant={check.severity === 'critical' ? 'critical' : 'warning'}>
                  {check.count}
                </Badge>
              )}
              <span className="text-xs text-gray-500 hidden sm:block">{check.owner_role}</span>
              <Link
                to={check.fix_path}
                className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
              >
                Fix <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
