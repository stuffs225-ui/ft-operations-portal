import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Package, Truck, FileText, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '../lib/dataMode';
import {
  MOCK_DUBAI_FOLLOWUPS,
  MOCK_DUBAI_ETA_HISTORY,
  MOCK_AFS_ARRIVAL_REPORTS,
  MOCK_AFS_MISSING_ITEMS,
  MOCK_AFS_PREDELIVERY_REPORTS,
  MOCK_AFS_MAINTENANCE_REQUESTS,
} from '../data/mockAfs';
import type {
  DubaiProjectFollowup,
  DubaiEtaHistory,
  AfsArrivalReport,
  AfsMissingItem,
  AfsPredeliveryReport,
  AfsMaintenanceRequest,
} from '../types';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function arrivalStatusVariant(s: string): 'success' | 'warning' | 'neutral' | 'info' | 'critical' | 'default' {
  if (s === 'arrived') return 'success';
  if (s === 'pending') return 'warning';
  if (s === 'partially_arrived') return 'info';
  return 'neutral';
}

function severityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'critical' || s === 'high') return 'critical';
  if (s === 'medium') return 'warning';
  return 'neutral';
}

function missingStatusVariant(s: string): 'neutral' | 'warning' | 'success' | 'info' | 'critical' | 'default' {
  if (s === 'received' || s === 'waived') return 'success';
  if (s === 'requested') return 'info';
  if (s === 'open') return 'warning';
  return 'neutral';
}

function priorityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'critical' || s === 'high') return 'critical';
  if (s === 'medium') return 'warning';
  return 'neutral';
}

function maintenanceStatusVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'completed' || s === 'closed') return 'success';
  if (s === 'under_inspection') return 'info';
  if (s === 'parts_waiting' || s === 'in_repair') return 'warning';
  if (s === 'open' || s === 'assigned') return 'critical';
  return 'neutral';
}

interface LiveData {
  followups: DubaiProjectFollowup[];
  etaHistory: DubaiEtaHistory[];
  arrivals: AfsArrivalReport[];
  missingItems: AfsMissingItem[];
  predelivery: AfsPredeliveryReport[];
  maintenance: AfsMaintenanceRequest[];
}

const TABS = ['Missing PN', 'Delayed ETAs', 'Arrival Reports', 'Missing Items', 'Pre-Delivery', 'Maintenance'] as const;
type Tab = typeof TABS[number];

