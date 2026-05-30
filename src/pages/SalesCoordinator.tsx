import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Clock, AlertTriangle, CheckCircle2, Send,
  FileText, Upload, RotateCcw, Info,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isQuotationOverdue, getOverdueDays, getQuotationSlaStatus } from '../lib/quotationSla';
import { MOCK_QUOTATIONS } from '../data/mockQuotations';
import type { QuotationRequest } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysInStatus(quotation: QuotationRequest): number {
  const ref = quotation.updated_at ?? quotation.created_at;
  return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Section = 'new' | 'estimation' | 'clarification' | 'ready' | 'overdue';

const SECTION_STATUSES: Record<Section, string[]> = {
  new:          ['submitted_by_sales'],
  estimation:   ['sent_to_estimation', 'waiting_for_estimation'],
  clarification:['need_clarification'],
  ready:        ['quotation_received'],
  overdue:      [],  // derived
};

// ── Row component ─────────────────────────────────────────────────────────────

function QuotationRow({
  quotation,
  actionLabel,
  actionIcon,
}: {
  quotation: QuotationRequest;
  actionLabel: string;
  actionIcon: React.ReactNode;
}) {
  const slaStatus = getQuotationSlaStatus(quotation);
  const days = daysInStatus(quotation);
  const overdueDays = getOverdueDays(quotation);

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
      <div className="flex items-start gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-mono font-semibold text-gray-900">{quotation.quotation_code}</span>
          <span className="text-xs text-gray-500 mt-0.5">{quotation.customer_name}</span>
        </div>
        <div className="hidden sm:flex flex-wrap items-center gap-2 ml-2">
          {slaStatus === 'overdue' && (
            <Badge variant="critical">
              <AlertTriangle size={11} className="mr-1" />Overdue {overdueDays}d
            </Badge>
          )}
          {slaStatus === 'warning' && <Badge variant="warning">SLA Warning</Badge>}
          <Badge variant="neutral" className="capitalize">{quotation.priority}</Badge>
          <span className="text-xs text-gray-400">{days}d in status</span>
          {quotation.submitted_at && <span className="text-xs text-gray-400">Submitted {fmtDate(quotation.submitted_at)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link to={`/quotations/${quotation.id}`}>
          <Button size="sm" icon={actionIcon}>{actionLabel}</Button>
        </Link>
      </div>
    </div>
  );
}

// ── KPI strip ─────────────────────────────────────────────────────────────────

function KpiStrip({ quotations }: { quotations: QuotationRequest[] }) {
  const total = quotations.length;
  const newCount = quotations.filter((q) => q.quotation_status === 'submitted_by_sales').length;
  const waitingCount = quotations.filter((q) => ['sent_to_estimation', 'waiting_for_estimation'].includes(q.quotation_status)).length;
  const clarCount = quotations.filter((q) => q.quotation_status === 'need_clarification').length;
  const overdueCount = quotations.filter((q) => isQuotationOverdue(q)).length;

  const cards = [
    { label: 'Total Open', value: total, icon: <FileText size={18} />, color: 'text-brand-600 bg-brand-50' },
    { label: 'New / Unprocessed', value: newCount, icon: <Clock size={18} />, color: 'text-sky-700 bg-sky-50' },
    { label: 'Waiting Estimation', value: waitingCount, icon: <Send size={18} />, color: 'text-amber-700 bg-amber-50' },
    { label: 'Need Clarification', value: clarCount, icon: <AlertTriangle size={18} />, color: 'text-orange-700 bg-orange-50' },
    { label: 'Overdue', value: overdueCount, icon: <AlertTriangle size={18} />, color: overdueCount > 0 ? 'text-red-700 bg-red-50' : 'text-gray-500 bg-gray-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-4 flex items-start gap-3">
          <div className={`p-2 rounded-lg ${c.color}`}>{c.icon}</div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function SectionBlock({
  title,
  icon,
  quotations,
  emptyMsg,
  actionLabel,
  actionIcon,
}: {
  title: string;
  icon: React.ReactNode;
  quotations: QuotationRequest[];
  emptyMsg: string;
  actionLabel: string;
  actionIcon: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="overflow-hidden p-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">{quotations.length}</span>
        </div>
        <span className="text-xs text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          {quotations.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400 italic">{emptyMsg}</p>
          ) : (
            quotations.map((q) => (
              <QuotationRow key={q.id} quotation={q} actionLabel={actionLabel} actionIcon={actionIcon} />
            ))
          )}
        </>
      )}
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SalesCoordinator() {
  const { role } = useAuth();
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const canView = role === 'admin' || role === 'operations_manager' || role === 'sales_coordinator';

  useEffect(() => {
    if (!canView) { setLoading(false); return; }

    if (!isSupabaseConfigured || !supabase) {
      // Show all non-terminal quotations
      const active = MOCK_QUOTATIONS.filter((q) =>
        !['converted_to_so', 'converted_to_hot_project', 'cancelled', 'closed_lost'].includes(q.quotation_status),
      );
      setQuotations(active);
      setLoading(false);
      return;
    }

    supabase
      .from('quotation_requests')
      .select('*, requested_by_profile:profiles!quotation_requests_requested_by_fkey(full_name, email), assigned_coordinator:profiles!quotation_requests_assigned_coordinator_id_fkey(full_name, email)')
      .not('quotation_status', 'in', '("converted_to_so","converted_to_hot_project","cancelled","closed_lost")')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuotations((data as unknown as QuotationRequest[]) ?? []);
        setLoading(false);
      });
  }, [canView]);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-sm text-gray-500">Loading…</div>;
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sales Coordinator" subtitle="Coordinator workspace" />
        <EmptyState icon={<Users size={40} />} title="Access Restricted" description="This workspace is for Sales Coordinators, Operations Managers, and Admins." />
      </div>
    );
  }

  const sections: Record<Section, QuotationRequest[]> = {
    new:          quotations.filter((q) => SECTION_STATUSES.new.includes(q.quotation_status)),
    estimation:   quotations.filter((q) => SECTION_STATUSES.estimation.includes(q.quotation_status)),
    clarification:quotations.filter((q) => SECTION_STATUSES.clarification.includes(q.quotation_status)),
    ready:        quotations.filter((q) => SECTION_STATUSES.ready.includes(q.quotation_status)),
    overdue:      quotations.filter((q) => isQuotationOverdue(q)),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Coordinator"
        subtitle="Process quotation requests, record estimation, upload PDFs, and return to Sales"
      />

      {!isSupabaseConfigured && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>Dev mode — showing mock data. Changes will not be persisted.</span>
        </div>
      )}

      <KpiStrip quotations={quotations} />

      {sections.overdue.length > 0 && (
        <SectionBlock
          title="Overdue"
          icon={<AlertTriangle size={16} className="text-red-500" />}
          quotations={sections.overdue}
          emptyMsg="No overdue quotations."
          actionLabel="Process Now"
          actionIcon={<AlertTriangle size={13} />}
        />
      )}

      <SectionBlock
        title="New / Unprocessed"
        icon={<Clock size={16} className="text-sky-600" />}
        quotations={sections.new}
        emptyMsg="No new quotation requests."
        actionLabel="Mark Received"
        actionIcon={<CheckCircle2 size={13} />}
      />

      <SectionBlock
        title="Waiting for Estimation"
        icon={<Send size={16} className="text-amber-600" />}
        quotations={sections.estimation}
        emptyMsg="No quotations waiting for estimation."
        actionLabel="Upload Response"
        actionIcon={<Upload size={13} />}
      />

      <SectionBlock
        title="Need Clarification from Sales"
        icon={<AlertTriangle size={16} className="text-orange-500" />}
        quotations={sections.clarification}
        emptyMsg="No quotations awaiting clarification."
        actionLabel="View"
        actionIcon={<FileText size={13} />}
      />

      <SectionBlock
        title="Ready to Return to Sales"
        icon={<CheckCircle2 size={16} className="text-green-600" />}
        quotations={sections.ready}
        emptyMsg="No quotations ready to return."
        actionLabel="Return to Sales"
        actionIcon={<RotateCcw size={13} />}
      />
    </div>
  );
}
