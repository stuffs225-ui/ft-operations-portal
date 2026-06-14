import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Search, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { isSupabaseConfigured } from '../lib/supabase';
import { MOCK_FACTORY_RECORDS as MOCK_FACTORY_RECORDS_RAW } from '../data/mockFactory';
import { MOCK_PROJECTS as MOCK_PROJECTS_RAW } from '../data/mockProjects';
import { mockOrEmpty } from '../lib/dataMode';

const MOCK_FACTORY_RECORDS = mockOrEmpty(MOCK_FACTORY_RECORDS_RAW);
const MOCK_PROJECTS = mockOrEmpty(MOCK_PROJECTS_RAW);
import type { Project, FactoryRecord, FactoryProductionStatus } from '../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PROD_STATUS_MAP: Record<FactoryProductionStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  not_started:              { label: 'Not Started',            variant: 'neutral' },
  details_requested:        { label: 'Details Requested',      variant: 'info' },
  boq_pending:              { label: 'BOQ Pending',            variant: 'warning' },
  boq_uploaded:             { label: 'BOQ Uploaded',           variant: 'info' },
  ga_drawing_pending:       { label: 'GA Pending',             variant: 'warning' },
  ga_drawing_uploaded:      { label: 'GA Uploaded',            variant: 'info' },
  detail_drawings_pending:  { label: 'Drawings Pending',       variant: 'warning' },
  detail_drawings_uploaded: { label: 'Drawings Uploaded',      variant: 'info' },
  manhours_pending:         { label: 'Manhours Pending',       variant: 'warning' },
  manhours_added:           { label: 'Manhours Added',         variant: 'info' },
  pending_raw_materials:    { label: 'Pending Raw Materials',  variant: 'warning' },
  in_production:            { label: 'In Production',          variant: 'default' },
  monthly_update_required:  { label: 'Update Required',        variant: 'critical' },
  production_completed:     { label: 'Completed',              variant: 'success' },
  sent_to_qc:               { label: 'Sent to QC',            variant: 'success' },
  on_hold:                  { label: 'On Hold',                variant: 'neutral' },
};

type FilterTab = 'all' | 'not_started' | 'in_progress' | 'monthly_update' | 'completed' | 'on_hold';

interface ProjectWithRecords {
  project: Project;
  records: FactoryRecord[];
}

function getOverallStatus(records: FactoryRecord[]): FactoryProductionStatus {
  if (records.length === 0) return 'not_started';
  if (records.some((r) => r.production_status === 'monthly_update_required')) return 'monthly_update_required';
  if (records.some((r) => r.monthly_update_required)) return 'monthly_update_required';
  if (records.some((r) => r.production_status === 'in_production')) return 'in_production';
  if (records.some((r) => r.production_status === 'on_hold')) return 'on_hold';
  if (records.every((r) => r.production_status === 'sent_to_qc' || r.production_status === 'production_completed')) return 'production_completed';
  return records[0].production_status;
}

function getAvgProgress(records: FactoryRecord[]): number {
  if (records.length === 0) return 0;
  return Math.round(records.reduce((sum, r) => sum + r.progress_percentage, 0) / records.length);
}

function matchesTab(tab: FilterTab, records: FactoryRecord[]): boolean {
  if (tab === 'all') return true;
  if (tab === 'not_started') return records.some((r) => r.production_status === 'not_started');
  if (tab === 'in_progress') return records.some((r) => r.production_status === 'in_production');
  if (tab === 'monthly_update') return records.some((r) => r.monthly_update_required || r.production_status === 'monthly_update_required');
  if (tab === 'completed') return records.every((r) => r.production_status === 'production_completed' || r.production_status === 'sent_to_qc');
  if (tab === 'on_hold') return records.some((r) => r.production_status === 'on_hold');
  return true;
}

export function FactoryProjects() {
  const [items, setItems] = useState<ProjectWithRecords[]>([]);
  const [filtered, setFiltered] = useState<ProjectWithRecords[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const saudiApproved = MOCK_PROJECTS.filter(
        (p) => p.project_status === 'approved' && p.manufacturing_location === 'saudi',
      );
      const result: ProjectWithRecords[] = saudiApproved.map((p) => ({
        project: p,
        records: MOCK_FACTORY_RECORDS.filter((r) => r.project_id === p.id),
      }));
      setItems(result);
      setFiltered(result);
      setLoading(false);
      return;
    }
    // Supabase mode placeholder
    setItems([]);
    setFiltered([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    let result = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        ({ project }) =>
          project.project_code.toLowerCase().includes(q) ||
          project.so_number.toLowerCase().includes(q) ||
          project.customer_name.toLowerCase().includes(q),
      );
    }
    result = result.filter(({ records }) => matchesTab(activeTab, records));
    setFiltered(result);
  }, [search, activeTab, items]);

  const tabCounts: Record<FilterTab, number> = {
    all: items.length,
    not_started: items.filter(({ records }) => matchesTab('not_started', records)).length,
    in_progress: items.filter(({ records }) => matchesTab('in_progress', records)).length,
    monthly_update: items.filter(({ records }) => matchesTab('monthly_update', records)).length,
    completed: items.filter(({ records }) => matchesTab('completed', records)).length,
    on_hold: items.filter(({ records }) => matchesTab('on_hold', records)).length,
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'not_started', label: 'Not Started' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'monthly_update', label: 'Monthly Update Required' },
    { key: 'completed', label: 'Completed' },
    { key: 'on_hold', label: 'On Hold' },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Factory Projects"
        subtitle="Approved Saudi projects with active WO"
        icon={<Wrench size={18} />}
        breadcrumb={[{ label: 'Factory', path: '/factory' }, { label: 'Projects' }]}
      />

      {!isSupabaseConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800">
          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
          Dev mode — using mock factory data. Changes will not be persisted.
        </div>
      )}

      {/* Search */}
      <Card className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by project code, SO number, or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Wrench size={24} />}
          title="No approved Saudi projects found"
          description="Only approved Saudi-routed projects are managed through the factory module."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Project Code', 'SO Number', 'Customer', 'WO Status', 'Overall Status', 'Progress', 'Last Updated', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(({ project, records }) => {
                  const hasWO = records.some((r) => r.wo_reference_id);
                  const overallStatus = getOverallStatus(records);
                  const avgProgress = getAvgProgress(records);
                  const lastUpdated =
                    records.length > 0
                      ? records.reduce(
                          (latest, r) => (r.last_updated_at > latest ? r.last_updated_at : latest),
                          records[0].last_updated_at,
                        )
                      : project.updated_at;
                  const statusInfo = PROD_STATUS_MAP[overallStatus];

                  return (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                        {project.project_code}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{project.so_number}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 max-w-[180px] truncate">
                        {project.customer_name}
                      </td>
                      <td className="px-4 py-3">
                        {hasWO ? (
                          <Badge variant="success">WO Active</Badge>
                        ) : (
                          <Badge variant="critical">No WO</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                            <div
                              className="h-1.5 bg-brand-600 rounded-full"
                              style={{ width: `${avgProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{avgProgress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(lastUpdated)}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/factory/projects/${project.id}`}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
