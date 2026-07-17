// Create a Material QC Inspection — closes the Store→QC handoff loop.
// QC picks a received store item awaiting inspection and opens an inspection
// record (auto-numbered MQC-YYYY-#### by the DB trigger). Creating the
// inspection also flips the source item to `pending_qc` so the Store handoff
// queue and KPIs stay consistent.

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ClipboardCheck, ArrowLeft, Check } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ItemStatus } from '../types';

interface ReceiptItemOption {
  id: string;
  item_name: string;
  item_code: string | null;
  material_category: string;
  quantity_received: number;
  unit: string;
  serial_required: boolean;
  status: string;
  store_receipt_id: string;
  project_id: string | null;
  receipt_number?: string | null;
  project_code?: string | null;
}

// Items that still need a QC decision: freshly received or already flagged
// pending, not yet accepted/rejected/issued.
const INSPECTABLE_STATUSES: ItemStatus[] = ['received', 'pending_qc'];

export function MaterialQcInspectionNew() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [items, setItems] = useState<ReceiptItemOption[]>([]);
  const [loadingItems, setLoadingItems] = useState(isSupabaseConfigured);
  const [itemId, setItemId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    (async () => {
      const { data } = await supabase
        .from('store_receipt_items')
        .select('id, item_name, item_code, material_category, quantity_received, unit, serial_required, status, store_receipt_id, project_id, store_receipt:store_receipts(receipt_number), project:projects(project_code)')
        .in('status', INSPECTABLE_STATUSES)
        .order('created_at', { ascending: false })
        .limit(300);
      const rows = ((data ?? []) as unknown as (ReceiptItemOption & {
        store_receipt?: { receipt_number: string | null } | null;
        project?: { project_code: string | null } | null;
      })[]).map((r) => ({
        ...r,
        receipt_number: r.store_receipt?.receipt_number ?? null,
        project_code: r.project?.project_code ?? null,
      }));
      setItems(rows);
      setLoadingItems(false);
    })();
  }, []);

  const selected = items.find((i) => i.id === itemId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      navigate('/material-qc/inspections');
      return;
    }
    if (!itemId || !selected) {
      setError('Select a received item to inspect.');
      return;
    }

    setSaving(true);

    const { data, error: insErr } = await supabase
      .from('material_qc_inspections')
      .insert({
        store_receipt_item_id: selected.id,
        store_receipt_id: selected.store_receipt_id,
        project_id: selected.project_id,
        inspection_status: 'pending',
        inspection_result: 'pending',
        remarks: remarks.trim() || null,
        created_by: profile?.id ?? null,
      })
      .select('id')
      .single();

    if (insErr) {
      setError(insErr.message);
      setSaving(false);
      return;
    }

    // Move the source item into the pending-QC state so the Store handoff queue
    // reflects that an inspection now exists. Non-fatal if it fails.
    if (selected.status !== 'pending_qc') {
      await supabase.from('store_receipt_items').update({ status: 'pending_qc' }).eq('id', selected.id);
    }

    navigate(`/material-qc/inspections/${(data as { id: string }).id}`);
  }

  return (
    <div>
      <PageHeader
        title="New Material QC Inspection"
        subtitle="Open a quality inspection for a received store item."
        icon={<ClipboardCheck size={18} />}
        breadcrumb={[
          { label: 'Material QC', href: '/material-qc' },
          { label: 'Inspections', href: '/material-qc/inspections' },
          { label: 'New' },
        ]}
        actions={
          <Link to="/material-qc/inspections">
            <Button variant="ghost" icon={<ArrowLeft size={15} />}>Back</Button>
          </Link>
        }
        className="mb-6"
      />

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-xs text-amber-800">
          Dev mode — form submission returns to the list without persisting data.
        </div>
      )}

      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Received Item <span className="text-red-500">*</span>
            </label>
            {loadingItems ? (
              <input disabled placeholder="Loading received items…" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400" />
            ) : items.length === 0 && isSupabaseConfigured ? (
              <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-3">
                No received items are awaiting QC. Items appear here once the Store receives them.
              </p>
            ) : (
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select an item to inspect…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.item_code ? `${i.item_code} — ` : ''}{i.item_name} · {i.quantity_received} {i.unit}
                    {i.project_code ? ` · ${i.project_code}` : ''}{i.receipt_number ? ` · ${i.receipt_number}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selected && (
            <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 text-sm grid grid-cols-2 gap-y-1.5 gap-x-4">
              <div><span className="text-gray-500">Category:</span> {selected.material_category}</div>
              <div><span className="text-gray-500">Receipt:</span> {selected.receipt_number ?? '—'}</div>
              <div><span className="text-gray-500">Project:</span> {selected.project_code ?? 'Unallocated'}</div>
              <div><span className="text-gray-500">Serial required:</span> {selected.serial_required ? 'Yes' : 'No'}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Inspection scope, sampling notes…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-800">{error}</div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving} disabled={!itemId && isSupabaseConfigured} icon={<Check size={15} />}>
              Open Inspection
            </Button>
            <Link to="/material-qc/inspections">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
