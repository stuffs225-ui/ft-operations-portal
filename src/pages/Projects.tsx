import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen, Plus, Search, MapPin,
  ChevronRight, Loader2, Calendar, User,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/status/status-badge';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '@/components/feedback/empty-state';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MOCK_PROJECTS } from '@/data/mockProjects';
import type { Project, ProjectStatus, ManufacturingLocation, MedicalItems, UserRole } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

type StatusTab = 'all' | ProjectStatus;

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'submitted_for_approval', label: 'Submitted' },
  { key: 'sent_back_for_revision', label: 'Sent Back' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
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

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'sales_user'];

// ── Component ──────────────────────────────────────────────────────────────────

export function Projects() {
  const { role, profile } = useAuth();
  const { canViewCosts } = usePermission();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [locFilter, setLocFilter] = useState<'all' | ManufacturingLocation>('all');
  const [medFilter, setMedFilter] = useState<'all' | MedicalItems>('all');
  const [search, setSearch] = useState('');

  const canCreate = role ? CAN_CREATE.includes(role) : false;
  const canSeeMoney = canViewCosts;

  // Load data
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setProjects(MOCK_PROJECTS);
      return;
    }
    setLoading(true);
    supabase
      .from('projects')
      .select('*, sales_owner:profiles!projects_sales_owner_id_fkey(full_name, email)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setProjects(data as unknown as Project[]);
        setLoading(false);
      });
  }, []);

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

  return (
    <div>
      <PageHeader
        title="Projects / SO"
        subtitle="Sales Orders and project lifecycle management"
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

      {/* Filters row */}
      <div className="flex flex-col gap-3 mb-5">
        {/* Status tabs */}
        <div className="flex items-center gap-1 flex-wrap border-b border-gray-200 pb-3">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                statusTab === tab.key
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.key !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  {projects.filter((p) => p.project_status === tab.key).length}
                </span>
              )}
            </button>
          ))}
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
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Location filter */}
          <select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value as typeof locFilter)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Medical</option>
            <option value="yes">Medical</option>
            <option value="no">Non-Medical</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-brand-500 animate-spin" />
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Project / SO</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Customer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Route</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Delivery</th>
                {canSeeMoney && (
                  <th className="text-right px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Value</th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden xl:table-cell">Sales Owner</th>
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
                    <div className="text-gray-900 font-medium">{project.customer_name}</div>
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
                      <span className="font-semibold text-gray-900">
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
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            Showing {filtered.length} of {projects.length} projects
            {!isSupabaseConfigured && (
              <span className="ml-2 text-amber-600">· Dev mode — mock data</span>
            )}
          </div>
        </div>
      )}

      {/* Dev-mode notice for sales_user showing all projects */}
      {!isSupabaseConfigured && role === 'sales_user' && profile && (
        <p className="mt-3 text-xs text-gray-400">
          Dev mode shows all mock projects. In production, sales users see only their own projects.
        </p>
      )}
    </div>
  );
}
