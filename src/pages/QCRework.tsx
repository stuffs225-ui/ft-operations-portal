import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, CheckCircle2, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_PROJECT_QC_FINDINGS } from '../data/mockQc';
import type { ProjectQcFinding } from '../types';

type ReworkTab = 'required' | 'in_progress' | 'pending_reinspection' | 'overdue' | 'closed' | 'all';

const TABS: { key: ReworkTab; label: string }[] = [
  { key: 'required', label: 'Required' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'pending_reinspection', label: 'Pending QC Confirmation' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' },
];

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(f: ProjectQcFinding): boolean {
  if (!f.due_date || f.rework_completed_at) return false;
  return new Date(f.due_date) < new Date();
}

function severityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'warning';
  if (s === 'medium') return 'info';
  return 'neutral';
}

function reworkStatusBadge(f: ProjectQcFinding) {
  if (f.rework_completed_at) return <Badge variant="success">Completed</Badge>;
  if (f.finding_status === 'pending_reinspection') return <Badge variant="info">Pending QC Check</Badge>;
  if (f.finding_status === 'rework_in_progress') return <Badge variant="warning">In Progress</Badge>;
  if (isOverdue(f)) return <Badge variant="critical">Overdue</Badge>;
  return <Badge variant="warning">Required</Badge>;
}

export function QCRework() {
  const [items, setItems] = useState<ProjectQcFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ReworkTab>('required');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const raw = mockOrEmpty(MOCK_PROJECT_QC_FINDINGS);
        setItems(raw.filter(f => f.rework_required));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('project_qc_findings')
        .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type)')
        .eq('rework_required', true)
        .order('created_at', { ascending: false });
      setItems((data as unknown as ProjectQcFinding[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const now = new Date();

  const filtered = items.filter(f => {
    if (tab === 'all') return true;
    if (tab === 'required') {
      return !f.rework_completed_at && f.finding_status !== 'closed' && f.finding_status !== 'cancelled' && f.finding_status !== 'rework_in_progress' && f.finding_status !== 'pending_reinspection';
    }
    if (tab === 'in_progress') return f.finding_status === 'rework_in_progress';
    if (tab === 'pending_reinspection') return f.finding_status === 'pending_reinspection';
    if (tab === 'overdue') {
      return !f.rework_completed_at && f.due_date !== null && new Date(f.due_date) < now && f.finding_status !== 'closed' && f.finding_status !== 'cancelled';
    }
    if (tab === 'closed') {
      return !!f.rework_completed_at || f.finding_status === 'closed' || f.finding_status === 'cancelled';
    }
    return true;
  });

  const counts: Record<ReworkTab, number> = {
    required: items.filter(f => !f.rework_completed_at && f.finding_status !== 'closed' && f.finding_status !== 'cancelled' && f.finding_status !== 'rework_in_progress' && f.finding_status !== 'pending_reinspection').length,
    in_progress: items.filter(f => f.finding_status === 'rework_in_progress').length,
    pending_reinspection: items.filter(f => f.finding_status === 'pending_reinspection').length,
    overdue: items.filter(f => !f.rework_completed_at && f.due_date !== null && new Date(f.due_date) < now && f.finding_status !== 'closed' && f.finding_status !== 'cancelled').length,
    closed: items.filter(f => !!f.rework_completed_at || f.finding_status === 'closed' || f.finding_status === 'cancelled').length,
    all: items.length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Rework" subtitle="QC findings requiring factory rework and reinspection" />
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rework"
        subtitle="Findings flagged as rework required — track factory rework and QC reinspection"
        breadcrumb={[{ label: 'QC Dashboard', href: '/qc' }, { label: 'Rework' }]}
      />

      <DataSourceBadge variant="auto" />

      {counts.overdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700 flex items-center gap-2">
          <Wrench size={15} className="shrink-0 text-red-500" />
          <span><strong>{counts.overdue}</strong> rework item{counts.overdue !== 1 ? 's' : ''} overdue — release note cannot be issued until all rework is completed and confirmed by QC.</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'text-violet-700 border-b-2 border-violet-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {counts[t.key] > 0 && t.key !== 'all' && t.key !== 'closed' && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full font-semibold ${
                  t.key === 'overdue'
                    ? 'bg-red-100 text-red-700'
                    : tab === t.key
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<CheckCircle2 size={24} className="text-green-500" />}
              title={tab === 'required' ? 'No rework required' : tab === 'overdue' ? 'No overdue rework' : 'Nothing here'}
              description={
                tab === 'required'
                  ? 'No findings are currently flagged as rework required.'
                  : tab === 'overdue'
                  ? 'All rework items are within their due dates.'
                  : 'No rework items match this filter.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Finding #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Severity</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Vehicle Line</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Rework Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Due</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Completed</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(f => {
                  const overdue = isOverdue(f);
                  return (
                    <tr
                      key={f.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        overdue ? 'border-l-4 border-l-red-500' : !f.rework_completed_at ? 'border-l-4 border-l-orange-400' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-mono font-medium text-violet-700">{f.finding_number}</td>
                      <td className="px-4 py-3"><Badge variant={severityVariant(f.severity)}>{f.severity}</Badge></td>
                      <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell max-w-[180px] truncate">{f.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{f.project?.project_code ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 hidden lg:table-cell">{f.vehicle_line?.vehicle_type ?? '—'}</td>
                      <td className="px-4 py-3">{reworkStatusBadge(f)}</td>
                      <td className="px-4 py-3 text-sm hidden xl:table-cell">
                        <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                          {formatDate(f.due_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">{formatDate(f.rework_completed_at)}</td>
                      <td className="px-4 py-3">
                        <Link to={`/project-qc/findings/${f.id}`}>
                          <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-4 text-sm text-violet-800 space-y-1">
        <p className="font-semibold">Rework Governance</p>
        <ul className="space-y-1 text-violet-700">
          <li>• Rework is flagged on a finding by the QC inspector.</li>
          <li>• Factory is responsible for completing rework and updating the finding status.</li>
          <li>• QC must reinspect and confirm before the finding is closed.</li>
          <li>• All rework must be closed before a Release Note can be issued.</li>
        </ul>
      </div>
    </div>
  );
}
