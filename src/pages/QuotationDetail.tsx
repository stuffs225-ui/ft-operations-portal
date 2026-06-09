import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText, ArrowLeft, Loader2, User, Clock, Calendar,
  ChevronDown, Send, CheckCircle2, AlertTriangle, Upload,
  ArrowRight, FileUp, Edit2, Shield, RotateCcw,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { recordQuotationEvent, recordQuotationAuditEntry } from '../lib/quotationAudit';
import { getQuotationSlaStatus, getOverdueDays } from '../lib/quotationSla';
import {
  MOCK_QUOTATIONS,
  getMockQuotationLines,
  getMockQuotationDocuments,
  getMockQuotationTimeline,
} from '../data/mockQuotations';
import type {
  QuotationRequest, QuotationRequestLine, QuotationDocument,
  QuotationTimelineEvent, QuotationStatus, UserRole,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtSAR(n: number) {
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

type TabKey = 'overview' | 'customer' | 'lines' | 'documents' | 'coordinator' | 'response' | 'timeline' | 'audit';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview',    label: 'Overview',               icon: <FileText size={15} /> },
  { key: 'customer',    label: 'Customer Details',        icon: <User size={15} /> },
  { key: 'lines',       label: 'Requested Lines',         icon: <ChevronDown size={15} /> },
  { key: 'documents',   label: 'Specification Docs',      icon: <FileUp size={15} /> },
  { key: 'coordinator', label: 'Coordinator Processing',  icon: <Send size={15} /> },
  { key: 'response',    label: 'Quotation Response',      icon: <CheckCircle2 size={15} /> },
  { key: 'timeline',    label: 'Timeline',                icon: <Clock size={15} /> },
  { key: 'audit',       label: 'Audit',                   icon: <Shield size={15} /> },
];

const COORDINATOR_ROLES: UserRole[] = ['admin', 'operations_manager', 'sales_coordinator'];
const CAN_CONVERT: UserRole[] = ['admin', 'operations_manager', 'sales_user'];

// Map a raw Supabase/Postgres error to a clear, business-friendly message.
function humanizeConvertError(error: { message?: string; code?: string }): string {
  const msg = (error?.message ?? '').toLowerCase();
  if (msg.includes('could not find the function') || msg.includes('does not exist')) {
    return 'The SO conversion service is unavailable on this database instance. Please contact your system administrator.';
  }
  if (msg.includes('returned to sales')) {
    return 'This quotation is not ready to convert. It must be returned to Sales with a completed quotation response first.';
  }
  if (msg.includes('only convert your own')) {
    return 'You can only convert quotations that you own.';
  }
  if (msg.includes('not permitted')) {
    return 'Your role is not permitted to convert quotations to SO. Please contact Operations.';
  }
  if (msg.includes('not authenticated')) {
    return 'Your session has expired. Please sign in again and retry.';
  }
  return 'Could not convert this quotation to SO. Please review the required fields or contact Operations.';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, role } = useAuth();

  const [quotation, setQuotation] = useState<QuotationRequest | null>(null);
  const [lines, setLines] = useState<QuotationRequestLine[]>([]);
  const [documents, setDocuments] = useState<QuotationDocument[]>([]);
  const [timeline, setTimeline] = useState<QuotationTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Coordinator form state
  const [coordRemarks, setCoordRemarks] = useState('');
  const [estimationContact, setEstimationContact] = useState('');
  const [clarification, setClarification] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Response form state
  const [quotationNumber, setQuotationNumber] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [lineValues, setLineValues] = useState<Record<string, number>>({});
  const [savingResponse, setSavingResponse] = useState(false);

  const isCoordinator = role && COORDINATOR_ROLES.includes(role);
  const canConvert = role && CAN_CONVERT.includes(role);
  const canSeeFinancials = role === 'admin' || role === 'operations_manager';

  useEffect(() => {
    if (!id) return;

    if (!isSupabaseConfigured || !supabase) {
      const q = MOCK_QUOTATIONS.find((q) => q.id === id);
      if (q) {
        setQuotation(q);
        setLines(getMockQuotationLines(id));
        setDocuments(getMockQuotationDocuments(id));
        setTimeline(getMockQuotationTimeline(id));
        setCoordRemarks(q.coordinator_remarks ?? '');
        setEstimationContact(q.estimation_contact ?? '');
        setQuotationNumber(q.quotation_number ?? '');
        setLineValues(
          getMockQuotationLines(id).reduce<Record<string, number>>((acc, l) => {
            if (l.final_quotation_unit_value != null) acc[l.id] = l.final_quotation_unit_value;
            return acc;
          }, {}),
        );
      }
      setLoading(false);
      return;
    }

    supabase
      .from('quotation_requests')
      .select('*, requested_by_profile:profiles!quotation_requests_requested_by_fkey(full_name, email), assigned_coordinator:profiles!quotation_requests_assigned_coordinator_id_fkey(full_name, email)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        const q = data as unknown as QuotationRequest | null;
        setQuotation(q);
        if (q) {
          setCoordRemarks(q.coordinator_remarks ?? '');
          setEstimationContact(q.estimation_contact ?? '');
          setQuotationNumber(q.quotation_number ?? '');
        }
      });

    supabase.from('quotation_request_lines').select('*').eq('quotation_request_id', id).order('line_number')
      .then(({ data }) => setLines((data as unknown as QuotationRequestLine[]) ?? []));

    supabase.from('quotation_documents').select('*').eq('quotation_request_id', id).order('uploaded_at')
      .then(({ data }) => setDocuments((data as unknown as QuotationDocument[]) ?? []));

    supabase.from('quotation_timeline_events').select('*').eq('quotation_request_id', id).order('created_at', { ascending: false })
      .then(({ data }) => {
        setTimeline((data as unknown as QuotationTimelineEvent[]) ?? []);
        setLoading(false);
      });
  }, [id]);

  async function performUpdate(
    updates: Record<string, unknown>,
    eventType: string,
    eventTitle: string,
    eventBody: string | null,
    auditAction: string,
  ) {
    if (!id || !quotation) return;
    setSaving(true);
    setActionMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      await new Promise<void>((r) => setTimeout(r, 300));
      setQuotation((prev) => prev ? { ...prev, ...updates } : prev);
      setActionMsg('Dev mode — changes not persisted.');
      setSaving(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('quotation_requests')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (data) setQuotation(data as unknown as QuotationRequest);

      await recordQuotationEvent(id, eventType, eventTitle, eventBody, profile?.id ?? null, profile?.full_name ?? null);
      await recordQuotationAuditEntry(auditAction, id, eventTitle, null, updates as Record<string, unknown>, profile?.id ?? null, profile?.email ?? null, role);
      setActionMsg('Saved successfully.');
    } catch {
      setActionMsg('An error occurred. Please try again.');
    }
    setSaving(false);
  }

  function handleMarkReceived() {
    performUpdate(
      { quotation_status: 'received_by_coordinator', coordinator_remarks: coordRemarks || null },
      'quotation_received_by_coordinator',
      'Quotation received by Sales Coordinator',
      coordRemarks || null,
      'status_changed',
    );
  }

  function handleSentToEstimation() {
    if (!estimationContact.trim()) { setActionMsg('Estimation contact is required.'); return; }
    performUpdate(
      {
        quotation_status: 'waiting_for_estimation',
        sent_to_estimation_at: new Date().toISOString(),
        estimation_contact: estimationContact,
        coordinator_remarks: coordRemarks || null,
      },
      'quotation_sent_to_estimation',
      'Request forwarded to Estimation team',
      `Sent to: ${estimationContact}`,
      'sent_to_estimation_recorded',
    );
  }

  function handleRequestClarification() {
    if (!clarification.trim()) { setActionMsg('Clarification message is required.'); return; }
    performUpdate(
      { quotation_status: 'need_clarification', coordinator_remarks: clarification },
      'clarification_requested',
      'Clarification requested by coordinator',
      clarification,
      'status_changed',
    );
  }

  function handleSaveCoordRemarks() {
    performUpdate(
      { coordinator_remarks: coordRemarks || null },
      'coordinator_remarks_updated',
      'Coordinator remarks updated',
      null,
      'status_changed',
    );
  }

  async function handleReturnToSales() {
    if (!id || !quotation) return;
    setSavingResponse(true);

    if (!isSupabaseConfigured || !supabase) {
      await new Promise<void>((r) => setTimeout(r, 300));
      setQuotation((prev) => prev ? { ...prev, quotation_status: 'returned_to_sales', returned_to_sales_at: new Date().toISOString() } : prev);
      setSavingResponse(false);
      setActionMsg('Dev mode — changes not persisted.');
      return;
    }

    const totalValue = lines.reduce((sum, l) => {
      const uv = lineValues[l.id] ?? l.final_quotation_unit_value ?? 0;
      return sum + uv * l.quantity;
    }, 0);

    const { data } = await supabase
      .from('quotation_requests')
      .update({
        quotation_status: 'returned_to_sales',
        returned_to_sales_at: new Date().toISOString(),
        quotation_number: quotationNumber || null,
        quotation_total_value: totalValue > 0 ? totalValue : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (data) setQuotation(data as unknown as QuotationRequest);

    await recordQuotationEvent(id, 'quotation_returned_to_sales', 'Quotation returned to Sales for review', null, profile?.id ?? null, profile?.full_name ?? null);
    await recordQuotationAuditEntry('status_changed', id, 'Quotation returned to sales', null, { status: 'returned_to_sales' }, profile?.id ?? null, profile?.email ?? null, role);
    setSavingResponse(false);
  }

  async function handleConvertToSO() {
    if (!id || !quotation || saving) return; // guard against double-click

    // Already converted — go straight to the linked project instead of re-creating.
    if (quotation.converted_to_project_id) {
      navigate(`/projects/${quotation.converted_to_project_id}`);
      return;
    }

    setSaving(true);
    setActionMsg(null);
    setActionError(null);

    if (!isSupabaseConfigured || !supabase) {
      await new Promise<void>((r) => setTimeout(r, 400));
      // In dev mode, just mark as converted and link to an existing mock project
      setQuotation((prev) => prev ? { ...prev, quotation_status: 'converted_to_so', converted_to_project_id: 'proj-005' } : prev);
      setSaving(false);
      navigate('/projects/proj-005');
      return;
    }

    // Atomic, authorization-checked conversion via SECURITY DEFINER RPC.
    // (Direct client insert fails RLS project-code generation — see migration 067.)
    const { data, error } = await supabase.rpc('convert_quotation_to_so', {
      p_quotation_id: id,
    });

    if (error) {
      // Never swallow the real cause — log it for support, show a helpful message.
      console.error('[convert_quotation_to_so] failed:', error);
      setActionError(humanizeConvertError(error));
      setSaving(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const projId = (row as { project_id?: string } | null)?.project_id;
    if (!projId) {
      setActionError('Could not convert this quotation to SO. Please review the required fields or contact Operations.');
      setSaving(false);
      return;
    }

    // Best-effort timeline + audit; failures here must not block navigation.
    try {
      await recordQuotationEvent(id, 'quotation_converted_to_so', 'Quotation converted to Sales Order', null, profile?.id ?? null, profile?.full_name ?? null, { project_id: projId });
      await recordQuotationAuditEntry('converted_to_so', id, 'Quotation converted to SO', null, { project_id: projId }, profile?.id ?? null, profile?.email ?? null, role);
    } catch (e) {
      console.warn('[convert_quotation_to_so] audit/timeline logging failed (non-fatal):', e);
    }

    setQuotation((prev) => prev ? { ...prev, quotation_status: 'converted_to_so', converted_to_project_id: projId } : prev);
    setSaving(false);
    navigate(`/projects/${projId}`);
  }

  async function handleSaveLineValues() {
    if (!id) return;
    setSavingResponse(true);

    if (!isSupabaseConfigured || !supabase) {
      const total = lines.reduce((s, l) => s + (lineValues[l.id] ?? 0) * l.quantity, 0);
      setLines((prev) => prev.map((l) => ({ ...l, final_quotation_unit_value: lineValues[l.id] ?? l.final_quotation_unit_value, final_quotation_line_value: (lineValues[l.id] ?? l.final_quotation_unit_value ?? 0) * l.quantity })));
      setQuotation((prev) => prev ? { ...prev, quotation_number: quotationNumber || prev.quotation_number, quotation_total_value: total, quotation_status: 'quotation_received' } : prev);
      setSavingResponse(false);
      setActionMsg('Dev mode — changes not persisted.');
      return;
    }

    for (const line of lines) {
      const val = lineValues[line.id];
      if (val !== undefined) {
        await supabase.from('quotation_request_lines').update({ final_quotation_unit_value: val }).eq('id', line.id);
      }
    }
    const total = lines.reduce((s, l) => s + (lineValues[l.id] ?? l.final_quotation_unit_value ?? 0) * l.quantity, 0);

    if (pdfFileName) {
      await supabase.from('quotation_documents').insert({
        quotation_request_id: id,
        document_type: 'quotation_pdf',
        file_name: pdfFileName,
        uploaded_by: profile?.id ?? null,
        remarks: 'Final quotation PDF',
      });
    }

    await supabase.from('quotation_requests').update({
      quotation_number: quotationNumber || null,
      quotation_total_value: total > 0 ? total : null,
      quotation_status: 'quotation_received',
      quotation_received_at: new Date().toISOString(),
    }).eq('id', id);

    await recordQuotationEvent(id, 'quotation_pdf_uploaded', 'Quotation values entered', null, profile?.id ?? null, profile?.full_name ?? null, { quotation_number: quotationNumber });
    await recordQuotationAuditEntry('quotation_values_updated', id, 'Quotation values entered', null, { quotation_number: quotationNumber, total }, profile?.id ?? null, profile?.email ?? null, role);

    // Refresh
    const { data: updatedLines } = await supabase.from('quotation_request_lines').select('*').eq('quotation_request_id', id).order('line_number');
    setLines((updatedLines as unknown as QuotationRequestLine[]) ?? []);
    const { data: updatedQ } = await supabase.from('quotation_requests').select('*').eq('id', id).single();
    setQuotation(updatedQ as unknown as QuotationRequest);
    setSavingResponse(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 gap-3 text-gray-500"><Loader2 className="animate-spin" size={20} /><span>Loading quotation…</span></div>;
  }

  if (!quotation) {
    return (
      <div className="space-y-4">
        <Link to="/quotations" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline"><ArrowLeft size={15} />Back to Quotations</Link>
        <Card className="p-8 text-center text-gray-500">Quotation not found.</Card>
      </div>
    );
  }

  const slaStatus = getQuotationSlaStatus(quotation);
  const overdueDays = getOverdueDays(quotation);
  const total = lines.reduce((s, l) => s + (l.final_quotation_line_value ?? 0), 0);
  const canCoordinatorAct = isCoordinator;

  return (
    <div className="space-y-6">
      <PageHeader
        title={quotation.quotation_code}
        subtitle={quotation.customer_name}
        breadcrumb={[
          { label: 'Quotation Requests', path: '/quotations' },
          { label: quotation.quotation_code },
        ]}
        action={
          <div className="flex items-center gap-3">
            <Badge variant={STATUS_VARIANT[quotation.quotation_status]}>
              {STATUS_LABELS[quotation.quotation_status]}
            </Badge>
            {slaStatus === 'overdue' && (
              <Badge variant="critical">
                <AlertTriangle size={12} className="mr-1" />Overdue {overdueDays}d
              </Badge>
            )}
            {slaStatus === 'warning' && <Badge variant="warning">SLA Warning</Badge>}
          </div>
        }
      />

      {/* Action message (success / info) */}
      {actionMsg && (
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sm text-sky-800 flex items-center gap-2">
          <CheckCircle2 size={15} />{actionMsg}
        </div>
      )}

      {/* Action error (failure) */}
      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status & Priority</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge variant={STATUS_VARIANT[quotation.quotation_status]}>{STATUS_LABELS[quotation.quotation_status]}</Badge></div>
              <div className="flex justify-between"><span className="text-gray-500">Priority</span><span className="font-medium capitalize">{quotation.priority}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Source</span><span>{quotation.opportunity_source ?? '—'}</span></div>
            </div>
          </Card>
          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Key Dates</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{fmt(quotation.created_at)}</span></div>
              {quotation.submitted_at && <div className="flex justify-between"><span className="text-gray-500">Submitted</span><span>{fmt(quotation.submitted_at)}</span></div>}
              {quotation.sent_to_estimation_at && <div className="flex justify-between"><span className="text-gray-500">Sent to Estimation</span><span>{fmt(quotation.sent_to_estimation_at)}</span></div>}
              {quotation.returned_to_sales_at && <div className="flex justify-between"><span className="text-gray-500">Returned to Sales</span><span>{fmt(quotation.returned_to_sales_at)}</span></div>}
              {quotation.required_delivery_expectation && <div className="flex justify-between"><span className="text-gray-500">Delivery Expected</span><span>{fmt(quotation.required_delivery_expectation)}</span></div>}
            </div>
          </Card>
          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">People</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Sales Owner</span><span>{quotation.requested_by_profile?.full_name ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Coordinator</span><span>{quotation.assigned_coordinator?.full_name ?? <em className="text-gray-400">Unassigned</em>}</span></div>
            </div>
          </Card>
          {(canSeeFinancials || quotation.quotation_status === 'returned_to_sales' || quotation.quotation_status === 'converted_to_so') && (
            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quotation Value</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Quotation No.</span><span className="font-mono">{quotation.quotation_number ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Value</span>
                  <span className="font-semibold text-gray-900">{quotation.quotation_total_value != null ? fmtSAR(quotation.quotation_total_value) : '—'}</span>
                </div>
              </div>
            </Card>
          )}
          {quotation.scope_summary && (
            <Card className="p-5 md:col-span-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Scope Summary</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">{quotation.scope_summary}</p>
            </Card>
          )}
          {quotation.converted_to_project_id && (
            <Card className="p-4 md:col-span-2 bg-green-50 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-green-800">
                  <CheckCircle2 size={16} />
                  <span>Converted to Sales Order</span>
                </div>
                <Link to={`/projects/${quotation.converted_to_project_id}`}>
                  <Button size="sm" variant="outline">View Project <ArrowRight size={14} /></Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Customer Details ── */}
      {activeTab === 'customer' && (
        <Card className="p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Customer / Entity Details</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            {[
              ['Customer / Entity Name', quotation.customer_name],
              ['Contact Person', quotation.customer_contact_name],
              ['Contact Email', quotation.customer_email],
              ['Contact Phone', quotation.customer_phone],
              ['Opportunity Source', quotation.opportunity_source],
              ['Required Delivery', quotation.required_delivery_expectation ? fmt(quotation.required_delivery_expectation) : null],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">{label}</dt>
                <dd className="font-medium text-gray-900">{value ?? '—'}</dd>
              </div>
            ))}
            {quotation.sales_remarks && (
              <div className="sm:col-span-2">
                <dt className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Sales Remarks</dt>
                <dd className="text-gray-700 whitespace-pre-line">{quotation.sales_remarks}</dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      {/* ── Requested Lines ── */}
      {activeTab === 'lines' && (
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Requested Vehicles / Items ({lines.length})</h3>
          </div>
          {lines.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 italic">No lines recorded.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Qty</th>
                  {(canSeeFinancials || isCoordinator) && <>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Unit Value</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Line Total</th>
                  </>}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3 text-sm text-gray-500">{l.line_number}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{l.vehicle_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{l.description}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">{l.quantity}</td>
                    {(canSeeFinancials || isCoordinator) && <>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{l.final_quotation_unit_value != null ? fmtSAR(l.final_quotation_unit_value) : '—'}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{l.final_quotation_line_value != null ? fmtSAR(l.final_quotation_line_value) : '—'}</td>
                    </>}
                    <td className="px-4 py-3 text-sm text-gray-500">{l.remarks ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              {total > 0 && (canSeeFinancials || isCoordinator) && (
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</td>
                    <td />
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{fmtSAR(total)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </Card>
      )}

      {/* ── Specification Documents ── */}
      {activeTab === 'documents' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Specification Documents</h3>
          {documents.filter((d) => d.document_type !== 'quotation_pdf').length === 0 ? (
            <p className="text-sm text-gray-400 italic">No specification documents uploaded.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {documents.filter((d) => d.document_type !== 'quotation_pdf').map((d) => (
                <li key={d.id} className="py-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.file_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{d.document_type.replace(/_/g, ' ')} · v{d.version} · {fmt(d.uploaded_at)}</p>
                    {d.remarks && <p className="text-xs text-gray-500 mt-0.5">{d.remarks}</p>}
                  </div>
                  <Badge variant="neutral">Uploaded</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* ── Coordinator Processing ── */}
      {activeTab === 'coordinator' && (
        <div className="space-y-4">
          {/* SLA indicator */}
          {slaStatus !== 'ok' && (
            <div className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${slaStatus === 'overdue' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <AlertTriangle size={15} />
              {slaStatus === 'overdue'
                ? `This quotation is ${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue for processing.`
                : 'SLA deadline approaching — action required soon.'}
            </div>
          )}

          {!canCoordinatorAct ? (
            <Card className="p-6 text-center text-sm text-gray-500">Only Sales Coordinators and Managers can process quotations.</Card>
          ) : (
            <Card className="p-6 space-y-5">
              <h3 className="text-base font-semibold text-gray-900">Coordinator Actions</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coordinator Remarks</label>
                <textarea rows={3} value={coordRemarks} onChange={(e) => setCoordRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" placeholder="Internal remarks for this quotation request…" />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="secondary" loading={saving} onClick={handleSaveCoordRemarks} icon={<Edit2 size={13} />}>Save Remarks</Button>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quotation.quotation_status === 'submitted_by_sales' && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">Mark as Received</h4>
                    <p className="text-xs text-gray-500">Acknowledge receipt of this quotation request from Sales.</p>
                    <Button size="sm" loading={saving} onClick={handleMarkReceived} icon={<CheckCircle2 size={14} />}>Mark Received</Button>
                  </div>
                )}
                {['received_by_coordinator', 'submitted_by_sales'].includes(quotation.quotation_status) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">Record Sent to Estimation</h4>
                    <p className="text-xs text-gray-500">Record that you forwarded this request to the external Estimation Team by email.</p>
                    <input value={estimationContact} onChange={(e) => setEstimationContact(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2" placeholder="Estimation team email / contact…" />
                    <Button size="sm" loading={saving} onClick={handleSentToEstimation} icon={<Send size={14} />}>Record Sent to Estimation</Button>
                  </div>
                )}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-800">Request Clarification</h4>
                  <p className="text-xs text-gray-500">Ask Sales to provide additional information or update the specification.</p>
                  <textarea rows={2} value={clarification} onChange={(e) => setClarification(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none mb-2" placeholder="Describe what clarification is needed…" />
                  <Button size="sm" variant="outline" loading={saving} onClick={handleRequestClarification} icon={<AlertTriangle size={14} />}>Request Clarification</Button>
                </div>
              </div>

              {quotation.sent_to_estimation_at && (
                <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 text-sm text-sky-800 flex items-center gap-2">
                  <Calendar size={14} />
                  <span>Sent to Estimation on {fmtDT(quotation.sent_to_estimation_at)}{quotation.estimation_contact ? ` — ${quotation.estimation_contact}` : ''}</span>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ── Quotation Response ── */}
      {activeTab === 'response' && (
        <div className="space-y-4">
          {/* Quotation PDF (visible to sales when returned) */}
          {['returned_to_sales', 'converted_to_so'].includes(quotation.quotation_status) && (
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Quotation from Estimation</h3>
              {documents.filter((d) => d.document_type === 'quotation_pdf').map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileText size={18} className="text-brand-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.file_name}</p>
                    <p className="text-xs text-gray-400">Uploaded {fmtDT(d.uploaded_at)}</p>
                  </div>
                </div>
              ))}
              {quotation.quotation_number && (
                <p className="text-sm text-gray-700">Quotation No.: <span className="font-mono font-semibold">{quotation.quotation_number}</span></p>
              )}
              {quotation.quotation_total_value != null && (
                <p className="text-sm font-semibold text-gray-900">Total: {fmtSAR(quotation.quotation_total_value)}</p>
              )}
            </Card>
          )}

          {/* Coordinator entry form */}
          {canCoordinatorAct && !['converted_to_so', 'converted_to_hot_project', 'cancelled', 'closed_lost'].includes(quotation.quotation_status) && (
            <Card className="p-6 space-y-5">
              <h3 className="text-base font-semibold text-gray-900">Enter Quotation Response</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Number</label>
                  <input value={quotationNumber} onChange={(e) => setQuotationNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. QT-EST-2025-0088" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quotation PDF {!isSupabaseConfigured && <span className="text-gray-400">(filename in dev mode)</span>}</label>
                  {isSupabaseConfigured ? (
                    <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <Upload size={14} className="text-gray-400" />
                      <span className="text-gray-500 truncate">{pdfFileName || 'Choose PDF…'}</span>
                      <input type="file" accept=".pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPdfFileName(f.name); }} />
                    </label>
                  ) : (
                    <input value={pdfFileName} onChange={(e) => setPdfFileName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Quotation_PDF.pdf" />
                  )}
                </div>
              </div>

              {lines.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Final Unit Values per Line</h4>
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="pb-2 text-left text-xs font-semibold text-gray-500">Item</th>
                        <th className="pb-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                        <th className="pb-2 text-right text-xs font-semibold text-gray-500">Unit Value (SAR)</th>
                        <th className="pb-2 text-right text-xs font-semibold text-gray-500">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((l) => {
                        const uv = lineValues[l.id] ?? l.final_quotation_unit_value ?? 0;
                        const lt = uv * l.quantity;
                        return (
                          <tr key={l.id}>
                            <td className="py-2 text-sm text-gray-900">{l.vehicle_type} — {l.description}</td>
                            <td className="py-2 text-right text-sm text-gray-600">{l.quantity}</td>
                            <td className="py-2 text-right">
                              <input type="number" min={0} value={lineValues[l.id] ?? (l.final_quotation_unit_value ?? '')}
                                onChange={(e) => setLineValues((v) => ({ ...v, [l.id]: parseFloat(e.target.value) || 0 }))}
                                className="w-32 text-right px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="0" />
                            </td>
                            <td className="py-2 text-right text-sm font-medium text-gray-900">{lt > 0 ? fmtSAR(lt) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} className="pt-3 text-right text-sm font-semibold text-gray-700">Total</td>
                        <td />
                        <td className="pt-3 text-right text-sm font-bold text-gray-900">
                          {fmtSAR(lines.reduce((s, l) => s + (lineValues[l.id] ?? l.final_quotation_unit_value ?? 0) * l.quantity, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button size="sm" variant="secondary" loading={savingResponse} onClick={handleSaveLineValues} icon={<Edit2 size={14} />}>Save Values</Button>
                {quotation.quotation_status === 'quotation_received' && (
                  <Button size="sm" loading={savingResponse} onClick={handleReturnToSales} icon={<RotateCcw size={14} />}>Return to Sales</Button>
                )}
              </div>
            </Card>
          )}

          {/* Convert actions — for sales/admin when returned */}
          {canConvert && quotation.quotation_status === 'returned_to_sales' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Convert Quotation</h3>
              <div className="flex flex-wrap gap-3">
                <Button size="sm" loading={saving} onClick={handleConvertToSO} icon={<ArrowRight size={14} />}>Convert to SO</Button>
                <Button size="sm" variant="outline" disabled icon={<ArrowRight size={14} />}>Convert to Hot Project</Button>
              </div>
              <p className="text-xs text-gray-400 mt-3">"Convert to Hot Project" will be available in a future phase.</p>
            </Card>
          )}
        </div>
      )}

      {/* ── Timeline ── */}
      {activeTab === 'timeline' && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Quotation Timeline</h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No timeline events yet.</p>
          ) : (
            <ol className="relative border-l border-gray-200 ml-3 space-y-6">
              {timeline.map((ev) => (
                <li key={ev.id} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-brand-200 border-2 border-brand-500" />
                  <p className="text-xs text-gray-400 mb-0.5">{fmtDT(ev.created_at)}{ev.actor_name ? ` · ${ev.actor_name}` : ''}</p>
                  <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                  {ev.body && <p className="text-sm text-gray-600 mt-0.5">{ev.body}</p>}
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {/* ── Audit ── */}
      {activeTab === 'audit' && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Audit Log</h3>
          <p className="text-sm text-gray-500">Audit log entries for this quotation are visible in the system-wide Audit Log. Filter by entity ID: <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{quotation.id}</span></p>
          {role === 'admin' && (
            <div className="mt-4">
              <Link to="/audit-log">
                <Button size="sm" variant="secondary" icon={<Shield size={14} />}>Open Audit Log</Button>
              </Link>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
