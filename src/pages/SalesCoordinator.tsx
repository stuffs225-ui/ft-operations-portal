import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Clock, AlertTriangle, Send,
  RotateCcw, ChevronRight, UserCheck,
  CheckCircle2, RefreshCw, FileText, FilePlus, MessageSquare,
} from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  isQuotationOverdue,
  getOverdueDays,
  getQuotationSlaStatus,
  getQuotationSlaDue,
} from '../lib/quotationSla';
import { ROLE_MATRIX } from '../lib/roleMatrix';
import { isMissingRelationError } from '../lib/deferredMigrationSafety';
import { MOCK_QUOTATIONS as MOCK_QUOTATIONS_RAW } from '../data/mockQuotations';
import { mockOrEmpty } from '../lib/dataMode';
import type { QuotationRequest, QuotationStatus, QuotationPriority } from '../types';

// One row per quotation that has a clarification thread — the coordinator's
// "requests to Sales" follow-up list (latest message decides the state).
interface ClarificationThreadSummary {
  quotation_id: string;
  quotation_code: string;
  customer_name: string;
  lastBody: string;
  lastAt: string;
  awaitingSales: boolean;
}

const MOCK_QUOTATIONS = mockOrEmpty(MOCK_QUOTATIONS_RAW);

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES: QuotationStatus[] = [
  'submitted_by_sales', 'received_by_coordinator', 'sent_to_estimation',
  'waiting_for_estimation', 'need_clarification', 'quotation_received',
];

const PRIORITY_VARIANT: Record<QuotationPriority, 'neutral' | 'warning' | 'critical' | 'info'> = {
  low: 'neutral', medium: 'info', high: 'warning', urgent: 'critical',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Priority Row ──────────────────────────────────────────────────────────────

function PriorityRow({ q }: { q: QuotationRequest }) {
  const sla = getQuotationSlaStatus(q);
  const due = getQuotationSlaDue(q);
  const overdueDays = getOverdueDays(q);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="min-w-0 flex-1 flex items-center gap-3 flex-wrap">
        <span className="font-mono text-xs font-semibold text-teal-700 shrink-0">{q.quotation_code}</span>
        <span className="text-sm text-gray-700 truncate min-w-0">{q.customer_name}</span>
        {sla === 'overdue' && (
          <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">
            {overdueDays}d overdue
          </span>
        )}
        {sla === 'warning' && (
          <span className="text-xs font-medium text-amber-600 shrink-0">SLA warning</span>
        )}
        {due && sla === 'ok' && (
          <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">Due {fmtDate(due.toISOString())}</span>
        )}
        {(q.priority === 'high' || q.priority === 'urgent') && (
          <Badge variant={PRIORITY_VARIANT[q.priority]} size="sm" className="capitalize shrink-0 hidden sm:inline-flex">
            {q.priority}
          </Badge>
        )}
      </div>
      <Link to={`/quotations/${q.id}`} className="shrink-0">
        <Button variant="ghost" size="sm">Open <ChevronRight size={12} /></Button>
      </Link>
    </div>
  );
}

// ── Priority Section ──────────────────────────────────────────────────────────

const SHOW_MAX = 5;

