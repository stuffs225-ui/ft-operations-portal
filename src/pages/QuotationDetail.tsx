import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText, ArrowLeft, Loader2, Clock, ChevronDown,
  Send, CheckCircle2, AlertTriangle, Upload, ArrowRight,
  FileUp, Edit2, Shield, RotateCcw, Flame, ChevronRight,
  User, Calendar, ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { recordQuotationEvent, recordQuotationAuditEntry } from '../lib/quotationAudit';
import { getQuotationSlaStatus, getOverdueDays } from '../lib/quotationSla';
import { DocumentPanel } from '../components/documents/DocumentPanel';
import { openSignedUrl } from '../lib/documents';
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

const COORDINATOR_ROLES: UserRole[] = ['admin', 'operations_manager', 'sales_coordinator'];
const CAN_CONVERT: UserRole[] = ['admin', 'operations_manager', 'sales_user'];

// ── Accordion section ─────────────────────────────────────────────────────────

function Section({
  title, icon, defaultOpen = false, children, badge,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{icon}</span>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {badge !== undefined && (
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-gray-100 bg-white px-5 py-4">{children}</div>}
    </div>
  );
}

// ── Next action config ────────────────────────────────────────────────────────

function NextActionBanner({
  quotation,
  isCoordinator,
  canConvert,
  onConvertToSO,
}: {
  quotation: QuotationRequest;
  isCoordinator: boolean;
  canConvert: boolean;
  onConvertToSO: () => void;
}) {
  const s = quotation.quotation_status;

  if (s === 'converted_to_so' && quotation.converted_to_project_id) {
    return (
      <div className="flex items-center justify-between gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-900">Converted to Sales Order</p>
            <p className="text-xs text-green-700">This quotation has been converted. Track progress in the Project / SO page.</p>
          </div>
        </div>
        <Link to={`/projects/${quotation.converted_to_project_id}`}>
          <Button size="sm" variant="secondary" icon={<ArrowRight size={14} />}>View SO / Project</Button>
        </Link>
      </div>
    );
  }

  if (s === 'returned_to_sales' && canConvert) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
        <div className="flex items-start gap-3">
          <ArrowRight size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Quotation Returned — Ready to Register Sales Order</p>
            <p className="text-xs text-amber-700">
              The Sales Coordinator has returned this quotation with a completed response. Review the quotation values below,
              then open the SO registration form. Available quotation data will be prefilled — you will need to supply the
              SO Number and confirm any missing fields before submitting.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onConvertToSO}
          icon={<ArrowRight size={14} />}
        >
          Register Sales Order
        </Button>
      </div>
    );
  }

  if (s === 'need_clarification') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Clarification Required</p>
            <p className="text-xs text-red-700">The Sales Coordinator has requested clarification. Review the coordinator remarks below and respond by updating the quotation request.</p>
            {quotation.coordinator_remarks && (
              <p className="mt-2 text-sm text-red-800 bg-red-100 rounded-lg px-3 py-2">{quotation.coordinator_remarks}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (s === 'draft') {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="flex items-start gap-3">
          <FileText size={18} className="text-gray-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Draft — Not Submitted</p>
            <p className="text-xs text-gray-600">This quotation request is saved as a draft. Add specification documents and submit to the Sales Coordinator when ready.</p>
          </div>
        </div>
      </div>
    );
  }

  if (s === 'submitted_by_sales' && isCoordinator) {
    return (
      <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Send size={18} className="text-sky-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-sky-900">Submitted by Sales — Awaiting Coordinator Action</p>
            <p className="text-xs text-sky-700">Mark this quotation as received, forward to Estimation, or request clarification from Sales. Use the Coordinator Actions section below.</p>
          </div>
        </div>
      </div>
    );
  }

  if (['submitted_by_sales', 'received_by_coordinator', 'sent_to_estimation', 'waiting_for_estimation'].includes(s)) {
    return (
      <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-sky-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-sky-900">In Progress — Waiting for Sales Coordinator</p>
            <p className="text-xs text-sky-700">Status: <span className="font-medium">{STATUS_LABELS[s]}</span>. No action required from Sales at this time.</p>
          </div>
        </div>
      </div>
    );
  }

  if (s === 'quotation_received' && isCoordinator) {
    return (
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={18} className="text-indigo-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-900">Quotation Values Received</p>
            <p className="text-xs text-indigo-700">Review the final quotation values, then return to Sales so they can proceed with SO conversion.</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
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

  // Coordinator form state
  const [coordRemarks, setCoordRemarks] = useState('');
  const [estimationContact, setEstimationContact] = useState('');
  const [clarification, setClarification] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Response form state
  const [quotationNumber, setQuotationNumber] = useState('');
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [lineValues, setLineValues] = useState<Record<string, number>>({});
  const [savingResponse, setSavingResponse] = useState(false);

  const isCoordinator = role ? COORDINATOR_ROLES.includes(role) : false;
  const canConvert = role ? CAN_CONVERT.includes(role) : false;
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

  function handleConvertToSO() {
    if (!id || !quotation) return;

    // Already converted — navigate directly to the project
    if (quotation.converted_to_project_id) {
      navigate(`/projects/${quotation.converted_to_project_id}`);
      return;
    }

    // Navigate to the SO registration wizard prefilled from this quotation.
    // The wizard handles field completion, validation, and calls
    // link_quotation_to_project() after the project is created.
    navigate(`/projects/new?fromQuotationId=${id}`);
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
      let pdfStoragePath: string | null = null;
      if (pdfFile) {
        const safeName = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uploadPath = `${id}/quotation_pdf/${Date.now()}_${safeName}`;
        const { data: storageData, error: storageErr } = await supabase.storage
          .from('quotation-documents')
          .upload(uploadPath, pdfFile, { upsert: false });
        if (storageErr) {
          console.error('[QuotationDetail] PDF upload failed:', storageErr.message);
        } else {
          pdfStoragePath = storageData?.path ?? null;
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newDoc } = await (supabase.from('quotation_documents').insert({
        quotation_request_id: id,
        document_type: 'quotation_pdf',
        file_name: pdfFileName,
        storage_path: pdfStoragePath,
        file_size: pdfFile?.size ?? null,
        mime_type: pdfFile?.type || null,
        uploaded_by: profile?.id ?? null,
        remarks: 'Final quotation PDF',
      } as any).select().single());
      if (newDoc) {
        setDocuments((prev) => [...prev, newDoc as unknown as QuotationDocument]);
      }
      setPdfFile(null);
    }

    await supabase.from('quotation_requests').update({
      quotation_number: quotationNumber || null,
      quotation_total_value: total > 0 ? total : null,
      quotation_status: 'quotation_received',
      quotation_received_at: new Date().toISOString(),
    }).eq('id', id);

    await recordQuotationEvent(id, 'quotation_pdf_uploaded', 'Quotation values entered', null, profile?.id ?? null, profile?.full_name ?? null, { quotation_number: quotationNumber });
    await recordQuotationAuditEntry('quotation_values_updated', id, 'Quotation values entered', null, { quotation_number: quotationNumber, total }, profile?.id ?? null, profile?.email ?? null, role);

    const { data: updatedLines } = await supabase.from('quotation_request_lines').select('*').eq('quotation_request_id', id).order('line_number');
    setLines((updatedLines as unknown as QuotationRequestLine[]) ?? []);
    const { data: updatedQ } = await supabase.from('quotation_requests').select('*').eq('id', id).single();
    setQuotation(updatedQ as unknown as QuotationRequest);
    setSavingResponse(false);
  }

  // ── Loading / empty states ────────────────────────────────────────────────

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
  const lineTotal = lines.reduce((s, l) => s + (l.final_quotation_line_value ?? 0), 0);
  const specDocs = documents.filter((d) => d.document_type !== 'quotation_pdf');
  const quotationPdfs = documents.filter((d) => d.document_type === 'quotation_pdf');

  return (
    <div className="space-y-5 max-w-4xl">
      {/* ── Header ── */}
      <PageHeader
        title={quotation.quotation_code}
        subtitle={quotation.customer_name}
        breadcrumb={[
          { label: 'Quotation Requests', path: '/quotations' },
          { label: quotation.quotation_code },
        ]}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={STATUS_VARIANT[quotation.quotation_status]}>
              {STATUS_LABELS[quotation.quotation_status]}
            </Badge>
            {slaStatus === 'overdue' && (
              <Badge variant="critical">
                <AlertTriangle size={12} className="mr-1" />Overdue {overdueDays}d
              </Badge>
            )}
            {slaStatus === 'warning' && <Badge variant="warning">SLA Warning</Badge>}
            <Link to="/quotations">
              <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />}>Back</Button>
            </Link>
          </div>
        }
      />

      {/* ── Alert banners ── */}
      {actionMsg && (
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sm text-sky-800 flex items-center gap-2">
          <CheckCircle2 size={15} />{actionMsg}
        </div>
      )}
      {/* ── Next Action banner ── */}
      <NextActionBanner
        quotation={quotation}
        isCoordinator={isCoordinator}
        canConvert={canConvert}
        onConvertToSO={handleConvertToSO}
      />

      {/* ── Key Info strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Priority</p>
          <p className="text-sm font-semibold text-gray-900 capitalize">{quotation.priority}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Source</p>
          <p className="text-sm font-semibold text-gray-900">{quotation.opportunity_source ?? '—'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Delivery Expected</p>
          <p className="text-sm font-semibold text-gray-900">
            {quotation.required_delivery_expectation ? fmt(quotation.required_delivery_expectation) : '—'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">
            {(canSeeFinancials || isCoordinator || ['returned_to_sales', 'converted_to_so'].includes(quotation.quotation_status))
              ? 'Quotation Value' : 'Lines'}
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {(canSeeFinancials || isCoordinator || ['returned_to_sales', 'converted_to_so'].includes(quotation.quotation_status))
              ? (quotation.quotation_total_value != null ? fmtSAR(quotation.quotation_total_value) : '—')
              : `${lines.length} line${lines.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* ── Hot Project source link ── */}
      {quotation.linked_hot_project_id && (
        <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <Flame size={16} className="text-orange-500 shrink-0" />
          <p className="text-sm text-orange-900 flex-1">
            Created from Hot Project opportunity
          </p>
          <Link to={`/hot-projects/${quotation.linked_hot_project_id}`} className="flex items-center gap-1 text-xs text-orange-700 hover:underline font-medium shrink-0">
            <ExternalLink size={12} /> View Hot Project
          </Link>
        </div>
      )}

      {/* ── Scope Summary ── */}
      {quotation.scope_summary && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Scope Summary</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{quotation.scope_summary}</p>
        </Card>
      )}

      {/* ── Expandable detail sections ── */}
      <div className="space-y-3">

        {/* Customer Details */}
        <Section title="Customer Details" icon={<User size={15} />} defaultOpen>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ['Customer / Entity', quotation.customer_name],
              ['Contact Person', quotation.customer_contact_name],
              ['Contact Email', quotation.customer_email],
              ['Contact Phone', quotation.customer_phone],
              ['Sales Owner', quotation.requested_by_profile?.full_name],
              ['Coordinator', quotation.assigned_coordinator?.full_name ?? 'Unassigned'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</dt>
                <dd className="font-medium text-gray-900">{value ?? '—'}</dd>
              </div>
            ))}
            {quotation.sales_remarks && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Sales Remarks</dt>
                <dd className="text-gray-700 whitespace-pre-line">{quotation.sales_remarks}</dd>
              </div>
            )}
          </dl>
        </Section>

        {/* Key Dates */}
        <Section title="Key Dates" icon={<Calendar size={15} />}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div><dt className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Created</dt><dd className="font-medium">{fmt(quotation.created_at)}</dd></div>
            {quotation.submitted_at && <div><dt className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Submitted</dt><dd className="font-medium">{fmt(quotation.submitted_at)}</dd></div>}
            {quotation.sent_to_estimation_at && <div><dt className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Sent to Estimation</dt><dd className="font-medium">{fmt(quotation.sent_to_estimation_at)}{quotation.estimation_contact ? ` · ${quotation.estimation_contact}` : ''}</dd></div>}
            {quotation.returned_to_sales_at && <div><dt className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Returned to Sales</dt><dd className="font-medium">{fmt(quotation.returned_to_sales_at)}</dd></div>}
          </dl>
        </Section>

        {/* Requested Lines */}
        <Section title="Requested Lines" icon={<FileText size={15} />} badge={lines.length} defaultOpen>
          {lines.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No lines recorded.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr>
                    <th className="py-2 text-left text-xs font-semibold text-gray-500">#</th>
                    <th className="py-2 text-left text-xs font-semibold text-gray-500">Type</th>
                    <th className="py-2 text-left text-xs font-semibold text-gray-500">Description</th>
                    <th className="py-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                    {(canSeeFinancials || isCoordinator) && (
                      <>
                        <th className="py-2 text-right text-xs font-semibold text-gray-500">Unit Value</th>
                        <th className="py-2 text-right text-xs font-semibold text-gray-500">Line Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2 text-sm text-gray-500">{l.line_number}</td>
                      <td className="py-2 text-sm font-medium text-gray-900">{l.vehicle_type}</td>
                      <td className="py-2 text-sm text-gray-700">{l.description}</td>
                      <td className="py-2 text-right text-sm text-gray-700">{l.quantity}</td>
                      {(canSeeFinancials || isCoordinator) && (
                        <>
                          <td className="py-2 text-right text-sm text-gray-700">{l.final_quotation_unit_value != null ? fmtSAR(l.final_quotation_unit_value) : '—'}</td>
                          <td className="py-2 text-right text-sm font-medium text-gray-900">{l.final_quotation_line_value != null ? fmtSAR(l.final_quotation_line_value) : '—'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                {lineTotal > 0 && (canSeeFinancials || isCoordinator) && (
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={(canSeeFinancials || isCoordinator) ? 4 : 4} className="py-2 text-right text-sm font-semibold text-gray-700">Total</td>
                      <td />
                      <td className="py-2 text-right text-sm font-bold text-gray-900">{fmtSAR(lineTotal)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </Section>

        {/* Specification Documents */}
        <Section title="Specification Documents" icon={<FileUp size={15} />} badge={specDocs.length}>
          <DocumentPanel
            documents={specDocs as unknown as import('../types').ProjectDocument[]}
            bucket="quotation-documents"
            canUpload={['admin', 'operations_manager', 'sales_user', 'sales_coordinator'].includes(role ?? '')}
            upload={quotation && ['admin', 'operations_manager', 'sales_user', 'sales_coordinator'].includes(role ?? '') ? {
              bucket: 'quotation-documents',
              table: 'quotation_documents',
              foreignKey: { field: 'quotation_request_id', value: quotation.id },
              uploadedBy: profile?.id ?? null,
              documentTypeOptions: [
                { value: 'specification_file', label: 'Specification File' },
                { value: 'customer_po', label: 'Customer PO' },
                { value: 'customer_contract', label: 'Customer Contract' },
                { value: 'other', label: 'Other' },
              ],
            } : undefined}
            onUploaded={(doc) => setDocuments((prev) => [...prev, doc as unknown as import('../types').QuotationDocument])}
            emptyMessage="No specification documents uploaded."
          />
        </Section>

        {/* Quotation Response (shown when there's a response or when coordinator can act) */}
        {(['returned_to_sales', 'converted_to_so', 'quotation_received'].includes(quotation.quotation_status) ||
          (canSeeFinancials && quotation.quotation_number)) && (
          <Section title="Quotation Response from Estimation" icon={<CheckCircle2 size={15} />} defaultOpen>
            {quotationPdfs.length > 0 ? (
              <div className="space-y-3 mb-4">
                {quotationPdfs.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FileText size={16} className="text-brand-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{d.file_name}</p>
                      <p className="text-xs text-gray-400">Uploaded {fmtDT(d.uploaded_at)}</p>
                      {!d.storage_path && (
                        <p className="text-xs text-amber-600 mt-0.5">Document record exists — file not yet attached.</p>
                      )}
                    </div>
                    {d.storage_path && (
                      <button
                        onClick={() => void openSignedUrl('quotation-documents', d.storage_path!)}
                        className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium shrink-0"
                        title="Download PDF"
                      >
                        <ArrowRight size={12} /> Download
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic mb-4">No quotation PDF uploaded yet.</p>
            )}
            {quotation.quotation_number && (
              <p className="text-sm text-gray-700 mb-1">Quotation No.: <span className="font-mono font-semibold">{quotation.quotation_number}</span></p>
            )}
            {quotation.quotation_total_value != null && (
              <p className="text-sm font-semibold text-gray-900">Total: {fmtSAR(quotation.quotation_total_value)}</p>
            )}
          </Section>
        )}

        {/* Coordinator Processing — only visible to coordinator roles */}
        {isCoordinator && !['converted_to_so', 'converted_to_hot_project', 'cancelled', 'closed_lost'].includes(quotation.quotation_status) && (
          <Section title="Coordinator Actions" icon={<Send size={15} />} defaultOpen={['submitted_by_sales', 'quotation_received'].includes(quotation.quotation_status)}>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coordinator Remarks</label>
                <textarea rows={3} value={coordRemarks} onChange={(e) => setCoordRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" placeholder="Internal remarks…" />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="secondary" loading={saving} onClick={handleSaveCoordRemarks} icon={<Edit2 size={13} />}>Save Remarks</Button>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quotation.quotation_status === 'submitted_by_sales' && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">Mark as Received</h4>
                    <p className="text-xs text-gray-500">Acknowledge receipt from Sales.</p>
                    <Button size="sm" loading={saving} onClick={handleMarkReceived} icon={<CheckCircle2 size={14} />}>Mark Received</Button>
                  </div>
                )}
                {['received_by_coordinator', 'submitted_by_sales'].includes(quotation.quotation_status) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">Send to Estimation</h4>
                    <p className="text-xs text-gray-500">Record that you forwarded this to Estimation.</p>
                    <input value={estimationContact} onChange={(e) => setEstimationContact(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2" placeholder="Estimation email / contact…" />
                    <Button size="sm" loading={saving} onClick={handleSentToEstimation} icon={<Send size={14} />}>Record Sent to Estimation</Button>
                  </div>
                )}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-800">Request Clarification</h4>
                  <p className="text-xs text-gray-500">Ask Sales for additional information.</p>
                  <textarea rows={2} value={clarification} onChange={(e) => setClarification(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none mb-2" placeholder="What clarification is needed?" />
                  <Button size="sm" variant="outline" loading={saving} onClick={handleRequestClarification} icon={<AlertTriangle size={14} />}>Request Clarification</Button>
                </div>
              </div>

              {/* Enter quotation response values */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-800">Enter Quotation Response</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Number</label>
                    <input value={quotationNumber} onChange={(e) => setQuotationNumber(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. QT-EST-2025-0088" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quotation PDF</label>
                    {isSupabaseConfigured ? (
                      <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <Upload size={14} className={pdfFile ? 'text-brand-500' : 'text-gray-400'} />
                        <span className={`truncate ${pdfFile ? 'text-brand-700 font-medium' : 'text-gray-500'}`}>{pdfFile ? pdfFile.name : (pdfFileName || 'Choose PDF…')}</span>
                        <input type="file" accept=".pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPdfFile(f); setPdfFileName(f.name); } }} />
                      </label>
                    ) : (
                      <input value={pdfFileName} onChange={(e) => setPdfFileName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Quotation_PDF.pdf" />
                    )}
                  </div>
                </div>

                {lines.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Final Unit Values per Line</p>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr>
                          <th className="pb-2 text-left text-xs font-semibold text-gray-500">Item</th>
                          <th className="pb-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                          <th className="pb-2 text-right text-xs font-semibold text-gray-500">Unit Value (SAR)</th>
                          <th className="pb-2 text-right text-xs font-semibold text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lines.map((l) => {
                          const uv = lineValues[l.id] ?? l.final_quotation_unit_value ?? 0;
                          const lt = uv * l.quantity;
                          return (
                            <tr key={l.id}>
                              <td className="py-2 text-gray-900">{l.vehicle_type} — {l.description}</td>
                              <td className="py-2 text-right text-gray-600">{l.quantity}</td>
                              <td className="py-2 text-right">
                                <input type="number" min={0} value={lineValues[l.id] ?? (l.final_quotation_unit_value ?? '')}
                                  onChange={(e) => setLineValues((v) => ({ ...v, [l.id]: parseFloat(e.target.value) || 0 }))}
                                  className="w-32 text-right px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" placeholder="0" />
                              </td>
                              <td className="py-2 text-right font-medium text-gray-900">{lt > 0 ? fmtSAR(lt) : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button size="sm" variant="secondary" loading={savingResponse} onClick={handleSaveLineValues} icon={<Edit2 size={14} />}>Save Values</Button>
                  {quotation.quotation_status === 'quotation_received' && (
                    <Button size="sm" loading={savingResponse} onClick={handleReturnToSales} icon={<RotateCcw size={14} />}>Return to Sales</Button>
                  )}
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Timeline */}
        <Section title="Timeline" icon={<Clock size={15} />} badge={timeline.length}>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No timeline events yet.</p>
          ) : (
            <ol className="relative border-l border-gray-200 ml-3 space-y-5">
              {timeline.map((ev) => (
                <li key={ev.id} className="ml-4">
                  <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-brand-200 border-2 border-brand-500" />
                  <p className="text-xs text-gray-400 mb-0.5">{fmtDT(ev.created_at)}{ev.actor_name ? ` · ${ev.actor_name}` : ''}</p>
                  <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                  {ev.body && <p className="text-sm text-gray-600 mt-0.5">{ev.body}</p>}
                </li>
              ))}
            </ol>
          )}
        </Section>

        {/* Audit (admin only) */}
        {role === 'admin' && (
          <Section title="Audit Log" icon={<Shield size={15} />}>
            <p className="text-sm text-gray-500 mb-3">
              Audit log entries for this quotation. Filter by entity ID:{' '}
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{quotation.id}</span>
            </p>
            <Link to="/audit-log">
              <Button size="sm" variant="secondary" icon={<ChevronRight size={14} />}>Open Audit Log</Button>
            </Link>
          </Section>
        )}
      </div>
    </div>
  );
}
