import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  Package,
  Truck,
  FileText,
  Wrench,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '../lib/dataMode';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import {
  MOCK_DUBAI_FOLLOWUPS,
  MOCK_DUBAI_ETA_HISTORY,
  MOCK_AFS_ARRIVAL_REPORTS,
  MOCK_AFS_MISSING_ITEMS,
  MOCK_AFS_PREDELIVERY_REPORTS,
  MOCK_AFS_MAINTENANCE_REQUESTS,
} from '../data/mockAfs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function arrivalStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'arrived') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'partial') return 'info';
  return 'neutral';
}

function missingItemSeverityVariant(
  severity: string,
): 'success' | 'warning' | 'critical' | 'neutral' {
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'critical';
  if (severity === 'medium') return 'warning';
  return 'neutral';
}

function missingItemStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'resolved') return 'success';
  if (status === 'requested') return 'info';
  if (status === 'open') return 'warning';
  return 'neutral';
}

function maintenancePriorityVariant(
  priority: string,
): 'success' | 'warning' | 'critical' | 'neutral' {
  if (priority === 'critical') return 'critical';
  if (priority === 'high') return 'critical';
  if (priority === 'medium') return 'warning';
  return 'neutral';
}

function maintenanceStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'completed' || status === 'closed') return 'success';
  if (status === 'under_inspection') return 'info';
  if (status === 'parts_waiting') return 'warning';
  if (status === 'open') return 'critical';
  return 'neutral';
}

const TABS = [
  'Missing PN',
  'Delayed ETAs',
  'Arrival Reports',
  'Missing Items',
  'Pre-Delivery',
  'Maintenance',
] as const;

