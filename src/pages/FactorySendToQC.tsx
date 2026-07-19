import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, ChevronRight, ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_FACTORY_RECORDS as MOCK_FACTORY_RECORDS_RAW } from '../data/mockFactory';
import { mockOrEmpty } from '../lib/dataMode';
import type { FactoryRecord } from '../types';

const MOCK_FACTORY_RECORDS = mockOrEmpty(MOCK_FACTORY_RECORDS_RAW);

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

type FilterTab = 'ready' | 'sent' | 'all';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ready', label: 'Ready for QC' },
  { key: 'sent', label: 'Sent to QC' },
  { key: 'all', label: 'All Completed' },
];

interface ReadinessCheck {
  label: string;
  passed: boolean;
  blocker?: string;
}

function getReadinessChecks(record: FactoryRecord): ReadinessCheck[] {
  return [
    {
      label: 'Active Work Order',
      passed: !!record.wo_reference_id,
      blocker: 'An active Work Order is required before QC handoff.',
    },
    {
      // Production is complete when the derived status reaches 100% — a single
      // check (the old separate "Progress ≥ 100%" duplicated this, since progress
      // is now derived from the process steps).
      label: 'Production complete (100%)',
      passed: record.production_status === 'production_completed' || record.production_status === 'sent_to_qc',
      blocker: `Production is at ${record.progress_percentage}% — complete the process steps before QC.`,
    },
    {
      label: 'Monthly update submitted',
      passed: !record.monthly_update_required,
      blocker: 'Submit the latest monthly update before QC handoff.',
    },
  ];
}

