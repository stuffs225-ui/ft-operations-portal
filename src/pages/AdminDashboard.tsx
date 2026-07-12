import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserPlus, ShieldCheck, ScrollText, Settings,
  GitBranch, BarChart2, Activity, AlertTriangle,
  ClipboardCheck, FolderKanban, FileStack, BellRing,
  CalendarClock, CalendarRange, Target, UploadCloud, type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { RoleRulesCard } from '../components/ui/RoleRulesCard';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cn } from '../lib/utils';

// ─── KPI strip ────────────────────────────────────────────────────────────────

interface AdminKpi {
  label: string;
  value: number | string;
  color: string;
  path: string;
}

// ─── Quick action cards ───────────────────────────────────────────────────────

interface QuickAction {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  borderColor: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'users',
    label: 'User Management',
    description: 'View, suspend, and assign roles to users',
    path: '/admin/users',
    icon: Users,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-700',
    borderColor: 'border-l-purple-500',
  },
  {
    id: 'access-requests',
    label: 'Access Requests',
    description: 'Review and approve or reject access requests',
    path: '/admin/access-requests',
    icon: UserPlus,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-700',
    borderColor: 'border-l-purple-400',
  },
  {
    id: 'approvals',
    label: 'Admin Approvals',
    description: 'Review pending SO and approval submissions',
    path: '/admin-approvals',
    icon: ShieldCheck,
    iconBg: 'bg-slate-50',
    iconColor: 'text-slate-700',
    borderColor: 'border-l-slate-500',
  },
  {
    id: 'wo-pn-gate',
    label: 'WO / PN Gate',
    description: 'Review and manage WO and PN references',
    path: '/wo-pn-gate',
    icon: GitBranch,
    iconBg: 'bg-slate-50',
    iconColor: 'text-slate-700',
    borderColor: 'border-l-slate-400',
  },
  {
    id: 'audit-log',
    label: 'Audit Log',
    description: 'Review system audit trail and change history',
    path: '/audit-log',
    icon: ScrollText,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-700',
    borderColor: 'border-l-amber-500',
  },
  {
    id: 'settings',
    label: 'System Settings',
    description: 'Reference data: vehicle types, SLA rules, categories',
    path: '/settings',
    icon: Settings,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-700',
    borderColor: 'border-l-amber-400',
  },
  {
    id: 'notification-rules',
    label: 'Notification Rules',
    description: 'Configure system notification triggers',
    path: '/admin/notification-rules',
    icon: BellRing,
    iconBg: 'bg-gray-50',
    iconColor: 'text-gray-600',
    borderColor: 'border-l-gray-400',
  },
  {
    id: 'report-subscriptions',
    label: 'Report Subscriptions',
    description: 'Manage scheduled report distribution',
    path: '/admin/report-subscriptions',
    icon: CalendarClock,
    iconBg: 'bg-gray-50',
    iconColor: 'text-gray-600',
    borderColor: 'border-l-gray-400',
  },
  {
    id: 'invoicing-schedule',
    label: 'Invoicing Schedule',
    description: 'Manage project invoice dates, installments, and overdue lines',
    path: '/admin/invoicing-schedule',
    icon: CalendarRange,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-700',
    borderColor: 'border-l-rose-400',
  },
  {
    id: 'sales-targets',
    label: 'Sales Annual Targets',
    description: 'Set annual sales order, invoicing, and collection targets',
    path: '/admin/sales-targets',
    icon: Target,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-700',
    borderColor: 'border-l-emerald-400',
  },
  {
    id: 'aging-upload',
    label: 'Monthly Aging Upload',
    description: 'Upload the Finance collection/aging workbook and publish per-salesman items',
    path: '/admin/aging-upload',
    icon: UploadCloud,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-700',
    borderColor: 'border-l-indigo-400',
  },
];

// ─── Monitoring links ─────────────────────────────────────────────────────────

interface MonitorLink {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  iconClass: string;
  borderClass: string;
}

