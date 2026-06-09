import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ReceiptText, ArrowLeft, Plus, Save, Loader2, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ProjectInvoicingPlan, ProjectInvoiceMilestone, MilestoneStatus } from '../types';

interface ProjectMeta {
  id: string;
  project_code: string;
  customer_name: string;
  so_number: string;
  total_sales_value: number;
}

function formatSAR(v: number | null | undefined) {
  if (v == null) return '—';
  return 'SAR ' + v.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MILESTONE_STATUS_CONFIG: Record<MilestoneStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  planned:          { label: 'Planned',          variant: 'neutral'  },
  ready_to_invoice: { label: 'Ready to Invoice', variant: 'info'     },
  submitted:        { label: 'Invoice Sent',     variant: 'default'  },
  approved:         { label: 'Approved',         variant: 'success'  },
  paid:             { label: 'Paid',             variant: 'success'  },
  overdue:          { label: 'Overdue',          variant: 'critical' },
  cancelled:        { label: 'Cancelled',        variant: 'neutral'  },
};

const NEXT_STATUS: Partial<Record<MilestoneStatus, MilestoneStatus>> = {
  planned:          'ready_to_invoice',
  ready_to_invoice: 'submitted',
  submitted:        'approved',
  approved:         'paid',
};

const CAN_EDIT_ROLES = ['admin', 'operations_manager', 'sales_user'] as const;
type CanEditRole = typeof CAN_EDIT_ROLES[number];

