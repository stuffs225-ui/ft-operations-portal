import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, Plus, Trash2, Wand2, Info } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { extractPlaceholders } from '../lib/templateRender';
import type {
  TemplateType, TemplateFormat, TemplateVisibilityScope, TemplateFieldType,
} from '../types';

const TEMPLATE_TYPES: TemplateType[] = [
  'letter', 'report', 'form', 'checklist', 'pdf_template',
  'word_template', 'email_template', 'operational', 'other',
];
const TEMPLATE_FORMATS: TemplateFormat[] = [
  'rich_text', 'plain_text', 'html', 'file', 'pdf', 'docx', 'other',
];
const VISIBILITY_SCOPES: TemplateVisibilityScope[] = ['department', 'all_departments', 'admin_only'];
const FIELD_TYPES: TemplateFieldType[] = [
  'text', 'number', 'date', 'email', 'phone', 'dropdown', 'textarea',
  'project_selector', 'customer_selector', 'vehicle_selector', 'employee_selector',
];

interface DraftField {
  field_key: string;
  field_label: string;
  field_type: TemplateFieldType;
  is_required: boolean;
}

export function TemplateNew() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [name, setName] = useState('');
  const [type, setType] = useState<TemplateType>('letter');
  const [department, setDepartment] = useState(profile?.department ?? '');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<TemplateFormat>('plain_text');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<TemplateVisibilityScope>('department');
  const [fields, setFields] = useState<DraftField[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function addField() {
    setFields((prev) => [...prev, { field_key: '', field_label: '', field_type: 'text', is_required: false }]);
  }

  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateField(idx: number, patch: Partial<DraftField>) {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  function detectPlaceholders() {
    const keys = extractPlaceholders(body);
    setFields((prev) => {
      const existing = new Set(prev.map((f) => f.field_key));
      const added: DraftField[] = keys
        .filter((k) => !existing.has(k))
        .map((k) => ({
          field_key: k,
          field_label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          field_type: 'text' as TemplateFieldType,
          is_required: true,
        }));
      return [...prev, ...added];
    });
  }

  async function handleSubmit(submitForApproval: boolean) {
    setError(null);
    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }
    if (!body.trim()) {
      setError('Template body is required.');
      return;
    }
    setSaving(true);

    const approvalStatus = submitForApproval ? 'submitted_for_approval' : 'draft';
    const now = new Date().toISOString();

    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 400));
      setSaving(false);
      setMsg('Dev mode — changes not persisted');
      setTimeout(() => navigate('/templates'), 800);
      return;
    }

    const { data, error: insertErr } = await supabase
      .from('document_templates')
      .insert({
        template_code: `TPL-${Date.now()}`,
        template_name: name.trim(),
        template_type: type,
        department: department.trim() || null,
        description: description.trim() || null,
        template_format: format,
        template_body: body,
        visibility_scope: visibility,
        approval_status: approvalStatus,
        submitted_by: submitForApproval ? profile?.id ?? null : null,
        submitted_at: submitForApproval ? now : null,
      })
      .select('id')
      .single();

    if (insertErr || !data) {
      setError(insertErr?.message ?? 'Failed to create template');
      setSaving(false);
      return;
    }

    const templateId = (data as unknown as { id: string }).id;
    if (fields.length > 0) {
      const { error: fieldsErr } = await supabase.from('template_fields').insert(
        fields.map((f, i) => ({
          template_id: templateId,
          field_key: f.field_key,
          field_label: f.field_label,
          field_type: f.field_type,
          is_required: f.is_required,
          display_order: i + 1,
        })),
      );
      if (fieldsErr) {
        setError(fieldsErr.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    navigate('/templates');
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="New Template"
        subtitle="Create a document template with fillable fields"
        icon={<FileText size={18} />}
        breadcrumb={[{ label: 'Templates', path: '/templates' }, { label: 'New Template' }]}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}
      {msg && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">{msg}</div>
      )}

      <Card>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as TemplateType)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                {TEMPLATE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value as TemplateFormat)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                {TEMPLATE_FORMATS.map((f) => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as TemplateVisibilityScope)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                {VISIBILITY_SCOPES.map((v) => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Body <span className="text-red-500">*</span></label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8}
              placeholder="Use {{field_key}} for fillable placeholders, e.g. Dear {{recipient_name}}…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-300" />
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <Info size={12} /> Insert placeholders using <code className="font-mono">{'{{field_key}}'}</code> syntax.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Fields</h3>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={detectPlaceholders}>
                <Wand2 size={14} className="mr-1" /> Detect placeholders from body
              </Button>
              <Button variant="secondary" size="sm" onClick={addField}>
                <Plus size={14} className="mr-1" /> Add Field
              </Button>
            </div>
          </div>

          {fields.length === 0 ? (
            <p className="text-sm text-gray-400">No fields yet. Add fields manually or detect them from the body.</p>
          ) : (
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input type="text" value={f.field_key} onChange={(e) => updateField(idx, { field_key: e.target.value })}
                    placeholder="field_key"
                    className="col-span-3 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-300" />
                  <input type="text" value={f.field_label} onChange={(e) => updateField(idx, { field_label: e.target.value })}
                    placeholder="Field Label"
                    className="col-span-3 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                  <select value={f.field_type} onChange={(e) => updateField(idx, { field_type: e.target.value as TemplateFieldType })}
                    className="col-span-3 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                  <label className="col-span-2 flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="checkbox" checked={f.is_required} onChange={(e) => updateField(idx, { is_required: e.target.checked })} />
                    Required
                  </label>
                  <button onClick={() => removeField(idx)} className="col-span-1 text-red-400 hover:text-red-600 justify-self-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Link to="/templates" className="text-sm text-gray-400 hover:text-gray-600">← Back to templates</Link>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleSubmit(false)} loading={saving}>Save as Draft</Button>
          <Button variant="primary" size="sm" onClick={() => handleSubmit(true)} loading={saving}>Submit for Approval</Button>
        </div>
      </div>
    </div>
  );
}
