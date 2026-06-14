import { useNavigate, Link } from 'react-router-dom';
import {
  AlertTriangle, AlertCircle, ShoppingCart, PackageCheck, Truck,
  ClipboardX, ShieldAlert, Package, FileText, TrendingUp, TrendingDown,
  Minus, ArrowRight, Send, CheckCircle, Wrench, Calendar, Clock,
  ClipboardCheck, FileCheck, Plane, FileSearch, BarChart2, Activity,
  FolderKanban, Warehouse, Factory, Microscope, BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '@/components/common/page-header';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { DASHBOARD_KPI_CARDS, AFS_KPI_CARDS, PROJECT_SUMMARY } from '../data/mockDashboard';
import { mockOrEmpty, mockOrValue, isLiveMode } from '../lib/dataMode';
import { useAuth } from '../hooks/useAuth';
import type { KpiCard, UserRole } from '../types';
import { cn } from '../lib/utils';

const EMPTY_SUMMARY: typeof PROJECT_SUMMARY = {
  totalActive: 0, saudi: 0, dubai: 0, withWO: 0,
  withPN: 0, inProduction: 0, inQC: 0, readyToDeliver: 0,
};

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, AlertTriangle, AlertCircle, ShoppingCart, PackageCheck,
  Truck, ClipboardX, ShieldAlert, Package, Send, CheckCircle, Wrench, Calendar, Clock,
  ClipboardCheck, FileCheck, Plane, FileSearch, BarChart2, Activity,
};

const severityConfig = {
  normal:   { border: 'border-l-green-400',  badge: 'bg-green-50 text-green-700',  dot: 'bg-green-400' },
  warning:  { border: 'border-l-amber-400',  badge: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-400' },
  critical: { border: 'border-l-red-500',    badge: 'bg-red-50 text-red-700',      dot: 'bg-red-500'   },
  info:     { border: 'border-l-sky-400',    badge: 'bg-sky-50 text-sky-700',      dot: 'bg-sky-400'   },
};

type ModuleTile = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  iconClass: string;
  borderClass: string;
  roles?: UserRole[];
};

