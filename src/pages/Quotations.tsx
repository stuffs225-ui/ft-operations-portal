import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Search, Plus, AlertTriangle, Clock, ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isQuotationOverdue } from '../lib/quotationSla';
import { MOCK_QUOTATIONS } from '../data/mockQuotations';
import type { QuotationRequest, QuotationStatus, QuotationPriority, UserRole } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatSAR(n: number) {
  return 'SAR ' + n.toLocaleString('en-SA', { minimumFractionDigits: 0 });
}

const STATUS_LABELS: Record<QuotationStatus, string> = {
  draft:                    'Draft',
  submitted_by_sales:       'Submitted',
  received_by_coordinator:  'With Coordinator',
  sent_to_estimation:       'Sent to Estimation',
  waiting_for_estimation:   'Waiting Estimation',
  need_clarification:       'Need Clarification',
  quotation_received:       'Quotation Received',
  returned_to_sales:        'Returned to Sales',
  converted_to_hot_project: 'Converted to Hot Project',
  converted_to_so:          'Converted to SO',
  cancelled:                'Cancelled',
  closed_lost:              'Closed Lost',
};

const STATUS_VARIANT: Record<QuotationStatus, 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default'> = {
  draft:                    'neutral',
  submitted_by_sales:       'info',
  received_by_coordinator:  'info',
  sent_to_estimation:       'info',
  waiting_for_estimation:   'warning',
  need_clarification:       'critical',
  quotation_received:       'default',
  returned_to_sales:        'warning',
  converted_to_hot_project: 'success',
  converted_to_so:          'success',
  cancelled:                'neutral',
  closed_lost:              'neutral',
};

const PRIORITY_VARIANT: Record<QuotationPriority, 'neutral' | 'warning' | 'critical' | 'info'> = {
  low:    'neutral',
  medium: 'info',
  high:   'warning',
  urgent: 'critical',
};

function quotationNextAction(q: QuotationRequest): string {
  switch (q.quotation_status) {
    case 'draft':                    return 'Complete and submit to coordinator';
    case 'submitted_by_sales':       return 'Waiting for coordinator to process';
    case 'received_by_coordinator':  return 'Coordinator reviewing — no action needed';
    case 'sent_to_estimation':       return 'Waiting for estimation team';
    case 'waiting_for_estimation':   return 'Follow up with estimation team';
    case 'need_clarification':       return 'Provide clarification to coordinator';
    case 'quotation_received':       return 'Review received quotation and decide next step';
    case 'returned_to_sales':        return 'Review returned quotation and convert or close';
    case 'converted_to_hot_project': return 'Track in Hot Projects pipeline';
    case 'converted_to_so':          return 'Monitor SO / project execution';
    case 'cancelled':                return '—';
    case 'closed_lost':              return '—';
  }
}

function coordinatorNextAction(q: QuotationRequest): string {
  switch (q.quotation_status) {
    case 'submitted_by_sales':       return 'Mark received and assign to coordinator';
    case 'received_by_coordinator':  return 'Send to estimation team';
    case 'sent_to_estimation':       return 'Follow up with estimation team';
    case 'waiting_for_estimation':   return 'Record quotation when received from estimation';
    case 'need_clarification':       return 'Awaiting clarification from Sales';
    case 'quotation_received':       return 'Enter quotation number and return to Sales';
    case 'returned_to_sales':        return 'Returned — awaiting Sales next action';
    case 'converted_to_hot_project': return 'Converted';
    case 'converted_to_so':          return 'Converted to SO';
    default:                         return '—';
  }
}

type StatusGroup =
  | 'action_required'
  | 'all'
  | 'draft'
  | 'submitted'
  | 'coordinator'
  | 'converted'
  | 'closed';

const STATUS_GROUP_FILTER: Record<StatusGroup, QuotationStatus[]> = {
  action_required: ['returned_to_sales', 'need_clarification', 'quotation_received'],
  all:             [],
  draft:           ['draft'],
  submitted:       ['submitted_by_sales'],
  coordinator:     ['received_by_coordinator', 'sent_to_estimation', 'waiting_for_estimation'],
  converted:       ['converted_to_hot_project', 'converted_to_so'],
  closed:          ['cancelled', 'closed_lost'],
};

