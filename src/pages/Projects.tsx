import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen, Plus, Search, MapPin,
  ChevronRight, Calendar, User,
  Layers, Activity, FileClock, AlertTriangle, CheckCircle2, Wallet,
} from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/status/status-badge';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ReportExportBar } from '../components/features/ReportExportBar';
import { useAuth } from '@/hooks/useAuth';
import { sectorLabel } from '@/lib/commercialFields';
import { usePermission } from '@/hooks/usePermission';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { exportRowsToCsv } from '@/lib/reportExport';
import type { ReportColumn } from '@/lib/reportExport';
import { MOCK_PROJECTS } from '@/data/mockProjects';
import type { Project, ProjectStatus, ManufacturingLocation, MedicalItems, UserRole } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

type StatusTab = 'all' | ProjectStatus;

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all',                      label: 'All'          },
  { key: 'draft',                    label: 'Draft'        },
  { key: 'submitted_for_approval',   label: 'Submitted'    },
  { key: 'sent_back_for_revision',   label: 'Sent Back'    },
  { key: 'approved',                 label: 'Approved'     },
  { key: 'active',                   label: 'Active'       },
  { key: 'completed',                label: 'Completed'    },
  { key: 'rejected',                 label: 'Rejected'     },
];


function locationBadge(loc: ManufacturingLocation) {
  if (loc === 'not_set') return <Badge variant="neutral">Not Set</Badge>;
  return <Badge variant={loc === 'saudi' ? 'default' : 'info'}>{loc === 'saudi' ? 'Saudi' : 'Dubai'}</Badge>;
}

function medicalBadge(med: MedicalItems) {
  if (med === 'not_set') return null;
  return <Badge variant={med === 'yes' ? 'warning' : 'neutral'}>{med === 'yes' ? 'Medical' : 'Non-Medical'}</Badge>;
}

