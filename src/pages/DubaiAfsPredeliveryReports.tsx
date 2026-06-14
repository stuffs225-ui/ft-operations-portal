import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { MOCK_AFS_PREDELIVERY_REPORTS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';

type Tab = 'all' | 'ready' | 'not_ready';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Ready for Delivery' },
  { key: 'not_ready', label: 'Not Ready' },
];

export function DubaiAfsPredeliveryReports() {
  const [tab, setTab] = useState<Tab>('all');

  const reports = mockOrEmpty(MOCK_AFS_PREDELIVERY_REPORTS).filter(r => {
    if (tab === 'ready') return r.ready_for_delivery;
    if (tab === 'not_ready') return !r.ready_for_delivery;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Pre-Delivery Reports" subtitle="AFS pre-delivery readiness checks and delivery approval" />
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
          <div className="px-5 py-10 text-center text-sm text-gray-400">No pre-delivery reports found.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reports.map(r => (
              <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileSearch size={14} className="text-sky-500" />
                    <span className="text-sm font-mono font-semibold text-sky-700">{r.predelivery_report_number}</span>
                    <Badge variant={r.ready_for_delivery ? 'success' : 'warning'}>
                      {r.ready_for_delivery ? 'Ready' : 'Not Ready'}
                    </Badge>
                    {!r.release_note_issued && (
                      <Badge variant="critical">No Release Note</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">{r.project?.customer_name} — {r.vehicle_line?.vehicle_type ?? 'Project-wide'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Report: {new Date(r.report_date).toLocaleDateString('en-GB')} ·
                    Checklist: {r.checklist_items_passed}/{r.checklist_items_total} passed ·
                    {r.open_missing_items > 0 && (
                      <span className="text-red-600 ml-1">{r.open_missing_items} missing item(s)</span>
                    )}
                  </div>
                </div>
                <Link to={`/dubai-afs/predelivery-reports/${r.id}`}>
                  <Button variant="ghost" size="sm">View</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
