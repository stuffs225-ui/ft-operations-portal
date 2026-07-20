import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, ChevronRight, ChevronLeft, Check, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { recordFactoryEvent } from '../lib/factoryAudit';
import { MOCK_PROJECTS } from '../data/mockProjects';
import type { RawMaterialRequestType, Project } from '../types';

const STEPS = ['Request Type', 'Linkage', 'File Upload', 'Review & Submit'];

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              i < current
                ? 'bg-green-100 text-green-700'
                : i === current
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <span>{i + 1}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < steps.length - 1 && <div className="w-8 h-px bg-gray-200 mx-1" />}
        </div>
      ))}
    </div>
  );
}

export function FactoryRawMaterialRequestNew() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [requestType, setRequestType] = useState<RawMaterialRequestType | null>(null);
  const [projectId, setProjectId] = useState('');
  const [vehicleLine, setVehicleLine] = useState('');
  const [remarks, setRemarks] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('excel_bom');
  const [fileRemarks, setFileRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [devSuccess, setDevSuccess] = useState('');
  const [saudiProjects, setSaudiProjects] = useState<Project[]>([]);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setSaudiProjects(
          MOCK_PROJECTS.filter(
            (p) => p.project_status === 'approved' && p.manufacturing_location === 'saudi',
          ),
        );
        return;
      }
      const { data } = await supabase
        .from('projects')
        .select('id, project_code, so_number, customer_name, project_status, manufacturing_location, customer_delivery_date, updated_at, created_at')
        .eq('manufacturing_location', 'saudi')
        .eq('project_status', 'approved')
        .order('project_code');
      setSaudiProjects((data as unknown as Project[]) ?? []);
    })();
  }, []);

  function handleSubmit(action: 'draft' | 'submit' | 'procurement') {
    setSubmitting(true);
    setSubmitError(null);
    setDevSuccess('');

    if (!isSupabaseConfigured || !supabase) {
      const actionLabels = { draft: 'saved as Draft', submit: 'submitted', procurement: 'sent to Procurement' };
      setDevSuccess(`Dev mode — RMR ${actionLabels[action]} recorded (not persisted)`);
      setSubmitting(false);
      setTimeout(() => {
        navigate('/factory/raw-material-requests');
      }, 1500);
      return;
    }

    const statusMap = { draft: 'draft', submit: 'submitted', procurement: 'sent_to_procurement' };
    const now = new Date().toISOString();
    const reqNumber = `RMR-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;

    const newRmr = {
      project_id: requestType === 'project_related' && projectId ? projectId : null,
      request_type: requestType,
      request_number: reqNumber,
      status: statusMap[action],
      requested_by: user?.id ?? null,
      requested_at: now,
      remarks: remarks || null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.from('production_raw_material_requests').insert(newRmr as any).select().then(({ data, error }) => {
      if (error || !data || data.length === 0) {
        setSubmitError(error?.message ?? 'The request could not be created.');
        setSubmitting(false);
        return;
      }
      const insertedId: string = (data[0] as { id: string }).id;

      const insertFileIfNeeded = fileName.trim()
        ? supabase!
            .from('production_raw_material_request_files')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .insert({
              raw_material_request_id: insertedId,
              file_name: fileName,
              file_type: fileType,
              remarks: fileRemarks || null,
              uploaded_by: user?.id ?? null,
              uploaded_at: now,
              parsing_status: 'pending_future_parser',
            } as any)
            .then(() => undefined)
        : Promise.resolve();

      insertFileIfNeeded.then(() => {
        recordFactoryEvent(
          'raw_material_request',
          insertedId,
          requestType === 'project_related' ? projectId : null,
          `rmr_${action}`,
          `RMR ${reqNumber} ${action}`,
          user?.id ?? null,
        );
        setSubmitting(false);
        navigate('/factory/raw-material-requests');
      });
    });
  }

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="New Raw Material Request"
        subtitle="Create a project-related or stock raw material request"
        icon={<Package size={18} />}
        breadcrumb={[
          { label: 'Factory', path: '/factory' },
          { label: 'Raw Material Requests', path: '/factory/raw-material-requests' },
          { label: 'New Request' },
        ]}
      />

      {!isSupabaseConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800">
          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
          Dev mode — request will not be persisted.
        </div>
      )}

      <Card className="p-6 max-w-2xl">
        <StepIndicator steps={STEPS} current={step} />

        {devSuccess && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 mb-4">
            <CheckCircle2 size={14} className="text-green-600" />
            {devSuccess}
          </div>
        )}

        {/* Step 0 — Request Type */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-800 mb-4">Select Request Type</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Project-Related */}
              <button
                onClick={() => setRequestType('project_related')}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  requestType === 'project_related'
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                    <Package size={16} className="text-brand-700" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Project-Related</span>
                  {requestType === 'project_related' && (
                    <Check size={14} className="ml-auto text-brand-600" />
                  )}
                </div>
                <p className="text-xs text-gray-500">Linked to a Saudi project and WO</p>
              </button>

              {/* Stock Request */}
              <button
                onClick={() => setRequestType('stock')}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  requestType === 'stock'
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package size={16} className="text-gray-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Stock Request</span>
                  {requestType === 'stock' && (
                    <Check size={14} className="ml-auto text-brand-600" />
                  )}
                </div>
                <p className="text-xs text-gray-500">General workshop consumables — no project required</p>
              </button>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                disabled={!requestType}
                onClick={() => setStep(1)}
                icon={<ChevronRight size={14} />}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 1 — Linkage */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-800 mb-4">Linkage</p>

            {requestType === 'project_related' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select a project…</option>
                    {saudiProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_code} — {p.customer_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Vehicle Line (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Line 1 — ARFF Cat 7"
                    value={vehicleLine}
                    onChange={(e) => setVehicleLine(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Remarks</label>
                  <textarea
                    rows={3}
                    placeholder="Additional notes about this request…"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4">
                  <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-sky-800">
                    Stock request — no project linkage required.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Remarks</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the items needed…"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={() => setStep(0)} icon={<ChevronLeft size={14} />}>
                Back
              </Button>
              <Button onClick={() => setStep(2)} icon={<ChevronRight size={14} />}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — File Upload */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-800 mb-4">File Upload (Optional)</p>

            <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4">
              <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-800">
                Future BOQ/BOM Excel parser ready — uploaded files will be parsed automatically in a future release.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                File name (e.g. BOM-ARFF-CAT7.xlsx)
              </label>
              <input
                type="text"
                placeholder="BOM-ARFF-CAT7.xlsx"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">File Type</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="excel_bom">Excel — Bill of Materials (BOM)</option>
                <option value="excel_boq">Excel — Bill of Quantities (BOQ)</option>
                <option value="pdf_specification">PDF — Specification</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">File Remarks</label>
              <textarea
                rows={2}
                placeholder="Notes about this file…"
                value={fileRemarks}
                onChange={(e) => setFileRemarks(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={() => setStep(1)} icon={<ChevronLeft size={14} />}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} icon={<ChevronRight size={14} />}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Review & Submit */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-800 mb-4">Review & Submit</p>

            <Card className="p-4 bg-gray-50 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-500">Request Type</p>
                  <p className="font-medium text-gray-900 mt-0.5 capitalize">
                    {requestType === 'project_related' ? 'Project-Related' : 'Stock Request'}
                  </p>
                </div>
                {requestType === 'project_related' && projectId && (
                  <div>
                    <p className="text-gray-500">Project</p>
                    <p className="font-mono font-medium text-gray-900 mt-0.5">
                      {saudiProjects.find((p) => p.id === projectId)?.project_code ?? projectId}
                    </p>
                  </div>
                )}
                {vehicleLine && (
                  <div>
                    <p className="text-gray-500">Vehicle Line</p>
                    <p className="font-medium text-gray-900 mt-0.5">{vehicleLine}</p>
                  </div>
                )}
                {fileName && (
                  <div>
                    <p className="text-gray-500">File</p>
                    <p className="font-medium text-gray-900 mt-0.5">{fileName}</p>
                  </div>
                )}
                {remarks && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Remarks</p>
                    <p className="text-gray-700 mt-0.5">{remarks}</p>
                  </div>
                )}
              </div>
            </Card>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 mt-4">
                {submitError}
              </div>
            )}
            <div className="flex flex-wrap gap-3 justify-between mt-6">
              <Button variant="secondary" onClick={() => setStep(2)} icon={<ChevronLeft size={14} />}>
                Back
              </Button>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  loading={submitting}
                  onClick={() => handleSubmit('draft')}
                >
                  Save as Draft
                </Button>
                <Button
                  variant="outline"
                  loading={submitting}
                  onClick={() => handleSubmit('submit')}
                >
                  Submit
                </Button>
                <Button
                  variant="primary"
                  loading={submitting}
                  onClick={() => handleSubmit('procurement')}
                  icon={<Package size={14} />}
                >
                  Send to Procurement
                </Button>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-2">
              "Send to Procurement" will mark this RMR as sent directly to the procurement team.
            </p>
          </div>
        )}
      </Card>

      <div className="text-xs text-gray-400">
        <Link to="/factory/raw-material-requests" className="hover:text-gray-600 underline">
          Cancel and return to Raw Material Requests
        </Link>
      </div>
    </div>
  );
}
