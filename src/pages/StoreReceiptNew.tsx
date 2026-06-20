import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { recordStoreAudit } from '../lib/storeAudit';
import type { ReceiptType } from '../types';

interface ProjectOption {
  id: string;
  project_code: string;
  so_number: string;
  customer_name: string;
}

const MATERIAL_CATEGORIES = ['general', 'electrical', 'mechanical', 'medical', 'chemical', 'hydraulic', 'structural', 'consumable'];
const UNITS = ['unit', 'kg', 'litre', 'metre', 'set', 'box'];
const CONDITIONS = ['good', 'minor_damage', 'major_damage'];
const RECEIPT_TYPES = ['material', 'vehicle', 'mixed'];

interface DraftItem {
  item_name: string;
  item_code: string;
  material_category: string;
  quantity_received: number;
  unit: string;
  serial_required: boolean;
  storage_location: string;
  condition: string;
}

export function StoreReceiptNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    (async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, project_code, so_number, customer_name')
        .in('project_status', ['active', 'approved'])
        .order('created_at', { ascending: false })
        .limit(200);
      if (data) setProjects(data as ProjectOption[]);
    })();
  }, []);

  // Step 1 state
  const [receivedDate, setReceivedDate] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [projectId, setProjectId] = useState('');
  const [receiptType, setReceiptType] = useState<ReceiptType>('material');
  const [remarks, setRemarks] = useState('');

  // Step 2 state
  const [items, setItems] = useState<DraftItem[]>([]);
  const [newItem, setNewItem] = useState<DraftItem>({
    item_name: '', item_code: '', material_category: 'general',
    quantity_received: 1, unit: 'unit', serial_required: false,
    storage_location: '', condition: 'good',
  });

  const [devSuccess, setDevSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function addItem() {
    if (!newItem.item_name || newItem.quantity_received <= 0) return;
    setItems(prev => [...prev, { ...newItem }]);
    setNewItem({ item_name: '', item_code: '', material_category: 'general', quantity_received: 1, unit: 'unit', serial_required: false, storage_location: '', condition: 'good' });
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave(markReceived: boolean) {
    if (!isSupabaseConfigured || !supabase) {
      setDevSuccess(true);
      setTimeout(() => navigate('/store/receipts'), 1500);
      return;
    }

    if (!receivedDate.trim()) {
      setSaveError('Received date is required.');
      return;
    }
    if (!user?.id) {
      setSaveError('Not authenticated. Please refresh and sign in again.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const { data: srData, error: srError } = await supabase
        .from('store_receipts')
        .insert({
          received_date: receivedDate,
          receipt_type: receiptType,
          supplier_name: supplierName.trim() || null,
          delivery_note_number: deliveryNote.trim() || null,
          project_id: projectId || null,
          remarks: remarks.trim() || null,
          status: markReceived ? 'received' : 'draft',
          received_by: user.id,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (srError) throw srError;

      if (items.length > 0 && srData?.id) {
        const { error: itemsError } = await supabase
          .from('store_receipt_items')
          .insert(
            items.map(item => ({
              store_receipt_id: srData.id,
              project_id: projectId || null,
              item_name: item.item_name,
              item_code: item.item_code || null,
              material_category: item.material_category,
              quantity_received: item.quantity_received,
              unit: item.unit,
              serial_required: item.serial_required,
              storage_location: item.storage_location || null,
              condition: item.condition,
            }))
          );
        if (itemsError) throw itemsError;
      }

      void recordStoreAudit(
        markReceived ? 'store_receipt_received' : 'store_receipt_draft',
        srData.id,
        `Store receipt ${markReceived ? 'marked as received' : 'saved as draft'} with ${items.length} item(s).`,
        user.id,
      );

      navigate(srData?.id ? `/store/receipts/${srData.id}` : '/store/receipts');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save receipt. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (devSuccess) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8">
          <Package size={32} className="text-green-500 mx-auto mb-3" />
          <p className="text-green-700 font-semibold">Receipt saved (Dev Mode — not persisted)</p>
          <p className="text-green-600 text-sm mt-1">Redirecting to receipts…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="New Material Receipt" subtitle={`Step ${step} of 3`} />

      <div className="flex items-center gap-2 mb-2">
        {['Receipt Info', 'Add Items', 'Review'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === i + 1 ? 'bg-sky-600 text-white' : step > i + 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>{i + 1}</div>
            <span className={`text-sm ${step === i + 1 ? 'text-sky-700 font-medium' : 'text-gray-400'}`}>{label}</span>
            {i < 2 && <ChevronRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received Date <span className="text-red-500">*</span></label>
              <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Type</label>
              <select value={receiptType} onChange={e => setReceiptType(e.target.value as ReceiptType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                {RECEIPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
              <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Optional"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Note #</label>
              <input type="text" value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="Optional"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link to Project</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                <option value="">Unallocated</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.project_code} — {p.customer_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => { if (receivedDate) setStep(2); }}>
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <div className="p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">Add Items</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Item Name <span className="text-red-500">*</span></label>
                <input type="text" value={newItem.item_name} onChange={e => setNewItem(p => ({ ...p, item_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Item Code</label>
                <input type="text" value={newItem.item_code} onChange={e => setNewItem(p => ({ ...p, item_code: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={newItem.material_category} onChange={e => {
                  const cat = e.target.value;
                  setNewItem(p => ({ ...p, material_category: cat, serial_required: cat === 'medical' }));
                }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                  {MATERIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Qty <span className="text-red-500">*</span></label>
                <input type="number" min={1} value={newItem.quantity_received} onChange={e => setNewItem(p => ({ ...p, quantity_received: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                <select value={newItem.unit} onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
                <select value={newItem.condition} onChange={e => setNewItem(p => ({ ...p, condition: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Storage Location</label>
                <input type="text" value={newItem.storage_location} onChange={e => setNewItem(p => ({ ...p, storage_location: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input type="checkbox" id="serial_req" checked={newItem.serial_required} onChange={e => setNewItem(p => ({ ...p, serial_required: e.target.checked }))} />
                <label htmlFor="serial_req" className="text-xs text-gray-600">Serial number required (medical item)</label>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={addItem}>
              <Plus size={14} className="mr-1" /> Add Item
            </Button>

            {items.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Item</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Category</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm text-gray-800">{item.item_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{item.quantity_received} {item.unit}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">{item.material_category}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ChevronLeft size={14} /> Back
              </Button>
              <Button variant="primary" size="sm" onClick={() => { if (items.length > 0) setStep(3); }}>
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <div className="p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">Review & Save</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Received Date:</span><span>{receivedDate}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type:</span><span>{receiptType}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Supplier:</span><span>{supplierName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Project:</span><span>{projectId || 'Unallocated'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Items:</span><span>{items.length}</span></div>
            </div>
            {saveError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{saveError}</div>
            )}
            {!isSupabaseConfigured && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                Dev Mode — changes will not be persisted to the database.
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} disabled={saving}>
                <ChevronLeft size={14} /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? 'Saving…' : 'Save as Draft'}
                </Button>
                <Button variant="primary" size="sm" onClick={() => handleSave(true)} disabled={saving}>
                  {saving ? 'Saving…' : 'Mark as Received'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="text-center">
        <Link to="/store/receipts" className="text-sm text-gray-400 hover:text-gray-600">← Back to receipts</Link>
      </div>
    </div>
  );
}
