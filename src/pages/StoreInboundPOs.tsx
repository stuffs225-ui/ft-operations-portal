// Store — Inbound Purchase Orders
// Every PO raised by Procurement is visible to the Store with ETA, quantity,
// description, and code — but NEVER the price. Reads go through the
// purchase_orders_to_supplier_safe / purchase_order_items_safe views
// (migration 060), which mask cost columns for store users at the database
// level; this page additionally never renders a value column.

import { Fragment, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PackageCheck, Search, ChevronDown, ChevronRight, Truck } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// POs the Store should expect: approved / dispatched, not yet fully received.
const INBOUND_STATUSES = [
  'approved', 'sent_to_supplier', 'eta_confirmed',
  'in_transit', 'partially_received', 'delayed',
];

interface InboundPO {
  id: string;
  po_number: string;
  project_id: string;
  procurement_request_id: string | null;
  supplier_name: string;
  po_date: string;
  eta_date: string | null;
  po_status: string;
}

interface InboundPOItem {
  purchase_order_id: string;
  item_code: string | null;
  item_name: string;
  description: string | null;
  quantity_ordered: number;
  unit: string;
  expected_arrival_date: string | null;
}

interface ProjectRef {
  id: string;
  project_code: string;
  so_number: string;
  customer_name: string;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    approved:           { label: 'Approved',           variant: 'success' },
    sent_to_supplier:   { label: 'Sent to Supplier',   variant: 'info' },
    eta_confirmed:      { label: 'ETA Confirmed',      variant: 'info' },
    in_transit:         { label: 'In Transit',         variant: 'warning' },
    partially_received: { label: 'Partially Received', variant: 'warning' },
    delayed:            { label: 'Delayed',            variant: 'critical' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function etaBadge(eta: string | null) {
  if (!eta) return <span className="text-gray-400">No ETA</span>;
  const days = Math.ceil((new Date(eta).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <Badge variant="critical">Overdue {Math.abs(days)}d</Badge>;
  if (days <= 7) return <Badge variant="warning">In {days}d</Badge>;
  return <span className="text-gray-700">{formatDate(eta)}</span>;
}

export function StoreInboundPOs() {
  const [pos, setPos] = useState<InboundPO[]>([]);
  const [itemsByPo, setItemsByPo] = useState<Record<string, InboundPOItem[]>>({});
  const [projects, setProjects] = useState<Record<string, ProjectRef>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Snapshot of "now" taken once on mount so render stays pure.
  const [loadedAt] = useState(() => Date.now());

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }
      const sb = supabase;

      const { data: poData, error: poError } = await sb
        .from('purchase_orders_to_supplier_safe')
        .select('id, po_number, project_id, procurement_request_id, supplier_name, po_date, eta_date, po_status')
        .in('po_status', INBOUND_STATUSES)
        .order('eta_date', { ascending: true, nullsFirst: false });

      if (poError) {
        setError(poError.message);
        setLoading(false);
        return;
      }

      const poList = (poData ?? []) as InboundPO[];
      setPos(poList);

      if (poList.length > 0) {
        const poIds = poList.map((p) => p.id);
        const projectIds = Array.from(new Set(poList.map((p) => p.project_id)));
        const [{ data: itemData }, { data: projData }] = await Promise.all([
          sb.from('purchase_order_items_safe')
            .select('purchase_order_id, item_code, item_name, description, quantity_ordered, unit, expected_arrival_date')
            .in('purchase_order_id', poIds),
          sb.from('projects')
            .select('id, project_code, so_number, customer_name')
            .in('id', projectIds),
        ]);

        const grouped: Record<string, InboundPOItem[]> = {};
        for (const item of (itemData ?? []) as InboundPOItem[]) {
          (grouped[item.purchase_order_id] ??= []).push(item);
        }
        setItemsByPo(grouped);

        const projMap: Record<string, ProjectRef> = {};
        for (const p of (projData ?? []) as ProjectRef[]) projMap[p.id] = p;
        setProjects(projMap);
      }

      setLoading(false);
    })();
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const filtered = pos.filter((po) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const proj = projects[po.project_id];
    return (
      po.po_number.toLowerCase().includes(q) ||
      po.supplier_name.toLowerCase().includes(q) ||
      (proj?.project_code ?? '').toLowerCase().includes(q) ||
      (proj?.so_number ?? '').toLowerCase().includes(q) ||
      (itemsByPo[po.id] ?? []).some((i) =>
        (i.item_code ?? '').toLowerCase().includes(q) || i.item_name.toLowerCase().includes(q),
      )
    );
  });

