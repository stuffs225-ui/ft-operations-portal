import { useState, useEffect } from 'react';
import { Wrench, FileX, RefreshCw, CheckCircle2, Package, GitBranch, Ban } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { ReportExportBar } from '../components/features/ReportExportBar';
import { exportRowsToCsv } from '../lib/reportExport';
import type { ReportColumn } from '../lib/reportExport';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  MOCK_FACTORY_RECORDS as MOCK_FACTORY_RECORDS_RAW,
  MOCK_FACTORY_REQUIREMENTS as MOCK_FACTORY_REQUIREMENTS_RAW,
  MOCK_RAW_MATERIAL_REQUESTS as MOCK_RAW_MATERIAL_REQUESTS_RAW,
} from '../data/mockFactory';
import { mockOrEmpty } from '../lib/dataMode';
import type { FactoryRecord, FactoryItemRequirement, RawMaterialRequest } from '../types';

const MOCK_FACTORY_RECORDS = mockOrEmpty(MOCK_FACTORY_RECORDS_RAW);
const MOCK_FACTORY_REQUIREMENTS = mockOrEmpty(MOCK_FACTORY_REQUIREMENTS_RAW);
const MOCK_RAW_MATERIAL_REQUESTS = mockOrEmpty(MOCK_RAW_MATERIAL_REQUESTS_RAW as RawMaterialRequest[]);

import type { ReactNode } from 'react';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

type TableCol = { header: string; cell: (fr: FactoryRecord) => ReactNode };

