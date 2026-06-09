import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Flame, ArrowLeft, Save, Loader2, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { HotProject, HotProjectStage } from '../types';

function formatSAR(v: number | null) {
  if (v == null) return '—';
  return 'SAR ' + v.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STAGE_CONFIG: Record<HotProjectStage, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  lead:                { label: 'Lead',                variant: 'neutral'  },
  qualified:           { label: 'Qualified',           variant: 'info'     },
  proposal_required:   { label: 'Proposal Required',   variant: 'warning'  },
  quotation_requested: { label: 'QTN Requested',       variant: 'default'  },
  negotiation:         { label: 'Negotiation',         variant: 'warning'  },
  won:                 { label: 'Won',                 variant: 'success'  },
  lost:                { label: 'Lost',                variant: 'critical' },
  cancelled:           { label: 'Cancelled',           variant: 'neutral'  },
};

const EDITABLE_STAGES: HotProjectStage[] = ['lead', 'qualified', 'proposal_required', 'quotation_requested', 'negotiation'];
const ALL_STAGES: { value: HotProjectStage; label: string }[] = Object.entries(STAGE_CONFIG).map(([v, c]) => ({ value: v as HotProjectStage, label: c.label }));

const inputCls = 'w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30';

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

export function HotProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const [record, setRecord] = useState<HotProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<HotProject>>({});

  useEffect(() => {
    if (!id || !isSupabaseConfigured) return;
    setLoading(true);
    supabase!
      .from('hot_projects')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else { setRecord(data as HotProject); setForm(data as HotProject); }
        setLoading(false);
      });
  }, [id]);

  const canEdit =
    record != null &&
    (role === 'admin' || role === 'operations_manager' || EDITABLE_STAGES.includes(record.stage));

  async function handleSave() {
    if (!record || !isSupabaseConfigured) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase!
      .from('hot_projects')
      .update({
        title: form.title,
        customer_name: form.customer_name,
        customer_contact_name: form.customer_contact_name ?? null,
        customer_email: form.customer_email ?? null,
        customer_phone: form.customer_phone ?? null,
        opportunity_source: form.opportunity_source ?? null,
        stage: form.stage,
        probability: form.probability,
        estimated_value: form.estimated_value ?? null,
        expected_close_date: form.expected_close_date ?? null,
        notes: form.notes ?? null,
        lost_reason: form.lost_reason ?? null,
      })
      .eq('id', record.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setRecord({ ...record, ...form } as HotProject);
    setEditing(false);
    setSuccessMsg('Changes saved.');
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-4">
        <PageHeader title="Hot Project" icon={<Flame className="text-brand-600" size={22} />} action={<Link to="/hot-projects"><Button variant="secondary" icon={<ArrowLeft size={14} />} size="sm">Back</Button></Link>} />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Supabase is not configured.</div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-24 text-gray-400"><Loader2 size={24} className="animate-spin" /></div>;
  }

  if (!record) {
    return (
      <div className="space-y-4">
        <PageHeader title="Hot Project" icon={<Flame className="text-brand-600" size={22} />} action={<Link to="/hot-projects"><Button variant="secondary" icon={<ArrowLeft size={14} />} size="sm">Back</Button></Link>} />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error ?? 'Record not found.'}</div>
      </div>
    );
  }

  const stageCfg = STAGE_CONFIG[record.stage] ?? { label: record.stage, variant: 'neutral' as const };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={record.title}
        subtitle={`${record.hot_project_code} · ${record.customer_name}`}
        icon={<Flame className="text-brand-600" size={22} />}
        action={
          <div className="flex gap-2 items-center">
            <Badge variant={stageCfg.variant}>{stageCfg.label}</Badge>
            <Link to="/hot-projects">
              <Button variant="secondary" icon={<ArrowLeft size={14} />} size="sm">Back</Button>
            </Link>
            {canEdit && !editing && (
              <Button size="sm" onClick={() => setEditing(true)}>Edit</Button>
            )}
            {editing && (
              <>
                <Button variant="secondary" size="sm" onClick={() => { setEditing(false); setForm(record); }}>Cancel</Button>
                <Button size="sm" disabled={saving} icon={saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} onClick={() => void handleSave()}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </>
            )}
          </div>
        }
      />

      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{successMsg}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Opportunity</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Stage">
                {editing ? (
                  <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as HotProjectStage }))} className={inputCls}>
                    {ALL_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                ) : (
                  <Badge variant={stageCfg.variant} size="sm">{stageCfg.label}</Badge>
                )}
              </InfoField>
              <InfoField label="Probability">
                {editing ? (
                  <input type="number" min={0} max={100} value={form.probability ?? 0} onChange={(e) => setForm((f) => ({ ...f, probability: parseInt(e.target.value) || 0 }))} className={inputCls} />
                ) : `${record.probability}%`}
              </InfoField>
              <InfoField label="Estimated Value">
                {editing ? (
                  <input type="number" min={0} step="0.01" value={form.estimated_value ?? ''} onChange={(e) => setForm((f) => ({ ...f, estimated_value: e.target.value ? parseFloat(e.target.value) : null }))} className={inputCls} />
                ) : formatSAR(record.estimated_value)}
              </InfoField>
              <InfoField label="Expected Close">
                {editing ? (
                  <input type="date" value={form.expected_close_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, expected_close_date: e.target.value || null }))} className={inputCls} />
                ) : formatDate(record.expected_close_date)}
              </InfoField>
              <InfoField label="Source">
                {editing ? (
                  <input value={form.opportunity_source ?? ''} onChange={(e) => setForm((f) => ({ ...f, opportunity_source: e.target.value || null }))} className={inputCls} />
                ) : record.opportunity_source ?? '—'}
              </InfoField>
              <InfoField label="Created">{formatDate(record.created_at)}</InfoField>
            </div>

            {(editing ? form.stage === 'lost' : record.stage === 'lost') && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Lost Reason</div>
                {editing ? (
                  <textarea value={form.lost_reason ?? ''} onChange={(e) => setForm((f) => ({ ...f, lost_reason: e.target.value || null }))} rows={2} className="w-full border border-gray-200 rounded px-2 py-1 text-sm resize-none" />
                ) : <p className="text-sm text-gray-600">{record.lost_reason ?? '—'}</p>}
              </div>
            )}

            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Notes</div>
              {editing ? (
                <textarea value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))} rows={3} className="w-full border border-gray-200 rounded px-2 py-1 text-sm resize-none" />
              ) : <p className="text-sm text-gray-600">{record.notes ?? '—'}</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Customer</h3>
            <InfoField label="Name">
              {editing ? <input value={form.customer_name ?? ''} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} className={inputCls} /> : record.customer_name}
            </InfoField>
            <InfoField label="Contact">
              {editing ? <input value={form.customer_contact_name ?? ''} onChange={(e) => setForm((f) => ({ ...f, customer_contact_name: e.target.value || null }))} className={inputCls} /> : record.customer_contact_name ?? '—'}
            </InfoField>
            <InfoField label="Email">
              {editing ? <input type="email" value={form.customer_email ?? ''} onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value || null }))} className={inputCls} /> : record.customer_email ?? '—'}
            </InfoField>
            <InfoField label="Phone">
              {editing ? <input value={form.customer_phone ?? ''} onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value || null }))} className={inputCls} /> : record.customer_phone ?? '—'}
            </InfoField>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Links</h3>
            {record.linked_quotation_id ? (
              <Link to={`/quotations/${record.linked_quotation_id}`} className="flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
                <ExternalLink size={13} /> Linked Quotation
              </Link>
            ) : (
              <Link to={`/quotations/new?hot_project_id=${record.id}`} className="text-sm text-gray-500 hover:text-brand-600">
                + Request Quotation
              </Link>
            )}
            {record.linked_project_id && (
              <Link to={`/projects/${record.linked_project_id}`} className="flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
                <ExternalLink size={13} /> Linked SO / Project
              </Link>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
