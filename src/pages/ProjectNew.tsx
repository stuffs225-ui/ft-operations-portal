import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderPlus, ChevronRight, ChevronLeft, Check,
  Plus, Trash2, FileText, Info, AlertCircle,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { recordProjectEvent, recordAuditEntry } from '../lib/projectAudit';
import type { ManufacturingLocation, MedicalItems } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

interface VehicleLine {
  id: string;
  vehicle_type: string;
  description: string;
  quantity: number;
  unit_sales_value: number;
}

interface DocumentEntry {
  id: string;
  document_type: string;
  file_name: string;
  remarks: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const VEHICLE_TYPES = [
  'Fire Truck',
  'Ambulance',
  'Rescue Vehicle',
  'Hazmat Vehicle',
  'Command Vehicle',
  'Water Tanker',
  'Airport ARFF Truck',
  'Other',
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'customer_po', label: 'Customer PO' },
  { value: 'customer_contract', label: 'Customer Contract' },
  { value: 'sales_order_supporting_document', label: 'SO Supporting Document' },
  { value: 'specification_file', label: 'Specification File' },
  { value: 'other', label: 'Other' },
];

function formatSAR(value: number) {
  return value.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const STEPS = ['Basic Info', 'Documents', 'Vehicle Lines', 'Review & Submit'];

// ── Step indicators ────────────────────────────────────────────────────────────

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${i > 0 ? '' : ''}`}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  done
                    ? 'bg-brand-600 text-white'
                    : active
                    ? 'bg-white border-2 border-brand-600 text-brand-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span
                className={`text-sm font-medium hidden sm:block ${
                  active ? 'text-brand-700' : done ? 'text-gray-700' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 w-6 sm:w-12 ${done ? 'bg-brand-600' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ProjectNew() {
  const { profile, role } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step 1 — Basic Info
  const [soNumber, setSoNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [manufacturingLocation, setManufacturingLocation] = useState<ManufacturingLocation>('not_set');
  const [medicalItems, setMedicalItems] = useState<MedicalItems>('not_set');

  // Step 2 — Documents
  const [documents, setDocuments] = useState<DocumentEntry[]>([
    { id: uid(), document_type: 'customer_po', file_name: '', remarks: '' },
  ]);

  // Step 3 — Vehicle Lines
  const [lines, setLines] = useState<VehicleLine[]>([
    { id: uid(), vehicle_type: '', description: '', quantity: 1, unit_sales_value: 0 },
  ]);

  // ── Validation helpers ───────────────────────────────────────────────────────

  const step1Errors: string[] = [];
  if (!soNumber.trim()) step1Errors.push('SO Number is required');
  if (!customerName.trim()) step1Errors.push('Customer Name is required');
  if (!deliveryDate) step1Errors.push('Customer Delivery Date is required');

  const step2Errors: string[] = [];
  if (documents.length === 0) step2Errors.push('At least one document is required');
  documents.forEach((d, i) => {
    if (!d.file_name.trim()) step2Errors.push(`Document ${i + 1}: File name is required`);
  });

  const step3Errors: string[] = [];
  if (lines.length === 0) step3Errors.push('At least one vehicle line is required');
  lines.forEach((l, i) => {
    if (!l.vehicle_type) step3Errors.push(`Line ${i + 1}: Vehicle type is required`);
    if (!l.description.trim()) step3Errors.push(`Line ${i + 1}: Description is required`);
    if (l.quantity < 1) step3Errors.push(`Line ${i + 1}: Quantity must be ≥ 1`);
  });

  const allErrors = [...step1Errors, ...step2Errors, ...step3Errors];
  const totalValue = lines.reduce((sum, l) => sum + l.quantity * l.unit_sales_value, 0);

  // ── Document helpers ─────────────────────────────────────────────────────────

  function addDocument() {
    setDocuments((d) => [...d, { id: uid(), document_type: 'other', file_name: '', remarks: '' }]);
  }

  function removeDocument(id: string) {
    setDocuments((d) => d.filter((x) => x.id !== id));
  }

  function updateDocument(id: string, field: keyof DocumentEntry, value: string) {
    setDocuments((d) => d.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  }

  // ── Line helpers ─────────────────────────────────────────────────────────────

  function addLine() {
    setLines((l) => [...l, { id: uid(), vehicle_type: '', description: '', quantity: 1, unit_sales_value: 0 }]);
  }

  function removeLine(id: string) {
    setLines((l) => l.filter((x) => x.id !== id));
  }

  function updateLine(id: string, field: keyof VehicleLine, value: string | number) {
    setLines((l) => l.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSave(submitForApproval: boolean) {
    if (allErrors.length > 0) return;
    setSubmitting(true);
    setSubmitError(null);

    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 600));
      setSubmitting(false);
      navigate('/projects', {
        state: {
          toast: submitForApproval
            ? 'Dev mode — project submitted for approval (not persisted)'
            : 'Dev mode — project saved as draft (not persisted)',
        },
      });
      return;
    }

    try {
      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({
          so_number: soNumber.trim(),
          customer_name: customerName.trim(),
          customer_delivery_date: deliveryDate,
          sales_owner_id: profile?.id ?? null,
          project_status: submitForApproval ? 'submitted_for_approval' : 'draft',
          manufacturing_location: manufacturingLocation,
          medical_items: medicalItems,
          total_sales_value: totalValue,
          submitted_at: submitForApproval ? new Date().toISOString() : null,
          notes: notes.trim() || null,
          created_by: profile?.id ?? null,
        })
        .select()
        .single();

      if (projError) throw projError;
      const projectId = project.id;

      // Insert vehicle lines
      if (lines.length > 0) {
        await supabase.from('project_vehicle_lines').insert(
          lines.map((l, i) => ({
            project_id: projectId,
            line_number: i + 1,
            vehicle_type: l.vehicle_type,
            description: l.description,
            quantity: l.quantity,
            unit_sales_value: l.unit_sales_value,
          })),
        );
      }

      // Insert documents
      if (documents.length > 0) {
        await supabase.from('project_documents').insert(
          documents
            .filter((d) => d.file_name.trim())
            .map((d) => ({
              project_id: projectId,
              document_type: d.document_type,
              file_name: d.file_name.trim(),
              uploaded_by: profile?.id ?? null,
              remarks: d.remarks.trim() || null,
            })),
        );
      }

      await recordProjectEvent(
        projectId,
        submitForApproval ? 'submitted_for_approval' : 'project_created',
        submitForApproval ? 'Submitted for approval' : 'Project created',
        null,
        profile?.id ?? null,
        profile?.full_name ?? null,
      );

      await recordAuditEntry(
        'project_created',
        projectId,
        `Project ${submitForApproval ? 'submitted for approval' : 'saved as draft'}: ${soNumber}`,
        null,
        { so_number: soNumber, customer_name: customerName, project_status: submitForApproval ? 'submitted_for_approval' : 'draft' },
        profile?.id ?? null,
        profile?.email ?? null,
        role,
      );

      navigate(`/projects/${projectId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="New SO / Project"
        subtitle="Register a new Sales Order"
        icon={<FolderPlus size={18} />}
        breadcrumb={[
          { label: 'Projects', path: '/projects' },
          { label: 'New SO / Project' },
        ]}
      />

      {!isSupabaseConfigured && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Dev Mode</span> — Save / Submit will succeed but data will not be
            persisted to a database.
          </p>
        </div>
      )}

      <StepBar step={step} />

      {/* ── Step 1: Basic Info ─────────────────────────────────────────────────── */}
      {step === 0 && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Basic Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  SO Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={soNumber}
                  onChange={(e) => setSoNumber(e.target.value)}
                  placeholder="e.g. SO-CRCD-2025-0143"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Customer Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Civil Defence — Riyadh Region"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Manufacturing Location</label>
                <select
                  value={manufacturingLocation}
                  onChange={(e) => setManufacturingLocation(e.target.value as ManufacturingLocation)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="not_set">Not Set (decide at approval)</option>
                  <option value="saudi">Saudi Arabia</option>
                  <option value="dubai">Dubai / UAE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Medical Items</label>
                <select
                  value={medicalItems}
                  onChange={(e) => setMedicalItems(e.target.value as MedicalItems)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="not_set">Not Set (decide at approval)</option>
                  <option value="yes">Yes — Medical Items</option>
                  <option value="no">No — Non-Medical</option>
                </select>
              </div>
            </div>

            {medicalItems === 'yes' && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Medical items require serial number tracking per governance rules. This will be enforced in the delivery phase.
                </p>
              </div>
            )}

            {manufacturingLocation === 'saudi' && (
              <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg p-3">
                <Info size={14} className="text-sky-600 shrink-0 mt-0.5" />
                <p className="text-xs text-sky-800">
                  Saudi route: <strong>Work Order (WO) is mandatory</strong> before factory execution can begin.
                </p>
              </div>
            )}

            {manufacturingLocation === 'dubai' && (
              <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg p-3">
                <Info size={14} className="text-sky-600 shrink-0 mt-0.5" />
                <p className="text-xs text-sky-800">
                  Dubai route: <strong>Part Number (PN) is mandatory</strong> before Dubai follow-up can begin.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional context or instructions…"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
              <span className="font-medium">Sales Owner:</span>{' '}
              {profile?.full_name ?? profile?.email ?? 'You'}
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setStep(1)}
              disabled={step1Errors.length > 0}
            >
              Next <ChevronRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 2: Documents ──────────────────────────────────────────────────── */}
      {step === 1 && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Documents</h2>

          {!isSupabaseConfigured && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
              <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Storage not connected</span> — Enter the file name manually.
                Real file upload requires Supabase Storage to be configured.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {documents.map((doc, i) => (
              <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Document {i + 1}</span>
                  {documents.length > 1 && (
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Document Type</label>
                    <select
                      value={doc.document_type}
                      onChange={(e) => updateDocument(doc.id, 'document_type', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {DOCUMENT_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      File Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={doc.file_name}
                      onChange={(e) => updateDocument(doc.id, 'file_name', e.target.value)}
                      placeholder="e.g. PO-CRCD-2025-0143.pdf"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Remarks (optional)</label>
                  <input
                    type="text"
                    value={doc.remarks}
                    onChange={(e) => updateDocument(doc.id, 'remarks', e.target.value)}
                    placeholder="Any notes about this document…"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addDocument}
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
            >
              <Plus size={15} />
              Add Another Document
            </button>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={() => setStep(0)} icon={<ChevronLeft size={16} />}>
              Back
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={step2Errors.length > 0}
            >
              Next <ChevronRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 3: Vehicle Lines ──────────────────────────────────────────────── */}
      {step === 2 && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Vehicle Lines</h2>

          <div className="space-y-4">
            {lines.map((line, i) => (
              <div key={line.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Line {i + 1}</span>
                  {lines.length > 1 && (
                    <button
                      onClick={() => removeLine(line.id)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Vehicle Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={line.vehicle_type}
                      onChange={(e) => updateLine(line.id, 'vehicle_type', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select type…</option>
                      {VEHICLE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                      placeholder="e.g. Heavy Pumper Truck — 6000L"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unit Sales Value (SAR)</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={line.unit_sales_value}
                      onChange={(e) => updateLine(line.id, 'unit_sales_value', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div className="mt-2 text-right text-xs text-gray-500">
                  Line Total: <span className="font-semibold text-gray-800">
                    SAR {formatSAR(line.quantity * line.unit_sales_value)}
                  </span>
                </div>
              </div>
            ))}

            <button
              onClick={addLine}
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
            >
              <Plus size={15} />
              Add Vehicle Line
            </button>

            <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Sales Value</span>
              <span className="text-base font-bold text-gray-900">SAR {formatSAR(totalValue)}</span>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={() => setStep(1)} icon={<ChevronLeft size={16} />}>
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={step3Errors.length > 0}
            >
              Next <ChevronRight size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 4: Review & Submit ────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Validation errors */}
          {allErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={15} className="text-red-500" />
                <span className="text-sm font-semibold text-red-700">Please fix these issues before submitting:</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {allErrors.map((e) => (
                  <li key={e} className="text-xs text-red-700">{e}</li>
                ))}
              </ul>
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <span className="text-xs text-red-700">{submitError}</span>
            </div>
          )}

          {/* Basic info summary */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-gray-500">SO Number</span>
              <span className="font-medium">{soNumber || '—'}</span>
              <span className="text-gray-500">Customer</span>
              <span className="font-medium">{customerName || '—'}</span>
              <span className="text-gray-500">Delivery Date</span>
              <span className="font-medium">{deliveryDate || '—'}</span>
              <span className="text-gray-500">Location</span>
              <span className="font-medium capitalize">{manufacturingLocation.replace('_', ' ')}</span>
              <span className="text-gray-500">Medical Items</span>
              <span className="font-medium capitalize">{medicalItems.replace('_', ' ')}</span>
              {notes && (
                <>
                  <span className="text-gray-500">Notes</span>
                  <span className="font-medium">{notes}</span>
                </>
              )}
            </div>
          </Card>

          {/* Documents summary */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Documents ({documents.length})</h3>
            <div className="space-y-2">
              {documents.map((doc, i) => (
                <div key={doc.id} className="flex items-center gap-2 text-sm">
                  <FileText size={14} className="text-gray-400 shrink-0" />
                  <span className="text-gray-600">{DOCUMENT_TYPE_OPTIONS.find((o) => o.value === doc.document_type)?.label}</span>
                  <span className="text-gray-900 font-medium">{doc.file_name || `(doc ${i + 1} — no filename)`}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Vehicle lines summary */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Vehicle Lines ({lines.length})</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs font-semibold text-gray-600">#</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-600">Type</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-600">Description</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-600">Qty</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-600">Total (SAR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((l, i) => (
                  <tr key={l.id}>
                    <td className="py-2 text-gray-500">{i + 1}</td>
                    <td className="py-2">{l.vehicle_type || '—'}</td>
                    <td className="py-2 text-gray-600">{l.description || '—'}</td>
                    <td className="py-2 text-right">{l.quantity}</td>
                    <td className="py-2 text-right font-semibold">{formatSAR(l.quantity * l.unit_sales_value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={4} className="pt-2 text-right text-sm font-semibold text-gray-700">Total</td>
                  <td className="pt-2 text-right text-base font-bold text-gray-900">SAR {formatSAR(totalValue)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(2)} icon={<ChevronLeft size={16} />} disabled={submitting}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => handleSave(false)}
                disabled={submitting || allErrors.length > 0}
                loading={submitting}
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={submitting || allErrors.length > 0}
                loading={submitting}
                icon={!submitting ? <Check size={16} /> : undefined}
              >
                Submit for Approval
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
