import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Clock, AlertTriangle, Send,
  FileText, RotateCcw, Info, Users, ChevronRight,
  UserCheck, ShieldCheck, TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isQuotationOverdue, getOverdueDays, getQuotationSlaStatus } from '../lib/quotationSla';
import { ROLE_MATRIX } from '../lib/roleMatrix';
import { MOCK_QUOTATIONS as MOCK_QUOTATIONS_RAW } from '../data/mockQuotations';
import { mockOrEmpty } from '../lib/dataMode';
import type { QuotationRequest, QuotationStatus } from '../types';

const MOCK_QUOTATIONS = mockOrEmpty(MOCK_QUOTATIONS_RAW);

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
    case 'submitted_by_sales':       return 'Mark received and assign to coordinator';
    case 'received_by_coordinator':  return 'Send to estimation team';
    case 'sent_to_estimation':       return 'Follow up with estimation team';
    case 'waiting_for_estimation':   return 'Record quotation when received from estimation';
    case 'need_clarification':       return 'Awaiting clarification from Sales';
    case 'quotation_received':       return 'Enter quotation number and return to Sales';
    case 'returned_to_sales':        return 'Returned — awaiting Sales next action';
    default:                         return '—';
  }
}

const ACTIVE_STATUSES: QuotationStatus[] = [
  'submitted_by_sales', 'received_by_coordinator', 'sent_to_estimation',
  'waiting_for_estimation', 'need_clarification', 'quotation_received',
];

// ── Row component ─────────────────────────────────────────────────────────────

function QuotationRow({ q, profile }: { q: QuotationRequest; profile: { id?: string } | null }) {
  const slaStatus = getQuotationSlaStatus(q);
  const overdueDays = getOverdueDays(q);
  const days = daysInStatus(q);
  const isAssignedToMe = profile?.id && q.assigned_coordinator_id === profile.id;

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono font-semibold text-teal-700">{q.quotation_code}</span>
          {slaStatus === 'overdue' && (
            <Badge variant="critical"><AlertTriangle size={10} className="mr-1" />Overdue {overdueDays}d</Badge>
          )}
          {slaStatus === 'warning' && <Badge variant="warning">SLA Warning</Badge>}
          <Badge variant="neutral" className="capitalize">{q.priority}</Badge>
          {isAssignedToMe && <Badge variant="info">Assigned to Me</Badge>}
          {q.quotation_number && <span className="text-xs text-teal-600 font-mono">{q.quotation_number}</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-600 truncate">{q.customer_name}</span>
          <span className="text-xs text-gray-400">{days}d in status</span>
          {q.submitted_at && <span className="text-xs text-gray-400 hidden sm:inline">Submitted {fmtDate(q.submitted_at)}</span>}
        </div>
        <p className="text-xs text-teal-600 mt-0.5 hidden md:block">{coordinatorNextAction(q)}</p>
      </div>
      <div className="ml-3 shrink-0">
        <Link to={`/quotations/${q.id}`}>
          <Button size="sm" variant="ghost">View <ChevronRight size={12} /></Button>
        </Link>
      </div>
    </div>
  );
}

// ── Work Queue Section ────────────────────────────────────────────────────────

