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

  const workQueues: WorkQueue[] = [
    { label: 'New PRs to Process', count: kpiData.newPRs, description: 'Purchase requests received — review and create POs', href: '/procurement/requests', actionLabel: 'View PRs', urgent: kpiData.newPRs > 0 },
    { label: 'PR Items Without PO', count: kpiData.prItemsWithoutPO, description: 'Items waiting to be linked to a supplier PO', href: '/procurement/pr-items-without-po', actionLabel: 'Process Items', urgent: kpiData.prItemsWithoutPO > 0 },
    { label: 'POs Pending Approval', count: kpiData.poApprovalPending, description: 'High-value POs (> SAR 10,000) awaiting manager approval', href: '/procurement/purchase-orders', actionLabel: 'View POs', urgent: kpiData.poApprovalPending > 0 },
    { label: 'Awaiting Supplier Response', count: kpiData.sentToSupplier, description: 'POs sent — follow up for acknowledgement and ETA', href: '/procurement/purchase-orders', actionLabel: 'View POs' },
    { label: 'ETA Updates Due', count: kpiData.inTransit + kpiData.delayedEta, description: 'In-transit and delayed items needing ETA tracking', href: '/procurement/eta-history', actionLabel: 'ETA Tracking' },
    { label: 'Delayed Deliveries', count: kpiData.delayedEta, description: 'Supplier items with missed ETA — escalate or update', href: '/procurement/purchase-orders', actionLabel: 'View Delayed', urgent: kpiData.delayedEta > 0 },
    { label: 'Materials in Transit', count: kpiData.inTransit, description: 'POs confirmed in transit — expect this week', href: '/procurement/purchase-orders', actionLabel: 'Track Transit' },
    { label: 'Suppliers for Review', count: kpiData.suppliersForReview, description: 'Supplier records pending procurement approval', href: '/procurement/suppliers', actionLabel: 'Review Suppliers' },
  ];

  const topActions = [
    { label: 'Register PR', icon: <Plus size={14} />, href: '/procurement/requests/new', color: 'bg-amber-600 hover:bg-amber-700 text-white', show: canCreate },
    { label: 'Create PO', icon: <ShoppingCart size={14} />, href: '/procurement/purchase-orders/new', color: 'bg-amber-700 hover:bg-amber-800 text-white', show: canCreate },
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

      {/* KPI Strip — 4×2 grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Link key={kpi.label} to={kpi.href} className="group block">
            <div className={`rounded-lg border border-gray-200/80 p-4 bg-white hover:shadow-md transition-all ${kpi.critical ? 'border-l-4 border-l-red-500' : ''}`}>
              <div className={`inline-flex p-2 rounded-lg mb-2 border ${kpi.colorClass}`}>{kpi.icon}</div>
              <div className={`text-2xl font-bold tabular-nums ${kpi.critical && kpi.value > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                {kpi.value}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 leading-tight group-hover:text-gray-700 transition-colors">
                {kpi.label}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Work Queues */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Work Queues</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {workQueues.map((queue) => (
            <Link key={queue.label} to={queue.href} className="group block">
              <div className={`rounded-lg border border-gray-200/80 p-4 bg-white h-full hover:shadow-md hover:border-amber-300 transition-all ${queue.urgent && queue.count > 0 ? 'border-amber-300 bg-amber-50/50' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xl font-bold tabular-nums ${queue.urgent && queue.count > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                    {queue.count}
                  </span>
                  {queue.urgent && queue.count > 0 ? (
                    <Badge variant="warning">Action</Badge>
                  ) : queue.count === 0 ? (
                    <Badge variant="success">Clear</Badge>
                  ) : null}
                </div>
                <div className="text-xs font-semibold text-gray-900 mb-1 group-hover:text-amber-700 transition-colors">
                  {queue.label}
                </div>
                <div className="text-xs text-gray-500 leading-relaxed mb-2">{queue.description}</div>
                <div className="flex items-center gap-1 text-xs font-medium text-amber-700">
                  {queue.actionLabel}
                  <ChevronRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick navigation */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Procurement Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Purchase Requests', desc: 'Register and track all incoming PRs', href: '/procurement/requests', icon: <FileText size={18} />, badge: kpiData.newPRs > 0 ? `${kpiData.newPRs} new` : undefined },
            { label: 'PO to Supplier', desc: 'Create, track, and approve supplier POs', href: '/procurement/purchase-orders', icon: <ShoppingCart size={18} />, badge: kpiData.poApprovalPending > 0 ? `${kpiData.poApprovalPending} pending approval` : undefined, badgeCritical: true },
            { label: 'PR Items Without PO', desc: 'Quick queue for items still needing a PO', href: '/procurement/pr-items-without-po', icon: <AlertCircle size={18} />, badge: kpiData.prItemsWithoutPO > 0 ? `${kpiData.prItemsWithoutPO} items` : undefined, badgeCritical: kpiData.prItemsWithoutPO > 0 },
            { label: 'ETA Tracking', desc: 'Track and update ETAs for all open POs', href: '/procurement/eta-history', icon: <Clock size={18} /> },
            { label: 'Approved Suppliers', desc: 'Supplier register with procurement and QC status', href: '/procurement/suppliers', icon: <Users size={18} />, badge: kpiData.suppliersForReview > 0 ? `${kpiData.suppliersForReview} for review` : undefined },
            { label: 'Procurement Reports', desc: 'PR aging, PO status, ETA delay, supplier reports', href: '/reports/procurement', icon: <FileText size={18} /> },
          ].map((item) => (
            <Link key={item.href} to={item.href} className="group block">
              <div className="rounded-lg border border-gray-200/80 bg-white p-4 h-full hover:shadow-md hover:border-amber-300 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center shrink-0 text-amber-700">
                    {item.icon}
                  </div>
                  <ArrowRight size={16} className="text-gray-300 group-hover:text-amber-500 mt-1 transition-colors" />
                </div>
                <div className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-amber-700 transition-colors">
                  {item.label}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-2">{item.desc}</p>
                {item.badge && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${item.badgeCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
