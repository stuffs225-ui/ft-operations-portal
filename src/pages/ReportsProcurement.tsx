import { useState } from 'react';
import { FileText, Clock, AlertTriangle, TrendingDown, Star } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  MOCK_PROCUREMENT_REQUESTS,
  MOCK_PURCHASE_ORDERS,
} from '../data/mockProcurement';
import { MOCK_SUPPLIER_SCORECARDS } from '../data/mockReports';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusVariant(status: string): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'completed' || status === 'approved') return 'success';
  if (status === 'in_progress' || status === 'partially_ordered') return 'info';
  if (status === 'pr_received' || status === 'draft') return 'neutral';
  if (status === 'pending') return 'warning';
  if (status === 'cancelled') return 'critical';
  return 'neutral';
}

function approvalVariant(s: string): 'warning' | 'success' | 'critical' | 'neutral' {
  if (s === 'pending') return 'warning';
  if (s === 'approved') return 'success';
  if (s === 'rejected') return 'critical';
  return 'neutral';
}

function scoreBandVariant(score: number): 'success' | 'warning' | 'critical' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'critical';
}

const TABS = [
  'Open PRs',
  'PR Items Without PO',
  'PO Pending Approval',
  'PO Without ETA',
  'Delayed ETAs',
  'Supplier Status',
] as const;

