import { useState } from 'react';
import { Package } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MOCK_AFS_MISSING_ITEMS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import type { MissingItemStatus } from '../types';

type Tab = 'all' | MissingItemStatus;
const TABS: { key: Tab; label: string }[] = [
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

export function DubaiAfsMissingItems() {
  const [tab, setTab] = useState<Tab>('all');

  const items = mockOrEmpty(MOCK_AFS_MISSING_ITEMS).filter(i =>
    tab === 'all' ? true : i.missing_item_status === tab
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Missing Items" subtitle="Track all missing items from AFS arrival inspections" />
      <DataSourceBadge variant="preview" />

      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-white border border-b-white border-gray-100 text-sky-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No missing items found.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Package size={14} className="text-orange-500" />
                    <span className="text-sm font-medium text-gray-900">{item.item_name}</span>
                    {item.item_code && <span className="text-xs text-gray-400 font-mono">{item.item_code}</span>}
                    <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                    <Badge variant={statusVariant(item.missing_item_status)}>{item.missing_item_status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Qty received: {item.quantity_received} / {item.quantity_expected}
                    {item.notes && ` — ${item.notes}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
