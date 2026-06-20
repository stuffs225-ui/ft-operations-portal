import { useState, useEffect, useMemo } from 'react';
import { CalendarClock, AlertTriangle, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { recordFactoryEvent } from '../lib/factoryAudit';
import { MOCK_FACTORY_RECORDS as MOCK_FACTORY_RECORDS_RAW } from '../data/mockFactory';
import { mockOrEmpty } from '../lib/dataMode';
import type { FactoryRecord, FactoryProductionStatus } from '../types';

const MOCK_FACTORY_RECORDS = mockOrEmpty(MOCK_FACTORY_RECORDS_RAW);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

const PROD_STATUS_MAP: Record<FactoryProductionStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  not_started:              { label: 'Not Started',       variant: 'neutral' },
  details_requested:        { label: 'Details Requested', variant: 'info' },
  boq_pending:              { label: 'BOQ Pending',       variant: 'warning' },
  boq_uploaded:             { label: 'BOQ Uploaded',      variant: 'info' },
  ga_drawing_pending:       { label: 'GA Pending',        variant: 'warning' },
  ga_drawing_uploaded:      { label: 'GA Uploaded',       variant: 'info' },
  detail_drawings_pending:  { label: 'Drawings Pending',  variant: 'warning' },
  detail_drawings_uploaded: { label: 'Drawings Uploaded', variant: 'info' },
  manhours_pending:         { label: 'Manhours Pending',  variant: 'warning' },
  manhours_added:           { label: 'Manhours Added',    variant: 'info' },
  pending_raw_materials:    { label: 'Waiting Materials', variant: 'warning' },
  in_production:            { label: 'In Production',     variant: 'default' },
  monthly_update_required:  { label: 'Update Required',   variant: 'critical' },
  production_completed:     { label: 'Completed',         variant: 'success' },
  sent_to_qc:               { label: 'Sent to QC',       variant: 'success' },
  on_hold:                  { label: 'On Hold',           variant: 'neutral' },
};

type FilterTab = 'due' | 'overdue' | 'in_production' | 'all';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'due', label: 'Due' },
  { key: 'overdue', label: 'Overdue (>30 days)' },
  { key: 'in_production', label: 'In Production' },
  { key: 'all', label: 'All Records' },
];

interface UpdateFormState {
  progress: string;
  remarks: string;
}

