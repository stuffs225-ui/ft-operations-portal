import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ClipboardList, Search, AlertTriangle,
  CheckCircle2, UserCheck, ChevronRight, FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isQuotationOverdue, getOverdueDays, getQuotationSlaStatus } from '../lib/quotationSla';
import { MOCK_QUOTATIONS as MOCK_QUOTATIONS_RAW } from '../data/mockQuotations';
import { mockOrEmpty } from '../lib/dataMode';
import type { QuotationRequest, QuotationStatus, QuotationPriority } from '../types';

const MOCK_QUOTATIONS = mockOrEmpty(MOCK_QUOTATIONS_RAW);

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<QuotationStatus, string> = {
  draft:                    'Draft',
  submitted_by_sales:       'New — Submitted by Sales',
  received_by_coordinator:  'Received',
  sent_to_estimation:       'Sent to Estimation',
  waiting_for_estimation:   'Waiting Estimation',
  need_clarification:       'Need Clarification',
  quotation_received:       'Quotation Ready',
  returned_to_sales:        'Returned to Sales',
  converted_to_hot_project: 'Converted to Hot Project',
  converted_to_so:          'Converted to SO',
  cancelled:                'Cancelled',
  closed_lost:              'Closed Lost',
};

const STATUS_VARIANT: Record<QuotationStatus, 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default'> = {
  draft:                    'neutral',
  submitted_by_sales:       'info',
  received_by_coordinator:  'default',
  sent_to_estimation:       'warning',
  waiting_for_estimation:   'warning',
  need_clarification:       'critical',
  quotation_received:       'success',
  returned_to_sales:        'default',
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

// ── Types ─────────────────────────────────────────────────────────────────────

type QueueTab = 'new' | 'unassigned' | 'mine' | 'estimation' | 'clarification' | 'ready' | 'returned' | 'completed' | 'all';
type QuickFilter = 'all' | 'unassigned' | 'overdue' | 'high_priority' | 'clarification' | 'ready' | 'missing_quotation';

const QUEUE_TABS: { key: QueueTab; label: string }[] = [
  { key: 'new',          label: 'New'              },
  { key: 'unassigned',   label: 'Unassigned'       },
  { key: 'mine',         label: 'Assigned to Me'   },
  { key: 'estimation',   label: 'Waiting Estimation'},
  { key: 'clarification',label: 'Need Clarification'},
  { key: 'ready',        label: 'Ready to Return'  },
  { key: 'returned',     label: 'Returned'         },
  { key: 'completed',    label: 'Completed'        },
  { key: 'all',          label: 'All'              },
];

