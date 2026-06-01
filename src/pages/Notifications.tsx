import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Settings, CheckCheck, Info, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_NOTIFICATIONS, unreadCount } from '../data/mockNotifications';
import { markNotificationRead } from '../lib/notifications';
import { formatDate, cn } from '../lib/utils';
import type { AppNotification, NotificationSeverity } from '../types';

type SeverityFilter = 'all' | NotificationSeverity;

const SEVERITY_FILTERS: { key: SeverityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'routine', label: 'Routine' },
  { key: 'important', label: 'Important' },
  { key: 'critical', label: 'Critical' },
];

function severityDot(severity: NotificationSeverity) {
  const color =
    severity === 'critical' ? 'bg-red-500' : severity === 'important' ? 'bg-amber-500' : 'bg-gray-400';
  return <span className={cn('inline-block w-2.5 h-2.5 rounded-full shrink-0 mt-1.5', color)} />;
}

function severityBadge(severity: NotificationSeverity) {
  const variant = severity === 'critical' ? 'critical' : severity === 'important' ? 'warning' : 'neutral';
  return <Badge variant={variant} size="sm">{severity}</Badge>;
}

export function Notifications() {
  const { profile } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setItems(MOCK_NOTIFICATIONS.filter((n) => n.channel === 'in_app'));
      setLoading(false);
      return;
    }
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('channel', 'in_app')
      .order('created_at', { ascending: false });
    if (profile?.id) query = query.eq('user_id', profile.id);
    query.then(({ data, error }) => {
      if (error) console.error(error);
      setItems((data as unknown as AppNotification[]) ?? []);
      setLoading(false);
    });
  }, [profile?.id]);

  const modules = Array.from(new Set(items.map((n) => n.module_name).filter((m): m is string => !!m)));

  const filtered = items.filter((n) => {
    if (severity !== 'all' && n.severity !== severity) return false;
    if (moduleFilter !== 'all' && n.module_name !== moduleFilter) return false;
    return true;
  });

  const unread = unreadCount(items);

  async function handleMarkRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString(), delivery_status: 'read' } : n)),
    );
    await markNotificationRead(id);
  }

  async function handleMarkAll() {
    const now = new Date().toISOString();
    const unreadIds = items.filter((n) => n.read_at === null).map((n) => n.id);
    setItems((prev) => prev.map((n) => (n.read_at === null ? { ...n, read_at: now, delivery_status: 'read' } : n)));
    await Promise.all(unreadIds.map((id) => markNotificationRead(id)));
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        icon={<Bell size={18} />}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<CheckCheck size={14} />} onClick={handleMarkAll} disabled={unread === 0}>
              Mark all as read
            </Button>
            <Link to="/notifications/settings">
              <Button variant="ghost" size="sm" icon={<Settings size={14} />}>Settings</Button>
            </Link>
          </div>
        }
      />

      {!isSupabaseConfigured && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Dev Mode</span> — Showing mock in-app notifications.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setSeverity(f.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                severity === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-brand-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} />}
          title="No notifications"
          description="You have no notifications matching the current filters."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {filtered.map((n) => {
            const isUnread = n.read_at === null;
            return (
              <div
                key={n.id}
                className={cn('flex items-start gap-3 px-4 py-3.5 transition-colors', isUnread ? 'bg-blue-50' : 'hover:bg-gray-50')}
              >
                {severityDot(n.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{n.title}</span>
                    {n.module_name && <Badge variant="info" size="sm">{n.module_name}</Badge>}
                    {severityBadge(n.severity)}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  <div className="text-[11px] text-gray-400 mt-1">{formatDate(n.created_at)}</div>
                </div>
                {isUnread && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium shrink-0"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
