import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Info, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/status/status-badge';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ROLE_CONFIGS } from '@/lib/roles';
import { MOCK_ACCESS_REQUESTS } from '@/data/mockAccessRequests';
import { formatDate } from '@/lib/utils';
import type { AccessRequest, AccessRequestStatus } from '@/types';

type TabKey = 'all' | 'submitted' | 'under_review' | 'approved' | 'rejected';

const TABS: { key: TabKey; label: string; statuses: AccessRequestStatus[] | null }[] = [
  { key: 'all',          label: 'All',          statuses: null },
  { key: 'submitted',    label: 'Submitted',    statuses: ['submitted'] },
  { key: 'under_review', label: 'Under Review', statuses: ['under_review'] },
  { key: 'approved',     label: 'Approved',     statuses: ['approved'] },
  { key: 'rejected',     label: 'Rejected',     statuses: ['rejected'] },
];

export function statusBadge(status: AccessRequestStatus) {
  return <StatusBadge status={status} />;
}

export function AdminAccessRequests() {
  const [activeTab, setActiveTab] = useState<TabKey>('submitted');
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      Promise.resolve().then(() => {
        setRequests(MOCK_ACCESS_REQUESTS);
        setLoading(false);
      });
      return;
    }
    supabase
      .from('access_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setRequests((data as unknown as AccessRequest[]) ?? []);
        setLoading(false);
      });
  }, []);

  function matchesTab(r: AccessRequest, tab: TabKey): boolean {
    const def = TABS.find((t) => t.key === tab);
    if (!def || def.statuses === null) return true;
    return def.statuses.includes(r.request_status);
  }

  const filtered = requests.filter((r) => {
    if (!matchesTab(r, activeTab)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.full_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.employee_number ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Access Requests"
        subtitle="Review and assign roles for portal access requests"
      />

      {!isSupabaseConfigured && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Dev Mode</span> — Showing mock access requests.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-5">
        {TABS.map((tab) => {
          const count = requests.filter((r) => matchesTab(r, tab.key)).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, email, employee number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <span className="text-xs text-gray-400">{filtered.length} requests</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-brand-500 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left">Requester</th>
                <th className="px-4 py-2.5 text-left hidden md:table-cell">Employee #</th>
                <th className="px-4 py-2.5 text-left hidden lg:table-cell">Department</th>
                <th className="px-4 py-2.5 text-left hidden lg:table-cell">Requested Role</th>
                <th className="px-4 py-2.5 text-left hidden xl:table-cell">Job Title</th>
                <th className="px-4 py-2.5 text-left hidden md:table-cell">Submitted</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-xs">{req.full_name}</div>
                    <div className="text-[10px] text-gray-400">{req.email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                    {req.employee_number ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">
                    {req.department ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">
                    {req.requested_role ? ROLE_CONFIGS[req.requested_role].label : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden xl:table-cell">
                    {req.job_title ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                    {formatDate(req.created_at)}
                  </td>
                  <td className="px-4 py-3">{statusBadge(req.request_status)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/access-requests/${req.id}`}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">No access requests match the current filter.</div>
        )}
      </div>
    </div>
  );
}
