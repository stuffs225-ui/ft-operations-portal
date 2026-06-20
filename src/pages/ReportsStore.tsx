import { useState } from 'react';
import { Package, Truck, UserCheck, Inbox, Stethoscope, AlertCircle, Link as LinkIcon, Layers, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import type { PhotoType } from '../types';
import {
  MOCK_STORE_RECEIPTS as MOCK_STORE_RECEIPTS_RAW,
  MOCK_VEHICLE_RECEIPTS as MOCK_VEHICLE_RECEIPTS_RAW,
  MOCK_CUSTODY_RECORDS as MOCK_CUSTODY_RECORDS_RAW,
  MOCK_MEDICAL_SERIALS as MOCK_MEDICAL_SERIALS_RAW,
  MOCK_RECEIPT_ITEMS as MOCK_RECEIPT_ITEMS_RAW,
  MOCK_VEHICLE_PHOTOS,
} from '../data/mockStore';
import { mockOrEmpty } from '../lib/dataMode';

const MOCK_STORE_RECEIPTS = mockOrEmpty(MOCK_STORE_RECEIPTS_RAW);
const MOCK_VEHICLE_RECEIPTS = mockOrEmpty(MOCK_VEHICLE_RECEIPTS_RAW);
const MOCK_CUSTODY_RECORDS = mockOrEmpty(MOCK_CUSTODY_RECORDS_RAW);
const MOCK_MEDICAL_SERIALS = mockOrEmpty(MOCK_MEDICAL_SERIALS_RAW);
const MOCK_RECEIPT_ITEMS = Object.fromEntries(
  Object.entries(MOCK_RECEIPT_ITEMS_RAW).map(([k, v]) => [k, mockOrEmpty(v)])
);

const REQUIRED_PHOTOS: PhotoType[] = ['front', 'rear', 'left_side', 'right_side', 'chassis_plate'];

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
  if (status === 'damaged') return 'critical';
  if (status === 'draft') return 'neutral';
  return 'neutral';
}

