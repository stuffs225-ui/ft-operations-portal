import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FilePlus, Download } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getMockTemplate, getMockTemplateFields } from '../data/mockTemplates';
import { renderTemplate, validateRequiredFields, defaultValuesFor } from '../lib/templateRender';
import { downloadTextFile } from '../lib/reportExport';
import type { DocumentTemplate, TemplateField } from '../types';

export function TemplateGenerate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const seed = (tpl: DocumentTemplate, flds: TemplateField[]) => {
      setTemplate(tpl);
      setFields(flds);
      setValues(defaultValuesFor(flds));
      setTitle(`${tpl.template_name} — ${new Date().toISOString().split('T')[0]}`);
      setLoading(false);
    };
    if (!isSupabaseConfigured || !supabase) {
      const tpl = getMockTemplate(id);
      if (!tpl) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      seed(tpl, getMockTemplateFields(id));
      return;
    }
    Promise.all([
      supabase.from('document_templates').select('*').eq('id', id).single(),
      supabase.from('template_fields').select('*').eq('template_id', id).order('display_order', { ascending: true }),
    ]).then(([tplRes, fieldsRes]) => {
      if (tplRes.error || !tplRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      seed(tplRes.data as unknown as DocumentTemplate, (fieldsRes.data as unknown as TemplateField[]) ?? []);
    });
  }, [id]);

  function setValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  const rendered = template ? renderTemplate(template.template_body, values) : '';

  function genNumber(): string {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `GEN-${year}-${rand}`;
  }

  function handleDownload() {
    downloadTextFile(`${title || 'document'}.txt`, rendered, 'text/plain;charset=utf-8');
  }

  async function handleGenerate() {
    setError(null);
    if (!template) return;
    const check = validateRequiredFields(fields, values);
    if (!check.valid) {
      setError(`Please fill required fields: ${check.missing.join(', ')}`);
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const row = {
      template_id: template.id,
      generated_document_number: genNumber(),
      output_title: title.trim() || `${template.template_name} — ${now.split('T')[0]}`,
      filled_values_json: values,
      rendered_content: rendered,
      status: 'generated' as const,
      generated_by: profile?.id ?? null,
      generated_at: now,
    };

    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 400));
      setSaving(false);
      setMsg('Dev mode — changes not persisted');
      setTimeout(() => navigate('/templates/generated'), 800);
      return;
    }
    const { error: insertErr } = await supabase.from('generated_documents').insert(row);
    if (insertErr) {
      setError(insertErr.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    navigate('/templates/generated');
  }

  if (loading) {
    return <div className="px-5 py-10 text-center text-sm text-gray-400">Loading template…</div>;
  }

  if (notFound || !template) {
    return (
      <div className="space-y-5">
        <PageHeader title="Generate Document"
          breadcrumb={[{ label: 'Templates', href: '/templates' }, { label: 'Not found' }]} />
        <EmptyState icon={<FilePlus size={24} className="text-gray-400" />} title="Template not found"
          description="The template you are looking for does not exist."
          action={<Link to="/templates"><Button variant="secondary" size="sm">Back to templates</Button></Link>} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Generate Document"
        subtitle={`${template.template_code} — ${template.template_name}`}
        breadcrumb={[{ label: 'Templates', href: '/templates' }, { label: template.template_code, href: `/templates/${template.id}` }, { label: 'Generate' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download size={14} className="mr-1" /> Download as .txt
            </Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleGenerate}>
              <FilePlus size={14} className="mr-1" /> Generate Document
            </Button>
          </div>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}
      {msg && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">{msg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Output Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            {fields.length === 0 ? (
              <p className="text-sm text-gray-400">This template has no fillable fields.</p>
            ) : (
              fields.map((f) => (
                <FieldInput key={f.id} field={f} value={values[f.field_key] ?? ''} onChange={(v) => setValue(f.field_key, v)} />
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5 space-y-2">
            <h3 className="font-semibold text-gray-700">Live Preview</h3>
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[200px]">
              {rendered}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: TemplateField; value: string; onChange: (v: string) => void }) {
  const label = (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {field.field_label}
      {field.is_required && <span className="text-red-500"> *</span>}
    </label>
  );
  const cls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300';

  if (field.field_type === 'textarea') {
    return (
      <div>
        {label}
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} />
      </div>
    );
  }

  if (field.field_type === 'dropdown') {
    const opts = (field.options_json?.options as string[] | undefined) ?? null;
    if (opts && opts.length > 0) {
      return (
        <div>
          {label}
          <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
            <option value="">Select…</option>
            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div>
        {label}
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      </div>
    );
  }

  if (field.field_type.endsWith('_selector')) {
    return (
      <div>
        {label}
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
        <p className="mt-1 text-xs text-gray-400">type or pick</p>
      </div>
    );
  }

  const inputType =
    field.field_type === 'number' ? 'number'
      : field.field_type === 'date' ? 'date'
        : field.field_type === 'email' ? 'email'
          : field.field_type === 'phone' ? 'tel'
            : 'text';

  return (
    <div>
      {label}
      <input type={inputType} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
    </div>
  );
}
