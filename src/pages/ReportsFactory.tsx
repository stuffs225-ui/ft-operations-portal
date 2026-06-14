import { useState } from 'react';
import { Wrench, FileX, RefreshCw, CheckCircle2, Package } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  MOCK_FACTORY_RECORDS as MOCK_FACTORY_RECORDS_RAW,
  MOCK_FACTORY_REQUIREMENTS as MOCK_FACTORY_REQUIREMENTS_RAW,
  MOCK_RAW_MATERIAL_REQUESTS as MOCK_RAW_MATERIAL_REQUESTS_RAW,
} from '../data/mockFactory';
import { mockOrEmpty } from '../lib/dataMode';

const MOCK_FACTORY_RECORDS = mockOrEmpty(MOCK_FACTORY_RECORDS_RAW);
const MOCK_FACTORY_REQUIREMENTS = mockOrEmpty(MOCK_FACTORY_REQUIREMENTS_RAW);
const MOCK_RAW_MATERIAL_REQUESTS = mockOrEmpty(MOCK_RAW_MATERIAL_REQUESTS_RAW);
import { ReportExportBar } from '../components/features/ReportExportBar';
import { exportRowsToCsv } from '../lib/reportExport';
import type { ReportColumn } from '../lib/reportExport';
// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function productionStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'completed') return 'success';
  if (status === 'in_production') return 'info';
  if (status === 'on_hold') return 'warning';
  if (status === 'not_started') return 'neutral';
  return 'neutral';
}

function rmrStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'sent_to_procurement') return 'success';
  if (status === 'submitted') return 'info';
  if (status === 'draft') return 'neutral';
  return 'neutral';
}

const TABS = [
  'Missing BOQ',
  'Missing GA Drawing',
  'Monthly Update Required',
  'Ready for QC',
  'Raw Material Requests',
] as const;

type Tab = typeof TABS[number];

// ── Derived data helpers ──────────────────────────────────────────────────────

/** Factory records that have no uploaded BOQ requirement. */
function getMissingBoq() {
  return MOCK_FACTORY_RECORDS.filter((fr) => {
    const hasBoq = MOCK_FACTORY_REQUIREMENTS.some(
      (req) =>
        req.project_id === fr.project_id &&
        req.project_vehicle_line_id === fr.project_vehicle_line_id &&
        req.requirement_type?.name === 'BOQ' &&
        req.status === 'uploaded',
    );
    return !hasBoq;
  });
}

/** Factory records that have no uploaded GA Drawing requirement. */
function getMissingGaDrawing() {
  return MOCK_FACTORY_RECORDS.filter((fr) => {
    const hasGa = MOCK_FACTORY_REQUIREMENTS.some(
      (req) =>
        req.project_id === fr.project_id &&
        req.project_vehicle_line_id === fr.project_vehicle_line_id &&
        req.requirement_type?.name === 'GA Drawing' &&
        req.status === 'uploaded',
    );
    return !hasGa;
  });
}

/** Factory records where monthly_update_required is true. */
function getMonthlyUpdateRequired() {
  return MOCK_FACTORY_RECORDS.filter((fr) => fr.monthly_update_required);
}

