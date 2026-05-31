import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { MOCK_PROJECT_QC_INSPECTIONS } from '../data/mockQc';
import type { InspectionStatus, ProjectQcResult, ReadinessStatus, UserRole } from '../types';

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'qc_user'];

type StatusTab = 'all' | InspectionStatus;
type ResultFilter = 'all' | ProjectQcResult;

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function resultVariant(r: string): 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'default' {
  if (r === 'passed') return 'success';
  if (r === 'passed_with_comments') return 'warning';
  if (r === 'failed') return 'critical';
  if (r === 'rework_required') return 'warning';
  return 'neutral';
}

function readinessVariant(r: ReadinessStatus): 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default' {
  if (r === 'not_ready') return 'neutral';
  if (r === 'pending_rework') return 'warning';
  if (r === 'ready_for_release') return 'success';
  if (r === 'released') return 'info';
  return 'neutral';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ProjectQcInspections() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role) : false;
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');

  const filtered = MOCK_PROJECT_QC_INSPECTIONS.filter(i => {
    if (statusTab !== 'all' && i.inspection_status !== statusTab) return false;
    if (resultFilter !== 'all' && i.inspection_result !== resultFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Project QC Inspections"
        subtitle="Inspect vehicles and project lines after factory completion"
        action={
          canCreate ? (
            <Link to="/project-qc/inspections/new">
              <Button variant="primary" size="sm"><Plus size={14} className="mr-1" /> New Inspection</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Result:</span>
          <select value={resultFilter} onChange={e => setResultFilter(e.target.value as ResultFilter)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
            <option value="all">All Results</option>
            <option value="pending">Pending</option>
            <option value="passed">Passed</option>
            <option value="passed_with_comments">Passed with Comments</option>
            <option value="failed">Failed</option>
            <option value="rework_required">Rework Required</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setStatusTab(t.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
                statusTab === t.key ? 'text-sky-700 border-b-2 border-sky-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState icon={<ClipboardCheck size={24} className="text-gray-400" />} title="No inspections" description="No project QC inspections match the current filter." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Inspection #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Vehicle Line</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Result</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Readiness</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Inspected</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">{i.inspection_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell font-mono text-xs">{i.project?.project_code ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden lg:table-cell">{i.vehicle_line?.vehicle_type ?? 'Project-wide'}</td>
                    <td className="px-4 py-3"><Badge variant={resultVariant(i.inspection_result)}>{i.inspection_result.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Badge variant={readinessVariant(i.readiness_status)}>{i.readiness_status.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">{i.inspected_at ? formatDate(i.inspected_at) : '—'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/project-qc/inspections/${i.id}`}>
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
