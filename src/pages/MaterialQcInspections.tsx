import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_MATERIAL_QC_INSPECTIONS } from '../data/mockQc';
import type { MaterialQcInspection, InspectionStatus, MaterialInspectionResult, UserRole } from '../types';

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'qc_user'];

type StatusTab = 'all' | InspectionStatus;
type ResultFilter = 'all' | MaterialInspectionResult;

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function resultVariant(r: string): 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'default' {
  if (r === 'accepted') return 'success';
  if (r === 'accepted_with_comments') return 'warning';
  if (r === 'rejected') return 'critical';
  if (r === 'pending_supplier_clarification') return 'warning';
  if (r === 'pending_rework') return 'info';
  return 'neutral';
}

function statusVariant(s: string): 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default' {
  if (s === 'in_progress') return 'info';
  if (s === 'completed') return 'success';
  if (s === 'cancelled') return 'critical';
  return 'neutral';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function MaterialQcInspections() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role) : false;
  const [items, setItems] = useState<MaterialQcInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems(mockOrEmpty(MOCK_MATERIAL_QC_INSPECTIONS));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('material_qc_inspections')
        .select('*, project:projects(project_code, customer_name), item:store_receipt_items(item_name, item_code, material_category, quantity_received, unit)')
        .order('created_at', { ascending: false });
      setItems((data as unknown as MaterialQcInspection[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter(i => {
    if (statusTab !== 'all' && i.inspection_status !== statusTab) return false;
    if (resultFilter !== 'all' && i.inspection_result !== resultFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Material QC Inspections"
        subtitle="Inspect received materials and record QC results"
        breadcrumb={[{ label: 'Material QC', href: '/material-qc' }, { label: 'Inspections' }]}
        actions={
          canCreate ? (
            <Link to="/material-qc/inspections/new">
              <Button variant="primary" size="sm"><Plus size={14} className="mr-1" /> New Inspection</Button>
            </Link>
          ) : undefined
        }
      />

      <DataSourceBadge variant="auto" />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Result:</span>
          <select value={resultFilter} onChange={e => setResultFilter(e.target.value as ResultFilter)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
            <option value="all">All Results</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="accepted_with_comments">Accepted with Comments</option>
            <option value="rejected">Rejected</option>
            <option value="pending_supplier_clarification">Pending Supplier Clarification</option>
            <option value="pending_rework">Pending Rework</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setStatusTab(t.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
                statusTab === t.key ? 'text-sky-700 border-b-2 border-sky-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="px-5 py-10"><PageLoader /></div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState icon={<ClipboardCheck size={24} className="text-gray-400" />} title="No inspections" description="No inspections match the current filter." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Inspection #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Item</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Result</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Date</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">{i.inspection_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">{i.item?.item_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell capitalize">{i.item?.material_category ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{i.project?.project_code ?? '—'}</td>
                    <td className="px-4 py-3"><Badge variant={resultVariant(i.inspection_result)}>{i.inspection_result.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(i.inspection_status)}>{i.inspection_status.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">{i.inspected_at ? formatDate(i.inspected_at) : '—'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/material-qc/inspections/${i.id}`}>
                        <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