export function ProjectInvoicing() {
  const { projectId } = useParams<{ projectId: string }>();
  const { role } = useAuth();
  const canEdit = CAN_EDIT_ROLES.includes(role as CanEditRole);

  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [plan, setPlan] = useState<ProjectInvoicingPlan | null>(null);
  const [milestones, setMilestones] = useState<ProjectInvoiceMilestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [contractValue, setContractValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [newMs, setNewMs] = useState({ name: '', amount: '', due_date: '', percentage: '' });
  const [savingMs, setSavingMs] = useState(false);

  async function loadData() {
    if (!projectId || !isSupabaseConfigured) return;
    setLoading(true);
    const [projRes, planRes] = await Promise.all([
      supabase!.from('projects').select('id,project_code,customer_name,so_number,total_sales_value').eq('id', projectId).single(),
      supabase!.from('project_invoicing_plans').select('*').eq('project_id', projectId).maybeSingle(),
    ]);
    if (projRes.error) setError(projRes.error.message);
    else setProject(projRes.data as ProjectMeta);

    if (planRes.data) {
      const p = planRes.data as ProjectInvoicingPlan;
      setPlan(p);
      setContractValue(String(p.total_contract_value));
      const msRes = await supabase!
        .from('project_invoice_milestones')
        .select('*')
        .eq('plan_id', p.id)
        .order('sort_order', { ascending: true });
      if (!msRes.error) setMilestones((msRes.data ?? []) as ProjectInvoiceMilestone[]);
    }
    setLoading(false);
  }

  useEffect(() => { void loadData(); }, [projectId]);

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function createOrUpdatePlan() {
    if (!projectId || !isSupabaseConfigured) return;
    setSavingPlan(true);
    setError(null);
    const cv = parseFloat(contractValue) || 0;

    if (!plan) {
      const { data, error: err } = await supabase!
        .from('project_invoicing_plans')
        .insert({ project_id: projectId, total_contract_value: cv })
        .select('*')
        .single();
      setSavingPlan(false);
      if (err) { setError(err.message); return; }
      setPlan(data as ProjectInvoicingPlan);
      flash('Invoicing plan created.');
    } else {
      const { error: err } = await supabase!
        .from('project_invoicing_plans')
        .update({ total_contract_value: cv })
        .eq('id', plan.id);
      setSavingPlan(false);
      if (err) { setError(err.message); return; }
      setPlan({ ...plan, total_contract_value: cv });
      flash('Plan updated.');
    }
  }

  async function addMilestone() {
    if (!plan || !isSupabaseConfigured) return;
    if (!newMs.name.trim()) { setError('Milestone name is required.'); return; }
    setSavingMs(true);
    setError(null);
    const { data, error: err } = await supabase!
      .from('project_invoice_milestones')
      .insert({
        plan_id: plan.id,
        project_id: projectId!,
        milestone_name: newMs.name.trim(),
        amount: parseFloat(newMs.amount) || 0,
        percentage: newMs.percentage ? parseFloat(newMs.percentage) : null,
        due_date: newMs.due_date || null,
        sort_order: milestones.length,
      })
      .select('*')
      .single();
    setSavingMs(false);
    if (err) { setError(err.message); return; }
    setMilestones((ms) => [...ms, data as ProjectInvoiceMilestone]);
    setNewMs({ name: '', amount: '', due_date: '', percentage: '' });
    setAddingMilestone(false);
  }

  async function advanceStatus(ms: ProjectInvoiceMilestone) {
    const next = NEXT_STATUS[ms.milestone_status];
    if (!next || !isSupabaseConfigured) return;
    const now = new Date().toISOString();
    const patch: { milestone_status: string; submitted_at?: string; approved_at?: string; paid_at?: string } = { milestone_status: next };
    if (next === 'submitted') patch.submitted_at = now;
    if (next === 'approved')  patch.approved_at  = now;
    if (next === 'paid')      patch.paid_at       = now;

    const { error: err } = await supabase!
      .from('project_invoice_milestones')
      .update(patch)
      .eq('id', ms.id);
    if (err) { setError(err.message); return; }
    setMilestones((prev) => prev.map((m) => (m.id === ms.id ? { ...m, ...patch } as ProjectInvoiceMilestone : m)));
  }

  async function deleteMilestone(id: string) {
    if (!isSupabaseConfigured) return;
    if (!window.confirm('Delete this milestone?')) return;
    const { error: err } = await supabase!.from('project_invoice_milestones').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }

  const totalPlanned = milestones.reduce((s, m) => s + m.amount, 0);
  const totalPaid    = milestones.reduce((s, m) => s + (m.paid_amount ?? (m.milestone_status === 'paid' ? m.amount : 0)), 0);
  const totalOutstanding = totalPlanned - totalPaid;

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-4">
        <PageHeader title="Project Invoicing" icon={<ReceiptText className="text-brand-600" size={22} />} action={<Link to={`/projects/${projectId}`}><Button variant="secondary" icon={<ArrowLeft size={14} />} size="sm">Back to Project</Button></Link>} />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Supabase is not configured.</div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-24 text-gray-400"><Loader2 size={24} className="animate-spin" /></div>;
  }

  const inputCls = 'w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoicing Plan"
        subtitle={project ? `${project.project_code} · ${project.customer_name}` : 'Project Invoicing'}
        icon={<ReceiptText className="text-brand-600" size={22} />}
        action={
          <Link to={`/projects/${projectId}`}>
            <Button variant="secondary" icon={<ArrowLeft size={14} />} size="sm">Back to Project</Button>
          </Link>
        }
      />

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Plan header */}
      <Card className="p-5">
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Total Contract Value (SAR)</div>
            {canEdit ? (
              <div className="flex gap-2 items-center">
                <input
                  type="number" min={0} step="0.01"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 w-48"
                  placeholder="0.00"
                />
                <Button size="sm" disabled={savingPlan} icon={savingPlan ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} onClick={() => void createOrUpdatePlan()}>
                  {plan ? 'Update' : 'Create Plan'}
                </Button>
              </div>
            ) : (
              <div className="text-xl font-bold text-gray-900">{formatSAR(plan?.total_contract_value ?? null)}</div>
            )}
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-xs text-gray-500">Milestones Total</div>
              <div className="text-base font-semibold text-gray-800">{formatSAR(totalPlanned)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Paid</div>
              <div className="text-base font-semibold text-emerald-600">{formatSAR(totalPaid)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Outstanding</div>
              <div className="text-base font-semibold text-brand-600">{formatSAR(totalOutstanding)}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Milestones */}
      {!plan ? (
        <EmptyState
          icon={<ReceiptText size={32} className="text-gray-300" />}
          title="No invoicing plan yet"
          description="Set the total contract value above and click 'Create Plan' to start adding milestones."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Milestones ({milestones.length})</h3>
            {canEdit && (
              <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setAddingMilestone((v) => !v)}>
                Add Milestone
              </Button>
            )}
          </div>

          {addingMilestone && (
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Name</label>
                <input value={newMs.name} onChange={(e) => setNewMs((n) => ({ ...n, name: e.target.value }))} className={inputCls} placeholder="e.g. Mobilization" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount (SAR)</label>
                <input type="number" min={0} step="0.01" value={newMs.amount} onChange={(e) => setNewMs((n) => ({ ...n, amount: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">% of Contract</label>
                <input type="number" min={0} max={100} step="0.01" value={newMs.percentage} onChange={(e) => setNewMs((n) => ({ ...n, percentage: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                <input type="date" value={newMs.due_date} onChange={(e) => setNewMs((n) => ({ ...n, due_date: e.target.value }))} className={inputCls} />
              </div>
              <div className="col-span-2 md:col-span-4 flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setAddingMilestone(false)}>Cancel</Button>
                <Button size="sm" disabled={savingMs} icon={savingMs ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} onClick={() => void addMilestone()}>
                  Add
                </Button>
              </div>
            </div>
          )}

          {milestones.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No milestones yet. Add the first one above.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Milestone</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Due Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Invoice #</th>
                  {canEdit && <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {milestones.map((ms) => {
                  const cfg = MILESTONE_STATUS_CONFIG[ms.milestone_status] ?? { label: ms.milestone_status, variant: 'neutral' as const };
                  const nextStatus = NEXT_STATUS[ms.milestone_status];
                  const nextCfg = nextStatus ? MILESTONE_STATUS_CONFIG[nextStatus] : null;
                  return (
                    <tr key={ms.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {ms.milestone_name}
                        {ms.percentage != null && <span className="ml-1 text-xs text-gray-400">({ms.percentage}%)</span>}
                      </td>
                      <td className="px-4 py-3"><Badge variant={cfg.variant} size="sm">{cfg.label}</Badge></td>
                      <td className="px-4 py-3 text-right font-medium">{formatSAR(ms.amount)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(ms.due_date)}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{ms.invoice_number ?? '—'}</td>
                      {canEdit && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            {nextCfg && (
                              <button
                                onClick={() => void advanceStatus(ms)}
                                className="px-2 py-1 text-xs bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors"
                              >
                                {nextCfg.label}
                              </button>
                            )}
                            {ms.milestone_status === 'planned' && (
                              <button onClick={() => void deleteMilestone(ms.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
