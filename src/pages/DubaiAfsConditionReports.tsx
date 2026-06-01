import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { MOCK_AFS_CONDITION_REPORTS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import type { ConditionReportStatus } from '../types';

type Tab = 'all' | ConditionReportStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

function condVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'open') return 'critical';
  if (s === 'under_review') return 'warning';
  if (s === 'resolved' || s === 'closed') return 'success';
  return 'neutral';
}

function overallVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'major_damage' || s === 'requires_repair') return 'critical';
  if (s === 'minor_damage') return 'warning';
  if (s === 'good') return 'success';
  return 'neutral';
}

export function DubaiAfsConditionReports() {
  const [tab, setTab] = useState<Tab>('all');

  const reports = mockOrEmpty(MOCK_AFS_CONDITION_REPORTS).filter(r =>
    tab === 'all' ? true : r.report_status === tab
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Condition Reports" subtitle="Post-arrival vehicle condition assessments" />
      <DataSourceBadge variant="preview" />

      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-white border border-b-white border-gray-100 text-sky-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {reports.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No condition reports found.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reports.map(r => (
              <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Wrench size={14} className="text-purple-500" />
                    <span className="text-sm font-mono font-semibold text-sky-700">{r.condition_report_number}</span>
                    <Badge variant={overallVariant(r.overall_condition)}>{r.overall_condition.replace(/_/g, ' ')}</Badge>
                    <Badge variant={condVariant(r.report_status)}>{r.report_status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="text-sm text-gray-700 mt-1">{r.project?.customer_name} — {r.vehicle_line?.vehicle_type ?? 'Project-wide'}</div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{r.description}</p>
                </div>
                <Button variant="ghost" size="sm" disabled>View</Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
