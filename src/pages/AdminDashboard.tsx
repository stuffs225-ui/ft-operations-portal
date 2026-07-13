import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserPlus, ShieldCheck, Activity, BarChart2, ClipboardCheck,
  CheckCircle2, ArrowRight, FolderKanban, type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cn } from '../lib/utils';

// The sidebar now lists every admin tool once (SYSTEM ADMINISTRATION + SYSTEM
// GOVERNANCE), so this landing page is deliberately status-first: what needs
// attention right now, not a second copy of the navigation.

interface AdminCounts {
  users: number | null;
  pendingAccess: number | null;
  pendingApprovals: number | null;
  activeProjects: number | null;
}

const EMPTY: AdminCounts = { users: null, pendingAccess: null, pendingApprovals: null, activeProjects: null };

// ─── Attention items (only shown when there is something to act on) ────────────

interface Attention {
  id: string;
  count: number;
  label: string;
  sublabel: string;
  path: string;
  icon: LucideIcon;
  tone: 'amber' | 'rose';
}

// ─── Oversight shortcuts (entry points that aren't 1:1 sidebar duplicates) ─────

const OVERSIGHT: { id: string; label: string; path: string; icon: LucideIcon; iconClass: string }[] = [
  { id: 'control-tower', label: 'Operations Overview', path: '/control-tower',        icon: Activity,       iconClass: 'text-indigo-600' },
  { id: 'reports',       label: 'Reports Hub',         path: '/reports',              icon: BarChart2,      iconClass: 'text-cyan-600'   },
  { id: 'data-quality',  label: 'Data Quality',        path: '/reports/data-quality', icon: ClipboardCheck, iconClass: 'text-rose-600'   },
  { id: 'projects',      label: 'Projects / SO',       path: '/projects',             icon: FolderKanban,   iconClass: 'text-blue-600'   },
];

export function AdminDashboard() {
  const [counts, setCounts] = useState<AdminCounts>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) { setCounts(EMPTY); setLoading(false); }
        return;
      }
      const [usersRes, accessRes, approvalsRes, projectsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('access_requests').select('*', { count: 'exact', head: true }).eq('request_status', 'submitted'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('project_status', 'submitted_for_approval'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).in('project_status', ['active', 'approved', 'submitted_for_approval']),
      ]);
      if (cancelled) return;
      setCounts({
        users: usersRes.count ?? 0,
        pendingAccess: accessRes.count ?? 0,
        pendingApprovals: approvalsRes.count ?? 0,
        activeProjects: projectsRes.count ?? 0,
      });
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const fmt = (n: number | null) => (loading ? '—' : n == null ? '—' : String(n));

  const kpis = [
    { label: 'Total Users',             value: fmt(counts.users),            path: '/admin/users',           color: 'text-gray-900' },
    { label: 'Pending Access Requests', value: fmt(counts.pendingAccess),    path: '/admin/access-requests', color: (counts.pendingAccess ?? 0) > 0 ? 'text-amber-700' : 'text-gray-900' },
    { label: 'Pending SO Approvals',    value: fmt(counts.pendingApprovals), path: '/admin-approvals',       color: (counts.pendingApprovals ?? 0) > 0 ? 'text-rose-700' : 'text-gray-900' },
    { label: 'Active Projects',         value: fmt(counts.activeProjects),   path: '/projects',              color: 'text-gray-900' },
  ];

  const attention: Attention[] = [];
  if ((counts.pendingApprovals ?? 0) > 0) {
    attention.push({
      id: 'approvals', count: counts.pendingApprovals!, tone: 'rose',
      label: 'SO approvals waiting', sublabel: 'Sales orders submitted for your review',
      path: '/admin-approvals', icon: ShieldCheck,
    });
  }
  if ((counts.pendingAccess ?? 0) > 0) {
    attention.push({
      id: 'access', count: counts.pendingAccess!, tone: 'amber',
      label: 'Access requests waiting', sublabel: 'New users requesting a role',
      path: '/admin/access-requests', icon: UserPlus,
    });
  }

  return (
    <div>
      <PageHeader
        title="System Administration"
        subtitle="What needs your attention — user governance, approvals, and system status"
        breadcrumb={[{ label: 'Admin', href: '/admin-dashboard' }, { label: 'System Administration' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {/* System-at-a-glance KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            to={kpi.path}
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 text-center hover:shadow-md hover:border-gray-300 transition-all block"
          >
            <div className={cn('text-xl font-bold tabular-nums', loading ? 'text-gray-300 animate-pulse' : kpi.color)}>{kpi.value}</div>
            <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{kpi.label}</div>
          </Link>
        ))}
      </div>

      {/* Needs attention */}
      <div className="mb-6">
        <SectionHeader title="Needs Attention" accent="bg-rose-600" />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm h-20 animate-pulse" />
            ))}
          </div>
        ) : attention.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-6 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-800">All clear</p>
              <p className="text-xs text-gray-500">No access requests or SO approvals are waiting.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {attention.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.id}
                  to={a.path}
                  className={cn(
                    'bg-white rounded-lg border shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all block group',
                    a.tone === 'rose' ? 'border-rose-200' : 'border-amber-200',
                  )}
                >
                  <div className={cn('w-9 h-9 rounded-md flex items-center justify-center shrink-0',
                    a.tone === 'rose' ? 'bg-rose-50' : 'bg-amber-50')}>
                    <Icon size={17} className={a.tone === 'rose' ? 'text-rose-600' : 'text-amber-600'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className={cn('text-lg font-bold tabular-nums', a.tone === 'rose' ? 'text-rose-700' : 'text-amber-700')}>{a.count}</span>
                      <span className="text-sm font-semibold text-gray-800">{a.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{a.sublabel}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Cross-module oversight — entry points, not a copy of the sidebar */}
      <div>
        <SectionHeader title="Oversight" accent="bg-slate-600" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {OVERSIGHT.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.id} to={link.path} className="group">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3 hover:shadow-md hover:border-gray-300 transition-all">
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

      {/* Reminder: full admin tooling lives in the sidebar (no duplicate grid here). */}
      <p className="mt-6 flex items-center gap-1.5 text-[11px] text-gray-400">
        <Users size={12} />
        All admin tools are in the sidebar under System Administration and System Governance.
      </p>
    </div>
  );
}
