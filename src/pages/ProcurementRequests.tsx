import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Package } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { MOCK_PROCUREMENT_REQUESTS } from '../data/mockProcurement';
import type { ProcurementRequest } from '../types';

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
  const { role } = useAuth();
  void role;

  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<PRStatus>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setRequests(MOCK_PROCUREMENT_REQUESTS);
      setLoading(false);
      return;
    }
    supabase
      .from('procurement_requests')
      .select('*, project:projects(project_code, so_number, customer_name)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setRequests((data as unknown as ProcurementRequest[]) ?? []);
        setLoading(false);
      });
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

  return (
    <div>
      <PageHeader
        title="Purchase Requests"
        subtitle="All incoming PRs from production and engineering teams."
        breadcrumb={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'Purchase Requests' },
        ]}
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search PR number, project code, customer…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors -mb-px ${
              activeStatus === tab.key
                ? 'bg-brand-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={28} />}
          title="No purchase requests found"
          description={search ? 'Try adjusting your search terms.' : 'No PRs match the selected filter.'}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">PR Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Project</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Source Dept</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Received Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((pr) => (
                  <tr key={pr.id} className="hover:bg-gray-50">
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
