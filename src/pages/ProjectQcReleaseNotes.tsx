import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_RELEASE_NOTES } from '../data/mockQc';
import type { ReleaseStatus, UserRole } from '../types';

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'qc_user'];

type StatusTab = 'all' | ReleaseStatus;

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'ready_to_issue', label: 'Ready to Issue' },
  { key: 'issued', label: 'Issued' },
  { key: 'cancelled', label: 'Cancelled' },
];

function releaseVariant(r: string): 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'default' {
  if (r === 'issued') return 'success';
  if (r === 'ready_to_issue') return 'info';
  if (r === 'blocked') return 'critical';
  return 'neutral';
}

function typeVariant(t: string): 'neutral' | 'info' | 'warning' | 'default' {
  if (t === 'project_release') return 'info';
  if (t === 'vehicle_line_release') return 'warning';
  return 'neutral';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ProjectQcReleaseNotes() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role) : false;
  const [statusTab, setStatusTab] = useState<StatusTab>('all');

  const filtered = mockOrEmpty(MOCK_RELEASE_NOTES).filter(r => {
    if (statusTab !== 'all' && r.release_status !== statusTab) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Release Notes"
        subtitle="Issue Release Notes for projects and vehicle lines ready for customer delivery"
        actions={
          canCreate ? (
            <Link to="/project-qc/release-notes/new">
              <Button variant="primary" size="sm"><Plus size={14} className="mr-1" /> New Release Note</Button>
            </Link>
          ) : undefined
        }
      />

      <DataSourceBadge variant="preview" />

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
            <EmptyState icon={<FileCheck size={24} className="text-gray-400" />} title="No release notes" description="No release notes match the current filter." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Release Note #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Vehicle Line</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Issued</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${r.release_status === 'blocked' ? 'border-l-4 border-l-red-400' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">{r.release_note_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell font-mono text-xs">{r.project?.project_code ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden lg:table-cell">{r.vehicle_line?.vehicle_type ?? 'Whole Project'}</td>
                    <td className="px-4 py-3"><Badge variant={typeVariant(r.release_type)}>{r.release_type.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={releaseVariant(r.release_status)}>{r.release_status.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">{r.issued_at ? formatDate(r.issued_at) : '—'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/project-qc/release-notes/${r.id}`}>
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