function FactoryTable({ rows, cols, emptyMsg }: {
  rows: FactoryRecord[];
  cols: TableCol[];
  emptyMsg: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
          <tr>
            {cols.map((c) => (
              <th key={c.header} className="px-4 py-3 text-left">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((fr, i) => (
            <tr key={fr.id ?? i} className="hover:bg-gray-50">
              {cols.map((c) => (
                <td key={c.header} className="px-4 py-3">{c.cell(fr)}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="px-4 py-8 text-center text-gray-400">{emptyMsg}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const projectCol: TableCol = { header: 'Project', cell: (fr) => (
  <span className="font-mono font-semibold text-orange-700">{fr.project?.project_code ?? fr.project_id.slice(0, 8) + '…'}</span>
)};
const customerCol: TableCol = { header: 'Customer', cell: (fr) => (
  <span className="text-gray-600">{fr.project?.customer_name ?? '—'}</span>
)};
const vehicleCol: TableCol = { header: 'Vehicle Line', cell: (fr) => (
  <span className="text-gray-600">{fr.vehicle_line?.vehicle_type ?? '—'}</span>
)};
const statusCol: TableCol = { header: 'Production Status', cell: (fr) => (
  <Badge variant={productionStatusVariant(fr.production_status)}>
    {fr.production_status.replace(/_/g, ' ')}
  </Badge>
)};
const progressCol: TableCol = { header: 'Progress', cell: (fr) => (
  <span className="text-gray-600">{fr.progress_percentage}%</span>
)};
const lastUpdatedCol: TableCol = { header: 'Last Updated', cell: (fr) => (
  <span className="text-gray-500">{formatDate(fr.last_updated_at)}</span>
)};
const expectedCol: TableCol = { header: 'Expected Completion', cell: (fr) => (
  <span className="text-gray-500">{formatDate(fr.expected_completion_date)}</span>
)};

function productionStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'production_completed' || status === 'sent_to_qc') return 'success';
  if (status === 'in_production') return 'info';
  if (status === 'on_hold') return 'warning';
  if (status === 'not_started') return 'neutral';
  return 'neutral';
}

const TABS = [
  { key: 'missing_wo', label: 'Missing WO', icon: GitBranch },
  { key: 'missing_boq', label: 'Missing BOQ', icon: FileX },
  { key: 'missing_ga', label: 'Missing GA Drawing', icon: Wrench },
  { key: 'monthly_due', label: 'Monthly Update Due', icon: RefreshCw },
  { key: 'ready_qc', label: 'Ready for QC', icon: CheckCircle2 },
  { key: 'sent_qc', label: 'Sent to QC', icon: CheckCircle2 },
  { key: 'blocked', label: 'Blocked / On Hold', icon: Ban },
  { key: 'rmr', label: 'Raw Material Requests', icon: Package },
] as const;

type TabKey = typeof TABS[number]['key'];

export function ReportsFactory() {
  const [activeTab, setActiveTab] = useState<TabKey>('missing_wo');
  const [factoryRecords, setFactoryRecords] = useState<FactoryRecord[]>([]);
  const [requirements, setRequirements] = useState<FactoryItemRequirement[]>([]);
  const [rmrs, setRmrs] = useState<RawMaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!isSupabaseConfigured || !supabase) {
        setFactoryRecords(MOCK_FACTORY_RECORDS);
        setRequirements(MOCK_FACTORY_REQUIREMENTS as FactoryItemRequirement[]);
        setRmrs(MOCK_RAW_MATERIAL_REQUESTS);
        setLoading(false);
        return;
      }

      const [frRes, reqRes, rmrRes] = await Promise.all([
        supabase
          .from('factory_records')
          .select('*, project:projects(project_code, so_number, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description)')
          .order('updated_at', { ascending: false }),
        supabase
          .from('factory_item_requirements')
          .select('*, requirement_type:factory_requirement_types(name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('production_raw_material_requests')
          .select('*, project:projects(project_code, so_number, customer_name)')
          .order('requested_at', { ascending: false }),
      ]);

      setFactoryRecords((frRes.data as unknown as FactoryRecord[]) ?? []);
      setRequirements((reqRes.data as unknown as FactoryItemRequirement[]) ?? []);
      setRmrs((rmrRes.data as unknown as RawMaterialRequest[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Derived report datasets
  const missingWo = factoryRecords.filter((fr) => !fr.wo_reference_id);

  const missingBoq = factoryRecords.filter((fr) => {
    return !requirements.some(
      (req) =>
        req.project_id === fr.project_id &&
        req.project_vehicle_line_id === fr.project_vehicle_line_id &&
        req.requirement_type?.name === 'BOQ' &&
        (req.status === 'uploaded' || req.status === 'approved'),
    );
  });

  const missingGa = factoryRecords.filter((fr) => {
    return !requirements.some(
      (req) =>
        req.project_id === fr.project_id &&
        req.project_vehicle_line_id === fr.project_vehicle_line_id &&
        req.requirement_type?.name === 'GA Drawing' &&
        (req.status === 'uploaded' || req.status === 'approved'),
    );
  });

  const monthlyDue = factoryRecords.filter(
    (fr) => fr.monthly_update_required || fr.production_status === 'monthly_update_required',
  );

  const readyForQc = factoryRecords.filter((fr) => fr.production_status === 'production_completed');
  const sentToQc = factoryRecords.filter((fr) => fr.production_status === 'sent_to_qc');
  const blocked = factoryRecords.filter((fr) => fr.production_status === 'on_hold');

  const tabCounts: Record<TabKey, number> = {
    missing_wo: missingWo.length,
    missing_boq: missingBoq.length,
    missing_ga: missingGa.length,
    monthly_due: monthlyDue.length,
    ready_qc: readyForQc.length,
    sent_qc: sentToQc.length,
    blocked: blocked.length,
    rmr: rmrs.length,
  };

  function handleExportCsv() {
    const columns: ReportColumn<FactoryRecord>[] = [
      { key: 'project', header: 'Project', value: (fr) => fr.project?.project_code ?? fr.project_id },
      { key: 'vehicle_line', header: 'Vehicle Line', value: (fr) => fr.vehicle_line?.vehicle_type ?? '' },
      { key: 'wo', header: 'WO Reference', value: (fr) => fr.wo_reference_id ?? '' },
      { key: 'production_status', header: 'Production Status', value: (fr) => fr.production_status },
      { key: 'progress', header: 'Progress %', value: (fr) => fr.progress_percentage },
      { key: 'last_updated', header: 'Last Updated', value: (fr) => fr.last_updated_at ?? '' },
      { key: 'expected_completion', header: 'Expected Completion', value: (fr) => fr.expected_completion_date ?? '' },
    ];
    exportRowsToCsv(`factory_${activeTab}`, factoryRecords, columns);
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Factory Reports"
        subtitle="Production blockers, WO gaps, monthly updates, QC readiness, and raw material requests"
        breadcrumb={[{ label: 'Reports', href: '/reports' }, { label: 'Factory' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      <ReportExportBar
        reportKey="factory_progress"
        reportTitle="Factory Progress Report"
        department="Factory"
        onExportCsv={handleExportCsv}
      />

      <div className="report-print-root space-y-6">
        {/* Tab bar — orange accent */}
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tabCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading factory reports…</div>
        ) : (
          <>
            {/* Missing WO */}
            {activeTab === 'missing_wo' && (
              <div className="space-y-4">
                {missingWo.length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>{missingWo.length}</strong> factory record{missingWo.length !== 1 ? 's' : ''} missing a Work Order — production cannot begin without WO confirmation.
                    </span>
                  </div>
                )}
                <Card padding="none">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold text-sm text-gray-700">Missing WO ({missingWo.length})</span>
                  </div>
                  <FactoryTable
                    rows={missingWo}
                    cols={[projectCol, customerCol, vehicleCol, statusCol, progressCol, expectedCol]}
                    emptyMsg="All factory records have a confirmed Work Order"
                  />
                </Card>
              </div>
            )}

            {/* Missing BOQ */}
            {activeTab === 'missing_boq' && (
              <div className="space-y-4">
                {missingBoq.length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
                    <FileX className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>{missingBoq.length}</strong> factory record{missingBoq.length !== 1 ? 's' : ''} missing a BOQ upload — production cannot proceed.
                    </span>
                  </div>
                )}
                <Card padding="none">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <FileX className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold text-sm text-gray-700">Records Missing BOQ ({missingBoq.length})</span>
                  </div>
                  <FactoryTable
                    rows={missingBoq}
                    cols={[projectCol, vehicleCol, statusCol, progressCol, expectedCol]}
                    emptyMsg="All factory records have BOQ uploaded"
                  />
                </Card>
              </div>
            )}

            {/* Missing GA Drawing */}
            {activeTab === 'missing_ga' && (
              <div className="space-y-4">
                {missingGa.length > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                    <Wrench className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>{missingGa.length}</strong> factory record{missingGa.length !== 1 ? 's' : ''} missing a GA Drawing — detail drawings are blocked.
                    </span>
                  </div>
                )}
                <Card padding="none">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold text-sm text-gray-700">Records Missing GA Drawing ({missingGa.length})</span>
                  </div>
                  <FactoryTable
                    rows={missingGa}
                    cols={[projectCol, customerCol, vehicleCol, statusCol, { header: 'Remarks', cell: (fr) => <span className="text-gray-500 max-w-xs truncate block">{fr.remarks ?? '—'}</span> }]}
                    emptyMsg="All factory records have GA Drawing uploaded"
                  />
                </Card>
              </div>
            )}

            {/* Monthly Update Due */}
            {activeTab === 'monthly_due' && (
              <div className="space-y-4">
                {monthlyDue.length > 0 && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>{monthlyDue.length}</strong> factory record{monthlyDue.length !== 1 ? 's' : ''} require a monthly progress update from the factory team.
                    </span>
                  </div>
                )}
                <Card padding="none">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-orange-500" />
                    <span className="font-semibold text-sm text-gray-700">Pending Monthly Updates ({monthlyDue.length})</span>
                  </div>
                  <FactoryTable
                    rows={monthlyDue}
                    cols={[projectCol, vehicleCol, statusCol, progressCol, lastUpdatedCol, expectedCol]}
                    emptyMsg="No factory records require a monthly update"
                  />
                </Card>
              </div>
            )}

            {/* Ready for QC */}
            {activeTab === 'ready_qc' && (
              <div className="space-y-4">
                {readyForQc.length > 0 && (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>{readyForQc.length}</strong> factory record{readyForQc.length !== 1 ? 's' : ''} completed production and are ready for QC hand-off.
                    </span>
                  </div>
                )}
                <Card padding="none">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-sm text-gray-700">Ready for QC Hand-off ({readyForQc.length})</span>
                  </div>
                  <FactoryTable
                    rows={readyForQc}
                    cols={[
                      projectCol, customerCol, vehicleCol,
                      { header: 'Status', cell: () => <Badge variant="success">Production Completed</Badge> },
                      { header: 'Completed', cell: (fr) => <span className="text-gray-500">{formatDate(fr.actual_completion_date)}</span> },
                      { header: 'Remarks', cell: (fr) => <span className="text-gray-500 max-w-xs truncate block">{fr.remarks ?? '—'}</span> },
                    ]}
                    emptyMsg="No factory records currently ready for QC"
                  />
                </Card>
              </div>
            )}

            {/* Sent to QC */}
            {activeTab === 'sent_qc' && (
              <div className="space-y-4">
                {sentToQc.length > 0 && (
                  <div className="rounded-lg bg-sky-50 border border-sky-200 px-4 py-3 text-sm text-sky-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>{sentToQc.length}</strong> factory record{sentToQc.length !== 1 ? 's' : ''} sent to QC for inspection.
                    </span>
                  </div>
                )}
                <Card padding="none">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-500" />
                    <span className="font-semibold text-sm text-gray-700">Sent to QC ({sentToQc.length})</span>
                  </div>
                  <FactoryTable
                    rows={sentToQc}
                    cols={[
                      projectCol, customerCol, vehicleCol,
                      { header: 'Status', cell: () => <Badge variant="info">Sent to QC</Badge> },
                      lastUpdatedCol,
                    ]}
                    emptyMsg="No factory records have been sent to QC yet"
                  />
                </Card>
              </div>
            )}

            {/* Blocked / On Hold */}
            {activeTab === 'blocked' && (
              <div className="space-y-4">
                {blocked.length > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                    <Ban className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>{blocked.length}</strong> factory record{blocked.length !== 1 ? 's' : ''} on hold — review blockers and escalate if needed.
                    </span>
                  </div>
                )}
                <Card padding="none">
                  <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-sm text-gray-700">Blocked / On Hold ({blocked.length})</span>
                  </div>
                  <FactoryTable
                    rows={blocked}
                    cols={[
                      projectCol, customerCol, vehicleCol, progressCol, lastUpdatedCol,
                      { header: 'Remarks', cell: (fr) => <span className="text-gray-500 max-w-xs truncate block">{fr.remarks ?? '—'}</span> },
                    ]}
                    emptyMsg="No factory records currently on hold"
                  />
                </Card>
              </div>
            )}

            {/* Raw Material Requests */}
            {activeTab === 'rmr' && (
              <Card padding="none">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold text-sm text-gray-700">
                    Raw Material Requests ({rmrs.length})
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">Request #</th>
                        <th className="px-4 py-3 text-left">Project</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-left">WO Linked</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Requested At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rmrs.map((rmr) => (
                        <tr key={rmr.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono font-semibold text-orange-700">{rmr.request_number}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {rmr.project?.project_code ?? rmr.project_id ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={rmr.request_type === 'project_related' ? 'info' : 'neutral'}>
                              {rmr.request_type === 'project_related' ? 'Project' : 'Stock'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {rmr.wo_reference_id
                              ? <Badge variant="success" size="sm">WO Linked</Badge>
                              : rmr.request_type === 'project_related'
                                ? <Badge variant="critical" size="sm">No WO</Badge>
                                : <span className="text-xs text-gray-400">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="neutral">{rmr.status.replace(/_/g, ' ')}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(rmr.requested_at)}</td>
                        </tr>
                      ))}
                      {rmrs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                            No raw material requests found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