export function ReportsAFS() {
  const [activeTab, setActiveTab] = useState<Tab>('Missing PN');
  const [live, setLive] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }
      const [fu, eta, arr, mis, pre, maint] = await Promise.all([
        supabase.from('dubai_project_followups')
          .select('*, project:projects(project_code, customer_name, manufacturing_location), vehicle_line:project_vehicle_lines(vehicle_type)')
          .order('created_at', { ascending: false }).limit(200),
        supabase.from('dubai_eta_history')
          .select('*, project:projects(project_code, customer_name), changed_by_profile:profiles(full_name)')
          .order('changed_at', { ascending: false }).limit(200),
        supabase.from('afs_arrival_reports')
          .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type)')
          .order('arrival_date', { ascending: false }).limit(200),
        supabase.from('afs_missing_items')
          .select('*')
          .order('created_at', { ascending: false }).limit(200),
        supabase.from('afs_predelivery_reports')
          .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type)')
          .order('report_date', { ascending: false }).limit(200),
        supabase.from('afs_maintenance_requests')
          .select('*, project:projects(project_code, customer_name)')
          .order('reported_date', { ascending: false }).limit(200),
      ]);
      setLive({
        followups: (fu.data as unknown as DubaiProjectFollowup[]) ?? [],
        etaHistory: (eta.data as unknown as DubaiEtaHistory[]) ?? [],
        arrivals: (arr.data as unknown as AfsArrivalReport[]) ?? [],
        missingItems: (mis.data as unknown as AfsMissingItem[]) ?? [],
        predelivery: (pre.data as unknown as AfsPredeliveryReport[]) ?? [],
        maintenance: (maint.data as unknown as AfsMaintenanceRequest[]) ?? [],
      });
      setLoading(false);
    })();
  }, []);

  const followups = live?.followups ?? (mockOrEmpty(MOCK_DUBAI_FOLLOWUPS) as unknown as DubaiProjectFollowup[]);
  const etaHistory = live?.etaHistory ?? (mockOrEmpty(MOCK_DUBAI_ETA_HISTORY) as unknown as DubaiEtaHistory[]);
  const arrivals = live?.arrivals ?? (mockOrEmpty(MOCK_AFS_ARRIVAL_REPORTS) as unknown as AfsArrivalReport[]);
  const missingItems = live?.missingItems ?? (mockOrEmpty(MOCK_AFS_MISSING_ITEMS) as unknown as AfsMissingItem[]);
  const predelivery = live?.predelivery ?? (mockOrEmpty(MOCK_AFS_PREDELIVERY_REPORTS) as unknown as AfsPredeliveryReport[]);
  const maintenance = live?.maintenance ?? (mockOrEmpty(MOCK_AFS_MAINTENANCE_REQUESTS) as unknown as AfsMaintenanceRequest[]);

  const missingPn = followups.filter(f => !f.pn_reference_id);
  const delayedEtas = etaHistory;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dubai / AFS Reports"
        subtitle="PN gate, ETA tracking, arrivals, missing items, pre-delivery readiness, and after-sales maintenance"
        breadcrumb={[{ label: 'Reports', href: '/reports' }, { label: 'Dubai / AFS' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-sky-600 text-sky-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-10 text-center text-sm text-gray-400">Loading report data…</div>
      )}

      {!loading && activeTab === 'Missing PN' && (
        <div className="space-y-4">
          {missingPn.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span><strong>{missingPn.length}</strong> follow-up{missingPn.length !== 1 ? 's' : ''} missing PN — Dubai progress is blocked until PN is confirmed.</span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              <span className="font-semibold text-sm text-gray-700">Follow-ups Without PN ({missingPn.length})</span>
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
                  {missingPn.map(f => (
                    <tr key={f.id} className="hover:bg-red-50/30">
                      <td className="px-4 py-3 font-mono text-sm font-medium text-sky-700">{f.project?.project_code ?? f.project_id}</td>
                      <td className="px-4 py-3 text-gray-600">{f.project?.customer_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{f.vehicle_line?.vehicle_type ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{f.dubai_status.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{f.eta_status?.replace(/_/g, ' ') ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(f.next_followup_date)}</td>
                      <td className="px-4 py-3">
                        <Link to={`/dubai-afs/projects/${f.id}`} className="text-xs text-sky-600 hover:underline">View</Link>
                      </td>
                    </tr>
                  ))}
                  {missingPn.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">All follow-ups have a PN reference.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {!loading && activeTab === 'Delayed ETAs' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Clock size={14} className="text-amber-500" />
            <span className="font-semibold text-sm text-gray-700">ETA Change History ({delayedEtas.length})</span>
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
                {delayedEtas.map(h => (
                  <tr key={h.id} className="hover:bg-amber-50">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-sky-700">{h.project?.project_code ?? h.project_id}</td>
                    <td className="px-4 py-3 text-gray-600">{h.project?.customer_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 line-through text-xs">{formatDate(h.old_eta)}</td>
                    <td className="px-4 py-3 font-medium text-amber-700 text-xs">{formatDate(h.new_eta)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate text-xs">{h.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{h.changed_by_profile?.full_name ?? h.changed_by ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(h.changed_at)}</td>
                  </tr>
                ))}
                {delayedEtas.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No ETA changes recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && activeTab === 'Arrival Reports' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Truck size={14} className="text-sky-500" />
            <span className="font-semibold text-sm text-gray-700">Arrival Reports ({arrivals.length})</span>
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
                {arrivals.map(ar => (
                  <tr key={ar.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{ar.arrival_report_number}</td>
                    <td className="px-4 py-3 font-mono text-xs text-sky-700">{ar.project?.project_code ?? ar.project_id}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{ar.vehicle_line?.vehicle_type ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600 text-xs">{ar.received_quantity} / {ar.expected_quantity}</td>
                    <td className="px-4 py-3">
                      <Badge variant={arrivalStatusVariant(ar.arrival_status)}>{ar.arrival_status.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(ar.arrival_date)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/dubai-afs/arrival-reports/${ar.id}`} className="text-xs text-sky-600 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
                {arrivals.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No arrival reports found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && activeTab === 'Missing Items' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Package size={14} className="text-orange-500" />
            <span className="font-semibold text-sm text-gray-700">Missing Items ({missingItems.length})</span>
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
                {missingItems.map(mi => (
                  <tr key={mi.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{mi.item_code ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{mi.item_name}</td>
                    <td className="px-4 py-3 text-right text-gray-600 text-xs">{mi.quantity_expected}</td>
                    <td className="px-4 py-3 text-right text-gray-600 text-xs">{mi.quantity_received}</td>
                    <td className="px-4 py-3"><Badge variant={severityVariant(mi.severity)}>{mi.severity}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={missingStatusVariant(mi.missing_item_status)}>{mi.missing_item_status.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate text-xs">{mi.notes ?? '—'}</td>
                  </tr>
                ))}
                {missingItems.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No missing items recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && activeTab === 'Pre-Delivery' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <FileText size={14} className="text-sky-500" />
            <span className="font-semibold text-sm text-gray-700">Pre-Delivery Reports ({predelivery.length})</span>
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
                  <th className="px-4 py-3 text-left">Ready</th>
                  <th className="px-4 py-3 text-left">Release Note</th>
                  <th className="px-4 py-3 text-left">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {predelivery.map(pdr => (
                  <tr key={pdr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{pdr.predelivery_report_number}</td>
                    <td className="px-4 py-3 font-mono text-xs text-sky-700">{pdr.project?.project_code ?? pdr.project_id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{pdr.chassis_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{pdr.checklist_items_passed} / {pdr.checklist_items_total}</td>
                    <td className="px-4 py-3 text-right">
                      {(pdr.open_missing_items ?? 0) + (pdr.open_ncrs ?? 0) > 0
                        ? <Badge variant="warning">{(pdr.open_missing_items ?? 0) + (pdr.open_ncrs ?? 0)} blocking</Badge>
                        : <Badge variant="success">None</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={pdr.ready_for_delivery ? 'success' : 'critical'}>{pdr.ready_for_delivery ? 'Yes' : 'No'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={pdr.release_note_issued ? 'success' : 'warning'}>{pdr.release_note_issued ? 'Issued' : 'Pending'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/dubai-afs/predelivery-reports/${pdr.id}`} className="text-xs text-sky-600 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
                {predelivery.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No pre-delivery reports found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && activeTab === 'Maintenance' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Wrench size={14} className="text-purple-500" />
            <span className="font-semibold text-sm text-gray-700">Maintenance Requests ({maintenance.length})</span>
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
                {maintenance.map(mr => (
                  <tr key={mr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{mr.maintenance_request_number}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate text-xs">{mr.title}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{mr.customer_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{mr.chassis_number ?? '—'}</td>
                    <td className="px-4 py-3"><Badge variant={priorityVariant(mr.priority)}>{mr.priority}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={maintenanceStatusVariant(mr.maintenance_status)}>{mr.maintenance_status.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(mr.reported_date)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/after-sales/maintenance/${mr.id}`} className="text-xs text-sky-600 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
                {maintenance.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No maintenance requests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
