import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flame, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { HotProjectStage } from '../types';

const STAGES: { value: HotProjectStage; label: string }[] = [
  { value: 'lead',                label: 'Lead'               },
  { value: 'qualified',           label: 'Qualified'          },
  { value: 'proposal_required',   label: 'Proposal Required'  },
  { value: 'quotation_requested', label: 'Quotation Requested'},
  { value: 'negotiation',         label: 'Negotiation'        },
];

interface FormState {
  title: string;
  customer_name: string;
  customer_contact_name: string;
  customer_email: string;
  customer_phone: string;
  opportunity_source: string;
  stage: HotProjectStage;
  probability: number;
  estimated_value: string;
  expected_close_date: string;
  notes: string;
}

const EMPTY: FormState = {
  title: '',
  customer_name: '',
  customer_contact_name: '',
  customer_email: '',
  customer_phone: '',
  opportunity_source: '',
  stage: 'lead',
  probability: 50,
  estimated_value: '',
  expected_close_date: '',
  notes: '',
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30';

export function HotProjectNew() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) return;
    if (!form.title.trim() || !form.customer_name.trim()) {
      setError('Title and customer name are required.');
      return;
    }
    setSaving(true);
    setError(null);

    const { data, error: err } = await supabase!
      .from('hot_projects')
      .insert({
        title: form.title.trim(),
        customer_name: form.customer_name.trim(),
        customer_contact_name: form.customer_contact_name.trim() || null,
        customer_email: form.customer_email.trim() || null,
        customer_phone: form.customer_phone.trim() || null,
        opportunity_source: form.opportunity_source.trim() || null,
        stage: form.stage,
        probability: form.probability,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        expected_close_date: form.expected_close_date || null,
        notes: form.notes.trim() || null,
        sales_owner_id: profile?.id ?? null,
        created_by: profile?.id ?? null,
      })
      .select('id')
      .single();

    setSaving(false);
    if (err) { setError(err.message); return; }
    void navigate(`/hot-projects/${data.id}`);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="New Opportunity"
        subtitle="Add a hot project to the pipeline"
        icon={<Flame className="text-brand-600" size={22} />}
        action={
          <Link to="/hot-projects">
            <Button variant="secondary" icon={<ArrowLeft size={14} />} size="sm">Back</Button>
          </Link>
        }
      />

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Opportunity Details</h3>

          <Field label="Title" required>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} required className={inputCls} placeholder="e.g. SRCA Fire Truck Fleet 2026" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Stage">
              <select value={form.stage} onChange={(e) => set('stage', e.target.value as HotProjectStage)} className={inputCls}>
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Win Probability (%)">
              <input type="number" min={0} max={100} value={form.probability} onChange={(e) => set('probability', parseInt(e.target.value) || 0)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Estimated Value (SAR)">
              <input type="number" min={0} step="0.01" value={form.estimated_value} onChange={(e) => set('estimated_value', e.target.value)} className={inputCls} placeholder="0.00" />
            </Field>
            <Field label="Expected Close Date">
              <input type="date" value={form.expected_close_date} onChange={(e) => set('expected_close_date', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Customer Information</h3>

          <Field label="Customer Name" required>
            <input value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} required className={inputCls} placeholder="Organisation name" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Name">
              <input value={form.customer_contact_name} onChange={(e) => set('customer_contact_name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Contact Email">
              <input type="email" value={form.customer_email} onChange={(e) => set('customer_email', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Phone">
              <input value={form.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Opportunity Source">
              <input value={form.opportunity_source} onChange={(e) => set('opportunity_source', e.target.value)} className={inputCls} placeholder="Referral, Tender, etc." />
            </Field>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Notes</h3>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/30 resize-none"
            placeholder="Internal notes, next steps, key requirements…"
          />
        </Card>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {!isSupabaseConfigured && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Supabase is not configured — this form will not save.
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link to="/hot-projects">
            <Button variant="secondary" size="sm">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving || !isSupabaseConfigured} icon={saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} size="sm">
            {saving ? 'Saving…' : 'Create Opportunity'}
          </Button>
        </div>
      </form>
    </div>
  );
}
