import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Search, Plus, AlertTriangle, Clock,
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
  returned_to_sales:        'success',
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

type StatusGroup =
  | 'all'
  | 'draft'
  | 'submitted'
  | 'coordinator'
  | 'estimation'
  | 'clarification'
  | 'returned'
  | 'converted';

const STATUS_GROUP_FILTER: Record<StatusGroup, QuotationStatus[]> = {
  all:          [],
  draft:        ['draft'],
  submitted:    ['submitted_by_sales'],
  coordinator:  ['received_by_coordinator', 'sent_to_estimation', 'waiting_for_estimation', 'quotation_received'],
  estimation:   ['sent_to_estimation', 'waiting_for_estimation'],
  clarification:['need_clarification'],
  returned:     ['returned_to_sales'],
  converted:    ['converted_to_hot_project', 'converted_to_so'],
};

const STATUS_TABS: { key: StatusGroup; label: string }[] = [
  { key: 'all',          label: 'All' },
  { key: 'draft',        label: 'Draft' },
  { key: 'submitted',    label: 'Submitted' },
  { key: 'coordinator',  label: 'With Coordinator' },
  { key: 'estimation',   label: 'Estimation' },
  { key: 'clarification',label: 'Clarification' },
  { key: 'returned',     label: 'Returned' },
  { key: 'converted',    label: 'Converted' },
];

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'sales_user'];

// ── Component ─────────────────────────────────────────────────────────────────

export function Quotations() {
  const { role, profile } = useAuth();
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusGroup, setStatusGroup] = useState<StatusGroup>('all');
  const [priority, setPriority] = useState<QuotationPriority | 'all'>('all');

  const canCreate = role && CAN_CREATE.includes(role);
  const canSeeFinancials = role === 'admin' || role === 'operations_manager';

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const data =
        role === 'sales_user'
          ? MOCK_QUOTATIONS.filter((q) => q.requested_by === profile?.id || q.requested_by === 'dev-usr-002')
          : MOCK_QUOTATIONS;
      setQuotations(data);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('quotation_requests')
      .select('*, requested_by_profile:profiles!quotation_requests_requested_by_fkey(full_name, email), assigned_coordinator:profiles!quotation_requests_assigned_coordinator_id_fkey(full_name, email)')
      .order('created_at', { ascending: false });

    if (role === 'sales_user' && profile?.id) {
      query = query.eq('requested_by', profile.id);
    }

    query.then(({ data }) => {
      setQuotations((data as unknown as QuotationRequest[]) ?? []);
      setLoading(false);
    });
  }, [role, profile]);

  const filtered = useMemo(() => {
    let list = quotations;

    // Status group filter
    if (statusGroup !== 'all') {
      const statuses = STATUS_GROUP_FILTER[statusGroup];
      list = list.filter((q) => statuses.includes(q.quotation_status));
    }

    // Priority filter
    if (priority !== 'all') {
      list = list.filter((q) => q.priority === priority);
    }

    // Search
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation Requests"
        subtitle="Pre-sales quotation management and Sales Coordinator workflow"
        actions={
          canCreate ? (
            <Link to="/quotations/new">
              <Button icon={<Plus size={16} />}>New Quotation Request</Button>
            </Link>
          ) : undefined
        }
      />

      {/* Filters */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code, customer, scope…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as QuotationPriority | 'all')}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusGroup(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                statusGroup === tab.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sales Owner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Coordinator</th>
                  {canSeeFinancials && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Value</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filtered.map((q) => {
                  const overdue = isQuotationOverdue(q);
                  return (
                    <tr key={q.id} className="hover:bg-gray-50 transition-colors">
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
                      <td className="px-4 py-3">
                        <Badge variant={PRIORITY_VARIANT[q.priority]} className="capitalize">
                          {q.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {q.requested_by_profile?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {q.assigned_coordinator?.full_name ?? (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      {canSeeFinancials && (
                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                          {q.quotation_total_value != null ? formatSAR(q.quotation_total_value) : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {q.submitted_at ? (
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-gray-400" />
                            {formatDate(q.submitted_at)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/quotations/${q.id}`} className="text-sm text-brand-600 hover:underline font-medium">
                          View
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