export function FactoryMonthlyUpdates() {
  const { user } = useAuth();
  const [records, setRecords] = useState<FactoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('due');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<UpdateFormState>({ progress: '', remarks: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!isSupabaseConfigured || !supabase) {
        const allActive = MOCK_FACTORY_RECORDS.filter(
          (r) => !['sent_to_qc', 'production_completed', 'not_started'].includes(r.production_status),
        );
        setRecords(allActive);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('factory_records')
        .select('*, project:projects(project_code, so_number, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description, quantity)')
        .not('production_status', 'in', '("sent_to_qc","not_started")')
        .order('last_updated_at', { ascending: true });

      setRecords((data as unknown as FactoryRecord[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'due':
        return records.filter((r) => r.monthly_update_required || r.production_status === 'monthly_update_required');
      case 'overdue':
        return records.filter(
          (r) => r.monthly_update_required && daysSince(r.last_updated_at) > 30,
        );
      case 'in_production':
        return records.filter((r) => r.production_status === 'in_production');
      case 'all':
      default:
        return records;
    }
  }, [records, activeTab]);

  const tabCounts: Record<FilterTab, number> = {
    due: records.filter((r) => r.monthly_update_required || r.production_status === 'monthly_update_required').length,
    overdue: records.filter((r) => r.monthly_update_required && daysSince(r.last_updated_at) > 30).length,
    in_production: records.filter((r) => r.production_status === 'in_production').length,
    all: records.length,
  };

  function toggleExpand(recordId: string, currentProgress: number) {
    if (expandedId === recordId) {
      setExpandedId(null);
      setSuccessMsg('');
      setSaveError(null);
    } else {
      setExpandedId(recordId);
      setFormState({ progress: String(currentProgress), remarks: '' });
      setSuccessMsg('');
      setSaveError(null);
    }
  }

  async function submitUpdate(record: FactoryRecord) {
    setSubmitting(true);
    setSaveError(null);

    if (!isSupabaseConfigured || !supabase) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === record.id
            ? { ...r, progress_percentage: Number(formState.progress), monthly_update_required: false, remarks: formState.remarks || r.remarks }
            : r,
        ),
      );
      setSubmitting(false);
      setSuccessMsg('Dev mode — update recorded (not persisted)');
      setExpandedId(null);
      return;
    }

    const { error } = await supabase
      .from('factory_records')
      .update({
        progress_percentage: Number(formState.progress),
        remarks: formState.remarks.trim() || record.remarks || null,
        monthly_update_required: false,
        last_updated_by: user?.id ?? null,
        last_updated_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    if (error) {
      setSaveError(error.message);
      setSubmitting(false);
      return;
    }

    void recordFactoryEvent(
      'factory_record', record.id, record.project_id, 'factory_progress_updated',
      `Monthly progress updated to ${Number(formState.progress)}%.`,
      user?.id ?? null, { progress_percentage: Number(formState.progress) },
    );

    setRecords((prev) =>
      prev.map((r) =>
        r.id === record.id
          ? { ...r, progress_percentage: Number(formState.progress), monthly_update_required: false }
          : r,
      ),
    );
    setSubmitting(false);
    setSuccessMsg('Progress updated successfully.');
    setExpandedId(null);
  }

  const dueCount = tabCounts.due;
  const overdueCount = tabCounts.overdue;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Monthly Updates"
        subtitle="Production progress queue — submit updates, track blockers, and report completion"
        breadcrumb={[{ label: 'Factory', href: '/factory' }, { label: 'Monthly Updates' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {overdueCount > 0 && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span><strong>{overdueCount}</strong> production record{overdueCount !== 1 ? 's' : ''} overdue — no update in over 30 days. Submit now.</span>
        </div>
      )}

      {dueCount > 0 && overdueCount === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-amber-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span><strong>{dueCount}</strong> production record{dueCount !== 1 ? 's' : ''} require a monthly progress update.</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 flex items-center gap-2 text-sm text-green-800">
          <CheckCircle2 size={15} className="text-green-600" />
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Tabs */}
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

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading production records…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<CalendarClock size={24} className="text-gray-400" />}
              title={
                activeTab === 'due' ? 'No updates currently due' :
                activeTab === 'overdue' ? 'No overdue updates — great work!' :
                activeTab === 'in_production' ? 'No records currently in production' :
                'No active production records'
              }
              description={
                activeTab === 'due'
                  ? 'All production records are up to date.'
                  : activeTab === 'all'
                  ? 'No active production records found. Start production from Factory Projects.'
                  : 'Switch to another tab to see other records.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Vehicle Line</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Progress</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last Updated</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Days Since</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((record) => {
                  const statusInfo = PROD_STATUS_MAP[record.production_status];
                  const days = daysSince(record.last_updated_at);
                  const isOverdue = record.monthly_update_required && days > 30;
                  const isDue = record.monthly_update_required;
                  const isExpanded = expandedId === record.id;
                  const projectCode = record.project?.project_code ?? record.project_id;
                  const lineDesc = record.vehicle_line
                    ? `${record.vehicle_line.vehicle_type}: ${record.vehicle_line.description}`
                    : record.project_vehicle_line_id ? 'Vehicle Line' : 'Project-level';

                  return (
                    <>
                      <tr key={record.id} className={`hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-mono font-semibold text-orange-700">{projectCode}</p>
                          {isDue && <p className="text-[10px] text-amber-600 font-medium">Update Required</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell max-w-[140px] truncate">{lineDesc}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                              <div className="h-1.5 bg-orange-500 rounded-full" style={{ width: `${record.progress_percentage}%` }} />
                            </div>
                            <span className="text-xs text-gray-600">{record.progress_percentage}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{formatDate(record.last_updated_at)}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : days > 20 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {days}d {isOverdue && '⚠ Overdue'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isDue ? (
                            <Button
                              size="sm"
                              variant={isExpanded ? 'ghost' : 'secondary'}
                              onClick={() => toggleExpand(record.id, record.progress_percentage)}
                            >
                              {isExpanded ? 'Cancel' : 'Submit Update'}
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400 flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Up to date</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${record.id}-form`}>
                          <td colSpan={7} className="px-4 py-4 bg-orange-50/40 border-t border-orange-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-1 block">
                                  Progress % (current: {record.progress_percentage}%)
                                </label>
                                <input
                                  type="number"
                                  min={0} max={100}
                                  value={formState.progress}
                                  onChange={(e) => setFormState((s) => ({ ...s, progress: e.target.value }))}
                                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-1 block">Remarks</label>
                                <textarea
                                  rows={2}
                                  placeholder="Progress notes, blockers, next milestone…"
                                  value={formState.remarks}
                                  onChange={(e) => setFormState((s) => ({ ...s, remarks: e.target.value }))}
                                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                                />
                              </div>
                            </div>
                            {saveError && <p className="text-xs text-red-600 mb-2">{saveError}</p>}
                            <Button
                              size="sm"
                              loading={submitting}
                              onClick={() => submitUpdate(record)}
                              className="bg-orange-600 hover:bg-orange-700 text-white border-0"
                              icon={!submitting ? <ChevronRight size={13} /> : undefined}
                            >
                              Submit Update
                            </Button>
                          </td>
                        </tr>
                      )}
                    </>
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
