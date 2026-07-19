import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Search, AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  not_started:              { label: 'Not Started',           variant: 'neutral' },
  details_requested:        { label: 'Details Requested',     variant: 'info' },
  boq_pending:              { label: 'BOQ Pending',           variant: 'warning' },
  boq_uploaded:             { label: 'BOQ Uploaded',          variant: 'info' },
  ga_drawing_pending:       { label: 'GA Pending',            variant: 'warning' },
  ga_drawing_uploaded:      { label: 'GA Uploaded',           variant: 'info' },
  detail_drawings_pending:  { label: 'Drawings Pending',      variant: 'warning' },
  detail_drawings_uploaded: { label: 'Drawings Uploaded',     variant: 'info' },
  manhours_pending:         { label: 'Manhours Pending',      variant: 'warning' },
  manhours_added:           { label: 'Manhours Added',        variant: 'info' },
  pending_raw_materials:    { label: 'Waiting Materials',     variant: 'warning' },
  in_production:            { label: 'In Production',         variant: 'default' },
  monthly_update_required:  { label: 'Update Required',       variant: 'critical' },
  production_completed:     { label: 'Completed',             variant: 'success' },
  sent_to_qc:               { label: 'Sent to QC',           variant: 'success' },
  on_hold:                  { label: 'On Hold / Blocked',     variant: 'neutral' },
};

type FilterTab = 'all' | 'missing_wo' | 'ready' | 'in_production' | 'waiting_materials' | 'blocked' | 'ready_for_qc' | 'completed';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'missing_wo', label: 'Missing WO' },
  { key: 'ready', label: 'Ready to Start' },
  { key: 'in_production', label: 'In Production' },
  { key: 'waiting_materials', label: 'Waiting Materials' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'ready_for_qc', label: 'Ready for QC' },
  { key: 'completed', label: 'Completed' },
];

interface ProjectWithRecords {
  project: Project;
  records: FactoryRecord[];
  hasWo: boolean;
  overallStatus: FactoryProductionStatus;
  avgProgress: number;
  lastUpdated: string;
}

function getOverallStatus(records: FactoryRecord[]): FactoryProductionStatus {
  if (records.length === 0) return 'not_started';
  if (records.some((r) => r.production_status === 'monthly_update_required')) return 'monthly_update_required';
  if (records.some((r) => r.monthly_update_required)) return 'monthly_update_required';
  if (records.some((r) => r.production_status === 'in_production')) return 'in_production';
  if (records.some((r) => r.production_status === 'on_hold')) return 'on_hold';
  if (records.some((r) => r.production_status === 'pending_raw_materials')) return 'pending_raw_materials';
  if (records.some((r) => r.production_status === 'production_completed')) return 'production_completed';
  if (records.some((r) => r.production_status === 'sent_to_qc')) return 'sent_to_qc';
  return records[0].production_status;
}

function getNextAction(hasWo: boolean, status: FactoryProductionStatus): string {
  if (!hasWo) return 'Enter WO';
  switch (status) {
    case 'not_started': return 'Start Production';
    case 'boq_pending': return 'Upload BOQ';
    case 'ga_drawing_pending': return 'Upload GA Drawing';
    case 'detail_drawings_pending': return 'Upload Drawings';
    case 'manhours_pending': return 'Add Manhours';
    case 'pending_raw_materials': return 'Check Raw Materials';
    case 'monthly_update_required': return 'Submit Monthly Update';
    case 'production_completed': return 'Send to QC';
    case 'on_hold': return 'Resolve Blocker';
    case 'in_production': return 'Submit Monthly Update';
    case 'sent_to_qc': return '—';
    default: return 'View';
  }
}

function matchesTab(tab: FilterTab, item: ProjectWithRecords): boolean {
  if (tab === 'all') return true;
  if (tab === 'missing_wo') return !item.hasWo;
  if (tab === 'ready') return item.hasWo && item.overallStatus === 'not_started';
  if (tab === 'in_production') return item.overallStatus === 'in_production' || item.overallStatus === 'monthly_update_required';
  if (tab === 'waiting_materials') return item.overallStatus === 'pending_raw_materials';
  if (tab === 'blocked') return item.overallStatus === 'on_hold';
  if (tab === 'ready_for_qc') return item.overallStatus === 'production_completed';
  if (tab === 'completed') return item.overallStatus === 'sent_to_qc';
  return true;
}