function custodyStatusVariant(
  status: string,
): 'success' | 'warning' | 'critical' | 'neutral' | 'info' {
  if (status === 'in_custody') return 'info';
  if (status === 'pending_approval' || status === 'pending_acceptance') return 'warning';
  if (status === 'returned' || status === 'consumed_by_project') return 'success';
  if (status === 'lost_or_damaged') return 'critical';
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

function itemStatusVariant(status: string): 'success' | 'warning' | 'critical' | 'neutral' | 'info' | 'default' {
  if (status === 'in_store' || status === 'installed') return 'success';
  if (status === 'pending_qc') return 'warning';
  if (status === 'rejected_by_qc' || status === 'lost_or_damaged') return 'critical';
  if (status === 'received' || status === 'accepted_by_qc') return 'info';
  return 'neutral';
}

const TABS = [
  'Inventory Snapshot',
  'Material Receipts',
  'Vehicle Receipts',
  'Missing Photos',
  'Custody Pending Acceptance',
  'Custody Overdue',
  'Material Issuance',
  'Unallocated Materials',
  'Medical Serials',
] as const;

type Tab = typeof TABS[number];

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsStore() {
  const [activeTab, setActiveTab] = useState<Tab>('Inventory Snapshot');

  const allItems = Object.values(MOCK_RECEIPT_ITEMS).flat();

  const materialReceipts = MOCK_STORE_RECEIPTS.filter(
    (r) => r.receipt_type === 'material' || r.receipt_type === 'mixed',
  );

  // Custody records awaiting receiver acceptance after being issued
  const custodyPendingAcceptance = MOCK_CUSTODY_RECORDS.filter(
    (c) => c.receiver_decision === 'pending' && (c.status === 'issued' || c.status === 'pending_acceptance'),
  );

  // Custody records where approval is still pending (blocked before issuance)
  const custodyPendingApproval = MOCK_CUSTODY_RECORDS.filter(
    (c) => c.approval_status === 'pending_approval',
  );

  const custodyOverdue = custodyPendingAcceptance; // same set: issued but not yet accepted

  // Issued/in-custody records for issuance report
  const issuedRecords = MOCK_CUSTODY_RECORDS.filter(
    (c) => c.status === 'issued' || c.status === 'in_custody' || c.status === 'pending_acceptance',
  );

  // Unallocated: receipt items with no project assigned
  const unallocatedItems = allItems.filter((item) => !item.project_id);

  // Vehicles missing one or more required photos
  const vehiclesMissingPhotos = MOCK_VEHICLE_RECEIPTS.filter(v => {
    const photos = MOCK_VEHICLE_PHOTOS[v.id] ?? [];
    const presentTypes = photos.filter(p => p.storage_path).map(p => p.photo_type);
    return REQUIRED_PHOTOS.some(t => !presentTypes.includes(t));
  });

  // Inventory by status
  const inventoryByStatus = [
    { status: 'in_store', label: 'In Store', color: 'border-l-emerald-400' },
    { status: 'issued', label: 'Issued', color: 'border-l-sky-400' },
    { status: 'in_custody', label: 'In Custody', color: 'border-l-cyan-400' },
    { status: 'pending_qc', label: 'Pending QC', color: 'border-l-amber-400' },
    { status: 'rejected_by_qc', label: 'QC Rejected', color: 'border-l-red-500' },
    { status: 'installed', label: 'Installed', color: 'border-l-purple-400' },
    { status: 'returned', label: 'Returned', color: 'border-l-gray-400' },
  ].map(s => ({ ...s, count: allItems.filter(i => i.status === s.status).length }));

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Store Reports"
        subtitle="Inventory, receipts, vehicle receiving, custody, and serial tracking"
        breadcrumb={[{ label: 'Reports', href: '/reports' }, { label: 'Store' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab
                ? 'border-cyan-600 text-cyan-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1 — Inventory Snapshot */}
      {activeTab === 'Inventory Snapshot' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {inventoryByStatus.map(s => (
              <div key={s.status} className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 ${s.color}`}>
                <div className="text-2xl font-bold text-gray-900">{s.count}</div>
                <div className="text-sm text-gray-600 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              <span className="font-semibold text-sm text-gray-700">
                All Inventory Items ({allItems.length})
              </span>
              <Link to="/store/inventory" className="ml-auto text-xs text-cyan-600 hover:underline">
                Full Inventory →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Serial?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allItems.slice(0, 20).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.item_name}
                        {item.item_code && <span className="ml-1 text-xs text-gray-400 font-mono">({item.item_code})</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.material_category}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.quantity_received} {item.unit}</td>
                      <td className="px-4 py-3">
                        <Badge variant={itemStatusVariant(item.status)}>{item.status.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {item.serial_required
                          ? <Badge variant="warning">Yes</Badge>
                          : <span className="text-gray-400 text-xs">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {allItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        No inventory items yet — receive material to start tracking.
                      </td>
                    </tr>
                  )}
                  {allItems.length > 20 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-center text-xs text-gray-400">
                        Showing first 20 of {allItems.length} items —{' '}
                        <Link to="/store/inventory" className="text-cyan-600 hover:underline">view all in Inventory</Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2 — Material Receipts */}
      {activeTab === 'Material Receipts' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Material Receipts ({materialReceipts.length})
            </span>
            <Link to="/store/receipts" className="ml-auto text-xs text-cyan-600 hover:underline">
              View all →
            </Link>
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
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link to={`/store/receipts/${r.id}`} className="text-cyan-700 hover:underline font-mono">
                        {r.receipt_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.project?.project_code ?? '—'}</td>
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
                      No material receipts — receive material to start tracking.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3 — Vehicle Receipts */}
      {activeTab === 'Vehicle Receipts' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Vehicle Receipts ({MOCK_VEHICLE_RECEIPTS.length})
            </span>
            <Link to="/store/vehicle-receiving" className="ml-auto text-xs text-cyan-600 hover:underline">
              View all →
            </Link>
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
                      <Link to={`/store/vehicle-receiving/${vr.id}`} className="text-cyan-700 hover:underline">
                        {vr.chassis_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{vr.vehicle_type}</td>
                    <td className="px-4 py-3 text-gray-600">{vr.project?.project_code ?? '—'}</td>
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
                      No vehicle receipts — register an incoming vehicle to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4 — Missing Photos */}
      {activeTab === 'Missing Photos' && (
        <div className="space-y-4">
          {vehiclesMissingPhotos.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong>{vehiclesMissingPhotos.length}</strong> vehicle receipt{vehiclesMissingPhotos.length !== 1 ? 's' : ''} missing required photos —
                vehicles cannot be accepted until all 5 photos are uploaded.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-sm text-gray-700">
                Vehicles Missing Required Photos ({vehiclesMissingPhotos.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Chassis #</th>
                    <th className="px-4 py-3 text-left">Vehicle Type</th>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Missing Photos</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehiclesMissingPhotos.map(vr => {
                    const photos = MOCK_VEHICLE_PHOTOS[vr.id] ?? [];
                    const presentTypes = photos.filter(p => p.storage_path).map(p => p.photo_type);
                    const missing = REQUIRED_PHOTOS.filter(t => !presentTypes.includes(t));
                    return (
                      <tr key={vr.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs font-medium text-red-700">
                          {vr.chassis_number}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{vr.vehicle_type}</td>
                        <td className="px-4 py-3 text-gray-600">{vr.project?.project_code ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {missing.map(t => (
                              <span key={t} className="text-[10px] bg-red-100 text-red-700 rounded px-1.5 py-0.5 font-medium">
                                {t.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="warning">{vr.status.replace(/_/g, ' ')}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/store/vehicle-receiving/${vr.id}`}
                            className="text-xs text-cyan-600 hover:underline flex items-center gap-1"
                          >
                            <LinkIcon size={12} /> Upload Photos
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {vehiclesMissingPhotos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        All vehicles have complete photo documentation.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5 — Custody Pending Acceptance */}
      {activeTab === 'Custody Pending Acceptance' && (
        <div className="space-y-4">
          {custodyPendingApproval.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong>{custodyPendingApproval.length}</strong> custody record{custodyPendingApproval.length !== 1 ? 's' : ''} pending Admin or Operations Manager approval before issuance.
              </span>
            </div>
          )}
          {custodyPendingAcceptance.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>
                <strong>{custodyPendingAcceptance.length}</strong> issued record{custodyPendingAcceptance.length !== 1 ? 's' : ''} awaiting receiver acceptance.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-sm text-gray-700">
                All Custody Records ({MOCK_CUSTODY_RECORDS.length})
              </span>
              <Link to="/custody" className="ml-auto text-xs text-cyan-600 hover:underline">
                View all →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Custody #</th>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Issue Type</th>
                    <th className="px-4 py-3 text-left">Approval</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MOCK_CUSTODY_RECORDS.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link to={`/custody/${c.id}`} className="text-cyan-700 hover:underline font-mono">
                          {c.custody_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.project?.project_code ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.item?.item_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{c.issue_type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        {c.approval_required
                          ? <Badge variant={c.approval_status === 'approved' ? 'success' : c.approval_status === 'pending_approval' ? 'warning' : 'neutral'}>
                              {c.approval_status.replace(/_/g, ' ')}
                            </Badge>
                          : <span className="text-gray-400 text-xs">Not required</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={custodyStatusVariant(c.status)}>
                          {c.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {MOCK_CUSTODY_RECORDS.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No custody records — issue material custody to start tracking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 6 — Custody Overdue */}
      {activeTab === 'Custody Overdue' && (
        <div className="space-y-4">
          {custodyOverdue.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong>{custodyOverdue.length}</strong> issued record{custodyOverdue.length !== 1 ? 's' : ''} awaiting receiver acceptance.
                These materials have been issued but the recipient has not accepted or rejected them yet.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-sm text-gray-700">
                Issued — Awaiting Acceptance ({custodyOverdue.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Custody #</th>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-left">Issued To</th>
                    <th className="px-4 py-3 text-left">Issued At</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {custodyOverdue.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/custody/${c.id}`} className="font-mono text-cyan-700 hover:underline">
                          {c.custody_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.project?.project_code ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.item?.item_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {c.issued_to_role?.replace(/_/g, ' ') ?? c.issued_to_department ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-amber-700 font-medium">{formatDate(c.issued_at)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="warning">{c.status.replace(/_/g, ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                  {custodyOverdue.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No pending acceptances — all issued materials have been accepted or returned.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 7 — Material Issuance */}
      {activeTab === 'Material Issuance' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-cyan-500" />
            <span className="font-semibold text-sm text-gray-700">
              Issued / In Custody ({issuedRecords.length})
            </span>
            <Link to="/store/issuance" className="ml-auto text-xs text-cyan-600 hover:underline">
              Full Issuance View →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Custody #</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Issue Type</th>
                  <th className="px-4 py-3 text-left">Issued To</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {issuedRecords.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/custody/${c.id}`} className="font-mono text-cyan-700 hover:underline">
                        {c.custody_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.project?.project_code ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.item?.item_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.issue_type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.issued_to_role?.replace(/_/g, ' ') ?? c.issued_to_department ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={custodyStatusVariant(c.status)}>
                        {c.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {issuedRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No issued materials — issue material custody to begin tracking.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 8 — Unallocated Materials */}
      {activeTab === 'Unallocated Materials' && (
        <div className="space-y-4">
          {unallocatedItems.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
              <Inbox className="w-4 h-4 shrink-0" />
              <span>
                <strong>{unallocatedItems.length}</strong> item{unallocatedItems.length !== 1 ? 's' : ''} in store with no project assignment —{' '}
                <Link to="/store/unallocated" className="underline">assign items</Link> before issuance.
              </span>
            </div>
          )}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-sm text-gray-700">
                Unallocated Items ({unallocatedItems.length})
              </span>
              <Link to="/store/unallocated" className="ml-auto text-xs text-cyan-600 hover:underline">
                Manage →
              </Link>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unallocatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{item.item_code ?? '—'}</td>
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
                    </tr>
                  ))}
                  {unallocatedItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        No unallocated materials — all received items are linked to projects.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 9 — Medical Serials */}
      {activeTab === 'Medical Serials' && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">
              Medical Serial Numbers ({MOCK_MEDICAL_SERIALS.length})
            </span>
            <Link to="/store/serials" className="ml-auto text-xs text-cyan-600 hover:underline">
              Full Serial Register →
            </Link>
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
                      No medical serial numbers registered — register serials from Material Receiving.
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
