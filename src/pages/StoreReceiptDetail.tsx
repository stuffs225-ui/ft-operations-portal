import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, ArrowLeft, Tag } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_STORE_RECEIPTS, MOCK_MEDICAL_SERIALS, getMockReceiptItems } from '../data/mockStore';
import { recordStoreAudit } from '../lib/storeAudit';
import type { StoreReceipt, StoreReceiptItem, MedicalSerialNumber, ReceiptStatus, ItemStatus, UserRole } from '../types';

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
  const { role, user } = useAuth();

  const [receipt, setReceipt] = useState<StoreReceipt | null>(null);
  const [items, setItems] = useState<StoreReceiptItem[]>([]);
  const [serials, setSerials] = useState<MedicalSerialNumber[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [notFound, setNotFound] = useState(!id);
  const [tab, setTab] = useState<'items' | 'serials'>('items');
  const [devMsg, setDevMsg] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const hasSerials = items.some(i => i.serial_required);
  const canAct = role ? CAN_ACT.includes(role) : false;

  useEffect(() => {
    if (!id) return;

    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const found = MOCK_STORE_RECEIPTS.find(r => r.id === id);
        if (!found) { setNotFound(true); setLoading(false); return; }
        const mockItems = getMockReceiptItems(id);
        setReceipt(found);
        setItems(mockItems);
        setSerials(MOCK_MEDICAL_SERIALS.filter(s => mockItems.some(i => i.id === s.store_receipt_item_id)));
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('store_receipts')
        .select('*, project:projects(project_code, so_number, customer_name)')
        .eq('id', id)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setReceipt(data as unknown as StoreReceipt);

      const { data: itemData } = await supabase
        .from('store_receipt_items')
        .select('*')
        .eq('store_receipt_id', id);

      const loadedItems = (itemData as unknown as StoreReceiptItem[]) ?? [];
      setItems(loadedItems);

      const serialItemIds = loadedItems.filter(i => i.serial_required).map(i => i.id);
      if (serialItemIds.length > 0) {
        const { data: serialData } = await supabase
          .from('medical_serial_numbers')
          .select('*')
          .in('store_receipt_item_id', serialItemIds);
        setSerials((serialData as unknown as MedicalSerialNumber[]) ?? []);
      }

      setLoading(false);
    })();
  }, [id]);

  async function handleAction(action: string) {
    if (!isSupabaseConfigured || !supabase) {
      setDevMsg(`Dev Mode — "${action}" action recorded (not persisted).`);
      return;
    }
    if (!receipt || !user?.id) return;

    let newStatus: ReceiptStatus | null = null;
    if (action === 'Mark as Received') newStatus = 'received';
    else if (action === 'Send to QC') newStatus = 'pending_material_qc';
    if (!newStatus) return;

    setActing(true);
    setActionError(null);

    try {
      const { error } = await supabase
        .from('store_receipts')
        .update({ status: newStatus })
        .eq('id', receipt.id);

      if (error) throw error;

      void recordStoreAudit(
        `store_receipt_${newStatus}`,
        receipt.id,
        `Store receipt ${receipt.receipt_number} status updated to ${newStatus}.`,
        user.id,
      );

      setReceipt(r => r ? { ...r, status: newStatus! } : r);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update receipt.');
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  if (notFound || !receipt) {
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
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{actionError}</div>
      )}

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
              <Button variant="primary" size="sm" onClick={() => handleAction('Mark as Received')} disabled={acting}>
                {acting ? 'Saving…' : 'Mark as Received'}
              </Button>
            )}
            {receipt.status === 'received' && (
              <Button variant="secondary" size="sm" onClick={() => handleAction('Send to QC')} disabled={acting}>
                {acting ? 'Saving…' : 'Send to Material QC'}
              </Button>
            )}
          </div>
        )}
      </Card>

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
