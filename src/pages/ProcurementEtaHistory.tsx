import { useState, useEffect } from 'react';
import { Clock, Search } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { isSupabaseConfigured } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { MOCK_ETA_HISTORY } from '../data/mockProcurement';
import type { EtaChangeHistory } from '../types';

type EntityTypeFilter = 'all' | 'po_to_supplier' | 'pr_item';

const ENTITY_TYPE_TABS: { key: EntityTypeFilter; label: string }[] = [
  { key: 'all',            label: 'All' },
  { key: 'po_to_supplier', label: 'PO to Supplier' },
  { key: 'pr_item',        label: 'PR Item' },
];

function entityTypeBadge(entityType: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    po_to_supplier: { label: 'PO to Supplier', variant: 'info' },
    pr_item:        { label: 'PR Item',        variant: 'warning' },
    other:          { label: 'Other',          variant: 'neutral' },
  };
  const { label, variant } = map[entityType] ?? { label: entityType, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function computeDaysDelta(oldEta: string | null, newEta: string | null): number | null {
  if (!oldEta || !newEta) return null;
  const old = new Date(oldEta).getTime();
  const next = new Date(newEta).getTime();
  return Math.round((next - old) / (1000 * 60 * 60 * 24));
}

function DaysDelta({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-xs text-gray-400">—</span>;
  if (delta === 0) return <span className="text-xs text-gray-500">0 days</span>;
  if (delta > 0) {
    return <span className="text-xs font-semibold text-red-600">+{delta}d (delay)</span>;
  }
  return <span className="text-xs font-semibold text-green-600">{delta}d (improvement)</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function ProcurementEtaHistory() {
  const [history, setHistory] = useState<EtaChangeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<EntityTypeFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const sorted = [...MOCK_ETA_HISTORY].sort(
        (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
      );
      setHistory(sorted);
      setLoading(false);
      return;
    }
    supabase
      .from('eta_change_history')
      .select('*, changed_by_profile:profiles!eta_change_history_changed_by_fkey(full_name)')
      .order('changed_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setHistory((data as unknown as EtaChangeHistory[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = history.filter((entry) => {
    if (activeType !== 'all' && entry.entity_type !== activeType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        entry.entity_id.toLowerCase().includes(q) ||
        entry.reason.toLowerCase().includes(q) ||
        (entry.remarks ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="ETA History"
        subtitle="Full audit trail of all ETA changes with reasons."
        icon={<Clock size={18} />}
        breadcrumb={[
          { label: 'Procurement', path: '/procurement' },
          { label: 'ETA History' },
        ]}
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entity ID, reason text…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        />
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 border-b border-gray-200">
        {ENTITY_TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveType(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors -mb-px ${
              activeType === tab.key
                ? 'bg-brand-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Clock size={28} />}
          title="No ETA changes found"
          description={search ? 'Try adjusting your search terms.' : 'No ETA history matches the selected filter.'}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Entity ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Project</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Old ETA → New ETA</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Delta</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Reason</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Remarks</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Changed By</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Changed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((entry) => {
                  const delta = computeDaysDelta(entry.old_eta, entry.new_eta);
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{entityTypeBadge(entry.entity_type)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-900">{entry.entity_id}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{entry.project_id ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-gray-500">{entry.old_eta ? formatDate(entry.old_eta) : '—'}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium text-gray-900">{entry.new_eta ? formatDate(entry.new_eta) : '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><DaysDelta delta={delta} /></td>
                      <td className="px-4 py-3 text-gray-700 max-w-[200px]">
                        <span className="line-clamp-2">{entry.reason}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px]">
                        {entry.remarks ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {entry.changed_by_profile?.full_name ?? entry.changed_by ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDateTime(entry.changed_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
