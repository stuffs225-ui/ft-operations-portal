import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban, Activity, Flame, FileText, BarChart3,
  TrendingUp, Clock, ClipboardCheck, BarChart2,
  AlertTriangle, XCircle, CheckCircle2, AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { RoleRulesCard } from '../components/ui/RoleRulesCard';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cn } from '../lib/utils';

// ─── KPI strip ────────────────────────────────────────────────────────────────

type KpiSeverity = 'normal' | 'warning' | 'critical' | 'info';

interface ManagementKpi {
  label: string;
  value: number | string;
  color: string;
  path: string;
  severity: KpiSeverity;
}

const FALLBACK_KPIS: ManagementKpi[] = [
  { label: 'Active Projects',    value: '—', color: 'text-blue-700',   path: '/projects',              severity: 'info'     },
  { label: 'Pending Approval',   value: '—', color: 'text-amber-700',  path: '/projects',              severity: 'warning'  },
  { label: 'Overdue Projects',   value: '—', color: 'text-red-700',    path: '/projects',              severity: 'critical' },
  { label: 'Release Blocked',    value: '—', color: 'text-rose-700',   path: '/control-tower',         severity: 'critical' },
  { label: 'Open QC Blockers',   value: '—', color: 'text-purple-700', path: '/control-tower',         severity: 'warning'  },
  { label: 'Open NCRs',          value: '—', color: 'text-orange-700', path: '/reports/data-quality',  severity: 'warning'  },
  { label: 'Hot Projects Open',  value: '—', color: 'text-rose-600',   path: '/hot-projects',          severity: 'info'     },
  { label: 'Open Quotations',    value: '—', color: 'text-indigo-600', path: '/quotations',            severity: 'info'     },
];

// ─── Management visibility links ──────────────────────────────────────────────

interface ManagementLink {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  iconClass: string;
  borderClass: string;
}

const VISIBILITY_LINKS: ManagementLink[] = [
  { id: 'portfolio',    label: 'Portfolio Overview',   path: '/projects',    icon: FolderKanban, iconClass: 'text-indigo-600', borderClass: 'border-l-indigo-400' },
  { id: 'ops',          label: 'Operations Overview',  path: '/control-tower',icon: Activity,    iconClass: 'text-slate-600',  borderClass: 'border-l-slate-400'  },
  { id: 'hot-projects', label: 'Hot Projects',         path: '/hot-projects', icon: Flame,       iconClass: 'text-rose-600',   borderClass: 'border-l-rose-400'   },
  { id: 'quotations',   label: 'Quotation Pipeline',   path: '/quotations',   icon: FileText,    iconClass: 'text-blue-600',   borderClass: 'border-l-blue-400'   },
  { id: 'receivables',  label: 'Receivables',          path: '/receivables',  icon: BarChart3,   iconClass: 'text-violet-600', borderClass: 'border-l-violet-400' },
];

// ─── Executive report links ───────────────────────────────────────────────────

const REPORT_LINKS: ManagementLink[] = [
  { id: 'hub',          label: 'Reports Hub',       path: '/reports',                icon: BarChart2,      iconClass: 'text-cyan-600',  borderClass: 'border-l-cyan-400'  },
  { id: 'executive',    label: 'Executive Report',  path: '/reports/executive',      icon: TrendingUp,     iconClass: 'text-blue-600',  borderClass: 'border-l-blue-400'  },
  { id: 'sla',          label: 'SLA & Delays',      path: '/reports/sla',            icon: Clock,          iconClass: 'text-amber-600', borderClass: 'border-l-amber-400' },
  { id: 'health',       label: 'Health Scores',     path: '/reports/health-scores',  icon: Activity,       iconClass: 'text-green-600', borderClass: 'border-l-green-400' },
  { id: 'data-quality', label: 'Data Quality',      path: '/reports/data-quality',   icon: ClipboardCheck, iconClass: 'text-rose-600',  borderClass: 'border-l-rose-400'  },
];

// ─── Severity styling ─────────────────────────────────────────────────────────

const SEVERITY_BORDER: Record<KpiSeverity, string> = {
  critical: 'border-l-red-400',
  warning:  'border-l-amber-400',
  info:     'border-l-blue-400',
  normal:   'border-l-green-400',
};

const SEVERITY_ICON: Record<KpiSeverity, LucideIcon> = {
  critical: XCircle,
  warning:  AlertTriangle,
  info:     AlertCircle,
  normal:   CheckCircle2,
};