export function FactoryProjects() {
  const [items, setItems] = useState<ProjectWithRecords[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!isSupabaseConfigured || !supabase) {
        const saudiApproved = MOCK_PROJECTS.filter(
          (p) => p.project_status === 'approved' && p.manufacturing_location === 'saudi',
        );
        const { MOCK_EXECUTION_REFERENCES } = await import('../data/mockExecutionReferences');
        const woProjectIds = new Set(
          MOCK_EXECUTION_REFERENCES
            .filter((r) => r.reference_type === 'wo' && r.status !== 'cancelled' && r.status !== 'superseded')
            .map((r) => r.project_id),
        );
        const result: ProjectWithRecords[] = saudiApproved.map((p) => {
          const records = MOCK_FACTORY_RECORDS.filter((r) => r.project_id === p.id);
          const hasWo = woProjectIds.has(p.id);
          const overallStatus = getOverallStatus(records);
          const avgProgress = records.length > 0
            ? Math.round(records.reduce((s, r) => s + r.progress_percentage, 0) / records.length)
            : 0;
          const lastUpdated = records.length > 0
            ? records.reduce((lat, r) => r.last_updated_at > lat ? r.last_updated_at : lat, records[0].last_updated_at)
            : p.updated_at;
          return { project: p, records, hasWo, overallStatus, avgProgress, lastUpdated };
        });
        setItems(result);
        setLoading(false);
        return;
      }

      const [projRes, recordsRes, woRefRes] = await Promise.all([
        supabase.from('projects').select('*').eq('manufacturing_location', 'saudi').eq('project_status', 'approved').order('project_code'),
        supabase.from('factory_records').select('*'),
        // A project "has a WO" when it has an active WO in the execution register —
        // NOT when a factory record happens to reference one. A fresh project can
        // have an approved WO with no factory record yet (this was the "Missing WO"
        // bug where the list disagreed with the project page).
        supabase.from('project_execution_references').select('project_id')
          .eq('reference_type', 'wo').not('status', 'in', '("cancelled","superseded")'),
      ]);

      const projects = (projRes.data as unknown as Project[]) ?? [];
      const allRecords = (recordsRes.data as unknown as FactoryRecord[]) ?? [];
      const woProjectIds = new Set(((woRefRes.data as { project_id: string }[]) ?? []).map((r) => r.project_id));

      const result: ProjectWithRecords[] = projects.map((p) => {
        const records = allRecords.filter((r) => r.project_id === p.id);
        const hasWo = woProjectIds.has(p.id);
        const overallStatus = getOverallStatus(records);
        const avgProgress = records.length > 0
          ? Math.round(records.reduce((s, r) => s + r.progress_percentage, 0) / records.length)
          : 0;
        const lastUpdated = records.length > 0
          ? records.reduce((lat, r) => r.last_updated_at > lat ? r.last_updated_at : lat, records[0].last_updated_at)
          : p.updated_at;
        return { project: p, records, hasWo, overallStatus, avgProgress, lastUpdated };
      });
      setItems(result);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (activeTab !== 'all') list = list.filter((i) => matchesTab(activeTab, i));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(({ project: p }) =>
        p.project_code.toLowerCase().includes(q) ||
        p.so_number.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, activeTab, search]);

  const tabCounts = TABS.reduce<Record<FilterTab, number>>((acc, t) => {
    acc[t.key] = t.key === 'all' ? items.length : items.filter((i) => matchesTab(t.key, i)).length;
    return acc;
  }, {} as Record<FilterTab, number>);

  const missingWoCount = items.filter((i) => !i.hasWo).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Factory Projects"
        subtitle="Saudi approved projects — production tracking and WO readiness"
        breadcrumb={[{ label: 'Factory', href: '/factory' }, { label: 'Projects' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {missingWoCount > 0 && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span><strong>{missingWoCount}</strong> project{missingWoCount !== 1 ? 's' : ''} missing WO — factory execution is blocked.</span>
          <Link to="/wo-pn-gate" className="ml-auto shrink-0">
            <Button size="sm" variant="primary" className="bg-red-600 hover:bg-red-700 text-white border-0">Enter WO</Button>
          </Link>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Status tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === t.key
                  ? 'text-orange-700 border-orange-500'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {t.label}
              {tabCounts[t.key] > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === t.key ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tabCounts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Project code, SO, customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-56"
            />
          </div>
          <span className="ml-auto text-xs text-gray-400">
            {loading ? '' : `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading factory projects…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<Wrench size={24} className="text-gray-400" />}
              title={items.length === 0 ? 'No approved Saudi projects' : 'No factory projects require action right now.'}
              description={
                items.length === 0
                  ? 'Saudi approved projects appear here once available.'
                  : 'Try a different status filter or clear the search.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Customer</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">WO</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Production Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Progress</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last Updated</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Next Action</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(({ project: p, hasWo, overallStatus, avgProgress, lastUpdated }) => {
                  const statusInfo = PROD_STATUS_MAP[overallStatus];
                  const nextAction = getNextAction(hasWo, overallStatus);
                  const nextActionWarn = ['Enter WO', 'Submit Monthly Update', 'Send to QC', 'Resolve Blocker'].includes(nextAction);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono font-semibold text-orange-700">{p.project_code}</p>
                        <p className="text-[10px] text-gray-400">{p.so_number}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell max-w-[160px] truncate">{p.customer_name}</td>
                      <td className="px-4 py-3">
                        {hasWo
                          ? <Badge variant="success">WO Active</Badge>
                          : <Badge variant="critical">Missing WO</Badge>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                            <div className="h-1.5 bg-orange-500 rounded-full" style={{ width: `${avgProgress}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{avgProgress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{formatDate(lastUpdated)}</td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className={`text-xs font-medium ${nextActionWarn ? 'text-amber-600' : 'text-gray-500'}`}>
                          {nextAction}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/factory/projects/${p.id}`}>
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
    </div>
  );
}