type Tab = typeof TABS[number];

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsProcurement() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Open PRs');

  const canSeeCost = role && ['admin', 'operations_manager', 'procurement_user'].includes(role);

  // Derived data
  const openPRs = MOCK_PROCUREMENT_REQUESTS.filter(
    (pr) => !['completed', 'cancelled'].includes(pr.status),
  );

  const prWithoutPO = MOCK_PROCUREMENT_REQUESTS.filter(
    (pr) => pr.status === 'pr_received' || pr.status === 'in_progress',
  );

  const poPendingApproval = MOCK_PURCHASE_ORDERS.filter(
    (po) => po.approval_status === 'pending',
  );

  const poWithoutEta = MOCK_PURCHASE_ORDERS.filter(
    (po) => !po.eta_date,
  );

  const now = new Date();
  const delayedETAs = MOCK_PURCHASE_ORDERS.filter(
    (po) => po.eta_date && new Date(po.eta_date) < now,
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Procurement Reports"
        subtitle="PR pipeline, PO status, ETA coverage, and supplier performance"
        breadcrumb={[{ label: 'Reports', path: '/reports' }, { label: 'Procurement' }]}
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

      {/* Tab 1 — Open PRs */}
      {activeTab === 'Open PRs' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Open Purchase Requests ({openPRs.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">PR Number</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {openPRs.map((pr) => (
                  <tr key={pr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{pr.pr_number}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {pr.project?.project_code ?? pr.project_id}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(pr.status)}>
                        {pr.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{pr.source_department ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(pr.created_at)}</td>
                  </tr>
                ))}
                {openPRs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No open purchase requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2 — PR Items Without PO */}
      {activeTab === 'PR Items Without PO' && (
        <div className="space-y-4">
          {prWithoutPO.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>{prWithoutPO.length}</strong> PR{prWithoutPO.length !== 1 ? 's' : ''}{' '}
                approved / submitted but without a PO to supplier.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-sm text-gray-700">
                PRs Awaiting PO ({prWithoutPO.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">PR Number</th>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    {canSeeCost && (
                      <th className="px-4 py-3 text-right">Est. Value</th>
                    )}
                    <th className="px-4 py-3 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prWithoutPO.map((pr) => (
                    <tr key={pr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{pr.pr_number}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {pr.project?.project_code ?? pr.project_id}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(pr.status)}>
                          {pr.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      {canSeeCost && (
                        <td className="px-4 py-3 text-right text-gray-500">—</td>
                      )}
                      <td className="px-4 py-3 text-gray-500">{formatDate(pr.created_at)}</td>
                    </tr>
                  ))}
                  {prWithoutPO.length === 0 && (
                    <tr>
                      <td colSpan={canSeeCost ? 5 : 4} className="px-4 py-8 text-center text-gray-400">
                        No PRs awaiting PO
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3 — PO Pending Approval */}
      {activeTab === 'PO Pending Approval' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-sm text-gray-700">
              POs Pending Approval ({poPendingApproval.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">PO Number</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  {canSeeCost && (
                    <th className="px-4 py-3 text-right">Value</th>
                  )}
                  <th className="px-4 py-3 text-left">Approval</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {poPendingApproval.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{po.po_number}</td>
                    <td className="px-4 py-3 text-gray-600">{po.supplier_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {po.project?.project_code ?? po.project_id}
                    </td>
                    {canSeeCost && (
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        {po.purchase_value.toLocaleString()} {po.currency}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Badge variant={approvalVariant(po.approval_status)}>
                        {po.approval_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(po.created_at)}</td>
                  </tr>
                ))}
                {poPendingApproval.length === 0 && (
                  <tr>
                    <td colSpan={canSeeCost ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                      No POs pending approval
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4 — PO Without ETA */}
      {activeTab === 'PO Without ETA' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-sm text-gray-700">
              POs Without Confirmed ETA ({poWithoutEta.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">PO Number</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">PO Status</th>
                  {canSeeCost && (
                    <th className="px-4 py-3 text-right">Value</th>
                  )}
                  <th className="px-4 py-3 text-left">PO Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {poWithoutEta.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{po.po_number}</td>
                    <td className="px-4 py-3 text-gray-600">{po.supplier_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {po.project?.project_code ?? po.project_id}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">
                        {po.po_status?.replace(/_/g, ' ') ?? '—'}
                      </Badge>
                    </td>
                    {canSeeCost && (
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        {po.purchase_value.toLocaleString()} {po.currency}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-500">{formatDate(po.po_date)}</td>
                  </tr>
                ))}
                {poWithoutEta.length === 0 && (
                  <tr>
                    <td colSpan={canSeeCost ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                      All POs have ETAs confirmed
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 5 — Delayed ETAs */}
      {activeTab === 'Delayed ETAs' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="font-semibold text-sm text-gray-700">
              Delayed ETAs — Past Due ({delayedETAs.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">PO Number</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">ETA</th>
                  {canSeeCost && (
                    <th className="px-4 py-3 text-right">Value</th>
                  )}
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {delayedETAs.map((po) => (
                  <tr key={po.id} className="hover:bg-red-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{po.po_number}</td>
                    <td className="px-4 py-3 text-gray-600">{po.supplier_name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {po.project?.project_code ?? po.project_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-red-600 font-medium">{formatDate(po.eta_date)}</span>
                      <Badge variant="critical" className="ml-2">Overdue</Badge>
                    </td>
                    {canSeeCost && (
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        {po.purchase_value.toLocaleString()} {po.currency}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Badge variant="neutral">
                        {po.po_status?.replace(/_/g, ' ') ?? '—'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {delayedETAs.length === 0 && (
                  <tr>
                    <td colSpan={canSeeCost ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                      No delayed ETAs
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 6 — Supplier Status */}
      {activeTab === 'Supplier Status' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Star className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Supplier Scorecards ({MOCK_SUPPLIER_SCORECARDS.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Quality</th>
                  <th className="px-4 py-3 text-right">Delivery</th>
                  <th className="px-4 py-3 text-right">NCRs</th>
                  <th className="px-4 py-3 text-right">Delayed POs</th>
                  <th className="px-4 py-3 text-left">Band</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_SUPPLIER_SCORECARDS.map((sc) => (
                  <tr key={sc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{sc.supplier_name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{sc.score}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{sc.quality_score}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{sc.delivery_score}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{sc.ncr_count}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{sc.delayed_po_count}</td>
                    <td className="px-4 py-3">
                      <Badge variant={scoreBandVariant(sc.score)}>
                        {sc.score >= 80 ? 'Good' : sc.score >= 60 ? 'Watch' : 'At Risk'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
