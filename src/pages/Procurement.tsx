import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Package, Truck, Clock, Users, AlertTriangle,
  CheckCircle, FileText, TrendingDown, Plus, AlertCircle,
  ChevronRight, ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { ROLE_MATRIX } from '../lib/roleMatrix';
import {
  MOCK_PROCUREMENT_REQUESTS as MOCK_PROCUREMENT_REQUESTS_RAW,
  MOCK_PURCHASE_ORDERS as MOCK_PURCHASE_ORDERS_RAW,
  MOCK_SUPPLIERS as MOCK_SUPPLIERS_RAW,
  MOCK_PR_ITEMS as MOCK_PR_ITEMS_RAW,
} from '../data/mockProcurement';
import { mockOrEmpty } from '../lib/dataMode';

const MOCK_PROCUREMENT_REQUESTS = mockOrEmpty(MOCK_PROCUREMENT_REQUESTS_RAW);
const MOCK_PURCHASE_ORDERS = mockOrEmpty(MOCK_PURCHASE_ORDERS_RAW);
const MOCK_SUPPLIERS = mockOrEmpty(MOCK_SUPPLIERS_RAW);
const MOCK_PR_ITEMS = mockOrEmpty(MOCK_PR_ITEMS_RAW);

interface KpiItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  critical?: boolean;
  href: string;
}

interface WorkQueue {
  label: string;
  count: number;
  description: string;
  href: string;
  actionLabel: string;
  urgent?: boolean;
}

const CAN_CREATE = ['admin', 'operations_manager', 'procurement_user'];

