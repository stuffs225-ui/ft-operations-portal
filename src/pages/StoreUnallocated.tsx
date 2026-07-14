import { useState, useEffect } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_STORE_RECEIPTS, MOCK_RECEIPT_ITEMS } from '../data/mockStore';
import type { UserRole } from '../types';
import { mockOrEmpty } from '../lib/dataMode';

const CAN_ASSIGN: UserRole[] = ['admin', 'operations_manager', 'store_user'];

interface ProjectOption {
  id: string;
  project_code: string;
  customer_name: string;
}

interface UnallocatedItem {
  id: string;
  item_name: string;
  item_code: string | null;
  material_category: string;
  quantity_received: number;
  unit: string;
  status: string;
  store_receipt_id: string;
  receipt_number: string;
  received_date: string;
}

export function StoreUnallocated() {
  const { role } = useAuth();
  const canAssign = role ? CAN_ASSIGN.includes(role) : false;

  const [unallocatedItems, setUnallocatedItems] = useState<UnallocatedItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [devMsgs, setDevMsgs] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        const [{ data: receipts }, { data: projData }] = await Promise.all([
          supabase
            .from('store_receipts')
            .select('id, receipt_number, received_date, store_receipt_items(id, item_name, item_code, material_category, quantity_received, unit, status, store_receipt_id, project_id)')
            .is('project_id', null)
            .order('received_date', { ascending: false })
            .limit(200),
          supabase
            .from('projects')
            .select('id, project_code, customer_name')
            .in('project_status', ['active', 'approved'])
            .order('created_at', { ascending: false })
            .limit(200),
        ]);

        if (receipts) {
          const items: UnallocatedItem[] = [];
          for (const r of (receipts as any[])) {
            for (const item of (r.store_receipt_items ?? [])) {
              if (!item.project_id) {
                items.push({ ...item, receipt_number: r.receipt_number, received_date: r.received_date });
              }
            }
          }
          setUnallocatedItems(items);
        }
        if (projData) setProjects(projData as ProjectOption[]);
      } else {
        const result: UnallocatedItem[] = mockOrEmpty(MOCK_STORE_RECEIPTS)
          .filter(r => !r.project_id)
          .flatMap(r =>
            (MOCK_RECEIPT_ITEMS[r.id] ?? []).map(item => ({
              id: item.id,
              item_name: item.item_name,
              item_code: item.item_code ?? null,
              material_category: item.material_category,
              quantity_received: item.quantity_received,
              unit: item.unit,
              status: item.status,
              store_receipt_id: item.store_receipt_id,
              receipt_number: r.receipt_number,
              received_date: r.received_date,
            }))
          );
        setUnallocatedItems(result);
      }
      setLoading(false);
    })();
  }, []);

  async function handleAssign(itemId: string) {
    if (!selectedProject) return;

    if (!isSupabaseConfigured || !supabase) {
      const proj = projects.find(p => p.id === selectedProject);
      const label = proj ? `${proj.project_code} — ${proj.customer_name}` : selectedProject;
      setDevMsgs(prev => ({ ...prev, [itemId]: `Dev Mode — assigned to ${label} (not persisted)` }));
      setAssigningItemId(null);
      setSelectedProject('');
      return;
    }

    const item = unallocatedItems.find(i => i.id === itemId);
    const receiptId = item?.store_receipt_id;
    if (!receiptId) { setAssigningItemId(null); setSelectedProject(''); return; }

    setAssigning(true);
    // Allocation must land on BOTH the receipt and its items. store_receipt_items
    // carries its own project_id (custody, QC, serials and Project Detail all read
    // the item-level link), so updating only the receipt would leave every item
    // orphaned with project_id = NULL. Update the receipt first, then its items.
    const receiptRes = await supabase
      .from('store_receipts')
      .update({ project_id: selectedProject })
      .eq('id', receiptId);
    const itemsRes = receiptRes.error ? null : await supabase
      .from('store_receipt_items')
      .update({ project_id: selectedProject })
      .eq('store_receipt_id', receiptId)
      .is('project_id', null);
    setAssigning(false);

    if (!receiptRes.error && !itemsRes?.error) {
      // The whole receipt is now allocated — drop every item that shared it.
      setUnallocatedItems(prev => prev.filter(i => i.store_receipt_id !== receiptId));
    }
    setAssigningItemId(null);
    setSelectedProject('');
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Unallocated Materials"
        subtitle="Received items not yet linked to a project"
        breadcrumb={[{ label: 'Store', href: '/store' }, { label: 'Unallocated Materials' }]}
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700">
          Unallocated materials should be assigned to a project before issuance.
          Items without a project link cannot be tracked in Project Detail.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading unallocated materials…</div>
      ) : unallocatedItems.length === 0 ? (
        <EmptyState
          icon={<Package size={24} className="text-green-400" />}
          title="No unallocated materials"
          description="All received materials are linked to projects."
        />
      ) : (
        <Card>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              Unallocated Items
              <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {unallocatedItems.length}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Receipt</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Item</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Received</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  {canAssign && <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Assign</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {unallocatedItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{item.receipt_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{item.item_name}</p>
                      {item.item_code && <p className="text-xs text-gray-400 font-mono">{item.item_code}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{item.material_category}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.quantity_received} {item.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                      {new Date(item.received_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3"><Badge variant="neutral">{item.status.replace(/_/g, ' ')}</Badge></td>
                    {canAssign && (
                      <td className="px-4 py-3">
                        {devMsgs[item.id] ? (
                          <span className="text-xs text-green-600">{devMsgs[item.id]}</span>
                        ) : assigningItemId === item.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedProject}
                              onChange={e => setSelectedProject(e.target.value)}
                              className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                            >
                              <option value="">Select project…</option>
                              {projects.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.project_code} ({p.customer_name})
                                </option>
                              ))}
                            </select>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAssign(item.id)}
                              disabled={assigning || !selectedProject}
                            >
                              OK
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setAssigningItemId(null)}>✕</Button>
                          </div>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => setAssigningItemId(item.id)}>
                            Assign
                          </Button>
                        )}
                      </td>
                    )}
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