function PrioritySection({
  title,
  accentColor,
  items,
  queueHref,
}: {
  title: string;
  accentColor: string;
  items: QuotationRequest[];
  queueHref: string;
}) {
  if (items.length === 0) return null;
  const shown = items.slice(0, SHOW_MAX);
  const remaining = items.length - SHOW_MAX;

  return (
    <div>
      <SectionHeader title={`${title} (${items.length})`} accent={accentColor} />
      <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
        {shown.map(q => <PriorityRow key={q.id} q={q} />)}
        {remaining > 0 && (
          <Link
            to={queueHref}
            className="flex items-center justify-center gap-1 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 border-t border-gray-100 transition-colors"
          >
            View {remaining} more in queue <ChevronRight size={13} />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SalesCoordinator() {
  const { role, profile } = useAuth();
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [threads, setThreads] = useState<ClarificationThreadSummary[]>([]);
  const [threadsUnavailable, setThreadsUnavailable] = useState(false);

  const canView = role === 'admin' || role === 'operations_manager' || role === 'sales_coordinator';

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!cancelled) setLoading(true);
      if (!canView) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        const active = MOCK_QUOTATIONS.filter(q =>
          ACTIVE_STATUSES.includes(q.quotation_status as QuotationStatus),
        );
        if (!cancelled) {
          setQuotations(active as unknown as QuotationRequest[]);
          setLoading(false);
        }
        return;
      }

      const [{ data }, clarRes] = await Promise.all([
        supabase
          .from('quotation_requests')
          .select('*, requested_by_profile:profiles!quotation_requests_requested_by_fkey(full_name, email), assigned_coordinator:profiles!quotation_requests_assigned_coordinator_id_fkey(full_name, email)')
          .in('quotation_status', ACTIVE_STATUSES)
          .order('created_at', { ascending: false }),
        supabase
          .from('quotation_clarifications')
          .select('quotation_id, direction, body, created_at, quotation:quotation_requests(quotation_code, customer_name)')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      // Requests to Sales — one entry per quotation, driven by the latest
      // clarification message. Deferred-safe: migration 106 pending → notice.
      let threadSummaries: ClarificationThreadSummary[] = [];
      let unavailable = false;
      if (clarRes.error) {
        unavailable = isMissingRelationError(clarRes.error);
      } else {
        const seen = new Set<string>();
        for (const row of (clarRes.data ?? []) as unknown as {
          quotation_id: string; direction: string; body: string; created_at: string;
          quotation?: { quotation_code: string; customer_name: string } | null;
        }[]) {
          if (seen.has(row.quotation_id)) continue;
          seen.add(row.quotation_id);
          threadSummaries.push({
            quotation_id: row.quotation_id,
            quotation_code: row.quotation?.quotation_code ?? '—',
            customer_name: row.quotation?.customer_name ?? '—',
            lastBody: row.body,
            lastAt: row.created_at,
            awaitingSales: row.direction === 'coordinator_request',
          });
        }
        threadSummaries = threadSummaries.slice(0, 6);
      }

      if (!cancelled) {
        setQuotations((data as unknown as QuotationRequest[]) ?? []);
        setThreads(threadSummaries);
        setThreadsUnavailable(unavailable);
        setLoading(false);
      }
    }

    void run();
    return () => { cancelled = true; };
  }, [canView, reloadKey]);

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="Coordinator Dashboard" subtitle="Quotation coordination workspace" />
        <div className="flex flex-col items-center py-16 text-center text-gray-400">
          <ClipboardList size={40} className="mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Access Restricted</p>
          <p className="text-xs mt-1">This workspace is for Sales Coordinators, Operations Managers, and Admins.</p>
        </div>
      </div>
    );
  }

  // KPI derivations
  const newCount          = quotations.filter(q => q.quotation_status === 'submitted_by_sales').length;
  const unassignedCount   = quotations.filter(q =>
    ['submitted_by_sales', 'received_by_coordinator'].includes(q.quotation_status) && !q.assigned_coordinator_id,
  ).length;
  const assignedToMeCount = quotations.filter(q => profile?.id && q.assigned_coordinator_id === profile.id).length;
  const estimationCount   = quotations.filter(q => ['sent_to_estimation', 'waiting_for_estimation'].includes(q.quotation_status)).length;
  const clarificationCount= quotations.filter(q => q.quotation_status === 'need_clarification').length;
  const readyCount        = quotations.filter(q => q.quotation_status === 'quotation_received').length;
  const overdueCount      = quotations.filter(q => isQuotationOverdue(q)).length;

  const kpis: {
    label: string; value: number; icon: React.ReactNode;
    colorClass: string; href: string; urgent: boolean;
  }[] = [
    {
      label: 'New / Unprocessed', value: newCount,
      icon: <Clock size={15} />, colorClass: 'text-teal-700 bg-teal-50 border-teal-200',
      href: '/coordinator-queue', urgent: newCount > 0,
    },
    {
      label: 'Unassigned', value: unassignedCount,
      icon: <UserCheck size={15} />, colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
      href: '/coordinator-queue?filter=unassigned', urgent: unassignedCount > 0,
    },
    {
      label: 'Need Clarification', value: clarificationCount,
      icon: <AlertTriangle size={15} />, colorClass: 'text-orange-700 bg-orange-50 border-orange-200',
      href: '/coordinator-queue?filter=clarification', urgent: clarificationCount > 0,
    },
    {
      label: 'Ready to Return', value: readyCount,
      icon: <RotateCcw size={15} />, colorClass: 'text-green-700 bg-green-50 border-green-200',
      href: '/coordinator-queue?filter=ready', urgent: readyCount > 0,
    },
    {
      label: 'Assigned to Me', value: assignedToMeCount,
      icon: <ClipboardList size={15} />, colorClass: 'text-teal-700 bg-teal-50 border-teal-200',
      href: '/coordinator-queue?tab=mine', urgent: false,
    },
    {
      label: 'Waiting Estimation', value: estimationCount,
      icon: <Send size={15} />, colorClass: 'text-sky-700 bg-sky-50 border-sky-200',
      href: '/coordinator-queue?tab=estimation', urgent: false,
    },
    {
      label: 'Total Active', value: quotations.length,
      icon: <FileText size={15} />, colorClass: 'text-gray-600 bg-gray-50 border-gray-200',
      href: '/coordinator-queue?tab=all', urgent: false,
    },
    {
      label: 'Overdue', value: overdueCount,
      icon: <AlertTriangle size={15} />,
      colorClass: overdueCount > 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-gray-500 bg-gray-50 border-gray-200',
      href: '/coordinator-queue?filter=overdue', urgent: overdueCount > 0,
    },
  ];

  // Priority groups — ordered by urgency
  const groups = {
    overdue:      quotations.filter(q => isQuotationOverdue(q)),
    clarification:quotations.filter(q => q.quotation_status === 'need_clarification'),
    ready:        quotations.filter(q => q.quotation_status === 'quotation_received'),
    intake:       quotations.filter(q => ['submitted_by_sales', 'received_by_coordinator'].includes(q.quotation_status)),
    estimation:   quotations.filter(q => ['sent_to_estimation', 'waiting_for_estimation'].includes(q.quotation_status)),
  };

  const allClear = !loading && quotations.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coordinator Dashboard"
        subtitle="Receive, coordinate, and return quotation requests to Sales."
        actions={
          <div className="flex items-center gap-2">
            {role === 'sales_coordinator' && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_MATRIX.sales_coordinator.badgeClass}`}>
                Sales Coordinator
              </span>
            )}
            <button
              onClick={() => setReloadKey(k => k + 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Reload"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <DataSourceBadge variant="auto" />
          </div>
        }
      />

      {/* Critical overdue alert */}
      {!loading && overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <span>
              <strong>{overdueCount}</strong> quotation{overdueCount !== 1 ? 's' : ''} have breached SLA — process immediately.
            </span>
          </div>
          <Link to="/coordinator-queue?filter=overdue">
            <Button variant="secondary" size="sm">Open Queue</Button>
          </Link>
        </div>
      )}

      {/* KPI tiles — clickable, linked to queue tabs */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-7 w-10" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map(k => (
            <Link
              key={k.label}
              to={k.href}
              className={`rounded-lg border p-4 block hover:shadow-md transition-all ${k.colorClass}`}
            >
              <div className="mb-1">{k.icon}</div>
              <div className="text-2xl font-bold tabular-nums">{k.value}</div>
              <div className="text-xs font-medium mt-0.5 opacity-80">{k.label}</div>
            </Link>
          ))}
        </div>
      )}

      {/* Primary CTAs */}
      {!loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/coordinator-queue">
            <Button variant="primary" size="sm">
              <ClipboardList size={13} className="mr-1" /> Open Coordinator Queue
            </Button>
          </Link>
          <Link to="/quotations/new">
            <Button variant="secondary" size="sm">
              <FilePlus size={13} className="mr-1" /> New Quotation Request
            </Button>
          </Link>
          <Link to="/quotations">
            <Button variant="secondary" size="sm">
              <FileText size={13} className="mr-1" /> All Quotation Requests
            </Button>
          </Link>
          <Link to="/reports/sales">
            <Button variant="ghost" size="sm">Coordination Reports</Button>
          </Link>
        </div>
      )}

      {/* Requests to Sales — clarification threads raised by the coordinator */}
      {!loading && (
        <div>
          <SectionHeader title="Requests to Sales" accent="bg-violet-500" />
          <p className="text-sm text-gray-500 mb-3">
            Clarification threads with the sales team — ask for documents, specs, or anything else from a quotation's page.
          </p>
          {threadsUnavailable ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
              Migration 106 is pending — clarification threads will appear here once applied.
            </div>
          ) : threads.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200/80 px-4 py-6 text-center text-sm text-gray-400">
              No clarification threads yet. Open a quotation and use its clarification thread to request anything from Sales.
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden">
              {threads.map((t) => (
                <div key={t.quotation_id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <MessageSquare size={14} className={`shrink-0 ${t.awaitingSales ? 'text-amber-500' : 'text-green-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-teal-700">{t.quotation_code}</span>
                      <span className="text-sm text-gray-700 truncate">{t.customer_name}</span>
                      {t.awaitingSales
                        ? <Badge variant="warning" size="sm">Awaiting sales reply</Badge>
                        : <Badge variant="success" size="sm">Sales replied</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {t.lastBody} · {fmtDate(t.lastAt)}
                    </p>
                  </div>
                  <Link to={`/quotations/${t.quotation_id}`} className="shrink-0">
                    <Button variant="ghost" size="sm">Open <ChevronRight size={12} /></Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Priority sections — command center view */}
      {!loading && (
        <div className="space-y-5">
          {allClear ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CheckCircle2 size={36} className="text-green-400 mb-3" />
              <p className="text-base font-semibold text-gray-700">All clear — no active quotations</p>
              <p className="text-sm text-gray-400 mt-1">
                No quotation requests are currently active in the coordination pipeline.
              </p>
            </div>
          ) : (
            <>
              <PrioritySection
                title="Overdue — SLA Breached"
                accentColor="bg-red-500"
                items={groups.overdue}
                queueHref="/coordinator-queue?filter=overdue"
              />
              <PrioritySection
                title="Need Clarification from Sales"
                accentColor="bg-orange-500"
                items={groups.clarification}
                queueHref="/coordinator-queue?filter=clarification"
              />
              <PrioritySection
                title="Ready to Return to Sales"
                accentColor="bg-green-500"
                items={groups.ready}
                queueHref="/coordinator-queue?filter=ready"
              />
              <PrioritySection
                title="In Intake / Processing"
                accentColor="bg-teal-500"
                items={groups.intake}
                queueHref="/coordinator-queue"
              />
              <PrioritySection
                title="Waiting for Estimation Response"
                accentColor="bg-sky-500"
                items={groups.estimation}
                queueHref="/coordinator-queue?tab=estimation"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
