import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Plus, Trash2, FileUp,
  CheckCircle2, AlertCircle, Info, Flame, Loader2,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { SECTOR_OPTIONS } from '../lib/commercialFields';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { recordQuotationEvent, recordQuotationAuditEntry } from '../lib/quotationAudit';
import type { QuotationPriority } from '../types';
import type { HotProject } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LineItem {
  vehicle_type: string;
  description: string;
  quantity: number;
  remarks: string;
}

interface DocItem {
  file_name: string;
  document_type: string;
  remarks: string;
}

interface FormData {
  customer_name: string;
  customer_contact_name: string;
  customer_email: string;
  customer_phone: string;
  opportunity_source: string;
  sector: '' | 'private' | 'gov' | 'semi_gov';
  priority: QuotationPriority;
  required_delivery_expectation: string;
  scope_summary: string;
  sales_remarks: string;
  lines: LineItem[];
  documents: DocItem[];
}

const INITIAL_FORM: FormData = {
  customer_name: '',
  customer_contact_name: '',
  customer_email: '',
  customer_phone: '',
  opportunity_source: '',
  sector: '',
  priority: 'medium',
  required_delivery_expectation: '',
  scope_summary: '',
  sales_remarks: '',
  lines: [],
  documents: [],
};

const VEHICLE_TYPES = [
  'ARFF Cat 4', 'ARFF Cat 5', 'ARFF Cat 6', 'ARFF Cat 7', 'ARFF Cat 8', 'ARFF Cat 9',
  'ALS Ambulance', 'BLS Ambulance', 'Patient Transport',
  'Foam Tender', 'Water Tender', 'Rescue Tender', 'Command Unit',
  'Hazmat Unit', 'Rapid Intervention Vehicle', 'Other',
];

const DOC_TYPES = [
  { value: 'specification_file',   label: 'Specification File' },
  { value: 'customer_requirement', label: 'Customer Requirement' },
  { value: 'supporting_document',  label: 'Supporting Document' },
  { value: 'other',                label: 'Other' },
];