/** Factory records where production_status is 'production_completed' (ready for QC hand-off). */
function getReadyForQc() {
  return MOCK_FACTORY_RECORDS.filter(
    (fr) => fr.production_status === 'production_completed',
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsFactory() {
  const [activeTab, setActiveTab] = useState<Tab>('Missing BOQ');

  const missingBoq = getMissingBoq();
  const missingGaDrawing = getMissingGaDrawing();
  const monthlyUpdateRequired = getMonthlyUpdateRequired();
  const readyForQc = getReadyForQc();

  function handleExportCsv() {
    const columns: ReportColumn<typeof MOCK_FACTORY_RECORDS[number]>[] = [
      { key: 'project', header: 'Project', value: (fr) => fr.project?.project_code ?? fr.project_id },
      { key: 'vehicle_line', header: 'Vehicle Line', value: (fr) => fr.vehicle_line?.vehicle_type ?? '' },
      { key: 'production_status', header: 'Production Status', value: (fr) => fr.production_status },
      { key: 'progress', header: 'Progress %', value: (fr) => fr.progress_percentage },
      { key: 'expected_completion', header: 'Expected Completion', value: (fr) => fr.expected_completion_date ?? '' },
    ];
    exportRowsToCsv('factory_progress', MOCK_FACTORY_RECORDS, columns);
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Factory Reports"
        subtitle="Production blockers, BOQ gaps, monthly updates, and QC readiness"
        breadcrumb={[{ label: 'Reports', href: '/reports' }, { label: 'Factory' }]}
      />

      {!isSupabaseConfigured && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-700">
          Dev mode — showing mock data
        </div>
      )}

      <ReportExportBar
        reportKey="factory_progress"
        reportTitle="Factory Progress Report"
        department="Factory"
        onExportCsv={handleExportCsv}
      />

      <div className="report-print-root space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1 — Missing BOQ */}
      {activeTab === 'Missing BOQ' && (
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
              <FileX className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-sm text-gray-700">
                Records Missing BOQ ({missingBoq.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Vehicle Line</th>
                    <th className="px-4 py-3 text-left">Production Status</th>
                    <th className="px-4 py-3 text-right">Progress</th>
                    <th className="px-4 py-3 text-left">Expected Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {missingBoq.map((fr) => (
                    <tr key={fr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {fr.project?.project_code ?? fr.project_id}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fr.vehicle_line?.vehicle_type ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={productionStatusVariant(fr.production_status)}>
                          {fr.production_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {fr.progress_percentage}%
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(fr.expected_completion_date)}
                      </td>
                    </tr>
                  ))}
                  {missingBoq.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        All factory records have BOQ uploaded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2 — Missing GA Drawing */}
      {activeTab === 'Missing GA Drawing' && (
        <div className="space-y-4">
          {missingGaDrawing.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
              <Wrench className="w-4 h-4 shrink-0" />
              <span>
                <strong>{missingGaDrawing.length}</strong> factory record{missingGaDrawing.length !== 1 ? 's' : ''} missing a GA Drawing — detail drawings are blocked.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-sm text-gray-700">
                Records Missing GA Drawing ({missingGaDrawing.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Vehicle Line</th>
                    <th className="px-4 py-3 text-left">Production Status</th>
                    <th className="px-4 py-3 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {missingGaDrawing.map((fr) => (
                    <tr key={fr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {fr.project?.project_code ?? fr.project_id}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fr.project?.customer_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fr.vehicle_line?.vehicle_type ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={productionStatusVariant(fr.production_status)}>
                          {fr.production_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                        {fr.remarks ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {missingGaDrawing.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        All factory records have GA Drawing uploaded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3 — Monthly Update Required */}
      {activeTab === 'Monthly Update Required' && (
        <div className="space-y-4">
          {monthlyUpdateRequired.length > 0 && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span>
                <strong>{monthlyUpdateRequired.length}</strong> factory record{monthlyUpdateRequired.length !== 1 ? 's' : ''} require a monthly progress update from the factory team.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-sm text-gray-700">
                Pending Monthly Updates ({monthlyUpdateRequired.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Vehicle Line</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Progress</th>
                    <th className="px-4 py-3 text-left">Last Updated</th>
                    <th className="px-4 py-3 text-left">Expected Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {monthlyUpdateRequired.map((fr) => (
                    <tr key={fr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {fr.project?.project_code ?? fr.project_id}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fr.vehicle_line?.vehicle_type ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={productionStatusVariant(fr.production_status)}>
                          {fr.production_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {fr.progress_percentage}%
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(fr.last_updated_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(fr.expected_completion_date)}
                      </td>
                    </tr>
                  ))}
                  {monthlyUpdateRequired.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No factory records require a monthly update
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4 — Ready for QC */}
      {activeTab === 'Ready for QC' && (
        <div className="space-y-4">
          {readyForQc.length > 0 && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                <strong>{readyForQc.length}</strong> factory record{readyForQc.length !== 1 ? 's' : ''} completed production and ready for QC hand-off.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="font-semibold text-sm text-gray-700">
                Ready for QC Hand-off ({readyForQc.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Vehicle Line</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Completed</th>
                    <th className="px-4 py-3 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {readyForQc.map((fr) => (
                    <tr key={fr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {fr.project?.project_code ?? fr.project_id}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fr.project?.customer_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {fr.vehicle_line?.vehicle_type ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="success">completed</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(fr.actual_completion_date)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                        {fr.remarks ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {readyForQc.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No factory records currently ready for QC
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5 — Raw Material Requests */}
      {activeTab === 'Raw Material Requests' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Raw Material Requests ({MOCK_RAW_MATERIAL_REQUESTS.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">RMR Number</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Requested By</th>
                  <th className="px-4 py-3 text-left">Requested At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_RAW_MATERIAL_REQUESTS.map((rmr) => (
                  <tr key={rmr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{rmr.request_number}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {rmr.project?.project_code ?? rmr.project_id ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {rmr.request_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={rmrStatusVariant(rmr.status)}>
                        {rmr.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {rmr.requested_by_profile?.full_name ?? rmr.requested_by}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(rmr.requested_at)}
                    </td>
                  </tr>
                ))}
                {MOCK_RAW_MATERIAL_REQUESTS.length === 0 && (
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
      </div>
    </div>
  );
}
