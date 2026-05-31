import { useState } from 'react';
import { Package, Truck, UserCheck, Inbox, Stethoscope } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  MOCK_STORE_RECEIPTS,
  MOCK_VEHICLE_RECEIPTS,
  MOCK_CUSTODY_RECORDS,
  MOCK_MEDICAL_SERIALS,
  MOCK_RECEIPT_ITEMS,
} from '../data/mockStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function receiptStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'accepted') return 'success';
  if (status === 'partially_received') return 'info';
  if (status === 'pending_material_qc') return 'warning';
  if (status === 'draft') return 'neutral';
  if (status === 'rejected') return 'critical';
  return 'neutral';
}

function vehicleStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'accepted') return 'success';
  if (status === 'pending_condition_review') return 'warning';
  if (status === 'received') return 'info';
  if (status === 'draft') return 'neutral';
  return 'neutral';
}

function custodyStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'in_custody') return 'info';
  if (status === 'pending_approval') return 'warning';
  if (status === 'returned') return 'success';
  if (status === 'rejected') return 'critical';
  return 'neutral';
}

function qcStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' {
  if (status === 'passed') return 'success';
  if (status === 'pending_qc' || status === 'not_checked') return 'warning';
  if (status === 'failed') return 'critical';
  return 'neutral';
}

const TABS = [
  'Material Receipts',
  'Vehicle Receipts',
  'Custody Pending',
  'Unallocated Materials',
  'Medical Serials',
] as const;

type Tab = typeof TABS[number];

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsStore() {
  const [activeTab, setActiveTab] = useState<Tab>('Material Receipts');

  const materialReceipts = MOCK_STORE_RECEIPTS.filter(
    (r) => r.receipt_type === 'material' || r.receipt_type === 'mixed',
  );

  const custodyPending = MOCK_CUSTODY_RECORDS.filter(
    (c) => c.status === 'pending_approval',
  );

  // Unallocated: receipt items with no project assigned
  const unallocatedItems = Object.values(MOCK_RECEIPT_ITEMS)
    .flat()
    .filter((item) => !item.project_id);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Store Reports"
        subtitle="Material receipts, vehicle receiving, custody, and serial tracking"
        breadcrumb={[{ label: 'Reports', path: '/reports' }, { label: 'Store' }]}
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

      {/* Tab 1 — Material Receipts */}
      {activeTab === 'Material Receipts' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Material Receipts ({materialReceipts.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Receipt #</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Delivery Note</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Received Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materialReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.receipt_number}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.project?.project_code ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.supplier_name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.delivery_note_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={receiptStatusVariant(r.status)}>
                        {r.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(r.received_date)}</td>
                  </tr>
                ))}
                {materialReceipts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No material receipts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2 — Vehicle Receipts */}
      {activeTab === 'Vehicle Receipts' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Vehicle Receipts ({MOCK_VEHICLE_RECEIPTS.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Chassis #</th>
                  <th className="px-4 py-3 text-left">Vehicle Type</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Condition</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Received Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_VEHICLE_RECEIPTS.map((vr) => (
                  <tr key={vr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 font-mono text-xs">
                      {vr.chassis_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{vr.vehicle_type}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {vr.project?.project_code ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {vr.condition_status?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={vehicleStatusVariant(vr.status)}>
                        {vr.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(vr.received_date)}</td>
                  </tr>
                ))}
                {MOCK_VEHICLE_RECEIPTS.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No vehicle receipts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3 — Custody Pending */}
      {activeTab === 'Custody Pending' && (
        <div className="space-y-4">
          {custodyPending.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>
                <strong>{custodyPending.length}</strong> custody record{custodyPending.length !== 1 ? 's' : ''} pending approval before issuance.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-sm text-gray-700">
                All Custody Records ({MOCK_CUSTODY_RECORDS.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Custody #</th>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Issue Type</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Issued At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MOCK_CUSTODY_RECORDS.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.custody_number}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.project?.project_code ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.item?.item_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {c.issue_type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={custodyStatusVariant(c.status)}>
                          {c.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(c.issued_at)}</td>
                    </tr>
                  ))}
                  {MOCK_CUSTODY_RECORDS.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No custody records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 4 — Unallocated Materials */}
      {activeTab === 'Unallocated Materials' && (
        <div className="space-y-4">
          {unallocatedItems.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
              <Inbox className="w-4 h-4 shrink-0" />
              <span>
                <strong>{unallocatedItems.length}</strong> item{unallocatedItems.length !== 1 ? 's' : ''} in store with no project assignment — requires ops manager attention.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-sm text-gray-700">
                Unallocated Items ({unallocatedItems.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Item Code</th>
                    <th className="px-4 py-3 text-left">Item Name</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-right">Qty Received</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unallocatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{item.item_code}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.item_name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {item.material_category?.replace(/_/g, ' ') ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {item.quantity_received} {item.unit}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="warning">{item.status.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                        {item.remarks ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {unallocatedItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No unallocated materials found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5 — Medical Serials */}
      {activeTab === 'Medical Serials' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Medical Serial Numbers ({MOCK_MEDICAL_SERIALS.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Serial #</th>
                  <th className="px-4 py-3 text-left">Manufacturer</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">QC Status</th>
                  <th className="px-4 py-3 text-left">Current Status</th>
                  <th className="px-4 py-3 text-left">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MOCK_MEDICAL_SERIALS.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {s.serial_number}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.manufacturer ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.supplier_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={qcStatusVariant(s.qc_status)}>
                        {s.qc_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {s.current_status.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(s.expiry_date)}</td>
                  </tr>
                ))}
                {MOCK_MEDICAL_SERIALS.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No medical serial numbers registered
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