function QueueSection({
  title, icon, quotations, emptyMsg, profile,
}: {
  title: string;
  icon: React.ReactNode;
  quotations: QuotationRequest[];
  emptyMsg: string;
  profile: { id?: string } | null;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="overflow-hidden p-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
            quotations.length > 0 ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-white text-gray-500 border-gray-200'
          }`}>{quotations.length}</span>
        </div>
        <span className="text-xs text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        quotations.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-400 italic">{emptyMsg}</p>
        ) : (
          quotations.map(q => <QuotationRow key={q.id} q={q} profile={profile} />)
        )
      )}
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SalesCoordinator() {
  const { role, profile } = useAuth();
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const canView = role === 'admin' || role === 'operations_manager' || role === 'sales_coordinator';
  const coordRules = ROLE_MATRIX.sales_coordinator.rules;

  useEffect(() => {
    if (!canView) { setLoading(false); return; }

    if (!isSupabaseConfigured || !supabase) {
      const active = MOCK_QUOTATIONS.filter(q =>
        ACTIVE_STATUSES.includes(q.quotation_status as QuotationStatus),
      );
      setQuotations(active as unknown as QuotationRequest[]);
      setLoading(false);
      return;
    }

    supabase
      .from('quotation_requests')
      .select('*, requested_by_profile:profiles!quotation_requests_requested_by_fkey(full_name, email), assigned_coordinator:profiles!quotation_requests_assigned_coordinator_id_fkey(full_name, email)')
      .in('quotation_status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuotations((data as unknown as QuotationRequest[]) ?? []);
        setLoading(false);
      });
  }, [canView]);

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="Coordinator Dashboard" subtitle="Quotation coordination workspace" />
        <EmptyState icon={<Users size={40} />} title="Access Restricted" description="This workspace is for Sales Coordinators, Operations Managers, and Admins." />
      </div>
    );
  }

  // KPI derivations
  const newCount = quotations.filter(q => q.quotation_status === 'submitted_by_sales').length;
  const unassignedCount = quotations.filter(q =>
    ['submitted_by_sales', 'received_by_coordinator'].includes(q.quotation_status) && !q.assigned_coordinator_id
  ).length;
  const assignedToMeCount = quotations.filter(q => profile?.id && q.assigned_coordinator_id === profile.id).length;
  const estimationCount = quotations.filter(q => ['sent_to_estimation', 'waiting_for_estimation'].includes(q.quotation_status)).length;
  const clarificationCount = quotations.filter(q => q.quotation_status === 'need_clarification').length;
  const readyCount = quotations.filter(q => q.quotation_status === 'quotation_received').length;
  const overdueCount = quotations.filter(q => isQuotationOverdue(q)).length;

  const kpis = [
    { label: 'New / Unprocessed', value: newCount, icon: <Clock size={16} />, color: 'text-teal-700 bg-teal-50 border-teal-200', urgent: newCount > 0 },
    { label: 'Unassigned', value: unassignedCount, icon: <UserCheck size={16} />, color: 'text-amber-700 bg-amber-50 border-amber-200', urgent: unassignedCount > 0 },
    { label: 'Assigned to Me', value: assignedToMeCount, icon: <ClipboardList size={16} />, color: 'text-teal-700 bg-teal-50 border-teal-200', urgent: false },
    { label: 'Waiting Estimation', value: estimationCount, icon: <Send size={16} />, color: 'text-sky-700 bg-sky-50 border-sky-200', urgent: false },
    { label: 'Need Clarification', value: clarificationCount, icon: <AlertTriangle size={16} />, color: 'text-orange-700 bg-orange-50 border-orange-200', urgent: clarificationCount > 0 },
    { label: 'Ready to Return', value: readyCount, icon: <RotateCcw size={16} />, color: 'text-green-700 bg-green-50 border-green-200', urgent: readyCount > 0 },
    { label: 'Total Active', value: quotations.length, icon: <FileText size={16} />, color: 'text-gray-600 bg-gray-50 border-gray-200', urgent: false },
    { label: 'Overdue', value: overdueCount, icon: <AlertTriangle size={16} />, color: overdueCount > 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-gray-500 bg-gray-50 border-gray-200', urgent: overdueCount > 0 },
  ];

  // Work queue data
  const queues = {
    new:          quotations.filter(q => q.quotation_status === 'submitted_by_sales'),
    unassigned:   quotations.filter(q => ['submitted_by_sales', 'received_by_coordinator'].includes(q.quotation_status) && !q.assigned_coordinator_id),
    mine:         quotations.filter(q => profile?.id && q.assigned_coordinator_id === profile.id),
    estimation:   quotations.filter(q => ['sent_to_estimation', 'waiting_for_estimation'].includes(q.quotation_status)),
    clarification:quotations.filter(q => q.quotation_status === 'need_clarification'),
    ready:        quotations.filter(q => q.quotation_status === 'quotation_received'),
    overdue:      quotations.filter(q => isQuotationOverdue(q)),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coordinator Dashboard"
        subtitle="Receive, process, clarify, and return quotation requests to Sales."
        actions={
          <div className="flex items-center gap-2">
            {role === 'sales_coordinator' && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_MATRIX.sales_coordinator.badgeClass}`}>
                Sales Coordinator
              </span>
            )}
            <DataSourceBadge variant="auto" />
          </div>
        }
      />

      {/* Dev mode notice */}
      {!isSupabaseConfigured && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>Dev mode — showing mock data. Changes will not be persisted.</span>
        </div>
      )}

      {/* Critical alert: overdue */}
      {!loading && overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <span><strong>{overdueCount}</strong> quotation{overdueCount !== 1 ? 's' : ''} are overdue — SLA breached. Process immediately.</span>
          </div>
          <Link to="/coordinator-queue">
            <Button variant="secondary" size="sm">Open Queue</Button>
          </Link>
        </div>
      )}

      {/* Top actions */}
      <div className="flex flex-wrap gap-2">
        <Link to="/coordinator-queue">
          <Button variant="primary" size="sm"><ClipboardList size={13} className="mr-1" /> Coordinator Queue</Button>
        </Link>
        <Link to="/quotations">
          <Button variant="secondary" size="sm"><FileText size={13} className="mr-1" /> All Quotation Requests</Button>
        </Link>
        <Link to="/coordinator-queue?filter=unassigned">
          <Button variant="secondary" size="sm"><UserCheck size={13} className="mr-1" /> Unassigned Requests</Button>
        </Link>
        <Link to="/coordinator-queue?filter=clarification">
          <Button variant="secondary" size="sm"><AlertTriangle size={13} className="mr-1" /> Need Clarification</Button>
        </Link>
        <Link to="/coordinator-queue?filter=ready">
          <Button variant="secondary" size="sm"><RotateCcw size={13} className="mr-1" /> Ready to Return</Button>
        </Link>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.urgent ? `${k.color} ring-1 ring-inset ring-current/20` : `${k.color}`}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={k.color.split(' ')[0]}>{k.icon}</div>
            </div>
            <div className={`text-2xl font-bold ${loading ? 'text-gray-300' : ''}`}>{loading ? '—' : k.value}</div>
            <div className="text-xs font-medium mt-0.5 opacity-80">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Work queues */}
      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Left column */}
          <div className="space-y-4">
            <QueueSection
              title="New / Unprocessed"
              icon={<Clock size={15} className="text-teal-600" />}
              quotations={queues.new}
              emptyMsg="No new quotation requests. Great work!"
              profile={profile}
            />
            <QueueSection
              title="Unassigned Requests"
              icon={<UserCheck size={15} className="text-amber-600" />}
              quotations={queues.unassigned}
              emptyMsg="All requests are assigned — no action needed."
              profile={profile}
            />
            <QueueSection
              title="Need Clarification from Sales"
              icon={<AlertTriangle size={15} className="text-orange-500" />}
              quotations={queues.clarification}
              emptyMsg="No quotations awaiting clarification from Sales."
              profile={profile}
            />
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <QueueSection
              title="Waiting for Estimation"
              icon={<Send size={15} className="text-sky-600" />}
              quotations={queues.estimation}
              emptyMsg="No quotations currently waiting for estimation response."
              profile={profile}
            />
            <QueueSection
              title="Ready to Return to Sales"
              icon={<RotateCcw size={15} className="text-green-600" />}
              quotations={queues.ready}
              emptyMsg="No quotations ready to return. Enter quotation number first."
              profile={profile}
            />
            <QueueSection
              title="Assigned to Me"
              icon={<ClipboardList size={15} className="text-teal-600" />}
              quotations={queues.mine}
              emptyMsg="No quotations currently assigned to you."
              profile={profile}
            />
          </div>
        </div>
      )}

      {/* Bottom: Links + Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick links */}
        <Card>
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingUp size={14} className="text-teal-500" /> Quick Access
            </h3>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 gap-2">
            {[
              { label: 'Full Coordinator Queue', path: '/coordinator-queue', desc: 'All stages with tabs and filters' },
              { label: 'All Quotation Requests', path: '/quotations', desc: 'Full quotation list with search' },
              { label: 'Coordination Reports', path: '/reports/sales', desc: 'Pipeline, aging, and status reports' },
            ].map(l => (
              <Link key={l.path} to={l.path} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all group">
                <div>
                  <div className="text-sm font-medium text-gray-800 group-hover:text-teal-700">{l.label}</div>
                  <div className="text-xs text-gray-500">{l.desc}</div>
                </div>
                <ChevronRight size={14} className="text-gray-400 group-hover:text-teal-600" />
              </Link>
            ))}
          </div>
        </Card>

        {/* Governance rules */}
        <Card>
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ShieldCheck size={14} className="text-teal-500" /> Coordinator Governance Rules
            </h3>
          </div>
          <div className="px-5 py-4 space-y-2">
            {coordRules.map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-teal-500 mt-0.5 shrink-0">▸</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