const MODULE_TILES: ModuleTile[] = [
  { id: 'quotations',   label: 'Quotations',       path: '/quotations',   icon: FileText,     iconClass: 'text-blue-600',    borderClass: 'border-l-blue-400',    roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'] },
  { id: 'sales',        label: 'Sales Workspace',  path: '/sales',        icon: TrendingUp,   iconClass: 'text-emerald-600', borderClass: 'border-l-emerald-400', roles: ['admin','operations_manager','sales_user'] },
  { id: 'projects',     label: 'Projects / SO',    path: '/projects',     icon: FolderKanban, iconClass: 'text-indigo-600',  borderClass: 'border-l-indigo-400'  },
  { id: 'procurement',  label: 'Procurement',      path: '/procurement',  icon: ShoppingCart, iconClass: 'text-amber-600',   borderClass: 'border-l-amber-400',   roles: ['admin','operations_manager','procurement_user'] },
  { id: 'factory',      label: 'Factory',          path: '/factory',      icon: Factory,      iconClass: 'text-orange-600',  borderClass: 'border-l-orange-400',  roles: ['admin','operations_manager','factory_user'] },
  { id: 'store',        label: 'Store / Warehouse',path: '/store',        icon: Warehouse,    iconClass: 'text-teal-600',    borderClass: 'border-l-teal-400',    roles: ['admin','operations_manager','store_user'] },
  { id: 'material-qc',  label: 'Material QC',      path: '/material-qc',  icon: Microscope,   iconClass: 'text-purple-600',  borderClass: 'border-l-purple-400',  roles: ['admin','operations_manager','qc_user'] },
  { id: 'project-qc',   label: 'Project QC',       path: '/project-qc',   icon: ClipboardCheck,iconClass:'text-violet-600', borderClass: 'border-l-violet-400',  roles: ['admin','operations_manager','qc_user'] },
  { id: 'dubai-afs',    label: 'Dubai / AFS',      path: '/dubai-afs',    icon: Plane,        iconClass: 'text-sky-600',     borderClass: 'border-l-sky-400',     roles: ['admin','operations_manager','afs_user'] },
  { id: 'after-sales',  label: 'After Sales',      path: '/after-sales',  icon: Wrench,       iconClass: 'text-rose-600',    borderClass: 'border-l-rose-400',    roles: ['admin','operations_manager','afs_user'] },
  { id: 'reports',      label: 'Reports Hub',      path: '/reports',      icon: BarChart2,    iconClass: 'text-cyan-600',    borderClass: 'border-l-cyan-400',    roles: ['admin','operations_manager','procurement_user','factory_user','store_user','qc_user','afs_user','sales_coordinator','viewer'] },
  { id: 'control-tower',label: 'Control Tower',    path: '/control-tower',icon: BarChart3,    iconClass: 'text-purple-600',  borderClass: 'border-l-purple-500',  roles: ['admin','operations_manager','viewer'] },
];

function KpiCardItem({ card }: { card: KpiCard }) {
  const navigate = useNavigate();
  const Icon = ICON_MAP[card.icon] ?? FileText;
  const sc = severityConfig[card.severity];

  return (
    <div
      onClick={() => navigate(card.path)}
      className={cn(
        'bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-5 cursor-pointer',
        'hover:shadow-md hover:border-gray-300 transition-all',
        sc.border,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg', sc.badge)}>
          <Icon size={18} />
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          {card.trend === 'up'      && <TrendingUp size={12} className="text-red-400" />}
          {card.trend === 'down'    && <TrendingDown size={12} className="text-green-400" />}
          {card.trend === 'neutral' && <Minus size={12} />}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{card.value}</div>
      <div className="text-sm font-semibold text-gray-700 mb-1">{card.title}</div>
      {card.subtitle && (
        <div className="text-xs text-gray-500 leading-snug">{card.subtitle}</div>
      )}
    </div>
  );
}

export function Dashboard() {
  const { role } = useAuth();
  const summary = mockOrValue(PROJECT_SUMMARY, EMPTY_SUMMARY);
  const dashboardCards = mockOrEmpty(DASHBOARD_KPI_CARDS);
  const afsCards = mockOrEmpty(AFS_KPI_CARDS);
  const visibleModuleTiles = MODULE_TILES.filter(
    (t) => !t.roles || !role || t.roles.includes(role) || role === 'admin',
  );

  return (
    <div>
      <PageHeader
        title="Operations Control Tower"
        subtitle="Operational status across all modules"
        breadcrumb={[{ label: 'Dashboard' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {isLiveMode() && (
        <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6 text-xs text-gray-600">
          <Activity size={15} className="shrink-0 mt-0.5 text-gray-400" />
          <span>
            Summary figures populate from the module pages and Reports. Open any module below
            for current, role-specific detail.
          </span>
        </div>
      )}

      {/* Project Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {[
          { label: 'Active Projects', value: summary.totalActive, color: 'text-brand-700' },
          { label: 'Saudi Route', value: summary.saudi, color: 'text-blue-700' },
          { label: 'Dubai Route', value: summary.dubai, color: 'text-sky-700' },
          { label: 'With WO', value: summary.withWO, color: 'text-green-700' },
          { label: 'With PN', value: summary.withPN, color: 'text-teal-700' },
          { label: 'In Production', value: summary.inProduction, color: 'text-amber-700' },
          { label: 'In QC', value: summary.inQC, color: 'text-purple-700' },
          { label: 'Ready to Deliver', value: summary.readyToDeliver, color: 'text-green-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
            <div className={cn('text-xl font-bold', item.color)}>{item.value}</div>
            <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{item.label}</div>
          </div>
        ))}
      </div>

      {/* KPI Cards Grid — hidden in live mode until module data is wired (Phase 2+) */}
      {dashboardCards.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-600 rounded-full inline-block" />
            Critical Operational Indicators
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
            {dashboardCards.map((card) => (
              <KpiCardItem key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}

      {/* Dubai / AFS & After Sales KPIs — hidden in live mode until module data is wired */}
      {afsCards.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-sky-600 rounded-full inline-block" />
            Dubai / AFS &amp; After Sales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {afsCards.map((card) => (
              <KpiCardItem key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}

      {/* Your Modules — role-filtered static launcher, no data fetching */}
      {visibleModuleTiles.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-500 rounded-full inline-block" />
            Your Modules
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {visibleModuleTiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <Link key={tile.id} to={tile.path} className="group">
                  <div className={cn(
                    'bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm px-4 py-3',
                    'hover:shadow-md hover:border-gray-300 transition-all',
                    tile.borderClass,
                  )}>
                    <Icon size={16} className={cn('mb-2', tile.iconClass)} />
                    <div className="text-xs font-semibold text-gray-800 group-hover:text-gray-600 transition-colors leading-tight">
                      {tile.label}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Governance Rules Banner */}
      <Card className="bg-brand-950 border-brand-800 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="text-xs font-semibold text-brand-300 mb-1 uppercase tracking-wide">
              Governance Golden Rules — Active
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-brand-200">
              {[
                'SO = commercial reference. WO = mandatory for Saudi. PN = mandatory for Dubai.',
                'No BOQ, BOM, drawings, or Raw Material Requests before WO (Saudi).',
                'No Dubai ETA, Dubai PO, or AFS readiness before PN (Dubai).',
                'PO to Supplier > 10,000 SAR requires Admin or Operations Manager approval.',
                'Temporary Custody requires Admin or Operations Manager approval.',
                'Release Note blocked until all QC findings and rework are closed.',
                'Medical items must be tracked by serial number.',
                'Vehicle receiving requires chassis number and photos.',
              ].map((rule) => (
                <div key={rule} className="flex items-start gap-2">
                  <span className="text-brand-400 shrink-0 mt-0.5">▸</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="shrink-0 hidden lg:flex flex-col items-end gap-1 text-brand-400 text-xs">
            <span>Playbook v3.2</span>
            <ArrowRight size={16} />
          </div>
        </div>
      </Card>
    </div>
  );
}