  const overdue = pos.filter((po) => po.eta_date && new Date(po.eta_date).getTime() < loadedAt).length;
  const thisWeek = pos.filter((po) => {
    if (!po.eta_date) return false;
    const days = (new Date(po.eta_date).getTime() - loadedAt) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 7;
  }).length;

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inbound Purchase Orders"
        subtitle="POs raised by Procurement, expected at the Store — ETA, quantities, codes, and descriptions. Prices are never shown."
        icon={<PackageCheck size={18} />}
        breadcrumb={[
          { label: 'Store Dashboard', href: '/store' },
          { label: 'Inbound POs' },
        ]}
        className="mb-2"
      />

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          Dev mode — inbound POs load from the live database only.
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Expected POs', value: pos.length, critical: false },
          { label: 'Arriving This Week', value: thisWeek, critical: false },
          { label: 'ETA Overdue', value: overdue, critical: overdue > 0 },
        ].map((k) => (
          <div key={k.label} className={`bg-white rounded-lg border px-3 py-2.5 ${k.critical ? 'border-gray-200 border-l-4 border-l-red-500' : 'border-gray-200/80'}`}>
            <div className={`text-xl font-bold tabular-nums ${k.critical ? 'text-red-700' : 'text-gray-900'}`}>{k.value}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search PO number, project, SO, supplier, item code…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<PackageCheck size={28} />}
          title="No inbound POs"
          description={search ? 'Try adjusting your search terms.' : 'No purchase orders are currently expected at the Store.'}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-8"></th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">PO Number</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">Project / SO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">Supplier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">ETA</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">Lines</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((po) => {
                  const proj = projects[po.project_id];
                  const items = itemsByPo[po.id] ?? [];
                  const isOpen = expanded.has(po.id);
                  return (
                    <Fragment key={po.id}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggle(po.id)}>
                        <td className="pl-3 text-gray-400">
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{po.po_number}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{proj?.project_code ?? '—'}</div>
                          <div className="text-xs text-gray-500">{proj ? `${proj.so_number} · ${proj.customer_name}` : ''}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{po.supplier_name}</td>
                        <td className="px-4 py-3">{statusBadge(po.po_status)}</td>
                        <td className="px-4 py-3">{etaBadge(po.eta_date)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{items.length}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Link to={`/store/receipts/new?po=${po.id}`}>
                            <Button size="sm" variant="secondary" icon={<Truck size={13} />}>Receive</Button>
                          </Link>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-gray-50/60">
                          <td></td>
                          <td colSpan={7} className="px-4 py-3">
                            {items.length === 0 ? (
                              <p className="text-xs text-gray-400">No line items recorded on this PO.</p>
                            ) : (
                              <table className="w-full text-xs bg-white border border-gray-100 rounded-lg overflow-hidden">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="text-left px-3 py-2 font-medium text-gray-500">Code</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-500">Description</th>
                                    <th className="text-right px-3 py-2 font-medium text-gray-500">Qty</th>
                                    <th className="text-left px-3 py-2 font-medium text-gray-500">Line ETA</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td className="px-3 py-2 font-mono text-gray-700">{item.item_code ?? '—'}</td>
                                      <td className="px-3 py-2 text-gray-800">
                                        {item.item_name}
                                        {item.description && item.description !== item.item_name && (
                                          <span className="text-gray-400"> — {item.description}</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-right tabular-nums">{item.quantity_ordered} {item.unit}</td>
                                      <td className="px-3 py-2 text-gray-600">{formatDate(item.expected_arrival_date)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
