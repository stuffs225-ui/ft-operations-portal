import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, AlertCircle, ShoppingCart, PackageCheck, Truck,
  ClipboardX, ShieldAlert, Package, FileText, TrendingUp, TrendingDown,
  Minus, Send, CheckCircle, Wrench, Calendar, Clock,
  ClipboardCheck, FileCheck, Plane, FileSearch, BarChart2, Activity,
  FolderKanban, Warehouse, Factory, Microscope, BarChart3,
  Inbox, Flame, GitBranch, ShieldCheck, UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { DASHBOARD_KPI_CARDS, AFS_KPI_CARDS, PROJECT_SUMMARY } from '../data/mockDashboard';
import { mockOrEmpty, isLiveMode } from '../lib/dataMode';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { KpiCard, UserRole } from '../types';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Role-aware subtitle ──────────────────────────────────────────────────────

const ROLE_SUBTITLES: Partial<Record<UserRole, string>> = {
  admin:               'Full system access across all modules and governance',
  operations_manager:  'Operations oversight across execution, quality, and approvals',
  sales_user:          'Commercial pipeline, quotations, and project status',
  sales_coordinator:   'Quotation coordination and commercial workflow',
  procurement_user:    'Procurement requests, purchase orders, and supplier management',
  factory_user:        'Production execution, work orders, and factory operations',
  store_user:          'Inventory, warehouse, vehicle receiving, and custody',
  qc_user:             'Quality inspections, NCRs, and release management',
  afs_user:            'Dubai/AFS coordination and after-sales maintenance',
  viewer:              'Read-only operational overview and reporting',
};

// ─── My Work quick-access ─────────────────────────────────────────────────────

type QuickCard = {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  iconClass: string;
  borderClass: string;
  roles?: UserRole[];
};

const MY_WORK_CARDS: QuickCard[] = [
  // Universal
  {
    id: 'inbox',
    label: 'Action Inbox',
    description: 'Pending actions and tasks',
    path: '/inbox',
    icon: Inbox,
    iconClass: 'text-brand-600',
    borderClass: 'border-l-brand-500',
  },
  // Admin / Ops
  {
    id: 'approvals',
    label: 'Pending Approvals',
    description: 'Review SO and PO approval queue',
    path: '/admin-approvals',
    icon: ShieldCheck,
    iconClass: 'text-slate-600',
    borderClass: 'border-l-slate-400',
    roles: ['admin', 'operations_manager'],
  },
  // Sales coordinator
  {
    id: 'coordinator-queue',
    label: 'Coordinator Queue',
    description: 'Process quotations and updates',
    path: '/sales-coordinator',
    icon: UserCheck,
    iconClass: 'text-emerald-600',
    borderClass: 'border-l-emerald-400',
    roles: ['sales_coordinator'],
  },
  // Factory
  {
    id: 'wo-pn-shortcut',
    label: 'WO / PN Gate',
    description: 'Work orders and project numbers',
    path: '/wo-pn-gate',
    icon: GitBranch,
    iconClass: 'text-green-700',
    borderClass: 'border-l-green-500',
    roles: ['factory_user'],
  },
  {
    id: 'factory-records',
    label: 'Production Records',
    description: 'BOQ, BOM, and production progress',
    path: '/factory',
    icon: Factory,
    iconClass: 'text-orange-600',
    borderClass: 'border-l-orange-400',
    roles: ['factory_user'],
  },
  // Procurement
  {
    id: 'proc-requests',
    label: 'Procurement Requests',
    description: 'Open PRs awaiting action',
    path: '/procurement/requests',
    icon: ShoppingCart,
    iconClass: 'text-amber-600',
    borderClass: 'border-l-amber-400',
    roles: ['procurement_user'],
  },
  {
    id: 'proc-pos',
    label: 'Purchase Orders',
    description: 'Active POs and ETA tracking',
    path: '/procurement/purchase-orders',
    icon: FileCheck,
    iconClass: 'text-yellow-700',
    borderClass: 'border-l-yellow-500',
    roles: ['procurement_user'],
  },
  // Store
  {
    id: 'store-receiving',
    label: 'Receiving Queue',
    description: 'Pending material receipts (GRN)',
    path: '/store',
    icon: Warehouse,
    iconClass: 'text-cyan-600',
    borderClass: 'border-l-cyan-400',
    roles: ['store_user'],
  },
  {
    id: 'vehicle-receiving-shortcut',
    label: 'Vehicle Receiving',
    description: 'Chassis, photos, serial tracking',
    path: '/store/vehicle-receiving',
    icon: Truck,
    iconClass: 'text-teal-600',
    borderClass: 'border-l-teal-400',
    roles: ['store_user'],
  },
  // QC
  {
    id: 'material-qc-shortcut',
    label: 'Material Inspections',
    description: 'Open material QC inspections',
    path: '/material-qc',
    icon: Microscope,
    iconClass: 'text-purple-600',
    borderClass: 'border-l-purple-400',
    roles: ['qc_user'],
  },
  {
    id: 'release-notes-shortcut',
    label: 'Release Notes',
    description: 'Pending release notes queue',
    path: '/project-qc',
    icon: FileSearch,
    iconClass: 'text-violet-600',
    borderClass: 'border-l-violet-400',
    roles: ['qc_user'],
  },
  // AFS
  {
    id: 'dubai-afs-shortcut',
    label: 'Dubai Projects',
    description: 'Active AFS project tracking',
    path: '/dubai-afs',
    icon: Plane,
    iconClass: 'text-sky-600',
    borderClass: 'border-l-sky-400',
    roles: ['afs_user'],
  },
  {
    id: 'after-sales-shortcut',
    label: 'Maintenance Jobs',
    description: 'After-sales maintenance queue',
    path: '/after-sales',
    icon: Wrench,
    iconClass: 'text-rose-600',
    borderClass: 'border-l-rose-400',
    roles: ['afs_user'],
  },
];

