import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_PROJECT_QC_FINDINGS } from '../data/mockQc';
import type { ProjectQcFinding, FindingStatus } from '../types';

type StatusTab = 'all' | FindingStatus;

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'rework_in_progress', label: 'Rework In Progress' },
  { key: 'pending_reinspection', label: 'Pending Reinspection' },
  { key: 'closed', label: 'Closed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function statusVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'open' || s === 'assigned') return 'critical';
  if (s === 'rework_in_progress' || s === 'pending_reinspection') return 'warning';
  if (s === 'closed') return 'success';
  return 'neutral';
}

function severityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'warning';
  if (s === 'medium') return 'info';
  return 'neutral';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ProjectQcFindings() {
  const [items, setItems] = useState<ProjectQcFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<StatusTab>('all');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems(mockOrEmpty(MOCK_PROJECT_QC_FINDINGS));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('project_qc_findings')
        .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description)')
        .order('created_at', { ascending: false });
      setItems((data as unknown as ProjectQcFinding[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter(f => {
    if (statusTab !== 'all' && f.finding_status !== statusTab) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="QC Findings"
        subtitle="Findings raised during project and vehicle QC inspections"
        breadcrumb={[{ label: 'Project QC', href: '/project-qc' }, { label: 'Findings' }]}
      />

      <DataSourceBadge variant="auto" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setStatusTab(t.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
                statusTab === t.key ? 'text-violet-700 border-b-2 border-violet-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="px-5 py-10"><PageLoader /></div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState icon={<AlertTriangle size={24} className="text-gray-400" />} title="No findings" description="No findings match the current filter." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Finding #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Severity</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Rework</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Due</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Blocks Release</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(f => (
                  <tr key={f.id} className={`hover:bg-gray-50 transition-colors ${f.rework_required && f.finding_status !== 'closed' ? 'border-l-4 border-l-orange-400' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">{f.finding_number}</td>
                    <td className="px-4 py-3"><Badge variant={severityVariant(f.severity)}>{f.severity}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell max-w-[200px] truncate">{f.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{f.project?.project_code ?? '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {f.rework_required
                        ? <Badge variant={f.rework_completed_at ? 'success' : 'warning'}>{f.rework_completed_at ? 'Done' : 'Required'}</Badge>
                        : <span className="text-xs text-gray-400">No</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">{f.due_date ? formatDate(f.due_date) : '—'}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(f.finding_status)}>{f.finding_status.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {f.finding_status !== 'closed' && f.finding_status !== 'cancelled'
                        ? <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium"><XCircle size={12} /> Blocking</span>
                        : <Badge variant="success">No</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/project-qc/findings/${f.id}`}>
                        <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
