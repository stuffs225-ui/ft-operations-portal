import { useState } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { MOCK_STORE_RECEIPTS, MOCK_RECEIPT_ITEMS } from '../data/mockStore';
import type { UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

const CAN_ASSIGN: UserRole[] = ['admin', 'operations_manager', 'store_user'];

export function StoreUnallocated() {
  const { role } = useAuth();
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [devMsgs, setDevMsgs] = useState<Record<string, string>>({});

  const canAssign = role ? CAN_ASSIGN.includes(role) : false;

  // Find unallocated receipts and their items
  const unallocatedReceipts = MOCK_STORE_RECEIPTS.filter(r => !r.project_id);
  const unallocatedItems = unallocatedReceipts.flatMap(r =>
    (MOCK_RECEIPT_ITEMS[r.id] ?? []).map(item => ({ ...item, receipt_number: r.receipt_number, received_date: r.received_date }))
  );

  function handleAssign(itemId: string) {
    if (!selectedProject) return;
    if (!isSupabaseConfigured) {
      setDevMsgs(prev => ({ ...prev, [itemId]: `Dev Mode — assigned to ${selectedProject} (not persisted)` }));
      setAssigningItemId(null);
      setSelectedProject('');
      return;
    }
    setAssigningItemId(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Unallocated Materials"
        subtitle="Received items not yet linked to a project"
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700">
          Unallocated materials should be assigned to a project before issuance. Items without a project link cannot be tracked in Project Detail.
        </p>
      </div>

      {unallocatedItems.length === 0 ? (
        <EmptyState
          icon={<Package size={24} className="text-gray-400" />}
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
                    <td className="px-4 py-3 text-sm font-mono text-sky-700">{item.receipt_number}</td>
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
                              className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-300"
                            >
                              <option value="">Select project…</option>
                              <option value="proj-005">FT-2025-0005 (GACA)</option>
                              <option value="proj-006">FT-2025-0006 (Dubai CD)</option>
                            </select>
                            <Button variant="primary" size="sm" onClick={() => handleAssign(item.id)}>OK</Button>
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