const STATUS_TABS: { key: StatusGroup; label: string }[] = [
  { key: 'action_required', label: 'Action Required' },
  { key: 'draft',           label: 'Draft'           },
  { key: 'submitted',       label: 'Submitted'       },
  { key: 'coordinator',     label: 'With Coordinator'},
  { key: 'converted',       label: 'Converted'       },
  { key: 'closed',          label: 'Closed'          },
  { key: 'all',             label: 'All'             },
];

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'sales_user'];

// ── Component ─────────────────────────────────────────────────────────────────

export function Quotations() {
  const { role, profile } = useAuth();
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const isCoordinator = role === 'sales_coordinator';
  const [statusGroup, setStatusGroup] = useState<StatusGroup>(isCoordinator ? 'submitted' : 'action_required');
  const [priority, setPriority] = useState<QuotationPriority | 'all'>('all');

  const isSalesUser = role === 'sales_user';
  const canCreate = role && CAN_CREATE.includes(role);
  const canSeeFinancials = role === 'admin' || role === 'operations_manager';

  const accentActive = isCoordinator ? 'text-teal-700 border-b-2 border-teal-600' : 'text-emerald-700 border-b-2 border-emerald-600';
  const accentBadge = isCoordinator ? 'bg-teal-100 text-teal-700' : 'bg-emerald-100 text-emerald-700';
  const accentRing = isCoordinator ? 'focus:ring-teal-600/30' : 'focus:ring-emerald-600/30';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        const data =
          role === 'sales_user'
            ? MOCK_QUOTATIONS.filter((q) => q.requested_by === profile?.id || q.requested_by === 'dev-usr-002')
            : MOCK_QUOTATIONS;
        if (!cancelled) {
          setQuotations(data);
          setLoading(false);
        }
        return;
      }

      let query = supabase
        .from('quotation_requests')
        .select('*, requested_by_profile:profiles!quotation_requests_requested_by_fkey(full_name, email), assigned_coordinator:profiles!quotation_requests_assigned_coordinator_id_fkey(full_name, email)')
        .order('created_at', { ascending: false });

      if (role === 'sales_user' && profile?.id) {
        query = query.eq('requested_by', profile.id);
      }

      const { data } = await query;
      if (!cancelled) {
        setQuotations((data as unknown as QuotationRequest[]) ?? []);
        setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [role, profile]);

  const tabCounts = useMemo(() => {
    const counts: Record<StatusGroup, number> = {} as Record<StatusGroup, number>;
    for (const tab of STATUS_TABS) {
      const statuses = STATUS_GROUP_FILTER[tab.key];
      counts[tab.key] = statuses.length === 0
        ? quotations.length
        : quotations.filter(q => statuses.includes(q.quotation_status)).length;
    }
    return counts;
  }, [quotations]);

  const filtered = useMemo(() => {
    let list = quotations;

    if (statusGroup !== 'all') {
      const statuses = STATUS_GROUP_FILTER[statusGroup];
      list = list.filter((q) => statuses.includes(q.quotation_status));
    }

    if (priority !== 'all') {
      list = list.filter((q) => q.priority === priority);
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (q) =>
          q.quotation_code.toLowerCase().includes(s) ||
          q.customer_name.toLowerCase().includes(s) ||
          (q.scope_summary ?? '').toLowerCase().includes(s),
      );
    }

    return list;
  }, [quotations, statusGroup, priority, search]);

  const actionRequired = quotations.filter(q =>
    STATUS_GROUP_FILTER.action_required.includes(q.quotation_status)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation Requests"
        subtitle={isSalesUser
          ? 'Your quotation requests — track status, respond to clarifications, and convert to projects'
          : isCoordinator
          ? 'All quotation requests — process new submissions, coordinate with estimation, and return completed quotations to Sales'
          : 'Pre-sales quotation management and Sales Coordinator workflow'}
        actions={
          canCreate ? (
            <Link to="/quotations/new">
              <Button icon={<Plus size={16} />}>New Quotation Request</Button>
            </Link>
          ) : undefined
        }
      />

      {!loading && isCoordinator && (() => {
        const unprocessed = quotations.filter(q => q.quotation_status === 'submitted_by_sales');
        const clarification = quotations.filter(q => q.quotation_status === 'need_clarification');
        const ready = quotations.filter(q => q.quotation_status === 'quotation_received');
        const total = unprocessed.length + clarification.length + ready.length;
        return total > 0 ? (
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-teal-800">
            <AlertTriangle size={14} className="text-teal-500 shrink-0" />
            <span>
              {unprocessed.length > 0 && <><strong>{unprocessed.length}</strong> new{unprocessed.length !== 1 ? ' requests' : ' request'} pending pickup</>}
              {unprocessed.length > 0 && (clarification.length > 0 || ready.length > 0) && ' · '}
              {clarification.length > 0 && <><strong>{clarification.length}</strong> awaiting clarification</>}
              {clarification.length > 0 && ready.length > 0 && ' · '}
              {ready.length > 0 && <><strong>{ready.length}</strong> ready to return to Sales</>}
            </span>
          </div>
        ) : null;
      })()}
      {!loading && !isCoordinator && actionRequired.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <span>
            <strong>{actionRequired.length}</strong> quotation{actionRequired.length !== 1 ? 's' : ''} require your attention — returned, clarification requested, or quotation received.
          </span>
        </div>
      )}

      {/* Tab filters */}
      <div className="flex gap-1 border-b border-gray-100 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusGroup(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              statusGroup === tab.key ? accentActive : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                statusGroup === tab.key ? accentBadge : 'bg-gray-100 text-gray-500'
              }`}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + priority */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code, customer, scope…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${accentRing}`}
          />
        </div>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as QuotationPriority | 'all')}
          className={`text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${accentRing}`}
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="No quotations found"
          description={search ? 'Try adjusting your search or filters.' : 'No quotation requests match the selected filters.'}
          action={
            canCreate ? (
              <Link to="/quotations/new">
                <Button icon={<Plus size={16} />} size="sm">New Quotation Request</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Priority</th>
                  {isCoordinator && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Sales Owner</th>
                  )}
                  {!isSalesUser && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Coordinator</th>
                  )}
                  {canSeeFinancials && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Total Value</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Next Action</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filtered.map((q) => {
                  const overdue = isQuotationOverdue(q);
                  const isActionable = isCoordinator
                    ? ['submitted_by_sales', 'quotation_received'].includes(q.quotation_status)
                    : STATUS_GROUP_FILTER.action_required.includes(q.quotation_status);
                  const action = isCoordinator ? coordinatorNextAction(q) : quotationNextAction(q);
                  return (
                    <tr key={q.id} className={`hover:bg-gray-50 transition-colors ${isCoordinator && isActionable ? 'bg-teal-50/20' : !isCoordinator && isActionable ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-medium text-gray-900">{q.quotation_code}</span>
                          {overdue && <AlertTriangle size={13} className="text-amber-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{q.customer_name}</div>
                        {q.scope_summary && (
                          <div className="text-xs text-gray-400 truncate max-w-[200px]">{q.scope_summary}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[q.quotation_status]}>
                          {STATUS_LABELS[q.quotation_status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant={PRIORITY_VARIANT[q.priority]} className="capitalize">
                          {q.priority}
                        </Badge>
                      </td>
                      {isCoordinator && (
                        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                          {q.requested_by_profile?.full_name ?? (
                            <span className="text-gray-400 italic">Unknown</span>
                          )}
                        </td>
                      )}
                      {!isSalesUser && (
                        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                          {q.assigned_coordinator?.full_name ?? (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                      )}
                      {canSeeFinancials && (
                        <td className="px-4 py-3 text-right text-sm text-gray-700 hidden lg:table-cell">
                          {q.quotation_total_value != null ? formatSAR(q.quotation_total_value) : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                        {q.submitted_at ? (
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-gray-400" />
                            {formatDate(q.submitted_at)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs ${isActionable ? (isCoordinator ? 'text-teal-700 font-medium' : 'text-amber-700 font-medium') : 'text-gray-500'}`}>
                          {action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/quotations/${q.id}`}>
                          <Button variant="ghost" size="sm">View <ChevronRight size={12} /></Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