const STEP_LABELS = ['Customer Info', 'Requested Items', 'Specification Docs', 'Review & Submit'];

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-0">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              i < current
                ? 'bg-green-100 text-green-700'
                : i === current
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {i < current ? <CheckCircle2 size={16} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-12 ${i < current ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function QuotationNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, role } = useAuth();

  const hotProjectId = searchParams.get('hot_project_id');

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [newLine, setNewLine] = useState<LineItem>({ vehicle_type: '', description: '', quantity: 1, remarks: '' });
  const [newDoc, setNewDoc] = useState<DocItem>({ file_name: '', document_type: 'specification_file', remarks: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Hot project prefill state
  const [hotProject, setHotProject] = useState<HotProject | null>(null);
  const [hotProjectLoading, setHotProjectLoading] = useState(!!hotProjectId && isSupabaseConfigured);

  // Fetch hot project and prefill form when hotProjectId is in URL
  useEffect(() => {
    if (!hotProjectId) return;

    if (!isSupabaseConfigured || !supabase) {
      // Dev mode: simulate a hot project so the form shows a source card
      Promise.resolve().then(() => {
        setHotProject({
          id: hotProjectId,
          hot_project_code: 'HP-2026-0001',
          title: 'Demo Opportunity',
          customer_name: '',
          customer_contact_name: null,
          customer_email: null,
          customer_phone: null,
          opportunity_source: null,
          stage: 'lead',
          probability: 50,
          estimated_value: null,
          expected_close_date: null,
          linked_quotation_id: null,
          linked_project_id: null,
          sales_owner_id: null,
          notes: null,
          lost_reason: null,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
      return;
    }

    supabase
      .from('hot_projects')
      .select('*')
      .eq('id', hotProjectId)
      .single()
      .then(({ data, error }) => {
        setHotProjectLoading(false);
        if (error || !data) return;
        const hp = data as unknown as HotProject;
        setHotProject(hp);
        // Prefill form with hot project data
        setForm((f) => ({
          ...f,
          customer_name: hp.customer_name ?? '',
          customer_contact_name: hp.customer_contact_name ?? '',
          customer_email: hp.customer_email ?? '',
          customer_phone: hp.customer_phone ?? '',
          opportunity_source: hp.opportunity_source ?? '',
          sector: hp.sector ?? '',
          scope_summary: hp.title ?? '',
          sales_remarks: hp.notes ?? '',
        }));
      });
  }, [hotProjectId]);

  function validate(forSubmit: boolean): string[] {
    const errs: string[] = [];
    if (!form.customer_name.trim()) errs.push('Customer / Entity Name is required.');
    if (form.lines.length === 0) errs.push('At least one requested vehicle / item line is required.');
    if (form.lines.some((l) => l.quantity <= 0)) errs.push('All line quantities must be greater than 0.');
    if (forSubmit && !form.documents.some((d) => d.document_type === 'specification_file')) {
      errs.push('At least one Specification File document is required to submit.');
    }
    return errs;
  }

  async function handleSave(submit: boolean) {
    const errs = validate(submit);
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setSubmitting(true);

    const now = new Date().toISOString();

    if (!isSupabaseConfigured || !supabase) {
      await new Promise<void>((r) => setTimeout(r, 400));
      setSubmitting(false);
      navigate('/quotations');
      return;
    }

    try {
      // ── Step 1: INSERT quotation as draft ─────────────────────────────────
      // Always inserts as 'draft' even when the user intends to submit.
      // The final status change to 'submitted_by_sales' happens after documents
      // are inserted, allowing migration 087 to enforce R-001 on the UPDATE.
      const { data: qtn, error: qErr } = await supabase
        .from('quotation_requests')
        .insert({
          customer_name: form.customer_name.trim(),
          customer_contact_name: form.customer_contact_name.trim() || null,
          customer_email: form.customer_email.trim() || null,
          customer_phone: form.customer_phone.trim() || null,
          opportunity_source: form.opportunity_source.trim() || null,
          // Migration-101 field — sent only when set (safe before 101 is applied)
          ...(form.sector ? { sector: form.sector } : {}),
          priority: form.priority,
          required_delivery_expectation: form.required_delivery_expectation || null,
          scope_summary: form.scope_summary.trim() || null,
          sales_remarks: form.sales_remarks.trim() || null,
          quotation_status: 'draft',
          requested_by: profile?.id ?? null,
          created_by: profile?.id ?? null,
          submitted_at: null,
          linked_hot_project_id: hotProjectId ?? null,
        })
        .select()
        .single();

      if (qErr || !qtn) throw qErr ?? new Error('Failed to create quotation');

      const qtnId = (qtn as { id: string; quotation_code: string }).id;
      const qtnCode = (qtn as { id: string; quotation_code: string }).quotation_code;

      // ── Step 2: INSERT lines ──────────────────────────────────────────────
      if (form.lines.length > 0) {
        await supabase.from('quotation_request_lines').insert(
          form.lines.map((l, idx) => ({
            quotation_request_id: qtnId,
            line_number: idx + 1,
            vehicle_type: l.vehicle_type,
            description: l.description,
            quantity: l.quantity,
            remarks: l.remarks || null,
          })),
        );
      }

      // ── Step 3: INSERT documents ──────────────────────────────────────────
      // Documents must exist before the final status UPDATE so that
      // migration 087 (trg_quotation_document_gates) can verify their presence.
      // If document insert fails, stop here — the quotation remains as draft.
      if (form.documents.length > 0) {
        const { error: docErr } = await supabase.from('quotation_documents').insert(
          form.documents.map((d) => ({
            quotation_request_id: qtnId,
            document_type: d.document_type,
            file_name: d.file_name,
            uploaded_by: profile?.id ?? null,
            remarks: d.remarks || null,
          })),
        );
        if (docErr) {
          setErrors([
            `Draft quotation ${qtnCode} was created but documents could not be saved: ${docErr.message}. ` +
            'Your draft is accessible in the Quotations list — open it to add documents, then resubmit.',
          ]);
          setSubmitting(false);
          return;
        }
      }

      // ── Step 4: Link hot project ──────────────────────────────────────────
      if (hotProjectId) {
        await supabase
          .from('hot_projects')
          .update({
            linked_quotation_id: qtnId,
            stage: 'quotation_requested',
          })
          .eq('id', hotProjectId);
      }

      if (submit) {
        // ── Step 5: UPDATE status to submitted_by_sales ───────────────────
        // Migration 087 (trg_quotation_document_gates) enforces R-001 here:
        // it blocks this UPDATE if no specification_file document row exists.
        const { error: submitErr } = await supabase
          .from('quotation_requests')
          .update({ quotation_status: 'submitted_by_sales', submitted_at: now })
          .eq('id', qtnId);

        if (submitErr) {
          const isGovernance =
            submitErr.message.includes('R-001') ||
            submitErr.message.includes('specification file') ||
            submitErr.message.includes('Governance violation');
          setErrors([
            isGovernance
              ? `Draft quotation ${qtnCode} was created but submission was blocked by the database: ` +
                'at least one document must have type "Specification File". ' +
                'Your draft is accessible in the Quotations list — change the document type and retry.'
              : `Draft quotation ${qtnCode} was created but could not be submitted: ${submitErr.message}. ` +
                'Your draft is accessible in the Quotations list.',
          ]);
          setSubmitting(false);
          return;
        }

        // ── Step 6: Record timeline + audit (submission confirmed) ────────
        await recordQuotationEvent(
          qtnId,
          'quotation_submitted_by_sales',
          'Quotation submitted to Sales Coordinator',
          hotProjectId ? `Created from Hot Project ${hotProject?.hot_project_code ?? hotProjectId}` : null,
          profile?.id ?? null,
          profile?.full_name ?? null,
        );
        await recordQuotationAuditEntry(
          'quotation_submitted',
          qtnId,
          'Quotation submitted by sales',
          null,
          { status: 'submitted_by_sales', linked_hot_project_id: hotProjectId ?? null },
          profile?.id ?? null,
          profile?.email ?? null,
          role,
        );
      } else {
        // ── Step 5 (draft path): Record timeline + audit ──────────────────
        await recordQuotationEvent(
          qtnId,
          'quotation_draft_created',
          'Quotation request created as draft',
          hotProjectId ? `Created from Hot Project ${hotProject?.hot_project_code ?? hotProjectId}` : null,
          profile?.id ?? null,
          profile?.full_name ?? null,
        );
        await recordQuotationAuditEntry(
          'quotation_created',
          qtnId,
          'Quotation draft created',
          null,
          { status: 'draft', linked_hot_project_id: hotProjectId ?? null },
          profile?.id ?? null,
          profile?.email ?? null,
          role,
        );
      }

      setSubmitting(false);
      navigate(`/quotations/${qtnId}`);
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'An error occurred']);
      setSubmitting(false);
    }
  }

  function addLine() {
    if (!newLine.vehicle_type || !newLine.description) return;
    setForm((f) => ({ ...f, lines: [...f.lines, { ...newLine }] }));
    setNewLine({ vehicle_type: '', description: '', quantity: 1, remarks: '' });
  }

  function removeLine(idx: number) {
    setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  }

  function addDoc() {
    if (!newDoc.file_name.trim()) return;
    setForm((f) => ({ ...f, documents: [...f.documents, { ...newDoc }] }));
    setNewDoc({ file_name: '', document_type: 'specification_file', remarks: '' });
  }

  function removeDoc(idx: number) {
    setForm((f) => ({ ...f, documents: f.documents.filter((_, i) => i !== idx) }));
  }

  if (hotProjectLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
        <Loader2 className="animate-spin" size={20} />
        <span>Loading opportunity details…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="New Quotation Request"
        subtitle="Create a pre-sales quotation request for the Sales Coordinator to process"
      />

      {/* Hot Project source card */}
      {hotProject && (
        <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <Flame size={16} className="text-orange-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-900">
              Created from Hot Project: <span className="font-mono">{hotProject.hot_project_code}</span>
            </p>
            <p className="text-xs text-orange-700 truncate">{hotProject.title}</p>
          </div>
          <Link to={`/hot-projects/${hotProject.id}`} className="text-xs text-orange-700 hover:underline whitespace-nowrap font-medium shrink-0">
            View Hot Project →
          </Link>
        </div>
      )}

      {/* Step indicator */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <StepIndicator current={step} total={STEP_LABELS.length} />
          <span className="text-sm text-gray-600 font-medium">
            Step {step + 1}: {STEP_LABELS[step]}
          </span>
        </div>
      </Card>

      {/* Dev mode notice */}
      {!isSupabaseConfigured && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>Dev mode — changes will not be persisted. Data shown after save is mock data.</span>
        </div>
      )}

      {/* Step 1 — Customer Info */}
      {step === 0 && (
        <Card className="p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Customer / Entity Information</h2>
          {hotProject && (
            <div className="flex items-start gap-2 p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800">
              <Info size={14} className="mt-0.5 shrink-0" />
              Customer details have been prefilled from the Hot Project. You can edit them if needed.
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer / Entity Name <span className="text-red-500">*</span></label>
              <input value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="e.g. General Authority of Civil Aviation" />
              <p className="mt-1 text-xs text-gray-400">Use the official entity or company name — this appears on the quotation document.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input value={form.customer_contact_name} onChange={(e) => setForm((f) => ({ ...f, customer_contact_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input type="email" value={form.customer_email} onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input value={form.customer_phone} onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="+966 11 200 3300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Source</label>
              <input value={form.opportunity_source} onChange={(e) => setForm((f) => ({ ...f, opportunity_source: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Direct, Tender, Referral…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sector (optional)</label>
              <select value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value as FormData['sector'] }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Not set</option>
                {SECTOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as QuotationPriority }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">High and Urgent are escalated to the coordinator immediately.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Required Delivery Expectation</label>
              <input type="date" value={form.required_delivery_expectation} onChange={(e) => setForm((f) => ({ ...f, required_delivery_expectation: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <p className="mt-1 text-xs text-gray-400">Approximate customer expectation — helps coordinator prioritize. Not a committed delivery date.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Scope Summary</label>
              <textarea rows={3} value={form.scope_summary} onChange={(e) => setForm((f) => ({ ...f, scope_summary: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" placeholder="Brief description of what is being requested, including any special requirements or context…" />
              <p className="mt-1 text-xs text-gray-400">Include enough context for the coordinator — incomplete scope is the most common cause of delays.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sales Remarks</label>
              <textarea rows={2} value={form.sales_remarks} onChange={(e) => setForm((f) => ({ ...f, sales_remarks: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" placeholder="Internal notes for the coordinator — not visible to the customer…" />
              <p className="mt-1 text-xs text-gray-400">Internal only — use this for urgency context, relationship notes, or known constraints.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(1)}>Next <ChevronRight size={16} /></Button>
          </div>
        </Card>
      )}

      {/* Step 2 — Vehicle Lines */}
      {step === 1 && (
        <Card className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Requested Vehicles / Items</h2>
            <p className="text-sm text-gray-500 mt-1">At least one item line is required. The more detail you include, the faster the coordinator can process your request.</p>
          </div>

          {/* Add line form */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle / Item Type <span className="text-red-500">*</span></label>
              <select value={newLine.vehicle_type} onChange={(e) => setNewLine((l) => ({ ...l, vehicle_type: e.target.value }))}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select type…</option>
                {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description <span className="text-red-500">*</span></label>
              <input value={newLine.description} onChange={(e) => setNewLine((l) => ({ ...l, description: e.target.value }))}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Brief description…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qty <span className="text-red-500">*</span></label>
              <input type="number" min={1} value={newLine.quantity} onChange={(e) => setNewLine((l) => ({ ...l, quantity: parseInt(e.target.value) || 1 }))}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <input value={newLine.remarks} onChange={(e) => setNewLine((l) => ({ ...l, remarks: e.target.value }))}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Optional remarks…" />
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={addLine} disabled={!newLine.vehicle_type || !newLine.description} icon={<Plus size={14} />}>Add</Button>
            </div>
          </div>

          {/* Lines list */}
          {form.lines.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr>
                  <th className="py-2 text-left text-xs font-semibold text-gray-500">#</th>
                  <th className="py-2 text-left text-xs font-semibold text-gray-500">Type</th>
                  <th className="py-2 text-left text-xs font-semibold text-gray-500">Description</th>
                  <th className="py-2 text-right text-xs font-semibold text-gray-500">Qty</th>
                  <th className="py-2 text-left text-xs font-semibold text-gray-500">Remarks</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {form.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-2 text-sm text-gray-500">{i + 1}</td>
                    <td className="py-2 text-sm font-medium text-gray-900">{l.vehicle_type}</td>
                    <td className="py-2 text-sm text-gray-700">{l.description}</td>
                    <td className="py-2 text-right text-sm text-gray-700">{l.quantity}</td>
                    <td className="py-2 text-sm text-gray-500">{l.remarks || '—'}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400 italic">No lines added yet.</p>
          )}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(0)} icon={<ChevronLeft size={16} />}>Back</Button>
            <Button onClick={() => setStep(2)}>Next <ChevronRight size={16} /></Button>
          </div>
        </Card>
      )}

      {/* Step 3 — Documents */}
      {step === 2 && (
        <Card className="p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Specification Documents</h2>

          <div className="flex items-start gap-2 p-3 bg-sky-50 border border-sky-200 rounded-lg text-sm text-sky-800">
            <Info size={15} className="mt-0.5 shrink-0" />
            <span>
              Documents are <strong>optional for saving as draft</strong> but required to submit to the coordinator.
              {!isSupabaseConfigured && ' Storage not connected — enter a filename to record the reference.'}
            </span>
          </div>

          {/* Add doc form */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Document Type</label>
              <select value={newDoc.document_type} onChange={(e) => setNewDoc((d) => ({ ...d, document_type: e.target.value }))}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {isSupabaseConfigured ? 'File' : 'File Name'} <span className="text-red-500">*</span>
              </label>
              {isSupabaseConfigured ? (
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center gap-2 px-2 py-2 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <FileUp size={14} className="text-gray-400" />
                    <span className="text-gray-500 truncate">{newDoc.file_name || 'Choose file…'}</span>
                    <input type="file" className="sr-only" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setNewDoc((d) => ({ ...d, file_name: f.name }));
                    }} />
                  </label>
                </div>
              ) : (
                <input value={newDoc.file_name} onChange={(e) => setNewDoc((d) => ({ ...d, file_name: e.target.value }))}
                  className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Filename.pdf" />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <input value={newDoc.remarks} onChange={(e) => setNewDoc((d) => ({ ...d, remarks: e.target.value }))}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Optional…" />
            </div>
            <div className="flex items-end">
              <Button size="sm" onClick={addDoc} disabled={!newDoc.file_name.trim()} icon={<Plus size={14} />}>Add</Button>
            </div>
          </div>

          {/* Docs list */}
          {form.documents.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {form.documents.map((d, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.file_name}</p>
                    <p className="text-xs text-gray-400">{DOC_TYPES.find((t) => t.value === d.document_type)?.label ?? d.document_type}{d.remarks ? ` — ${d.remarks}` : ''}</p>
                  </div>
                  <button onClick={() => removeDoc(i)} className="text-red-400 hover:text-red-600 ml-3"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 italic">No documents added yet. You can save a draft without documents and add them later.</p>
          )}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)} icon={<ChevronLeft size={16} />}>Back</Button>
            <Button onClick={() => setStep(3)}>Next <ChevronRight size={16} /></Button>
          </div>
        </Card>
      )}

      {/* Step 4 — Review */}
      {step === 3 && (
        <Card className="p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Review & Submit</h2>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
              {errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />{e}
                </div>
              ))}
            </div>
          )}

          {/* Hot project source banner in review */}
          {hotProject && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
              <Flame size={14} className="text-orange-500 shrink-0" />
              <span>Linked to Hot Project: <span className="font-mono font-medium">{hotProject.hot_project_code}</span> — {hotProject.title}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Customer</h3>
              <p className="text-sm font-semibold text-gray-900">{form.customer_name || <em className="text-red-500">Required</em>}</p>
              {form.customer_contact_name && <p className="text-sm text-gray-600">{form.customer_contact_name}</p>}
              {form.customer_email && <p className="text-xs text-gray-500">{form.customer_email}</p>}
              {form.scope_summary && <p className="text-xs text-gray-500 mt-2">{form.scope_summary}</p>}
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Request Details</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Priority:</span><span className="capitalize font-medium">{form.priority}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Source:</span><span>{form.opportunity_source || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Delivery:</span><span>{form.required_delivery_expectation || '—'}</span></div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Requested Lines ({form.lines.length})</h3>
            {form.lines.length === 0 ? (
              <p className="text-sm text-red-500">No lines — required.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {form.lines.map((l, i) => (
                  <li key={i} className="py-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{l.vehicle_type}</span>
                    <span className="text-gray-600">{l.description}</span>
                    <span className="text-gray-500">× {l.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Documents ({form.documents.length})</h3>
            {form.documents.length === 0 ? (
              <p className="text-sm text-amber-600 italic">No documents added. Documents are required to submit (but not for draft).</p>
            ) : (
              <ul className="space-y-1">
                {form.documents.map((d, i) => (
                  <li key={i} className="text-sm text-gray-700">{d.file_name} <span className="text-gray-400">({d.document_type})</span></li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(2)} icon={<ChevronLeft size={16} />}>Back</Button>
            <div className="flex gap-3">
              <Button variant="outline" loading={submitting} onClick={() => void handleSave(false)}>Save as Draft</Button>
              <Button loading={submitting} onClick={() => void handleSave(true)}>Submit to Coordinator <ChevronRight size={16} /></Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
