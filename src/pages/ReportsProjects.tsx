import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { ReportExportBar } from '../components/features/ReportExportBar';
import { exportRowsToCsv } from '../lib/reportExport';
import type { ReportColumn } from '../lib/reportExport';
import { useAuth } from '../hooks/useAuth';
import { MOCK_PROJECTS as MOCK_PROJECTS_RAW } from '../data/mockProjects';
import { getHealthScoreForProject } from '../data/mockReports';
import { MOCK_EXECUTION_REFERENCES as MOCK_EXECUTION_REFERENCES_RAW } from '../data/mockExecutionReferences';
import { mockOrEmpty } from '../lib/dataMode';

const MOCK_PROJECTS = mockOrEmpty(MOCK_PROJECTS_RAW);
const MOCK_EXECUTION_REFERENCES = mockOrEmpty(MOCK_EXECUTION_REFERENCES_RAW);
import type { Project, ProjectStatus } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusTab = 'all' | ProjectStatus;

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'submitted_for_approval', label: 'Submitted' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_BADGE_MAP: Record<ProjectStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  draft:                  { label: 'Draft',       variant: 'neutral' },
  submitted_for_approval: { label: 'Submitted',   variant: 'warning' },
  sent_back_for_revision: { label: 'Sent Back',   variant: 'critical' },
  approved:               { label: 'Approved',    variant: 'info' },
  active:                 { label: 'Active',      variant: 'success' },
  completed:              { label: 'Completed',   variant: 'success' },
  rejected:               { label: 'Rejected',    variant: 'critical' },
  cancelled:              { label: 'Cancelled',   variant: 'neutral' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function statusBadge(status: ProjectStatus) {
  const { label, variant } = STATUS_BADGE_MAP[status] ?? { label: status, variant: 'neutral' };
  return <Badge variant={variant}>{label}</Badge>;
}

function locationBadge(loc: string) {
  if (loc === 'not_set') return <Badge variant="neutral">Not Set</Badge>;
  if (loc === 'saudi') return <Badge variant="default">Saudi</Badge>;
  return <Badge variant="info">Dubai</Badge>;
}

function healthBandVariant(band: string): 'success' | 'warning' | 'critical' | 'neutral' {
  if (band === 'healthy') return 'success';
  if (band === 'watch') return 'warning';
  return 'critical';
}

function getProjectWoPnStatus(project: Project): { label: string; hasRef: boolean } {
  if (project.project_status !== 'approved' && project.project_status !== 'active') {
    return { label: '—', hasRef: true };
  }
  if (project.manufacturing_location === 'saudi') {
    const hasWo = MOCK_EXECUTION_REFERENCES.some(
      r => r.project_id === project.id && r.reference_type === 'wo'
        && r.status !== 'cancelled' && r.status !== 'superseded',
    );
    return hasWo
      ? { label: '✓ WO', hasRef: true }
      : { label: '✗ Missing WO', hasRef: false };
  }
  if (project.manufacturing_location === 'dubai') {
    const hasPn = MOCK_EXECUTION_REFERENCES.some(
      r => r.project_id === project.id && r.reference_type === 'pn'
        && r.status !== 'cancelled' && r.status !== 'superseded',
    );
    return hasPn
      ? { label: '✓ PN', hasRef: true }
      : { label: '✗ Missing PN', hasRef: false };
  }
  return { label: '—', hasRef: true };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsProjects() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');

  const canSeeHealth = role && ['admin', 'operations_manager'].includes(role);

  const filtered = useMemo(() => {
    let list = MOCK_PROJECTS;
    if (activeTab !== 'all') {
      list = list.filter(p => p.project_status === activeTab);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.project_code.toLowerCase().includes(q) ||
        p.so_number.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeTab, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Reports"
        subtitle="Lifecycle status, WO/PN coverage, and health scores"
        breadcrumb={[{ label: 'Reports', href: '/reports' }, { label: 'Projects' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      <ReportExportBar
        reportKey="projects_report_view"
        reportTitle="Project Status Report"
        department="Operations"
        onExportCsv={() => {
          type PRow = typeof MOCK_PROJECTS[number];
          const cols: ReportColumn<PRow>[] = [
            { key: 'project_code', header: 'Project Code', value: p => p.project_code },
            { key: 'so_number', header: 'SO Number', value: p => p.so_number },
            { key: 'customer_name', header: 'Customer', value: p => p.customer_name },
            { key: 'project_status', header: 'Status', value: p => p.project_status },
            { key: 'manufacturing_location', header: 'Location', value: p => p.manufacturing_location },
            { key: 'customer_delivery_date', header: 'Delivery Date', value: p => p.customer_delivery_date },
          ];
          exportRowsToCsv(`projects-report-${new Date().toISOString().split('T')[0]}.csv`, filtered, cols);
        }}
        summary={`${filtered.length} project${filtered.length !== 1 ? 's' : ''}`}
      />

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status tabs */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative sm:ml-auto">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search code, SO, customer…"
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-500">
            <Search size={32} className="text-gray-300 mb-3" />
            No projects match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">SO Number</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">WO / PN</th>
                  {canSeeHealth && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Health</th>
                  )}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(project => {
                  const woPn = getProjectWoPnStatus(project);
                  const healthScore = canSeeHealth ? getHealthScoreForProject(project.id) : undefined;

                  return (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-900">{project.project_code}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{project.so_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{project.customer_name}</td>
                      <td className="px-4 py-3">{statusBadge(project.project_status)}</td>
                      <td className="px-4 py-3">{locationBadge(project.manufacturing_location)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {project.customer_delivery_date ? formatDate(project.customer_delivery_date) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${woPn.hasRef ? 'text-green-600' : 'text-red-600'}`}>
                          {woPn.hasRef && woPn.label !== '—' && (
                            <CheckCircle2 size={12} className="inline mr-1" />
                          )}
                          {!woPn.hasRef && (
                            <XCircle size={12} className="inline mr-1" />
                          )}
                          {woPn.label}
                        </span>
                      </td>
                      {canSeeHealth && (
                        <td className="px-4 py-3">
                          {healthScore ? (
                            <Badge variant={healthBandVariant(healthScore.score_band)}>
                              {healthScore.score_band}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <Link to={`/projects/${project.id}`}>
                          <Button variant="ghost" size="sm" icon={<ArrowRight size={13} />}>
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