type Tab = typeof TABS[number];

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsAFS() {
  const [activeTab, setActiveTab] = useState<Tab>('Missing PN');

  // Live mode has no wired aggregation for this report — never render mock rows.
  const followups = mockOrEmpty(MOCK_DUBAI_FOLLOWUPS);
  const arrivalReports = mockOrEmpty(MOCK_AFS_ARRIVAL_REPORTS);
  const missingItems = mockOrEmpty(MOCK_AFS_MISSING_ITEMS);
  const predeliveryReports = mockOrEmpty(MOCK_AFS_PREDELIVERY_REPORTS);
  const maintenanceRequests = mockOrEmpty(MOCK_AFS_MAINTENANCE_REQUESTS);
  const missingPn = followups.filter((f) => !f.pn_reference_id);
  const delayedEtas = mockOrEmpty(MOCK_DUBAI_ETA_HISTORY);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dubai / AFS Reports"
        subtitle="PN gate, ETA tracking, arrival, pre-delivery, and maintenance status"
        breadcrumb={[{ label: 'Reports', path: '/reports' }, { label: 'Dubai / AFS' }]}
        action={<DataSourceBadge variant="preview" />}
      />

      {!isSupabaseConfigured && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-700">
          Dev mode — showing mock data
        </div>
      )}

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

      {/* Tab 1 — Missing PN */}
      {activeTab === 'Missing PN' && (
        <div className="space-y-4">
          {missingPn.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>{missingPn.length}</strong> project follow-up{missingPn.length !== 1 ? 's' : ''}{' '}
                missing a PN reference — Dubai PO cannot be issued until PN is confirmed.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-sm text-gray-700">
                Follow-ups Without PN ({missingPn.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Vehicle Line</th>
                    <th className="px-4 py-3 text-left">Dubai Status</th>
                    <th className="px-4 py-3 text-left">ETA Status</th>
                    <th className="px-4 py-3 text-left">Next Follow-up</th>
                    <th className="px-4 py-3 text-left">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {missingPn.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {f.project?.project_code ?? f.project_id}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {f.project?.customer_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {f.vehicle_line?.vehicle_type ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {f.dubai_status.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {f.eta_status?.replace(/_/g, ' ') ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(f.next_followup_date)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/dubai-afs/projects/${f.project_id}`}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {missingPn.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        All Dubai follow-ups have a PN reference
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2 — Delayed ETAs */}
      {activeTab === 'Delayed ETAs' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-sm text-gray-700">
              ETA Change History ({delayedEtas.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Old ETA</th>
                  <th className="px-4 py-3 text-left">New ETA</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                  <th className="px-4 py-3 text-left">Changed By</th>
                  <th className="px-4 py-3 text-left">Changed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {delayedEtas.map((h) => (
                  <tr key={h.id} className="hover:bg-amber-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {h.project?.project_code ?? h.project_id}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {h.project?.customer_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 line-through">
                      {formatDate(h.old_eta)}
                    </td>
                    <td className="px-4 py-3 font-medium text-amber-700">
                      {formatDate(h.new_eta)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {h.reason ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {h.changed_by_profile?.full_name ?? h.changed_by ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(h.changed_at)}</td>
                  </tr>
                ))}
                {delayedEtas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No ETA changes recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3 — Arrival Reports */}
      {activeTab === 'Arrival Reports' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Arrival Reports ({arrivalReports.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Report #</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Vehicle Type</th>
                  <th className="px-4 py-3 text-right">Received / Expected</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Arrival Date</th>
                  <th className="px-4 py-3 text-left">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {arrivalReports.map((ar) => (
                  <tr key={ar.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {ar.arrival_report_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ar.project?.project_code ?? ar.project_id}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ar.vehicle_line?.vehicle_type ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {ar.received_quantity} / {ar.expected_quantity}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={arrivalStatusVariant(ar.arrival_status)}>
                        {ar.arrival_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(ar.arrival_date)}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/dubai-afs/arrival-reports/${ar.id}`}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {arrivalReports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No arrival reports found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4 — Missing Items */}
      {activeTab === 'Missing Items' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Missing Items ({missingItems.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Item Code</th>
                  <th className="px-4 py-3 text-left">Item Name</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Received</th>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {missingItems.map((mi) => (
                  <tr key={mi.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {mi.item_code ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{mi.item_name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{mi.quantity_expected}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{mi.quantity_received}</td>
                    <td className="px-4 py-3">
                      <Badge variant={missingItemSeverityVariant(mi.severity)}>
                        {mi.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={missingItemStatusVariant(mi.missing_item_status)}>
                        {mi.missing_item_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {mi.notes ?? '—'}
                    </td>
                  </tr>
                ))}
                {missingItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No missing items recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 5 — Pre-Delivery */}
      {activeTab === 'Pre-Delivery' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Pre-Delivery Reports ({predeliveryReports.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Report #</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Chassis #</th>
                  <th className="px-4 py-3 text-left">Checklist</th>
                  <th className="px-4 py-3 text-right">Open Issues</th>
                  <th className="px-4 py-3 text-left">Ready for Delivery</th>
                  <th className="px-4 py-3 text-left">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {predeliveryReports.map((pdr) => (
                  <tr key={pdr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {pdr.predelivery_report_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {pdr.project?.project_code ?? pdr.project_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {pdr.chassis_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {pdr.checklist_items_passed} / {pdr.checklist_items_total} passed
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(pdr.open_missing_items ?? 0) + (pdr.open_ncrs ?? 0) > 0 ? (
                        <Badge variant="warning">
                          {(pdr.open_missing_items ?? 0) + (pdr.open_ncrs ?? 0)} blocking
                        </Badge>
                      ) : (
                        <Badge variant="success">none</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {pdr.ready_for_delivery ? (
                        <Badge variant="success">Yes</Badge>
                      ) : (
                        <Badge variant="critical">No</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/dubai-afs/predelivery-reports/${pdr.id}`}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {predeliveryReports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No pre-delivery reports found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 6 — Maintenance */}
      {activeTab === 'Maintenance' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Maintenance Requests ({maintenanceRequests.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Request #</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Chassis #</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Reported</th>
                  <th className="px-4 py-3 text-left">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {maintenanceRequests.map((mr) => (
                  <tr key={mr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {mr.maintenance_request_number}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{mr.title}</td>
                    <td className="px-4 py-3 text-gray-600">{mr.customer_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {mr.chassis_number ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={maintenancePriorityVariant(mr.priority)}>
                        {mr.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={maintenanceStatusVariant(mr.maintenance_status)}>
                        {mr.maintenance_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(mr.reported_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/after-sales/maintenance/${mr.id}`}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {maintenanceRequests.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No maintenance requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
