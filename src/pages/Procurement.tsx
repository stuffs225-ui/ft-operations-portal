import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Package, Truck, Clock, Users, AlertTriangle,
  CheckCircle, ChevronRight, FileText, TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  MOCK_PROCUREMENT_REQUESTS as MOCK_PROCUREMENT_REQUESTS_RAW,
  MOCK_PURCHASE_ORDERS as MOCK_PURCHASE_ORDERS_RAW,
  MOCK_SUPPLIERS as MOCK_SUPPLIERS_RAW,
} from '../data/mockProcurement';
import { mockOrEmpty } from '../lib/dataMode';

const MOCK_PROCUREMENT_REQUESTS = mockOrEmpty(MOCK_PROCUREMENT_REQUESTS_RAW);
const MOCK_PURCHASE_ORDERS = mockOrEmpty(MOCK_PURCHASE_ORDERS_RAW);
const MOCK_SUPPLIERS = mockOrEmpty(MOCK_SUPPLIERS_RAW);

interface KpiItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

export function Procurement() {
  const { role } = useAuth();

  const [openPRs, setOpenPRs] = useState(0);
  const [prItemsWithoutPO, setPrItemsWithoutPO] = useState(0);
  const [poApprovalPending, setPoApprovalPending] = useState(0);
  const [inTransit, setInTransit] = useState(0);
  const [delayed, setDelayed] = useState(0);

  const canSeeCost = ['admin', 'operations_manager', 'procurement_user'].includes(role ?? '');
  const canSeeApprovalQueue = role === 'admin' || role === 'operations_manager';

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const nonClosedPRs = MOCK_PROCUREMENT_REQUESTS.filter(
        (pr) => !['cancelled', 'closed'].includes(pr.status),
      ).length;
      setOpenPRs(nonClosedPRs);

      // Count PR items without PO — using mock PR data: PRs in waiting/pending states
      const itemsWithoutPO = MOCK_PROCUREMENT_REQUESTS.filter(
        (pr) => pr.status === 'pr_received' || pr.status === 'in_progress',
      ).length;
      setPrItemsWithoutPO(itemsWithoutPO);

      const pendingApproval = MOCK_PURCHASE_ORDERS.filter(
        (po) => po.po_status === 'pending_approval',
      ).length;
      setPoApprovalPending(pendingApproval);

      const transit = MOCK_PURCHASE_ORDERS.filter(
        (po) => po.po_status === 'in_transit',
      ).length;
      setInTransit(transit);

      const delayedPOs = MOCK_PURCHASE_ORDERS.filter(
        (po) => po.po_status === 'delayed',
      ).length;
      setDelayed(delayedPOs);
      return;
    }
    // Supabase mode — use mock as fallback until real fetch implemented
    setOpenPRs(MOCK_PROCUREMENT_REQUESTS.filter((pr) => !['cancelled', 'closed'].includes(pr.status)).length);
    setPrItemsWithoutPO(2);
    setPoApprovalPending(MOCK_PURCHASE_ORDERS.filter((po) => po.po_status === 'pending_approval').length);
    setInTransit(MOCK_PURCHASE_ORDERS.filter((po) => po.po_status === 'in_transit').length);
    setDelayed(0);
  }, []);

  // Suppress unused supplier count warning — used as supplier badge
  const _supplierCount = MOCK_SUPPLIERS.length;
  void _supplierCount;

  const kpis: KpiItem[] = [
    { label: 'Open PRs', value: openPRs, icon: <FileText size={18} />, color: 'text-sky-700 bg-sky-50' },
    { label: 'PR Items Without PO', value: prItemsWithoutPO, icon: <Package size={18} />, color: 'text-amber-700 bg-amber-50' },
    { label: 'PO Approval Pending', value: poApprovalPending, icon: <ShoppingCart size={18} />, color: 'text-red-700 bg-red-50' },
    { label: 'Materials In Transit', value: inTransit, icon: <Truck size={18} />, color: 'text-sky-700 bg-sky-50' },
    { label: 'Delayed Items', value: delayed, icon: <AlertTriangle size={18} />, color: 'text-red-700 bg-red-50' },
  ];

  const sections = [
    {
      title: 'Purchase Requests',
      description: 'Manage incoming PRs from production and engineering.',
      icon: <FileText size={20} className="text-brand-600" />,
      path: '/procurement/requests',
      badge: openPRs > 0 ? `${openPRs} open` : undefined,
      badgeVariant: 'info' as const,
    },
    {
      title: 'PO to Supplier',
      description: 'Create and track Purchase Orders sent to suppliers.',
      icon: <ShoppingCart size={20} className="text-brand-600" />,
      path: '/procurement/purchase-orders',
      badge: poApprovalPending > 0 ? `${poApprovalPending} pending approval` : undefined,
      badgeVariant: 'warning' as const,
    },
    {
      title: 'ETA History',
      description: 'Full log of all ETA changes with reasons and audit trail.',
      icon: <Clock size={20} className="text-brand-600" />,
      path: '/procurement/eta-history',
      badge: undefined,
      badgeVariant: 'neutral' as const,
    },
    {
      title: 'Approved Suppliers',
      description: 'Manage the approved supplier register and QC assessments.',
      icon: <Users size={20} className="text-brand-600" />,
      path: '/procurement/suppliers',
      badge: `${MOCK_SUPPLIERS.length} suppliers`,
      badgeVariant: 'neutral' as const,
    },
  ];

  if (canSeeApprovalQueue) {
    sections.push({
      title: 'PO Approval Queue',
      description: 'Review and approve high-value POs (> 10,000 SAR) before sending to supplier.',
      icon: <CheckCircle size={20} className="text-brand-600" />,
      path: '/admin-approvals',
      badge: poApprovalPending > 0 ? `${poApprovalPending} awaiting` : undefined,
      badgeVariant: 'warning' as const,
    });
  }

  return (
    <div>
      <PageHeader
        title="Procurement"
        subtitle="Purchase Requests, PO to Supplier, ETA tracking, and approved suppliers."
        breadcrumb={[{ label: 'Procurement' }]}
        actions={
          !isSupabaseConfigured ? (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <span className="w-2 h-2 bg-amber-400 rounded-full" />
              Dev Mode
            </div>
          ) : undefined
        }
      />

      {/* Governance note */}
      <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg px-4 py-3 mb-6 text-xs text-sky-800">
        <TrendingUp size={14} className="shrink-0 mt-0.5 text-sky-600" />
        <span>
          <strong>Governance:</strong> PO to Supplier &gt; 10,000 SAR requires Admin or Operations Manager approval before sending.
          Use <em>PO to Supplier</em> — never use the term &ldquo;BO&rdquo;.
        </span>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 text-center">
            <div className={`inline-flex p-2 rounded-lg mb-2 ${kpi.color}`}>{kpi.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-0.5 leading-tight">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Cost visibility notice */}
      {!canSeeCost && (
        <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6 text-xs text-gray-600">
          <AlertTriangle size={13} className="shrink-0 mt-0.5 text-gray-400" />
          <span>Purchase cost values are hidden for your role.</span>
        </div>
      )}

      {/* Section navigation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link key={section.path} to={section.path} className="block group">
            <Card className="p-5 h-full hover:shadow-md hover:border-brand-300 transition-all cursor-pointer group-hover:bg-brand-50/30">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                  {section.icon}
                </div>
                <ChevronRight size={18} className="text-gray-400 group-hover:text-brand-500 transition-colors mt-1" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{section.title}</h3>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">{section.description}</p>
              {section.badge && (
                <Badge variant={section.badgeVariant}>{section.badge}</Badge>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
