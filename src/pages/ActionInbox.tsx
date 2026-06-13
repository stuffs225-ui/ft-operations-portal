import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, AlertTriangle, Inbox as InboxIcon, Loader2, Search } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatDate, cn } from '../lib/utils';
import type { ActionInboxItem, TaskPriority } from '../types';

const priorityConfig: Record<TaskPriority, { label: string; badge: 'critical' | 'warning' | 'default' | 'info' }> = {
  critical: { label: 'Critical', badge: 'critical' },
  high:     { label: 'High',     badge: 'warning'  },
  medium:   { label: 'Medium',   badge: 'default'  },
  low:      { label: 'Low',      badge: 'info'     },
};

const actionTypeLabels: Record<string, string> = {
  quotation:  'Quotation',
  approval:   'Approval',
  revision:   'Revision',
  invoicing:  'Invoicing',
};

function ActionCard({ item }: { item: ActionInboxItem }) {
  const navigate = useNavigate();
  const pc = priorityConfig[item.priority] ?? priorityConfig.low;
  const isOverdue = item.status === 'overdue';
  const typeLabel = actionTypeLabels[item.action_type] ?? item.action_type;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4',
        'hover:shadow-md hover:border-gray-300 transition-all',
        item.priority === 'critical' || isOverdue
          ? 'border-l-4 border-l-red-500 border-gray-200'
          : 'border-gray-200',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <Badge variant={pc.badge}>{pc.label}</Badge>
          <Badge variant="neutral">{typeLabel}</Badge>
          {isOverdue && (
            <Badge variant="critical">Overdue</Badge>
          )}
        </div>

        <h3 className="text-sm font-semibold text-gray-900 mb-1">{item.title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>

        {item.due_at && (
          <div className={cn('flex items-center gap-1.5 mt-2 text-xs', isOverdue ? 'text-red-600' : 'text-gray-500')}>
            {isOverdue ? <AlertTriangle size={12} /> : <Clock size={12} />}
            {isOverdue ? `Overdue since ${formatDate(item.due_at)}` : `Due: ${formatDate(item.due_at)}`}
          </div>
        )}
      </div>

      <div className="shrink-0">
        <Button
          size="sm"
          variant="outline"
          icon={<ArrowRight size={14} />}
          onClick={() => navigate(item.path)}
        >
          View
        </Button>
      </div>
    </div>
  );
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function ActionInbox() {
  const [items, setItems] = useState<ActionInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('');
  const [filterStatus, setFilterStatus] = useState<'open' | 'overdue' | ''>('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('action_inbox_view' as any)
      .select('*')
      .order('due_at', { ascending: true, nullsFirst: false })
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else {
          setItems((data ?? []) as unknown as ActionInboxItem[]);
        }
        setLoading(false);
      });
  }, []);

  const visible = items
    .filter((item) => {
      if (filterPriority && item.priority !== filterPriority) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!item.title.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const pd = (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
      if (pd !== 0) return pd;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });

  const criticalCount = items.filter((t) => t.priority === 'critical').length;
  const overdueCount  = items.filter((t) => t.status === 'overdue').length;

  return (
    <div>
      <PageHeader
        title="My Action Inbox"
        subtitle="Tasks requiring your attention across active workflows"
        breadcrumb={[{ label: 'Inbox' }]}
        action={
          (criticalCount > 0 || overdueCount > 0) ? (
            <div className="flex items-center gap-2 text-xs">
              {criticalCount > 0 && (
                <span className="bg-red-100 text-red-700 rounded-full px-2 py-1 font-semibold">
                  {criticalCount} Critical
                </span>
              )}
              {overdueCount > 0 && (
                <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-1 font-semibold">
                  {overdueCount} Overdue
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Priority summary cards — only when there are real items */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => {
            const count = items.filter((t) => t.priority === p).length;
            const pc = priorityConfig[p];
            return (
              <button
                key={p}
                onClick={() => setFilterPriority(filterPriority === p ? '' : p)}
                className={cn(
                  'text-left rounded-xl border shadow-sm p-3 transition-all',
                  filterPriority === p ? 'ring-2 ring-brand-500 bg-brand-50' : 'bg-white hover:shadow-md',
                )}
              >
                <div className="text-xl font-bold text-gray-900">{count}</div>
                <Badge variant={pc.badge} className="mt-1">{pc.label} Priority</Badge>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'open' | 'overdue' | '')}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={22} className="animate-spin mr-2" />
          <span className="text-sm">Loading actions…</span>
        </div>
      ) : error ? (
        <Card className="py-10">
          <EmptyState
            icon={<AlertTriangle size={26} className="text-red-400" />}
            title="Could not load action inbox"
            description={error}
          />
        </Card>
      ) : visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map((item) => (
            <ActionCard key={item.id} item={item} />
          ))}
        </div>
      ) : items.length > 0 ? (
        <Card className="py-10">
          <EmptyState
            icon={<Search size={26} className="text-gray-400" />}
            title="No matching actions"
            description="Try adjusting your filters or search query."
          />
        </Card>
      ) : (
        <Card className="py-12">
          <EmptyState
            icon={<InboxIcon size={26} className="text-gray-400" />}
            title="All caught up"
            description="No open actions assigned to you right now. New workflow items will appear here automatically."
          />
        </Card>
      )}
    </div>
  );
}