export function Procurement() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role) : false;
  const matrix = role ? ROLE_MATRIX[role] : null;

  const [kpiData, setKpiData] = useState({
    newPRs: 0,
    prItemsWithoutPO: 0,
    poApprovalPending: 0,
    sentToSupplier: 0,
    delayedEta: 0,
    inTransit: 0,
    suppliersForReview: 0,
    fullyReceived: 0,
  });

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured) {
        const newPRs = MOCK_PROCUREMENT_REQUESTS.filter((pr) => pr.status === 'pr_received').length;
        const prItemsWithoutPO = MOCK_PR_ITEMS.filter((i) =>
          i.status === 'pending' || i.status === 'waiting_for_po_to_supplier'
        ).length;
        const poApprovalPending = MOCK_PURCHASE_ORDERS.filter((po) => po.po_status === 'pending_approval').length;
        const sentToSupplier = MOCK_PURCHASE_ORDERS.filter((po) => po.po_status === 'sent_to_supplier').length;
        const delayedEta = MOCK_PURCHASE_ORDERS.filter((po) => po.po_status === 'delayed').length;
        const inTransit = MOCK_PURCHASE_ORDERS.filter((po) => po.po_status === 'in_transit').length;
        const suppliersForReview = MOCK_SUPPLIERS.filter((s) => s.procurement_status === 'pending_review').length;
        const fullyReceived = MOCK_PURCHASE_ORDERS.filter((po) => po.po_status === 'fully_received').length;
        setKpiData({ newPRs, prItemsWithoutPO, poApprovalPending, sentToSupplier, delayedEta, inTransit, suppliersForReview, fullyReceived });
        return;
      }

      if (!supabase) return;
      const sb = supabase;

      const [prRes, itemsRes, pendingApprRes, sentRes, delayedRes, transitRes, suppRes, receivedRes] = await Promise.all([
        sb.from('procurement_requests').select('status', { count: 'exact' }).eq('status', 'pr_received'),
        sb.from('procurement_request_items').select('status', { count: 'exact' }).in('status', ['pending', 'waiting_for_po_to_supplier']),
        sb.from('purchase_orders_to_supplier').select('po_status', { count: 'exact' }).eq('po_status', 'pending_approval'),
        sb.from('purchase_orders_to_supplier').select('po_status', { count: 'exact' }).eq('po_status', 'sent_to_supplier'),
        sb.from('purchase_orders_to_supplier').select('po_status', { count: 'exact' }).eq('po_status', 'delayed'),
        sb.from('purchase_orders_to_supplier').select('po_status', { count: 'exact' }).eq('po_status', 'in_transit'),
        sb.from('approved_suppliers').select('procurement_status', { count: 'exact' }).eq('procurement_status', 'pending_review'),
        sb.from('purchase_orders_to_supplier').select('po_status', { count: 'exact' }).eq('po_status', 'fully_received'),
      ]);
      setKpiData({
        newPRs: prRes.count ?? 0,
        prItemsWithoutPO: itemsRes.count ?? 0,
        poApprovalPending: pendingApprRes.count ?? 0,
        sentToSupplier: sentRes.count ?? 0,
        delayedEta: delayedRes.count ?? 0,
        inTransit: transitRes.count ?? 0,
        suppliersForReview: suppRes.count ?? 0,
        fullyReceived: receivedRes.count ?? 0,
      });
    })();
  }, []);

  const kpis: KpiItem[] = [
    { label: 'New PRs', value: kpiData.newPRs, icon: <FileText size={16} />, colorClass: 'text-amber-700 bg-amber-50 border-amber-200', href: '/procurement/requests?status=pr_received' },
    { label: 'Items Without PO', value: kpiData.prItemsWithoutPO, icon: <Package size={16} />, colorClass: 'text-orange-700 bg-orange-50 border-orange-200', critical: kpiData.prItemsWithoutPO > 0, href: '/procurement/pr-items-without-po' },
    { label: 'PO Pending Approval', value: kpiData.poApprovalPending, icon: <AlertCircle size={16} />, colorClass: 'text-red-700 bg-red-50 border-red-200', critical: kpiData.poApprovalPending > 0, href: '/procurement/purchase-orders?status=pending_approval' },
    { label: 'Sent to Supplier', value: kpiData.sentToSupplier, icon: <ShoppingCart size={16} />, colorClass: 'text-sky-700 bg-sky-50 border-sky-200', href: '/procurement/purchase-orders?status=sent_to_supplier' },
    { label: 'Delayed ETA', value: kpiData.delayedEta, icon: <TrendingDown size={16} />, colorClass: 'text-red-700 bg-red-50 border-red-200', critical: kpiData.delayedEta > 0, href: '/procurement/purchase-orders?status=delayed' },
    { label: 'In Transit', value: kpiData.inTransit, icon: <Truck size={16} />, colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200', href: '/procurement/purchase-orders?status=in_transit' },
    { label: 'Suppliers for Review', value: kpiData.suppliersForReview, icon: <Users size={16} />, colorClass: 'text-gray-700 bg-gray-50 border-gray-200', href: '/procurement/suppliers?status=pending_review' },
    { label: 'Ready for Store', value: kpiData.fullyReceived, icon: <CheckCircle size={16} />, colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', href: '/procurement/purchase-orders?status=fully_received' },
  ];

  // One urgency-ordered Priority Queues block (replaces the previous 8 overlapping
  // work-queue cards). Order is fixed by urgency per the approved Artifact:
  // 1) Pending Approval  2) Items Without PO  3) Delayed ETA  4) New PRs.
  // All counts are derived from the same data already loaded above; all links and
  // query params are preserved.
  const priorityQueues: WorkQueue[] = [
    { label: 'POs Pending Approval', count: kpiData.poApprovalPending, description: 'High-value POs (≥ SAR 10,000) awaiting Admin / Operations Manager approval', href: '/procurement/purchase-orders?status=pending_approval', actionLabel: 'Review POs', urgent: kpiData.poApprovalPending > 0 },
    { label: 'PR Items Without PO', count: kpiData.prItemsWithoutPO, description: 'Approved items still waiting to be linked to a supplier PO', href: '/procurement/pr-items-without-po', actionLabel: 'Process Items', urgent: kpiData.prItemsWithoutPO > 0 },
    { label: 'Delayed ETA', count: kpiData.delayedEta, description: 'Supplier items with a missed ETA — escalate or update with a reason', href: '/procurement/purchase-orders?status=delayed', actionLabel: 'View Delayed', urgent: kpiData.delayedEta > 0 },
    { label: 'New PRs to Process', count: kpiData.newPRs, description: 'Purchase requests received — review and create POs', href: '/procurement/requests?status=pr_received', actionLabel: 'View PRs', urgent: kpiData.newPRs > 0 },
  ];

  const topActions = [
    { label: 'Register PR', icon: <Plus size={14} />, href: '/procurement/requests/new', color: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm', show: canCreate },
    { label: 'Create PO', icon: <ShoppingCart size={14} />, href: '/procurement/purchase-orders/new', color: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50', show: canCreate },
    { label: 'ETA Tracking', icon: <Clock size={14} />, href: '/procurement/eta-history', color: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50', show: true },
    { label: 'Suppliers', icon: <Users size={14} />, href: '/procurement/suppliers', color: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50', show: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement Dashboard"
        subtitle="Manage purchase requests, supplier POs, approvals, ETA updates, and supplier follow-up."
        breadcrumb={[{ label: 'Procurement' }]}
        actions={
          <div className="flex items-center gap-2">
            {matrix && (
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded ${matrix.badgeClass}`}>
                {matrix.label}
              </span>
            )}
            {!isSupabaseConfigured && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                Dev Mode
              </span>
            )}
          </div>
        }
      />

      {/* Governance banner */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
        <div className="space-y-0.5">
          <span className="font-semibold">Procurement Governance: </span>
          PO to Supplier &gt; SAR 10,000 requires Admin or Operations Manager approval before sending to supplier.
          Always link PRs to the correct project. Record ETA for all open POs.
          Supplier must be on the approved register before issuing a PO.
        </div>
      </div>

      {/* Top action bar */}
      <div className="flex flex-wrap gap-2">
        {topActions.filter((a) => a.show).map((action) => (
          <Link key={action.href} to={action.href}>
            <button className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${action.color}`}>
              {action.icon}
              {action.label}
            </button>
          </Link>
        ))}
      </div>

      {/* Compact KPI band — neutral by default, restrained red only for critical */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {kpis.map((kpi) => {
          const isCritical = !!kpi.critical && kpi.value > 0;
          return (
            <Link key={kpi.label} to={kpi.href} className="group block">
              <div className={`rounded-lg border bg-white px-3 py-2.5 hover:shadow-sm transition-all ${isCritical ? 'border-gray-200 border-l-4 border-l-red-500' : 'border-gray-200/80'}`}>
                <div className="flex items-center gap-2">
                  <span className={isCritical ? 'text-red-500' : 'text-gray-300'}>{kpi.icon}</span>
                  <span className={`text-xl font-bold tabular-nums ${isCritical ? 'text-red-700' : 'text-gray-900'}`}>
                    {kpi.value}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1 leading-tight group-hover:text-gray-700 transition-colors">
                  {kpi.label}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Priority Queues — single urgency-ordered block */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400 mb-3">Priority Queues</h2>
        <div className="rounded-lg border border-gray-200/80 bg-white divide-y divide-gray-100 overflow-hidden">
          {priorityQueues.map((queue) => {
            const isUrgent = queue.urgent && queue.count > 0;
            return (
              <Link key={queue.label} to={queue.href} className="group flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                <span className={`text-2xl font-bold tabular-nums w-12 shrink-0 ${isUrgent ? 'text-red-700' : queue.count === 0 ? 'text-gray-300' : 'text-gray-900'}`}>
                  {queue.count}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{queue.label}</span>
                    {isUrgent ? <Badge variant="critical">Action</Badge> : queue.count === 0 ? <Badge variant="success">Clear</Badge> : null}
                  </div>
                  <p className="text-xs text-gray-500 leading-snug mt-0.5">{queue.description}</p>
                </div>
                <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-brand-600 shrink-0">
                  {queue.actionLabel}
                  <ChevronRight size={12} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Procurement modules — compact navigation row */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400 mb-3">Procurement Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            { label: 'Purchase Requests', desc: 'Register and track incoming PRs', href: '/procurement/requests', icon: <FileText size={16} />, badge: kpiData.newPRs > 0 ? `${kpiData.newPRs} new` : undefined },
            { label: 'PO to Supplier', desc: 'Create and track supplier POs', href: '/procurement/purchase-orders', icon: <ShoppingCart size={16} />, badge: kpiData.poApprovalPending > 0 ? `${kpiData.poApprovalPending} pending approval` : undefined, badgeCritical: true },
            { label: 'PR Items Without PO', desc: 'Items still needing a PO', href: '/procurement/pr-items-without-po', icon: <AlertCircle size={16} />, badge: kpiData.prItemsWithoutPO > 0 ? `${kpiData.prItemsWithoutPO} items` : undefined, badgeCritical: kpiData.prItemsWithoutPO > 0 },
            { label: 'ETA Tracking', desc: 'Track and update ETAs for open POs', href: '/procurement/eta-history', icon: <Clock size={16} /> },
            { label: 'Approved Suppliers', desc: 'Register with procurement & QC status', href: '/procurement/suppliers', icon: <Users size={16} />, badge: kpiData.suppliersForReview > 0 ? `${kpiData.suppliersForReview} for review` : undefined },
            { label: 'Procurement Reports', desc: 'PR aging, PO status, ETA, suppliers', href: '/reports/procurement', icon: <FileText size={16} /> },
          ].map((item) => (
            <Link key={item.href} to={item.href} className="group flex items-center gap-3 rounded-lg border border-gray-200/80 bg-white px-3 py-2.5 hover:shadow-sm hover:border-gray-300 transition-all">
              <div className="w-8 h-8 bg-gray-50 rounded-md flex items-center justify-center shrink-0 text-gray-500 group-hover:text-brand-600 transition-colors">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.badgeCritical ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-snug truncate">{item.desc}</p>
              </div>
              <ArrowRight size={15} className="text-gray-300 group-hover:text-brand-500 shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
