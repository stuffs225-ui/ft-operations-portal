import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search, AlertTriangle, CalendarClock } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { MOCK_ETA_HISTORY, MOCK_PURCHASE_ORDERS } from '../data/mockProcurement';
import type { EtaChangeHistory, PurchaseOrder } from '../types';

type EntityTypeFilter = 'all' | 'po_to_supplier' | 'pr_item';
type EtaStatusFilter = 'all' | 'overdue' | 'this_week' | 'no_eta';
type ActiveView = 'current' | 'log';

const VIEW_TABS: { key: ActiveView; label: string }[] = [
  { key: 'current', label: 'Current ETA' },
  { key: 'log',     label: 'Change Log' },
];

const ENTITY_TYPE_TABS: { key: EntityTypeFilter; label: string }[] = [
  { key: 'all',            label: 'All' },
  { key: 'po_to_supplier', label: 'PO to Supplier' },
  { key: 'pr_item',        label: 'PR Item' },
];

const ETA_FILTER_OPTS: { key: EtaStatusFilter; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'overdue',   label: 'Overdue' },
  { key: 'this_week', label: 'Due This Week' },
  { key: 'no_eta',    label: 'No ETA' },
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

function poStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    draft:              { label: 'Draft',               variant: 'neutral' },
    pending_approval:   { label: 'Pending Approval',    variant: 'warning' },
    approved:           { label: 'Approved',            variant: 'success' },
    rejected:           { label: 'Rejected',            variant: 'critical' },
    sent_to_supplier:   { label: 'Sent to Supplier',    variant: 'info' },
    eta_confirmed:      { label: 'ETA Confirmed',       variant: 'info' },
    in_transit:         { label: 'In Transit',          variant: 'warning' },
    partially_received: { label: 'Partially Received',  variant: 'warning' },
    fully_received:     { label: 'Fully Received',      variant: 'success' },
    delayed:            { label: 'Delayed',             variant: 'critical' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function computeDaysDelta(oldEta: string | null, newEta: string | null): number | null {
  if (!oldEta || !newEta) return null;
  return Math.round(
    (new Date(newEta).getTime() - new Date(oldEta).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function DaysDelta({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-xs text-gray-400">—</span>;
  if (delta === 0) return <span className="text-xs text-gray-500">0 days</span>;
  if (delta > 0) return <span className="text-xs font-semibold text-red-600">+{delta}d (delay)</span>;
  return <span className="text-xs font-semibold text-green-600">{delta}d (improvement)</span>;
}

function EtaCountdown({ etaDate }: { etaDate: string | null }) {
  if (!etaDate) {
    return <span className="text-xs font-medium text-gray-400">Not set</span>;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eta = new Date(etaDate);
  const diffDays = Math.round((eta.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span className="text-xs font-semibold text-red-600">
        {Math.abs(diffDays)}d overdue
      </span>
    );
  }
  if (diffDays === 0) {
    return <span className="text-xs font-semibold text-amber-600">Today</span>;
  }
  if (diffDays <= 7) {
    return <span className="text-xs font-semibold text-amber-600">in {diffDays}d</span>;
  }
  return <span className="text-xs text-gray-600">in {diffDays}d</span>;
}

function nextAction(po: PurchaseOrder): string {
  if (!po.eta_date) return 'Set ETA';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(po.eta_date) < today) return 'Update ETA';
  if (po.po_status === 'pending_approval') return 'Awaiting Approval';
  if (po.po_status === 'approved') return 'Send to Supplier';
  if (po.po_status === 'sent_to_supplier' || po.po_status === 'eta_confirmed') return 'Confirm receipt';
  if (po.po_status === 'in_transit') return 'Track delivery';
  return 'Monitor';
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
  const [activeView, setActiveView] = useState<ActiveView>('current');

  // Current ETA state
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [posLoading, setPosLoading] = useState(true);
  const [etaFilter, setEtaFilter] = useState<EtaStatusFilter>('all');

  // Change Log state
  const [history, setHistory] = useState<EtaChangeHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeType, setActiveType] = useState<EntityTypeFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setPos(
          MOCK_PURCHASE_ORDERS.filter((po) => !['cancelled', 'closed'].includes(po.po_status)),
        );
        setPosLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('purchase_orders_to_supplier')
        .select('*, project:projects(project_code, customer_name)')
        .not('po_status', 'in', '(cancelled,closed)')
        .order('eta_date', { ascending: true, nullsFirst: false });
      if (error) console.error(error);
      setPos((data as unknown as PurchaseOrder[]) ?? []);
      setPosLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setHistory(
          [...MOCK_ETA_HISTORY].sort(
            (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
          ),
        );
        setHistoryLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('eta_change_history')
        .select('*, changed_by_profile:profiles!eta_change_history_changed_by_fkey(full_name)')
        .order('changed_at', { ascending: false });
      if (error) console.error(error);
      setHistory((data as unknown as EtaChangeHistory[]) ?? []);
      setHistoryLoading(false);
    })();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const filteredPos = pos.filter((po) => {
    if (etaFilter === 'no_eta') return !po.eta_date;
    if (etaFilter === 'overdue') {
      return !!po.eta_date && new Date(po.eta_date) < today;
    }
    if (etaFilter === 'this_week') {
      if (!po.eta_date) return false;
      const eta = new Date(po.eta_date);
      return eta >= today && eta <= weekEnd;
    }
    return true;
  });

  const overdueCount = pos.filter((po) => po.eta_date && new Date(po.eta_date) < today).length;
  const noEtaCount = pos.filter((po) => !po.eta_date).length;

  const filteredHistory = history.filter((entry) => {
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
        title="ETA Tracking"
        subtitle="Monitor current delivery ETAs and review ETA change history with reasons."
        icon={<CalendarClock size={18} />}
        breadcrumb={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'ETA Tracking' },
        ]}
        className="mb-6"
      />

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-xs text-red-800">
          <AlertTriangle size={14} className="shrink-0 text-red-600" />
          <span>
            <strong>{overdueCount} PO{overdueCount !== 1 ? 's' : ''}</strong> past their ETA.
            Review and update ETA with reason.
          </span>
        </div>
      )}

      {/* View toggle tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeView === tab.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.key === 'current' && overdueCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {overdueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Current ETA View ── */}
      {activeView === 'current' && (
        <div>
          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {ETA_FILTER_OPTS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setEtaFilter(opt.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  etaFilter === opt.key
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400 hover:text-brand-600'
                }`}
              >
                {opt.label}
                {opt.key === 'overdue' && overdueCount > 0 && (
                  <span className="ml-1 text-[10px] font-bold">({overdueCount})</span>
                )}
                {opt.key === 'no_eta' && noEtaCount > 0 && (
                  <span className="ml-1 text-[10px] font-bold">({noEtaCount})</span>
                )}
              </button>
            ))}
          </div>

          {posLoading ? (
            <PageLoader />
          ) : filteredPos.length === 0 ? (
            <EmptyState
              icon={<Clock size={28} />}
              title={
                etaFilter === 'overdue' ? 'No overdue ETAs' :
                etaFilter === 'this_week' ? 'No ETAs due this week' :
                etaFilter === 'no_eta' ? 'All active POs have ETAs set' :
                'No active purchase orders'
              }
              description={
                etaFilter === 'overdue' ? 'All active POs are within their expected delivery schedule.' :
                etaFilter === 'no_eta' ? 'Good — every active PO has an ETA recorded.' :
                'Approved POs will appear here once active.'
              }
            />
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">
                {filteredPos.length} {filteredPos.length === 1 ? 'order' : 'orders'}
              </p>
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">PO Number</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Supplier</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Project</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Current ETA</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Countdown</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Next Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredPos.map((po) => (
                        <tr key={po.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link
                              to={`/procurement/purchase-orders/${po.id}`}
                              className="font-mono font-semibold text-brand-600 hover:underline"
                            >
                              {po.po_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{po.supplier_name}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {po.project?.project_code ?? '—'}
                            </div>
                            {po.project?.customer_name && (
                              <div className="text-xs text-gray-500">{po.project.customer_name}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {po.eta_date ? formatDate(po.eta_date) : (
                              <span className="text-gray-400 italic">Not set</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <EtaCountdown etaDate={po.eta_date} />
                          </td>
                          <td className="px-4 py-3">{poStatusBadge(po.po_status)}</td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/procurement/purchase-orders/${po.id}?tab=eta`}
                              className="text-xs font-medium text-brand-600 hover:underline"
                            >
                              {nextAction(po)}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Change Log View ── */}
      {activeView === 'log' && (
        <div>
          {/* Search */}
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reason, remarks…"
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

          {historyLoading ? (
            <PageLoader />
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              icon={<Clock size={28} />}
              title="No ETA changes recorded"
              description={
                search
                  ? 'Try adjusting your search terms.'
                  : 'ETA changes recorded on PO detail pages will appear here with their reason and delta.'
              }
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Old ETA → New ETA</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Delta</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Reason</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Remarks</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Changed By</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Changed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHistory.map((entry) => {
                      const delta = computeDaysDelta(entry.old_eta, entry.new_eta);
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{entityTypeBadge(entry.entity_type)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-gray-500">
                                {entry.old_eta ? formatDate(entry.old_eta) : '—'}
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="font-medium text-gray-900">
                                {entry.new_eta ? formatDate(entry.new_eta) : '—'}
                              </span>
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
      )}
    </div>
  );
}
