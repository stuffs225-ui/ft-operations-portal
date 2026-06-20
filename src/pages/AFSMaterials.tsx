import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, PackageCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { MaterialCustodyRecord, CustodyStatus } from '../types';

type Tab = 'active' | 'returned' | 'all';

const TABS: { key: Tab; label: string }[] = [
  { key: 'active', label: 'In Custody / Issued' },
  { key: 'returned', label: 'Returned' },
  { key: 'all', label: 'All' },
];

const ACTIVE_STATUSES: CustodyStatus[] = ['issued', 'pending_acceptance', 'in_custody', 'installed'];
const RETURNED_STATUSES: CustodyStatus[] = ['returned', 'consumed_by_project'];

function statusVariant(s: CustodyStatus): 'neutral' | 'info' | 'success' | 'warning' | 'critical' | 'default' {
  if (s === 'in_custody' || s === 'issued') return 'info';
  if (s === 'returned' || s === 'consumed_by_project') return 'success';
  if (s === 'installed') return 'success';
  if (s === 'pending_acceptance') return 'warning';
  if (s === 'lost_or_damaged') return 'critical';
  return 'neutral';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AFSMaterials() {
  const [items, setItems] = useState<MaterialCustodyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems([]);
        setLoading(false);
        return;
      }
      // Fetch custody records for Dubai-manufacturing projects
      const { data } = await supabase
        .from('material_custody_records')
        .select('*, project:projects(project_code, so_number, customer_name, manufacturing_location), item:store_receipt_items(item_name, item_code, material_category)')
        .not('status', 'in', '("draft","cancelled")')
        .order('issued_at', { ascending: false })
        .limit(200);
      const records = (data as unknown as MaterialCustodyRecord[]) ?? [];
      // Filter to Dubai/AFS-related projects
      setItems(records.filter(r => {
        const loc = (r.project as { manufacturing_location?: string | null } | null)?.manufacturing_location;
        return loc === 'dubai' || loc === 'afs';
      }));
      setLoading(false);
    })();
  }, []);

  const tabCounts: Record<Tab, number> = {
    active: items.filter(r => ACTIVE_STATUSES.includes(r.status)).length,
    returned: items.filter(r => RETURNED_STATUSES.includes(r.status)).length,
    all: items.length,
  };

  const records = items.filter(r => {
    if (tab === 'active') return ACTIVE_STATUSES.includes(r.status);
    if (tab === 'returned') return RETURNED_STATUSES.includes(r.status);
    return true;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="AFS Materials"
        subtitle="Materials issued or in custody for Dubai/AFS projects. Full custody management is available via Materials in Custody."
        breadcrumb={[{ label: 'AFS Dashboard', href: '/dubai-afs' }, { label: 'AFS Materials' }]}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/custody">
              <Button variant="secondary" size="sm">
                <PackageCheck size={13} className="mr-1.5" /> All Custody Records
              </Button>
            </Link>
            <DataSourceBadge variant="auto" />
          </div>
        }
      />

      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'text-sky-700 border-b-2 border-sky-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            {!loading && tabCounts[t.key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${tab === t.key ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-500'}`}>
                {tabCounts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : records.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Package size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No AFS materials found for this filter.</p>
            {items.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">Materials are linked from custody records for Dubai/AFS projects.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Custody #</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Item</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Issued</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Returned</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Package size={13} className="text-sky-400 shrink-0" />
                        <span className="font-mono text-xs text-sky-700 font-semibold">{r.custody_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-sm font-medium text-gray-900">{r.item?.item_name ?? '—'}</div>
                      {r.item?.item_code && (
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{r.item.item_code}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="font-mono text-xs text-sky-700">{r.project?.project_code ?? '—'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{r.project?.customer_name ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(r.status)}>
                        {r.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{formatDate(r.issued_at)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{formatDate(r.returned_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/custody/${r.id}`}>
                        <Button variant="ghost" size="sm">
                          View <ChevronRight size={12} />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