const TAB_STATUSES: Record<QueueTab, QuotationStatus[]> = {
  new:          ['submitted_by_sales'],
  unassigned:   ['submitted_by_sales', 'received_by_coordinator'],
  mine:         ['received_by_coordinator', 'sent_to_estimation', 'waiting_for_estimation', 'need_clarification', 'quotation_received'],
  estimation:   ['sent_to_estimation', 'waiting_for_estimation'],
  clarification:['need_clarification'],
  ready:        ['quotation_received'],
  returned:     ['returned_to_sales'],
  completed:    ['converted_to_so', 'converted_to_hot_project', 'cancelled', 'closed_lost'],
  all:          [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysInStatus(q: QuotationRequest): number {
  const ref = q.updated_at ?? q.created_at;
  return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function coordinatorNextAction(q: QuotationRequest): string {
  switch (q.quotation_status) {
    case 'submitted_by_sales':       return 'Mark received';
    case 'received_by_coordinator':  return 'Send to estimation';
    case 'sent_to_estimation':       return 'Follow up with estimation';
    case 'waiting_for_estimation':   return 'Record quotation response';
    case 'need_clarification':       return 'Awaiting Sales clarification';
    case 'quotation_received':       return 'Return to Sales';
    case 'returned_to_sales':        return 'Returned — complete';
    case 'converted_to_so':          return 'Converted to SO';
    case 'converted_to_hot_project': return 'Converted to Hot Project';
    default:                         return '—';
  }
}

function isActionRequired(q: QuotationRequest): boolean {
  return ['submitted_by_sales', 'quotation_received', 'need_clarification'].includes(q.quotation_status);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CoordinatorQueue() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Default tab from URL param (from dashboard quick links)
  const urlFilter = searchParams.get('filter') as QuickFilter | null;
  const initialTab: QueueTab = (() => {
    if (urlFilter === 'unassigned') return 'unassigned';
    if (urlFilter === 'clarification') return 'clarification';
    if (urlFilter === 'ready') return 'ready';
    if (urlFilter === 'overdue') return 'all';
    return 'new';
  })();
  const [tab, setTab] = useState<QueueTab>(initialTab);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(urlFilter ?? 'all');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        const data = MOCK_QUOTATIONS.filter(q =>
          !['draft'].includes((q as unknown as QuotationRequest).quotation_status)
        );
        if (!cancelled) {
          setQuotations(data as unknown as QuotationRequest[]);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase
        .from('quotation_requests')
        .select('*, requested_by_profile:profiles!quotation_requests_requested_by_fkey(full_name, email), assigned_coordinator:profiles!quotation_requests_assigned_coordinator_id_fkey(full_name, email)')
        .not('quotation_status', 'in', '("draft")')
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setQuotations((data as unknown as QuotationRequest[]) ?? []);
        setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const currentUserId = profile?.id ?? null;

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<QueueTab, number> = {} as Record<QueueTab, number>;
    for (const t of QUEUE_TABS) {
      if (t.key === 'all') {
        counts[t.key] = quotations.length;
      } else if (t.key === 'unassigned') {
        counts[t.key] = quotations.filter(q =>
          TAB_STATUSES.unassigned.includes(q.quotation_status) && !q.assigned_coordinator_id
        ).length;
      } else if (t.key === 'mine') {
        counts[t.key] = quotations.filter(q =>
          TAB_STATUSES.mine.includes(q.quotation_status) && currentUserId != null && q.assigned_coordinator_id === currentUserId
        ).length;
      } else {
        counts[t.key] = quotations.filter(q => TAB_STATUSES[t.key].includes(q.quotation_status)).length;
      }
    }
    return counts;
  }, [quotations, currentUserId]);

  // Tab filter
  const tabFiltered = useMemo(() => {
    if (tab === 'all') return quotations;
    if (tab === 'unassigned') return quotations.filter(q => TAB_STATUSES.unassigned.includes(q.quotation_status) && !q.assigned_coordinator_id);
    if (tab === 'mine') return quotations.filter(q => TAB_STATUSES.mine.includes(q.quotation_status) && currentUserId != null && q.assigned_coordinator_id === currentUserId);
    return quotations.filter(q => TAB_STATUSES[tab].includes(q.quotation_status));
  }, [quotations, tab, currentUserId]);

  // Quick filter
  const quickFiltered = useMemo(() => {
    switch (quickFilter) {
      case 'unassigned':      return tabFiltered.filter(q => !q.assigned_coordinator_id);
      case 'overdue':         return tabFiltered.filter(q => isQuotationOverdue(q));
      case 'high_priority':   return tabFiltered.filter(q => q.priority === 'high' || q.priority === 'urgent');
      case 'clarification':   return tabFiltered.filter(q => q.quotation_status === 'need_clarification');
      case 'ready':           return tabFiltered.filter(q => q.quotation_status === 'quotation_received');
      case 'missing_quotation': return tabFiltered.filter(q => q.quotation_status === 'quotation_received' && !q.quotation_number);
      default:                return tabFiltered;
    }
  }, [tabFiltered, quickFilter]);

  // Search
  const filtered = useMemo(() => {
    if (!search.trim()) return quickFiltered;
    const q = search.toLowerCase();
    return quickFiltered.filter(r =>
      r.quotation_code.toLowerCase().includes(q) ||
      r.customer_name.toLowerCase().includes(q) ||
      (r.scope_summary ?? '').toLowerCase().includes(q) ||
      (r.requested_by_profile?.full_name ?? '').toLowerCase().includes(q)
    );
  }, [quickFiltered, search]);

  const overdueCount = quotations.filter(q => isQuotationOverdue(q)).length;

  const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
    { key: 'all',              label: 'All'              },
    { key: 'unassigned',       label: 'Unassigned'       },
    { key: 'overdue',          label: `Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}` },
    { key: 'high_priority',    label: 'High Priority'    },
    { key: 'clarification',    label: 'Clarification'    },
    { key: 'ready',            label: 'Ready to Return'  },
    { key: 'missing_quotation',label: 'Missing QTN #'   },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coordinator Queue"
        subtitle="Full quotation coordination workflow — all stages and filters."
        breadcrumb={[{ label: 'Coordinator Dashboard', href: '/sales-coordinator' }, { label: 'Queue' }]}
      />

      {/* Overdue alert */}
      {!loading && overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-red-800">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <span>
            <strong>{overdueCount}</strong> quotation{overdueCount !== 1 ? 's' : ''} have breached SLA — process immediately.
          </span>
        </div>
      )}

      {/* Workflow tabs */}
      <div className="flex gap-1 border-b border-gray-100 overflow-x-auto">
        {QUEUE_TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setQuickFilter('all'); }}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? 'text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            {tabCounts[t.key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                tab === t.key ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
              }`}>{tabCounts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map(f => (
          <button key={f.key} onClick={() => setQuickFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              quickFilter === f.key
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-700'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search code, customer, sales owner…"
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/30"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-lg border border-gray-200/80 overflow-hidden bg-white">
          <div className="h-10 bg-gray-50/80 border-b border-gray-100" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="ml-auto h-7 w-12 rounded-md" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={32} className="text-gray-300" />}
          title={tab === 'new' ? 'No new requests' : 'No items in this queue'}
          description={
            search
              ? 'Try adjusting your search.'
              : tab === 'new'
              ? 'No quotation requests are waiting to be processed. All clear!'
              : tab === 'clarification'
              ? 'No quotations are waiting for Sales clarification.'
              : tab === 'ready'
              ? 'No quotations ready to return. Enter quotation number and value first.'
              : 'No items match the current tab and filters.'
          }
          action={
            tab === 'new' ? (
              <Link to="/quotations">
                <Button variant="secondary" size="sm">View All Quotations</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Request</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Sales Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Quotation #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Sent to Est.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Next Action</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filtered.map(q => {
                  const sla = getQuotationSlaStatus(q);
                  const overdueDays = getOverdueDays(q);
                  const days = daysInStatus(q);
                  const actionable = isActionRequired(q);
                  const isAssignedToMe = profile?.id && q.assigned_coordinator_id === profile.id;

                  return (
                    <tr key={q.id} className={`hover:bg-gray-50 transition-colors ${sla === 'overdue' ? 'bg-red-50/30' : actionable ? 'bg-teal-50/20' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <FileText size={12} className="text-teal-400 shrink-0" />
                          <span className="font-mono text-xs font-semibold text-teal-700">{q.quotation_code}</span>
                          {sla === 'overdue' && (
                            <span className="text-xs text-red-600 font-medium">{overdueDays}d OD</span>
                          )}
                        </div>
                        {isAssignedToMe && (
                          <div className="flex items-center gap-1 mt-0.5 ml-5">
                            <UserCheck size={10} className="text-teal-500" />
                            <span className="text-xs text-teal-600">Assigned to me</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{q.customer_name}</div>
                        {q.scope_summary && (
                          <div className="text-xs text-gray-400 truncate max-w-[160px]">{q.scope_summary}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                        {q.requested_by_profile?.full_name ?? <span className="text-gray-400 italic">Unknown</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[q.quotation_status]} size="sm">
                          {STATUS_LABELS[q.quotation_status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant={PRIORITY_VARIANT[q.priority]} size="sm" className="capitalize">
                          {q.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                        <span className={days > 7 ? 'text-red-600 font-medium' : ''}>{days}d</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {q.quotation_number
                          ? <span className="font-mono text-xs text-teal-700 font-semibold">{q.quotation_number}</span>
                          : <span className="text-xs text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                        {fmtDate(q.sent_to_estimation_at)}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className={`text-xs ${actionable ? 'text-teal-700 font-medium' : 'text-gray-500'}`}>
                          {coordinatorNextAction(q)}
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
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            Showing {filtered.length} of {quotations.length} quotations
            {!isSupabaseConfigured && <span className="ml-2 text-amber-600">· Dev mode — mock data</span>}
          </div>
        </Card>
      )}

      {/* Schema gap notice */}
      {!isSupabaseConfigured && (
        <div className="flex items-start gap-2 text-xs text-gray-500 border border-gray-100 rounded-lg px-3 py-2">
          <CheckCircle2 size={12} className="mt-0.5 text-gray-400 shrink-0" />
          <span>
            <strong>Note:</strong> "Assign to Me", "Mark Received", "Send to Estimation", and "Return to Sales" actions are performed in the individual quotation detail view. Coordinator assignment requires Supabase write access via RLS policy.
          </span>
        </div>
      )}
    </div>
  );
}
