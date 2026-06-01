import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plane } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { MOCK_DUBAI_FOLLOWUPS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import type { DubaiStatus } from '../types';

type Tab = 'all' | 'active' | 'delayed' | 'arrived' | 'completed';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'delayed', label: 'Delayed' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'completed', label: 'Completed' },
];

function statusVariant(s: DubaiStatus): 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default' {
  if (s === 'completed') return 'success';
  if (s === 'in_transit' || s === 'eta_confirmed') return 'info';
  if (s === 'on_hold' || s === 'cancelled') return 'neutral';
  if (s === 'arrived_ksa' || s === 'handed_to_afs' || s === 'ready_for_pre_delivery') return 'success';
  return 'neutral';
}

function etaVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'delayed') return 'warning';
  if (s === 'on_track') return 'success';
  if (s === 'arrived') return 'info';
  return 'neutral';
}

export function DubaiAfsProjects() {
  const [tab, setTab] = useState<Tab>('all');

  const filtered = mockOrEmpty(MOCK_DUBAI_FOLLOWUPS).filter(f => {
    if (tab === 'active') return !['completed', 'cancelled', 'arrived_ksa', 'handed_to_afs', 'ready_for_pre_delivery'].includes(f.dubai_status);
    if (tab === 'delayed') return f.eta_status === 'delayed';
    if (tab === 'arrived') return ['arrived_ksa', 'handed_to_afs', 'ready_for_pre_delivery'].includes(f.dubai_status);
    if (tab === 'completed') return f.dubai_status === 'completed';
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Dubai Follow-ups" subtitle="Track vehicle ETA and Dubai project progress" />
      <DataSourceBadge variant="preview" />

      <div className="flex gap-1 border-b border-gray-100 pb-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-white border border-b-white border-gray-100 text-sky-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No follow-ups found.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(f => (
              <div key={f.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Plane size={14} className="text-sky-500 shrink-0" />
                    <span className="text-sm font-semibold text-gray-900">{f.project?.project_code}</span>
                    <span className="text-sm text-gray-500">{f.project?.customer_name}</span>
                    <Badge variant={statusVariant(f.dubai_status)}>{f.dubai_status.replace(/_/g, ' ')}</Badge>
                    <Badge variant={etaVariant(f.eta_status)}>{f.eta_status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {f.vehicle_line?.vehicle_type ?? 'Project-wide'}
                    {f.eta_date && ` — ETA: ${new Date(f.eta_date).toLocaleDateString('en-GB')}`}
                    {f.dubai_po_number && ` — PO: ${f.dubai_po_number}`}
                  </div>
                  {f.remarks && <div className="text-xs text-gray-400 mt-1 truncate">{f.remarks}</div>}
                </div>
                <Link to={`/dubai-afs/projects/${f.id}`}>
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