export function FactorySendToQC() {
  const [records, setRecords] = useState<FactoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('ready');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Send a completed production record to QC: transition its status to
  // 'sent_to_qc'. QC then picks it up from their inbound queue. RLS scopes the
  // update to records the factory user owns.
  async function sendToQc(record: FactoryRecord) {
    setSendingId(record.id);
    setSendError(null);
    if (!isSupabaseConfigured || !supabase) {
      setRecords((prev) => prev.map((r) => r.id === record.id ? { ...r, production_status: 'sent_to_qc' } : r));
      setSendingId(null);
      return;
    }
    const { error } = await supabase
      .from('factory_records')
      .update({ production_status: 'sent_to_qc' })
      .eq('id', record.id);
    setSendingId(null);
    if (error) { setSendError(`${record.project?.project_code ?? 'Record'}: ${error.message}`); return; }
    setRecords((prev) => prev.map((r) => r.id === record.id ? { ...r, production_status: 'sent_to_qc' } : r));
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!isSupabaseConfigured || !supabase) {
        const completed = MOCK_FACTORY_RECORDS.filter((r) =>
          r.production_status === 'production_completed' || r.production_status === 'sent_to_qc',
        );
        setRecords(completed);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('factory_records')
        .select('*, project:projects(project_code, so_number, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description, quantity)')
        .in('production_status', ['production_completed', 'sent_to_qc'])
        .order('updated_at', { ascending: false });

      setRecords((data as unknown as FactoryRecord[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'ready': return records.filter((r) => r.production_status === 'production_completed');
      case 'sent': return records.filter((r) => r.production_status === 'sent_to_qc');
      case 'all': default: return records;
    }
  }, [records, activeTab]);

  const tabCounts: Record<FilterTab, number> = {
    ready: records.filter((r) => r.production_status === 'production_completed').length,
    sent: records.filter((r) => r.production_status === 'sent_to_qc').length,
    all: records.length,
  };

  const readyCount = tabCounts.ready;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Send to QC"
        subtitle="Factory QC handoff queue — review readiness and send completed production for QC inspection"
        breadcrumb={[{ label: 'Factory', href: '/factory' }, { label: 'Send to QC' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {/* Governance note */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 text-sm text-orange-800">
        Production must be completed (100% progress, WO confirmed, monthly update submitted) before sending to QC.
        QC inspection is managed by the QC team — factory sends the handoff request only.
      </div>

      {sendError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" /> {sendError}
        </div>
      )}

      {readyCount > 0 && !loading && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-sky-700">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>
            <strong>{readyCount}</strong> production record{readyCount !== 1 ? 's' : ''} completed — ready to send to QC for inspection.
          </span>
        </div>
      )}

      {/* Schema note for send-to-QC mutation */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-xs text-gray-500">
        <span className="font-medium text-gray-600">Schema note:</span>{' '}
        The "Send to QC" action updates <code>factory_records.production_status</code> to <code>sent_to_qc</code>.
        Full QC inspection creation is handled by the QC module. This page provides the readiness queue and status view.
      </div>

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
          <div className="py-12 text-center text-sm text-gray-400">Loading QC handoff queue…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<ClipboardCheck size={24} className="text-gray-400" />}
              title={
                activeTab === 'ready' ? 'No production records ready for QC' :
                activeTab === 'sent' ? 'No records sent to QC yet' :
                'No completed production records'
              }
              description={
                activeTab === 'ready'
                  ? 'Production records will appear here when status reaches "Completed". Check Factory Projects.'
                  : activeTab === 'sent'
                  ? 'Records move here once sent to QC for inspection.'
                  : 'Complete production and submit monthly updates to see records here.'
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((record) => {
              const checks = getReadinessChecks(record);
              const allPassed = checks.every((c) => c.passed);
              const blockers = checks.filter((c) => !c.passed);
              const isSent = record.production_status === 'sent_to_qc';
              const isExpanded = expandedId === record.id;
              const projectCode = record.project?.project_code ?? record.project_id;
              const lineDesc = record.vehicle_line
                ? `${record.vehicle_line.vehicle_type}: ${record.vehicle_line.description}`
                : record.project_vehicle_line_id ? 'Vehicle Line' : 'Project-level';

              return (
                <div key={record.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-mono font-semibold text-orange-700">{projectCode}</span>
                        <span className="text-xs text-gray-500">{lineDesc}</span>
                        {isSent
                          ? <Badge variant="success">Sent to QC</Badge>
                          : allPassed
                            ? <Badge variant="info">Ready for QC</Badge>
                            : <Badge variant="warning">Blockers Exist</Badge>
                        }
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Progress: <strong className="text-gray-800">{record.progress_percentage}%</strong></span>
                        {record.wo_reference_id && <span>WO: <strong className="text-gray-800 font-mono">{record.wo_reference_id.slice(0, 8)}…</strong></span>}
                        <span>Updated: {formatDate(record.last_updated_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isSent && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedId(isExpanded ? null : record.id)}
                        >
                          {isExpanded ? 'Hide' : 'Readiness'} <ChevronRight size={13} />
                        </Button>
                      )}
                      <Link to={`/factory/projects/${record.project_id}`}>
                        <Button variant="ghost" size="sm">View Project <ChevronRight size={14} /></Button>
                      </Link>
                      {!isSent && allPassed && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="border-green-400 text-green-700 hover:bg-green-50"
                          onClick={() => sendToQc(record)}
                          disabled={sendingId === record.id}
                        >
                          <CheckCircle2 size={13} className="mr-1" /> {sendingId === record.id ? 'Sending…' : 'Send to QC'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Readiness checklist */}
                  {isExpanded && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-700 mb-2">QC Readiness Checklist</p>
                      {checks.map((check) => (
                        <div key={check.label} className="flex items-start gap-2">
                          {check.passed
                            ? <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                            : <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                          }
                          <div>
                            <span className={`text-xs font-medium ${check.passed ? 'text-gray-700' : 'text-gray-900'}`}>
                              {check.label}
                            </span>
                            {!check.passed && check.blocker && (
                              <p className="text-xs text-red-600 mt-0.5">{check.blocker}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {blockers.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                          <AlertCircle size={13} className="text-amber-500" />
                          <span className="text-xs text-amber-700">
                            {blockers.length} blocker{blockers.length !== 1 ? 's' : ''} must be resolved before sending to QC.
                          </span>
                        </div>
                      )}
                      {allPassed && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                          <CheckCircle2 size={13} className="text-green-500" />
                          <span className="text-xs text-green-700 font-medium">All checks passed — ready to send to QC.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