function formatSAR(value: number) {
  return 'SAR ' + value.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Sales no longer create Sales Orders directly — an SO arises from converting a
// quotation, and invoicing/SO ownership sits with Admin/Operations. Sales keep a
// read-only view of Projects. (Direct create hidden; quotation→SO conversion unaffected.)
const CAN_CREATE: UserRole[] = ['admin', 'operations_manager'];

// ── Component ──────────────────────────────────────────────────────────────────

export function Projects() {
  const { role, profile } = useAuth();
  const { canViewCosts } = usePermission();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [locFilter, setLocFilter] = useState<'all' | ManufacturingLocation>('all');
  const [medFilter, setMedFilter] = useState<'all' | MedicalItems>('all');
  const [search, setSearch] = useState('');

  const canCreate = role ? CAN_CREATE.includes(role) : false;
  const canSeeMoney = canViewCosts;
  const isBroadView = role === 'admin' || role === 'operations_manager' || role === 'viewer';
  const isSalesUser = role === 'sales_user';
  const reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  // Load data
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      void Promise.resolve().then(() => {
        setProjects(MOCK_PROJECTS);
        setLoading(false);
      });
      return;
    }
    const uid = profile?.id;
    const query = supabase
      .from('projects')
      .select('*, sales_owner:profiles!projects_sales_owner_id_fkey(full_name, email)')
      .order('created_at', { ascending: false });
    const scoped = (!isBroadView && uid) ? query.eq('sales_owner_id', uid) : query;
    scoped.then(({ data }) => {
      if (data) setProjects(data as unknown as Project[]);
      setLoading(false);
    });
  }, [isBroadView, profile?.id]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = projects;
    if (statusTab !== 'all') list = list.filter((p) => p.project_status === statusTab);
    if (locFilter !== 'all') list = list.filter((p) => p.manufacturing_location === locFilter);
    if (medFilter !== 'all') list = list.filter((p) => p.medical_items === medFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.project_code.toLowerCase().includes(q) ||
          p.so_number.toLowerCase().includes(q) ||
          p.customer_name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [projects, statusTab, locFilter, medFilter, search]);

  // KPI rollup — computed entirely from already-loaded projects (read-only, no extra query)
  const kpis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const active = projects.filter((p) => p.project_status === 'active');
    const delayed = active.filter((p) => {
      if (!p.customer_delivery_date) return false;
      const d = new Date(p.customer_delivery_date);
      return !Number.isNaN(d.getTime()) && d < today;
    });
    return {
      total: projects.length,
      active: active.length,
      pendingApproval: projects.filter((p) => p.project_status === 'submitted_for_approval').length,
      delayed: delayed.length,
      completed: projects.filter((p) => p.project_status === 'completed').length,
      totalValue: projects.reduce((s, p) => s + (p.total_sales_value || 0), 0),
    };
  }, [projects]);

  const kpiCards: {
    key: string; label: string; value: string; icon: typeof Layers;
    colorClass: string; tab?: StatusTab; urgent?: boolean;
  }[] = [
    { key: 'total',    label: 'Total Projects / SOs', value: String(kpis.total),    icon: Layers,       colorClass: 'text-gray-700 bg-gray-50 border-gray-200',          tab: 'all' },
    { key: 'active',   label: 'Active Projects',      value: String(kpis.active),   icon: Activity,     colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', tab: 'active' },
    { key: 'pending',  label: 'Pending Approval',     value: String(kpis.pendingApproval), icon: FileClock, colorClass: 'text-amber-700 bg-amber-50 border-amber-200',  tab: 'submitted_for_approval', urgent: kpis.pendingApproval > 0 },
    { key: 'delayed',  label: 'At Risk / Delayed',    value: String(kpis.delayed),  icon: AlertTriangle, colorClass: kpis.delayed > 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-gray-500 bg-gray-50 border-gray-200', urgent: kpis.delayed > 0 },
    { key: 'completed',label: 'Completed',            value: String(kpis.completed),icon: CheckCircle2, colorClass: 'text-sky-700 bg-sky-50 border-sky-200',             tab: 'completed' },
    ...(canSeeMoney ? [{
      key: 'value', label: 'Total Sales Value', value: formatSAR(kpis.totalValue),
      icon: Wallet, colorClass: 'text-violet-700 bg-violet-50 border-violet-200',
    } as const] : []),
  ];

  function handleExportCsv() {
    const columns: ReportColumn<Project>[] = [
      { key: 'project_code', header: 'Project Code', value: p => p.project_code },
      { key: 'so_number', header: 'SO Number', value: p => p.so_number },
      { key: 'customer_name', header: 'Customer', value: p => p.customer_name },
      { key: 'project_status', header: 'Status', value: p => p.project_status },
      { key: 'manufacturing_location', header: 'Location', value: p => p.manufacturing_location },
      { key: 'customer_delivery_date', header: 'Delivery Date', value: p => p.customer_delivery_date },
      { key: 'total_sales_value', header: 'Total Value (SAR)', value: p => p.total_sales_value },
    ];
    exportRowsToCsv(`projects-report-${new Date().toISOString().split('T')[0]}.csv`, filtered, columns);
  }

  return (
    <div>
      <PageHeader
        title="Projects / SO"
        subtitle={isSalesUser
          ? 'Your Sales Orders and projects — track approval status, delivery dates, and commercial value'
          : 'Sales Orders and project lifecycle management'}
        actions={
          canCreate ? (
            <Link to="/projects/new">
              <Button icon={<Plus size={16} />} size="md">
                New SO / Project
              </Button>
            </Link>
          ) : undefined
        }
      />

      <ReportExportBar
        reportKey="projects_report"
        reportTitle="Projects Report"
        department="Sales"
        onExportCsv={handleExportCsv}
        summary={`${filtered.length} project${filtered.length !== 1 ? 's' : ''} · total SAR ${filtered.reduce((s, p) => s + p.total_sales_value, 0).toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
      />

      {/* KPI strip — read-only, computed from loaded projects */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 no-print">
          {Array.from({ length: canSeeMoney ? 6 : 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 no-print">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            const inner = (
              <>
                <Icon size={15} className="mb-1" />
                <div className="text-xl font-bold tabular-nums leading-tight">{card.value}</div>
                <div className="text-[11px] font-medium mt-0.5 opacity-80 leading-tight">{card.label}</div>
              </>
            );
            const cls = `rounded-lg border p-4 ${card.colorClass}`;
            return card.tab ? (
              <button
                key={card.key}
                type="button"
                onClick={() => setStatusTab(card.tab as StatusTab)}
                className={`${cls} text-left hover:shadow-md transition-all`}
              >
                {inner}
              </button>
            ) : (
              <div key={card.key} className={cls}>{inner}</div>
            );
          })}
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-col gap-3 mb-5">
        {/* Status tabs */}
        <div className="flex items-center gap-1 flex-wrap border-b border-gray-100 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === 'all' ? projects.length : projects.filter((p) => p.project_status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  statusTab === tab.key
                    ? 'text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    statusTab === tab.key ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary filters + search */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search SO, customer, code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-transparent"
            />
          </div>

          {/* Location filter */}
          <select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value as typeof locFilter)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Locations</option>
            <option value="saudi">Saudi</option>
            <option value="dubai">Dubai</option>
            <option value="not_set">Not Set</option>
          </select>

          {/* Medical filter */}
          <select
            value={medFilter}
            onChange={(e) => setMedFilter(e.target.value as typeof medFilter)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Medical</option>
            <option value="yes">Medical</option>
            <option value="no">Non-Medical</option>
          </select>
        </div>
      </div>

      {/* Table — wrapped for print targeting */}
      <div className="report-print-root">
        {/* Print-only header */}
        <div className="hidden print:block mb-6 pb-4 border-b-2 border-gray-800">
          <h1 className="text-2xl font-bold text-gray-900">Projects Report — {new Date().getFullYear()}</h1>
          <p className="text-sm text-gray-700 mt-1">Generated by: {profile?.full_name ?? '—'}</p>
          <p className="text-sm text-gray-700">Generated: {reportDate}</p>
          <p className="text-sm text-gray-700 mt-1">{filtered.length} project{filtered.length !== 1 ? 's' : ''} · Total SAR {filtered.reduce((s, p) => s + p.total_sales_value, 0).toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {Array.from({ length: 6 }).map((_, i) => (
                  <th key={i} className="px-4 py-3"><Skeleton className="h-3 w-16" /></th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-md" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-md" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-28" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={32} />}
          title="No projects found"
          description={
            search || statusTab !== 'all' || locFilter !== 'all' || medFilter !== 'all'
              ? 'No projects match the current filters.'
              : canCreate
              ? 'Get started by registering your first Sales Order.'
              : 'No projects are available for your role yet.'
          }
          action={
            canCreate && !search && statusTab === 'all' ? (
              <Link to="/projects/new">
                <Button icon={<Plus size={16} />}>New SO / Project</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-[0.04em]">Project / SO</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-[0.04em]">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-[0.04em]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-[0.04em]">Route</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-[0.04em] hidden md:table-cell">Delivery</th>
                {canSeeMoney && (
                  <th className="text-right px-4 py-3 font-medium text-gray-500 uppercase tracking-[0.04em] hidden lg:table-cell">Value</th>
                )}
                <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-[0.04em] hidden xl:table-cell">Sales Owner</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{project.project_code}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{project.so_number}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900 font-medium">
                      {project.customer_name}
                      {project.sector && (
                        <span className="ml-2 text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 align-middle">
                          {sectorLabel(project.sector)}
                        </span>
                      )}
                    </div>
                    {project.medical_items !== 'not_set' && (
                      <div className="mt-1">{medicalBadge(project.medical_items)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={project.project_status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} className="text-gray-400 shrink-0" />
                      {locationBadge(project.manufacturing_location)}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar size={13} className="text-gray-400" />
                      {formatDate(project.customer_delivery_date)}
                    </div>
                  </td>
                  {canSeeMoney && (
                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                      <span className="font-semibold tabular-nums text-gray-900">
                        {formatSAR(project.total_sales_value)}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {project.sales_owner ? (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <User size={13} className="text-gray-400 shrink-0" />
                        <span>{project.sales_owner.full_name ?? project.sales_owner.email}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium text-xs"
                    >
                      View <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500 no-print">
            Showing {filtered.length} of {projects.length} projects
            {!isSupabaseConfigured && (
              <span className="ml-2 text-amber-600">· Dev mode — mock data</span>
            )}
          </div>
        </div>
      )}
      </div>{/* end report-print-root */}

      {/* Dev-mode notice for sales_user showing own projects only in production */}
      {!isSupabaseConfigured && role === 'sales_user' && profile && (
        <p className="mt-3 text-xs text-gray-400">
          Dev mode shows all mock projects. In production, sales users see only their own projects.
        </p>
      )}
    </div>
  );
}
