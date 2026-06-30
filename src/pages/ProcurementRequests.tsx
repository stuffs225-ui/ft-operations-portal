import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Package, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusTabsWithCounts } from '../components/procurement/ProcurementUI';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { MOCK_PROCUREMENT_REQUESTS } from '../data/mockProcurement';
import type { ProcurementRequest, UserRole } from '../types';

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'procurement_user'];

type PRStatus = 'all' | 'draft' | 'pr_received' | 'in_progress' | 'partially_ordered' | 'fully_ordered' | 'cancelled' | 'closed';

const STATUS_TABS: { key: PRStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'pr_received', label: 'PR Received' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'partially_ordered', label: 'Partially Ordered' },
  { key: 'fully_ordered', label: 'Fully Ordered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'closed', label: 'Closed' },
];

function prStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    draft:             { label: 'Draft',             variant: 'neutral' },
    pr_received:       { label: 'PR Received',       variant: 'info' },
    in_progress:       { label: 'In Progress',       variant: 'warning' },
    partially_ordered: { label: 'Partially Ordered', variant: 'warning' },
    fully_ordered:     { label: 'Fully Ordered',     variant: 'success' },
    cancelled:         { label: 'Cancelled',         variant: 'neutral' },
    closed:            { label: 'Closed',            variant: 'neutral' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

export function ProcurementRequests() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const canCreate = role ? CAN_CREATE.includes(role as UserRole) : false;

  // Deep-link support: dashboard KPI cards link here with ?status=<key>
  const urlStatus = searchParams.get('status');
  const initialStatus: PRStatus =
    urlStatus && STATUS_TABS.some((t) => t.key === urlStatus)
      ? (urlStatus as PRStatus)
      : 'all';

  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<PRStatus>(initialStatus);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setRequests(MOCK_PROCUREMENT_REQUESTS);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('procurement_requests')
        .select('*, project:projects(project_code, so_number, customer_name)')
        .order('created_at', { ascending: false });
      if (error) console.error(error);
      setRequests((data as unknown as ProcurementRequest[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = requests.filter((pr) => {
    if (activeStatus !== 'all' && pr.status !== activeStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        pr.pr_number.toLowerCase().includes(q) ||
        (pr.project?.project_code ?? '').toLowerCase().includes(q) ||
        (pr.project?.customer_name ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Tab counts derived from already-loaded requests (no new query).
  const statusCounts: Record<string, number> = { all: requests.length };
  for (const tab of STATUS_TABS) {
    if (tab.key === 'all') continue;
    statusCounts[tab.key] = requests.filter((pr) => pr.status === tab.key).length;
  }

  return (
    <div>
      <PageHeader
        title="Purchase Requests"
        subtitle="All incoming PRs from production and engineering teams."
        breadcrumb={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'Purchase Requests' },
        ]}
        actions={
          canCreate ? (
            <Link to="/procurement/requests/new">
              <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <Plus size={15} />
                Register PR
              </button>
            </Link>
          ) : undefined
        }
        className="mb-6"
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search PR number, project code, customer…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Status filter tabs with counts */}
      <StatusTabsWithCounts
        className="mb-5"
        tabs={STATUS_TABS}
        active={activeStatus}
        counts={statusCounts}
        onSelect={setActiveStatus}
      />

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-500 mb-3">
          {filtered.length} {filtered.length === 1 ? 'request' : 'requests'}
        </p>
      )}

      {loading ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['PR Number', 'Project', 'Source Dept', 'Status', 'Received Date', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3 space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-md" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-10" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={28} />}
          title="No purchase requests found"
          description={search ? 'Try adjusting your search terms.' : 'No purchase requests registered yet.'}
          action={
            !search && canCreate ? (
              <Link to="/procurement/requests/new">
                <button className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors mx-auto">
                  <Plus size={14} />
                  Register First PR
                </button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">PR Number</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">Source Dept</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">Received Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-[0.04em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((pr) => (
                  <tr
                    key={pr.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('a')) return;
                      navigate(`/procurement/requests/${pr.id}`);
                    }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-900">{pr.pr_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{pr.project?.project_code ?? '—'}</div>
                      <div className="text-xs text-gray-500">{pr.project?.customer_name ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{pr.source_department ?? '—'}</td>
                    <td className="px-4 py-3">{prStatusBadge(pr.status)}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {pr.received_date
                        ? new Date(pr.received_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/procurement/requests/${pr.id}`}
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
