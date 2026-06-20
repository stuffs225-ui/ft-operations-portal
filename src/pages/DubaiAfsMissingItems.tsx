import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_AFS_MISSING_ITEMS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import type { AfsMissingItem, MissingItemStatus } from '../types';

interface MissingItemWithProject extends AfsMissingItem {
  project?: { project_code: string; customer_name: string } | null;
  arrival_report?: { arrival_report_number: string } | null;
}

type Tab = 'blocking' | 'all' | MissingItemStatus;

const TABS: { key: Tab; label: string }[] = [
  { key: 'blocking', label: 'Blocking Delivery' },
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'requested', label: 'Requested' },
  { key: 'received', label: 'Received' },
  { key: 'waived', label: 'Waived' },
];

function statusVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'open') return 'critical';
  if (s === 'requested') return 'warning';
  if (s === 'received' || s === 'waived') return 'success';
  return 'neutral';
}

function severityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'warning';
  if (s === 'medium') return 'info';
  return 'neutral';
}

function daysOpen(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function isBlocking(item: AfsMissingItem): boolean {
  return ['open', 'requested'].includes(item.missing_item_status);
}

export function DubaiAfsMissingItems() {
  const [allItems, setAllItems] = useState<MissingItemWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('blocking');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setAllItems(mockOrEmpty(MOCK_AFS_MISSING_ITEMS) as MissingItemWithProject[]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('afs_missing_items')
        .select('*, project:projects(project_code, customer_name), arrival_report:afs_arrival_reports(arrival_report_number)')
        .order('created_at', { ascending: false });
      setAllItems((data as unknown as MissingItemWithProject[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const blockingItems = allItems.filter(isBlocking);

  const tabCounts: Record<Tab, number> = {
    blocking: blockingItems.length,
    all: allItems.length,
    open: allItems.filter(i => i.missing_item_status === 'open').length,
    requested: allItems.filter(i => i.missing_item_status === 'requested').length,
    received: allItems.filter(i => i.missing_item_status === 'received').length,
    waived: allItems.filter(i => i.missing_item_status === 'waived').length,
    cancelled: allItems.filter(i => i.missing_item_status === 'cancelled').length,
  };

  const items = allItems.filter(i => {
    if (tab === 'blocking') return isBlocking(i);
    if (tab === 'all') return true;
    return i.missing_item_status === (tab as MissingItemStatus);
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Missing Items"
        subtitle="Track all missing items from AFS arrival inspections. Open and requested missing items block pre-delivery readiness."
        breadcrumb={[{ label: 'AFS Dashboard', href: '/dubai-afs' }, { label: 'Missing Items' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {!loading && blockingItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-800">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <span>
            <strong>{blockingItems.length}</strong> missing item{blockingItems.length !== 1 ? 's' : ''} blocking delivery — pre-delivery readiness cannot be approved until all open items are resolved or waived.
          </span>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-100 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'text-sky-700 border-b-2 border-sky-600' : 'text-gray-500 hover:text-gray-700'}`}>
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
        ) : items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No missing items found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Item</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Severity</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Days Open</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Arrival Report</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(item => {
                  const days = daysOpen(item.created_at);
                  const blocking = isBlocking(item);
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${blocking ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Package size={13} className={blocking ? 'text-red-400' : 'text-gray-400'} />
                          <span className="font-medium text-gray-900 text-sm">{item.item_name}</span>
                        </div>
                        {item.item_code && (
                          <div className="text-xs text-gray-400 font-mono mt-0.5 ml-5">{item.item_code}</div>
                        )}
                        {item.notes && (
                          <div className="text-xs text-gray-500 mt-0.5 ml-5 truncate max-w-[180px]">{item.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {item.project ? (
                          <div>
                            <span className="font-mono text-xs text-sky-700 font-medium">{item.project.project_code}</span>
                            <div className="text-xs text-gray-500 mt-0.5">{item.project.customer_name}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {item.quantity_received}/{item.quantity_expected}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(item.missing_item_status)}>
                          {item.missing_item_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {blocking ? (
                          <span className={`text-xs font-medium ${days > 14 ? 'text-red-600' : days > 7 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {days}d
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500 font-mono">
                        {item.arrival_report?.arrival_report_number ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/dubai-afs/arrival-reports`}>
                          <Button variant="ghost" size="sm">
                            View <ChevronRight size={12} />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