const MONITOR_LINKS: MonitorLink[] = [
  { id: 'control-tower', label: 'Operations Overview', path: '/control-tower',        icon: Activity,        iconClass: 'text-indigo-600', borderClass: 'border-l-indigo-400' },
  { id: 'reports',        label: 'Reports Hub',         path: '/reports',              icon: BarChart2,       iconClass: 'text-cyan-600',   borderClass: 'border-l-cyan-400'   },
  { id: 'data-quality',   label: 'Data Quality',        path: '/reports/data-quality', icon: ClipboardCheck,  iconClass: 'text-rose-600',   borderClass: 'border-l-rose-400'   },
  { id: 'projects',       label: 'Projects / SO',       path: '/projects',             icon: FolderKanban,    iconClass: 'text-blue-600',   borderClass: 'border-l-blue-400'   },
  { id: 'templates',      label: 'Document Templates',  path: '/templates',            icon: FileStack,       iconClass: 'text-green-600',  borderClass: 'border-l-green-400'  },
  { id: 'health',         label: 'Health Scores',       path: '/reports/health-scores',icon: AlertTriangle,   iconClass: 'text-amber-600',  borderClass: 'border-l-amber-400'  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const [kpis, setKpis] = useState<AdminKpi[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const fallback: AdminKpi[] = [
        { label: 'Total Users',            value: '—', color: 'text-purple-700', path: '/admin/users' },
        { label: 'Pending Access Requests',value: '—', color: 'text-amber-700',  path: '/admin/access-requests' },
        { label: 'Pending SO Approvals',   value: '—', color: 'text-rose-700',   path: '/admin-approvals' },
        { label: 'Active Projects',        value: '—', color: 'text-blue-700',   path: '/projects' },
      ];

      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) { setKpis(fallback); setLoadingKpis(false); }
        return;
      }

      const [usersRes, accessRes, approvalsRes, projectsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('access_requests').select('*', { count: 'exact', head: true }).eq('request_status', 'submitted'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('project_status', 'submitted_for_approval'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).in('project_status', ['active', 'approved', 'submitted_for_approval']),
      ]);

      if (!cancelled) {
        setKpis([
          { label: 'Total Users',            value: usersRes.count ?? 0,     color: 'text-purple-700', path: '/admin/users' },
          { label: 'Pending Access Requests',value: accessRes.count ?? 0,    color: 'text-amber-700',  path: '/admin/access-requests' },
          { label: 'Pending SO Approvals',   value: approvalsRes.count ?? 0, color: 'text-rose-700',   path: '/admin-approvals' },
          { label: 'Active Projects',        value: projectsRes.count ?? 0,  color: 'text-blue-700',   path: '/projects' },
        ]);
        setLoadingKpis(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <PageHeader
        title="System Administration"
        subtitle="User management, access governance, audit, and system configuration"
        breadcrumb={[{ label: 'Admin', href: '/admin-dashboard' }, { label: 'System Administration' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {/* System status KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {loadingKpis
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center animate-pulse">
                <div className="h-7 bg-gray-100 rounded mb-1" />
                <div className="h-3 bg-gray-100 rounded w-3/4 mx-auto" />
              </div>
            ))
          : kpis.map((kpi) => (
              <Link
                key={kpi.label}
                to={kpi.path}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center hover:shadow-md hover:border-gray-300 transition-all block"
              >
                <div className={cn('text-xl font-bold', kpi.color)}>{kpi.value}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{kpi.label}</div>
              </Link>
            ))
        }
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <SectionHeader title="Admin Quick Actions" accent="bg-purple-600" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                to={action.path}
                className={cn(
                  'bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4',
                  'hover:shadow-md hover:border-gray-300 transition-all block',
                  action.borderColor,
                )}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', action.iconBg)}>
                  <Icon size={16} className={action.iconColor} />
                </div>
                <div className="text-sm font-semibold text-gray-800 mb-1">{action.label}</div>
                <div className="text-xs text-gray-500 leading-snug">{action.description}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Cross-module monitoring */}
      <div className="mb-6">
        <SectionHeader title="Cross-Module Monitoring" accent="bg-slate-600" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {MONITOR_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.id} to={link.path} className="group">
                <div className={cn(
                  'bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm px-4 py-3',
                  'hover:shadow-md hover:border-gray-300 transition-all',
                  link.borderClass,
                )}>
                  <Icon size={16} className={cn('mb-2', link.iconClass)} />
                  <div className="text-xs font-semibold text-gray-800 group-hover:text-gray-600 transition-colors leading-tight">
                    {link.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Governance rules */}
      <RoleRulesCard />
    </div>
  );
}
