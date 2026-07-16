import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { nextDocNumber, insertWithDocNumberRetry } from '../lib/docNumbers';
import { MOCK_PROJECTS } from '../data/mockProjects';
import type { MaintenanceIssueType, MaintenancePriority, Project } from '../types';

const ISSUE_TYPES: MaintenanceIssueType[] = ['mechanical', 'electrical', 'body_damage', 'software', 'upholstery', 'other'];
const PRIORITIES: MaintenancePriority[] = ['low', 'medium', 'high', 'critical'];

export function AfterSalesMaintenanceNew() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [devMessage, setDevMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Pick<Project, 'id' | 'project_code' | 'customer_name' | 'project_status'>[]>([]);

  // Step 1 — Basic Info
  const [customerName, setCustomerName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [title, setTitle] = useState('');
  const [issueType, setIssueType] = useState<MaintenanceIssueType>('other');
  const [priority, setPriority] = useState<MaintenancePriority>('medium');
  const [reportedDate, setReportedDate] = useState(new Date().toISOString().split('T')[0]);

  // Step 2 — Description
  const [description, setDescription] = useState('');
  const [woReference, setWoReference] = useState('');
  const [pnReference, setPnReference] = useState('');

  // Step 3 — Parts
  const [partsRequired, setPartsRequired] = useState(false);
  const [partsNotes, setPartsNotes] = useState('');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setProjects(MOCK_PROJECTS.filter(p => ['approved', 'active', 'completed'].includes(p.project_status)));
        return;
      }
      const { data } = await supabase
        .from('projects')
        .select('id, project_code, customer_name, project_status')
        .in('project_status', ['approved', 'active', 'completed'])
        .order('project_code');
      setProjects((data ?? []) as Pick<Project, 'id' | 'project_code' | 'customer_name' | 'project_status'>[]);
    })();
  }, []);

  const canProceedStep1 = customerName.trim() && title.trim() && reportedDate;
  const canProceedStep2 = description.trim();
  const canSubmit = canProceedStep1 && canProceedStep2;

  async function handleSubmit() {
    if (!canSubmit) { setFormError('Please fill in all required fields.'); return; }
    setFormError(null);
    if (!isSupabaseConfigured || !supabase) {
      setDevMessage('Dev Mode — maintenance request not persisted.');
      setTimeout(() => { navigate('/after-sales/maintenance'); }, 1500);
      return;
    }
    setSaving(true);
    const sb = supabase;
    const year = new Date().getFullYear();
    // Number is MAX+1 within the current year (not an all-time count, which broke
    // on year rollover) and retried once on a unique-violation race. Migration 114
    // adds the definitive server-side trigger; this is the correct prefill either way.
    const { error } = await insertWithDocNumberRetry(
      () => nextDocNumber({
        table: 'afs_maintenance_requests',
        column: 'maintenance_request_number',
        prefix: `MNT-${year}-`,
      }),
      (requestNumber) => sb.from('afs_maintenance_requests').insert({
        maintenance_request_number: requestNumber,
        customer_name: customerName,
        project_id: projectId || null,
        chassis_number: chassisNumber || null,
        title,
        issue_type: issueType,
        priority,
        reported_date: reportedDate,
        description,
        wo_reference: woReference || null,
        pn_reference: pnReference || null,
        parts_required: partsRequired,
        parts_notes: partsNotes || null,
        maintenance_status: 'open',
        created_by: profile?.id ?? null,
      }).select('id').single(),
    );
    setSaving(false);
    if (error) {
      setFormError('Failed to submit request. Please try again.');
      return;
    }
    navigate('/after-sales/maintenance');
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title="New Maintenance Request"
        subtitle="Log an after-sales maintenance or repair issue"
        breadcrumb={[{ label: 'After Sales', href: '/after-sales' }, { label: 'Maintenance Requests', href: '/after-sales/maintenance' }, { label: 'New Request' }]}
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${step > s ? 'bg-green-500 text-white' : step === s ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {step > s ? <Check size={12} /> : s}
            </div>
            {s < 4 && <div className={`h-0.5 w-8 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {step === 1 ? 'Basic Info' : step === 2 ? 'Description' : step === 3 ? 'Parts & References' : 'Review & Submit'}
        </span>
      </div>

      {devMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">{devMessage}</div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Step 1 — Basic Information</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name <span className="text-red-500">*</span></label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Request Title <span className="text-red-500">*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Linked Project (Optional)</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                <option value="">— None —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.project_code} — {p.customer_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Chassis Number</label>
              <input value={chassisNumber} onChange={e => setChassisNumber(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issue Type <span className="text-red-500">*</span></label>
              <select value={issueType} onChange={e => setIssueType(e.target.value as MaintenanceIssueType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                {ISSUE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority <span className="text-red-500">*</span></label>
              <select value={priority} onChange={e => setPriority(e.target.value as MaintenancePriority)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reported Date <span className="text-red-500">*</span></label>
              <input type="date" value={reportedDate} onChange={e => setReportedDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setStep(2)} disabled={!canProceedStep1}>
              Next <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Step 2 — Issue Description</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Detailed Description <span className="text-red-500">*</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Describe the issue in detail…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
          </div>
          <div className="flex gap-2 justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}><ArrowLeft size={14} className="mr-1" /> Back</Button>
            <Button variant="primary" size="sm" onClick={() => setStep(3)} disabled={!canProceedStep2}>
              Next <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Step 3 — References & Parts</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">WO Reference</label>
              <input value={woReference} onChange={e => setWoReference(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">PN Reference</label>
              <input value={pnReference} onChange={e => setPnReference(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="parts_req" checked={partsRequired} onChange={e => setPartsRequired(e.target.checked)} />
              <label htmlFor="parts_req" className="text-sm text-gray-700">Parts Required</label>
            </div>
            {partsRequired && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Parts Notes</label>
                <textarea value={partsNotes} onChange={e => setPartsNotes(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}><ArrowLeft size={14} className="mr-1" /> Back</Button>
            <Button variant="primary" size="sm" onClick={() => setStep(4)}>
              Review <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4 — Review */}
      {step === 4 && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Step 4 — Review & Submit</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{customerName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Title</span><span>{title}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Issue Type</span><span className="capitalize">{issueType.replace(/_/g, ' ')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Priority</span><span className="capitalize">{priority}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Reported Date</span><span>{new Date(reportedDate).toLocaleDateString('en-GB')}</span></div>
            {chassisNumber && <div className="flex justify-between"><span className="text-gray-500">Chassis No.</span><span>{chassisNumber}</span></div>}
            {woReference && <div className="flex justify-between"><span className="text-gray-500">WO Reference</span><span>{woReference}</span></div>}
            {pnReference && <div className="flex justify-between"><span className="text-gray-500">PN Reference</span><span>{pnReference}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Parts Required</span><span>{partsRequired ? 'Yes' : 'No'}</span></div>
          </div>
          {!isSupabaseConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700">
              Dev Mode — request will not be persisted to database.
            </div>
          )}
          {formError && <p className="text-xs text-red-600 text-right">{formError}</p>}
          <div className="flex gap-2 justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(3)}><ArrowLeft size={14} className="mr-1" /> Back</Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!canSubmit || saving}>
              <Check size={14} className="mr-1" /> Submit Request
            </Button>
          </div>
        </Card>
      )}

      {profile && (
        <p className="text-xs text-gray-400">Submitting as {profile.full_name ?? profile.email}</p>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link to="/after-sales/maintenance" className="hover:text-gray-600">← Back to maintenance list</Link>
      </div>
    </div>
  );
}
