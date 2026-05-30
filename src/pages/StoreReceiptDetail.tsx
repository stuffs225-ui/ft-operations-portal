import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, ArrowLeft, Tag } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { MOCK_STORE_RECEIPTS, MOCK_MEDICAL_SERIALS, getMockReceiptItems } from '../data/mockStore';
import type { ReceiptStatus, ItemStatus, UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

const RECEIPT_STATUS_VARIANT: Record<ReceiptStatus, 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default'> = {
  draft: 'neutral', received: 'info', partially_received: 'warning',
  pending_material_qc: 'warning', accepted: 'success', rejected: 'critical', closed: 'neutral',
};

const ITEM_STATUS_VARIANT: Record<ItemStatus, 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default'> = {
  received: 'info', pending_qc: 'warning', accepted_by_qc: 'success', rejected_by_qc: 'critical',
  in_store: 'success', issued: 'default', in_custody: 'default', installed: 'success',
  returned: 'neutral', consumed: 'neutral', lost_or_damaged: 'critical',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CAN_ACT: UserRole[] = ['admin', 'operations_manager', 'store_user'];

export function StoreReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const [tab, setTab] = useState<'items' | 'serials'>('items');
  const [devMsg, setDevMsg] = useState('');

  const receipt = MOCK_STORE_RECEIPTS.find(r => r.id === id);
  const items = id ? getMockReceiptItems(id) : [];
  const hasSerials = items.some(i => i.serial_required);
  const serials = MOCK_MEDICAL_SERIALS.filter(s => items.some(i => i.id === s.store_receipt_item_id));
  const canAct = role ? CAN_ACT.includes(role) : false;

  if (!receipt) {
    return (
      <div className="space-y-5">
        <PageHeader title="Receipt Not Found" />
        <EmptyState
          icon={<Package size={24} className="text-gray-400" />}
          title="Receipt not found"
          description="This receipt does not exist or has been removed."
        />
        <Link to="/store/receipts" className="text-sm text-sky-600 hover:underline">← Back to receipts</Link>
      </div>
    );
  }

  function handleAction(action: string) {
    if (!isSupabaseConfigured) {
      setDevMsg(`Dev Mode — "${action}" action recorded (not persisted).`);
      return;
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={receipt.receipt_number}
        subtitle={receipt.project ? `Project: ${receipt.project.project_code} — ${receipt.project.customer_name}` : 'Unallocated receipt'}
        action={
          <Link to="/store/receipts">
            <Button variant="ghost" size="sm"><ArrowLeft size={14} className="mr-1" /> Back</Button>
          </Link>
        }
      />

      {devMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">{devMsg}</div>
      )}

      {/* Header card */}
      <Card>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <Badge variant={RECEIPT_STATUS_VARIANT[receipt.status]}>{receipt.status.replace(/_/g, ' ')}</Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Type</p>
            <Badge variant="neutral">{receipt.receipt_type}</Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Received Date</p>
            <p className="font-medium">{formatDate(receipt.received_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Supplier</p>
            <p className="font-medium">{receipt.supplier_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Delivery Note</p>
            <p>{receipt.delivery_note_number ?? '—'}</p>
          </div>
          <div className="col-span-2 md:col-span-3">
            <p className="text-xs text-gray-500 mb-1">Remarks</p>
            <p>{receipt.remarks ?? '—'}</p>
          </div>
        </div>
        {canAct && (
          <div className="px-5 pb-4 flex gap-2">
            {receipt.status === 'draft' && (
              <Button variant="primary" size="sm" onClick={() => handleAction('Mark as Received')}>Mark as Received</Button>
            )}
            {receipt.status === 'received' && (
              <Button variant="secondary" size="sm" onClick={() => handleAction('Send to QC')}>Send to Material QC</Button>
            )}
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-gray-100">
          {(['items', ...(hasSerials ? ['serials'] : [])] as ('items' | 'serials')[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium rounded-t transition-colors ${
                tab === t ? 'text-sky-700 border-b-2 border-sky-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'items' ? `Items (${items.length})` : `Serial Numbers (${serials.length})`}
            </button>
          ))}
        </div>

        {tab === 'items' && (
          <div className="overflow-x-auto">
            {items.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No items on this receipt.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Item</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Location</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Serial?</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">{item.item_name}</p>
                        {item.item_code && <p className="text-xs text-gray-400 font-mono">{item.item_code}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.material_category}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.quantity_received} {item.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{item.storage_location ?? '—'}</td>
                      <td className="px-4 py-3">
                        {item.serial_required
                          ? <Badge variant="warning"><Tag size={10} className="inline mr-1" />Required</Badge>
                          : <Badge variant="neutral">No</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ITEM_STATUS_VARIANT[item.status] ?? 'neutral'}>{item.status.replace(/_/g, ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'serials' && (
          <div className="overflow-x-auto">
            {serials.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No serial numbers registered yet.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Serial #</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Batch #</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Expiry</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">QC Status</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {serials.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">{s.serial_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{s.batch_number ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{s.expiry_date ?? '—'}</td>
                      <td className="px-4 py-3"><Badge variant="neutral">{s.qc_status.replace(/_/g, ' ')}</Badge></td>
                      <td className="px-4 py-3"><Badge variant="info">{s.current_status.replace(/_/g, ' ')}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