const SEVERITY_ICON_CLASS: Record<KpiSeverity, string> = {
  critical: 'text-red-400',
  warning:  'text-amber-400',
  info:     'text-blue-400',
  normal:   'text-green-400',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ManagementDashboard() {
  const [kpis, setKpis] = useState<ManagementKpi[]>(FALLBACK_KPIS);
  const [loadingKpis, setLoadingKpis] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) { setKpis(FALLBACK_KPIS); setLoadingKpis(false); }
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const activeStatuses = ['active', 'approved', 'submitted_for_approval'];

      const [activeRes, pendingRes, overdueRes, blockedRes, qcRes, ncrRes, hotRes, quotRes] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).in('project_status', activeStatuses),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('project_status', 'submitted_for_approval'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).in('project_status', activeStatuses).lt('customer_delivery_date', today),
        supabase.from('release_notes').select('*', { count: 'exact', head: true }).eq('release_status', 'blocked'),
        supabase.from('project_qc_findings').select('*', { count: 'exact', head: true }).in('finding_status', ['open', 'assigned', 'rework_in_progress', 'pending_reinspection']),
        supabase.from('material_ncrs').select('*', { count: 'exact', head: true }).in('ncr_status', ['open', 'assigned', 'corrective_action_in_progress', 'pending_evidence']),
        supabase.from('hot_projects').select('*', { count: 'exact', head: true }).in('stage', ['lead', 'qualified', 'proposal_required', 'quotation_requested', 'negotiation']),
        supabase.from('quotation_requests').select('*', { count: 'exact', head: true }).in('quotation_status', ['submitted_by_sales', 'received_by_coordinator', 'sent_to_estimation', 'waiting_for_estimation', 'need_clarification', 'quotation_received']),
      ]);

      const overdue = overdueRes.count ?? 0;
      const blocked = blockedRes.count ?? 0;
      const qc = qcRes.count ?? 0;
      const ncr = ncrRes.count ?? 0;

      if (!cancelled) {
        setKpis([
          { label: 'Active Projects',   value: activeRes.count ?? 0,  color: 'text-blue-700',   path: '/projects',             severity: 'info'                           },
          { label: 'Pending Approval',  value: pendingRes.count ?? 0, color: 'text-amber-700',  path: '/projects',             severity: pendingRes.count ? 'warning' : 'normal' },
          { label: 'Overdue Projects',  value: overdue,               color: overdue ? 'text-red-700'    : 'text-green-700', path: '/projects',             severity: overdue ? 'critical' : 'normal' },
          { label: 'Release Blocked',   value: blocked,               color: blocked ? 'text-rose-700'   : 'text-green-700', path: '/control-tower',        severity: blocked ? 'critical' : 'normal' },
          { label: 'Open QC Blockers',  value: qc,                    color: qc ? 'text-purple-700'      : 'text-green-700', path: '/control-tower',        severity: qc ? 'warning' : 'normal'      },
          { label: 'Open NCRs',         value: ncr,                   color: ncr ? 'text-orange-700'     : 'text-green-700', path: '/reports/data-quality', severity: ncr ? 'warning' : 'normal'     },
          { label: 'Hot Projects Open', value: hotRes.count ?? 0,     color: 'text-rose-600',   path: '/hot-projects',         severity: 'info'                           },
          { label: 'Open Quotations',   value: quotRes.count ?? 0,    color: 'text-indigo-600', path: '/quotations',           severity: 'info'                           },
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
        title="Management Dashboard"
        subtitle="Read-only visibility into portfolio health, delivery readiness, delays, and operational blockers."
        breadcrumb={[{ label: 'Management', href: '/management-dashboard' }, { label: 'Management Dashboard' }]}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
              Read-only
            </span>
            <DataSourceBadge variant="auto" />
          </div>
        }
      />

      {/* KPI strip — 4 cols on sm, 4 on md, 4+4 wrap on lg */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {loadingKpis
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center animate-pulse">
                <div className="h-7 bg-gray-100 rounded mb-1" />
                <div className="h-3 bg-gray-100 rounded w-3/4 mx-auto" />
              </div>
            ))
          : kpis.map((kpi) => {
              const SevIcon = SEVERITY_ICON[kpi.severity];
              return (
                <Link
                  key={kpi.label}
                  to={kpi.path}
                  className={cn(
                    'bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-3',
                    'hover:shadow-md hover:border-gray-300 transition-all block',
                    SEVERITY_BORDER[kpi.severity],
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className={cn('text-xl font-bold', kpi.color)}>{kpi.value}</div>
                    <SevIcon size={14} className={SEVERITY_ICON_CLASS[kpi.severity]} />
                  </div>
                  <div className="text-[11px] text-gray-500 leading-tight">{kpi.label}</div>
                </Link>
              );
            })
        }
      </div>

      {/* Management Visibility links */}
      <div className="mb-6">
        <SectionHeader title="Management Visibility" accent="bg-slate-600" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {VISIBILITY_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.id} to={link.path} className="group">
                <div className={cn(
                  'bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm px-4 py-3',
                  'hover:shadow-md hover:border-gray-300 transition-all',
                  link.borderClass,
                )}>
                  <Icon size={16} className={cn('mb-2', link.iconClass)} />
                  <div className="text-xs font-semibold text-gray-800 group-hover:text-gray-600 leading-tight">
                    {link.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Executive Reports shortcuts */}
      <div className="mb-6">
        <SectionHeader title="Executive Reports" accent="bg-blue-600" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {REPORT_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.id} to={link.path} className="group">
                <div className={cn(
                  'bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm px-4 py-3',
                  'hover:shadow-md hover:border-gray-300 transition-all',
                  link.borderClass,
                )}>
                  <Icon size={16} className={cn('mb-2', link.iconClass)} />
                  <div className="text-xs font-semibold text-gray-800 group-hover:text-gray-600 leading-tight">
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