// ─── Module tile type ─────────────────────────────────────────────────────────

type ModuleTile = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  iconClass: string;
  borderClass: string;
  roles?: UserRole[];
};

// ─── Role-grouped module sections ─────────────────────────────────────────────

type WorkSection = {
  id: string;
  label: string;
  accentClass: string;
  tiles: ModuleTile[];
};

const WORK_SECTIONS: WorkSection[] = [
  {
    id: 'commercial',
    label: 'Sales & Commercial',
    accentClass: 'bg-emerald-500',
    tiles: [
      { id: 'quotations',    label: 'Quotation Requests', path: '/quotations',   icon: FileText,   iconClass: 'text-blue-600',    borderClass: 'border-l-blue-400',    roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'] },
      { id: 'sales',         label: 'Sales Workspace',    path: '/sales',        icon: TrendingUp, iconClass: 'text-emerald-600', borderClass: 'border-l-emerald-400', roles: ['admin','operations_manager','sales_user'] },
      { id: 'hot-projects',  label: 'Hot Projects',       path: '/hot-projects', icon: Flame,      iconClass: 'text-rose-600',    borderClass: 'border-l-rose-400',    roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'] },
      { id: 'receivables',   label: 'Receivables',        path: '/receivables',  icon: BarChart3,  iconClass: 'text-violet-600',  borderClass: 'border-l-violet-400',  roles: ['admin','operations_manager','sales_user','sales_coordinator','viewer'] },
    ],
  },
  {
    id: 'projects',
    label: 'Projects & Governance',
    accentClass: 'bg-indigo-500',
    tiles: [
      // Projects/SO visible only to oversight and commercial roles (18.6A)
      { id: 'projects',        label: 'Projects / SO',    path: '/projects',        icon: FolderKanban, iconClass: 'text-indigo-600', borderClass: 'border-l-indigo-400',  roles: ['admin','operations_manager','sales_user','viewer'] },
      { id: 'admin-approvals', label: 'Admin Approvals',  path: '/admin-approvals', icon: ShieldCheck,  iconClass: 'text-slate-600',  borderClass: 'border-l-slate-400',   roles: ['admin','operations_manager'] },
      { id: 'wo-pn-gate',      label: 'WO / PN Gate',     path: '/wo-pn-gate',      icon: GitBranch,    iconClass: 'text-green-600',  borderClass: 'border-l-green-400',   roles: ['admin','operations_manager','factory_user'] },
    ],
  },
  {
    id: 'execution',
    label: 'Execution',
    accentClass: 'bg-amber-500',
    tiles: [
      { id: 'procurement',       label: 'Procurement',         path: '/procurement',            icon: ShoppingCart, iconClass: 'text-amber-600',  borderClass: 'border-l-amber-400',  roles: ['admin','operations_manager','procurement_user'] },
      { id: 'factory',           label: 'Factory / Production', path: '/factory',               icon: Factory,      iconClass: 'text-orange-600', borderClass: 'border-l-orange-400', roles: ['admin','operations_manager','factory_user'] },
      { id: 'store',             label: 'Store / Warehouse',   path: '/store',                  icon: Warehouse,    iconClass: 'text-teal-600',   borderClass: 'border-l-teal-400',   roles: ['admin','operations_manager','store_user'] },
      { id: 'custody',           label: 'Material Custody',    path: '/custody',                icon: PackageCheck, iconClass: 'text-cyan-600',   borderClass: 'border-l-cyan-400',   roles: ['admin','operations_manager','store_user','factory_user','afs_user'] },
      { id: 'vehicle-receiving', label: 'Vehicle Receiving',   path: '/store/vehicle-receiving', icon: Truck,       iconClass: 'text-slate-600',  borderClass: 'border-l-slate-400',  roles: ['admin','operations_manager','store_user'] },
    ],
  },
  {
    id: 'quality',
    label: 'Quality & Release',
    accentClass: 'bg-purple-500',
    tiles: [
      { id: 'material-qc', label: 'Material QC',          path: '/material-qc', icon: Microscope,    iconClass: 'text-purple-600', borderClass: 'border-l-purple-400', roles: ['admin','operations_manager','qc_user'] },
      { id: 'project-qc',  label: 'Project / Vehicle QC', path: '/project-qc',  icon: ClipboardCheck,iconClass: 'text-violet-600', borderClass: 'border-l-violet-400', roles: ['admin','operations_manager','qc_user'] },
    ],
  },
  {
    id: 'dubai-afs',
    label: 'Dubai / AFS',
    accentClass: 'bg-sky-500',
    tiles: [
      { id: 'dubai-afs',   label: 'Dubai / AFS',            path: '/dubai-afs',   icon: Plane, iconClass: 'text-sky-600',  borderClass: 'border-l-sky-400',  roles: ['admin','operations_manager','afs_user'] },
      { id: 'after-sales', label: 'After Sales Maintenance', path: '/after-sales', icon: Wrench,iconClass: 'text-rose-600', borderClass: 'border-l-rose-400', roles: ['admin','operations_manager','afs_user'] },
    ],
  },
  {
    id: 'reporting',
    label: 'Reporting',
    accentClass: 'bg-cyan-600',
    tiles: [
      { id: 'control-tower',       label: 'Operations Overview',  path: '/control-tower',       icon: BarChart3,    iconClass: 'text-purple-600', borderClass: 'border-l-purple-500', roles: ['admin','operations_manager','viewer'] },
      { id: 'reports',             label: 'Reports Hub',          path: '/reports',             icon: BarChart2,    iconClass: 'text-cyan-600',   borderClass: 'border-l-cyan-400',   roles: ['admin','operations_manager','viewer','sales_coordinator'] },
      // Per-role direct report tiles (18.6A — avoids broken hub for operational roles)
      { id: 'sales-report-tile',   label: 'Sales Reports',        path: '/reports/sales',       icon: TrendingUp,   iconClass: 'text-emerald-600', borderClass: 'border-l-emerald-400', roles: ['sales_user'] },
      { id: 'proc-report-tile',    label: 'Procurement Reports',  path: '/reports/procurement', icon: ShoppingCart, iconClass: 'text-amber-600',   borderClass: 'border-l-amber-400',   roles: ['procurement_user'] },
      { id: 'factory-report-tile', label: 'Factory Reports',      path: '/reports/factory',     icon: Factory,      iconClass: 'text-orange-600',  borderClass: 'border-l-orange-400',  roles: ['factory_user'] },
      { id: 'store-report-tile',   label: 'Store Reports',        path: '/reports/store',       icon: Warehouse,    iconClass: 'text-cyan-600',    borderClass: 'border-l-cyan-400',    roles: ['store_user'] },
      { id: 'qc-report-tile',      label: 'QC Reports',           path: '/reports/qc',          icon: ClipboardCheck,iconClass: 'text-violet-600', borderClass: 'border-l-violet-400',  roles: ['qc_user'] },
      { id: 'afs-report-tile',     label: 'AFS Reports',          path: '/reports/afs',         icon: Plane,        iconClass: 'text-sky-600',     borderClass: 'border-l-sky-400',     roles: ['afs_user'] },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCardItem({ card }: { card: KpiCard }) {
  const sc = severityConfig[card.severity];
  const Icon = ICON_MAP[card.icon] ?? FileText;

  return (
    <Link
      to={card.path}
      className={cn(
        'bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-5',
        'hover:shadow-md hover:border-gray-300 transition-all block',
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
    </Link>
  );
}

function ModuleTileLink({ tile }: { tile: ModuleTile }) {
  const Icon = tile.icon;
  return (
    <Link to={tile.path} className="group">
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
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Dashboard() {
  const { role } = useAuth();

  const [summary, setSummary] = useState<typeof PROJECT_SUMMARY>(EMPTY_SUMMARY);

  useEffect(() => {
    (async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSummary(PROJECT_SUMMARY);
      return;
    }
      const [
        activeRes, saudiRes, dubaiRes,
        woRes, pnRes, inProductionRes,
        inQcRes, readyRes,
      ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true })
          .in('project_status', ['active', 'approved', 'submitted_for_approval']),
        supabase.from('projects').select('*', { count: 'exact', head: true })
          .in('project_status', ['active', 'approved'])
          .eq('manufacturing_location', 'saudi'),
        supabase.from('projects').select('*', { count: 'exact', head: true })
          .in('project_status', ['active', 'approved'])
          .eq('manufacturing_location', 'dubai'),
        supabase.from('project_execution_references').select('project_id', { count: 'exact', head: true })
          .eq('reference_type', 'wo')
          .not('status', 'in', '(cancelled,superseded)'),
        supabase.from('project_execution_references').select('project_id', { count: 'exact', head: true })
          .eq('reference_type', 'pn')
          .not('status', 'in', '(cancelled,superseded)'),
        supabase.from('factory_records').select('project_id', { count: 'exact', head: true }),
        supabase.from('project_qc_inspections').select('*', { count: 'exact', head: true })
          .in('inspection_status', ['in_progress', 'pending']),
        supabase.from('release_notes').select('*', { count: 'exact', head: true })
          .eq('release_status', 'issued'),
      ]);
      setSummary({
        totalActive: activeRes.count ?? 0,
        saudi: saudiRes.count ?? 0,
        dubai: dubaiRes.count ?? 0,
        withWO: woRes.count ?? 0,
        withPN: pnRes.count ?? 0,
        inProduction: inProductionRes.count ?? 0,
        inQC: inQcRes.count ?? 0,
        readyToDeliver: readyRes.count ?? 0,
      });
    })();
  }, []);

  const dashboardCards = mockOrEmpty(DASHBOARD_KPI_CARDS);
  const afsCards = mockOrEmpty(AFS_KPI_CARDS);

  const isTileVisible = (t: { roles?: UserRole[] }) =>
    !t.roles || !role || role === 'admin' || t.roles.includes(role);

  const showSummaryStrip =
    !role || ['admin', 'operations_manager', 'viewer', 'sales_coordinator'].includes(role);

  const subtitle = (role && ROLE_SUBTITLES[role]) ?? 'Operational status across all modules';

  const myWorkCards = MY_WORK_CARDS.filter(isTileVisible);

  // Management/admin see the full overview; operational roles see their module sections
  const isManagement = !role || ['admin', 'operations_manager', 'viewer'].includes(role);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={subtitle}
        breadcrumb={[{ label: 'Dashboard' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {isLiveMode() && (
        <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6 text-xs text-gray-600">
          <Activity size={15} className="shrink-0 mt-0.5 text-gray-400" />
          <span>
            Summary figures are live counts from the database. Open any module below for role-specific detail.
          </span>
        </div>
      )}

      {/* My Work — role-specific shortcuts to the most critical tools */}
      {myWorkCards.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="My Work" accent="bg-brand-600" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {myWorkCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.id} to={card.path} className="group">
                  <div className={cn(
                    'bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm px-4 py-3',
                    'hover:shadow-md hover:border-gray-300 transition-all',
                    card.borderClass,
                  )}>
                    <Icon size={16} className={cn('mb-2', card.iconClass)} />
                    <div className="text-xs font-semibold text-gray-800 group-hover:text-gray-600 transition-colors leading-tight">
                      {card.label}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">
                      {card.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Project Summary Strip — oversight/management roles only */}
      {showSummaryStrip && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { label: 'Active Projects', value: summary.totalActive, color: 'text-brand-700' },
            { label: 'Saudi Route',     value: summary.saudi,       color: 'text-blue-700' },
            { label: 'Dubai Route',     value: summary.dubai,       color: 'text-sky-700' },
            { label: 'With WO',         value: summary.withWO,      color: 'text-green-700' },
            { label: 'With PN',         value: summary.withPN,      color: 'text-teal-700' },
            { label: 'In Production',   value: summary.inProduction, color: 'text-amber-700' },
            { label: 'In QC',           value: summary.inQC,        color: 'text-purple-700' },
            { label: 'Ready to Deliver',value: summary.readyToDeliver,color:'text-green-600' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
              <div className={cn('text-xl font-bold', item.color)}>{item.value}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards — management/admin overview only; hidden in live mode until wired */}
      {isManagement && dashboardCards.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="Critical Operational Indicators" accent="bg-brand-600" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardCards.map((card) => (
              <KpiCardItem key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}

      {/* Dubai / AFS KPIs — management/admin only; hidden in live mode until wired */}
      {isManagement && afsCards.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="Dubai / AFS & After Sales" accent="bg-sky-600" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {afsCards.map((card) => (
              <KpiCardItem key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}

      {/* Role-grouped module sections */}
      {WORK_SECTIONS.map((section) => {
        const visibleTiles = section.tiles.filter(isTileVisible);
        if (visibleTiles.length === 0) return null;
        return (
          <div key={section.id} className="mb-6">
            <SectionHeader title={section.label} accent={section.accentClass} />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {visibleTiles.map((tile) => (
                <ModuleTileLink key={tile.id} tile={tile} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
