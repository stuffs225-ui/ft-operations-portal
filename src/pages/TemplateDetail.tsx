import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Check, X, FilePlus, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getMockTemplate, getMockTemplateFields } from '../data/mockTemplates';
import type { DocumentTemplate, TemplateField, TemplateApprovalStatus, UserRole } from '../types';

const STATUS_BADGE: Record<TemplateApprovalStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'critical' | 'info' | 'neutral' }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  submitted_for_approval: { label: 'Pending Approval', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'critical' },
  archived: { label: 'Archived', variant: 'default' },
};

const APPROVAL_ROLES: UserRole[] = ['admin', 'operations_manager'];

export function TemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, role } = useAuth();

  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (!isSupabaseConfigured || !supabase) {
      Promise.resolve().then(() => {
        const tpl = getMockTemplate(id);
        if (!tpl) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setTemplate(tpl);
        setFields(getMockTemplateFields(id));
        setLoading(false);
      });
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
      setTemplate(tplRes.data as unknown as DocumentTemplate);
      setFields((fieldsRes.data as unknown as TemplateField[]) ?? []);
      setLoading(false);
    });
  }, [id]);

  const canApprove = role ? APPROVAL_ROLES.includes(role) : false;

  async function applyDecision(decision: 'approved' | 'rejected') {
    if (!template) return;
    if (decision === 'rejected' && !rejectReason.trim()) return;
    setSaving(true);
    const now = new Date().toISOString();
    const patch =
      decision === 'approved'
        ? { approval_status: 'approved' as const, approved_by: profile?.id ?? null, approved_at: now }
        : { approval_status: 'rejected' as const, rejected_by: profile?.id ?? null, rejected_at: now, rejection_reason: rejectReason.trim() };

    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 400));
      setTemplate({ ...template, ...patch });
      setSaving(false);
      setRejectOpen(false);
      setMsg('Dev mode — changes not persisted');
      return;
    }
    const { error } = await supabase.from('document_templates').update(patch).eq('id', template.id);
    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }
    setTemplate({ ...template, ...patch });
    setSaving(false);
    setRejectOpen(false);
  }

  if (loading) {
    return <div className="px-5 py-10 text-center text-sm text-gray-400">Loading template…</div>;
  }

  if (notFound || !template) {
    return (
      <div className="space-y-5">
        <PageHeader title="Template" icon={<FileText size={18} />}
          breadcrumb={[{ label: 'Templates', path: '/templates' }, { label: 'Not found' }]} />
        <EmptyState icon={<FileText size={24} className="text-gray-400" />} title="Template not found"
          description="The template you are looking for does not exist."
          action={<Link to="/templates"><Button variant="secondary" size="sm">Back to templates</Button></Link>} />
      </div>
    );
  }

  const status = STATUS_BADGE[template.approval_status];

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title={template.template_name}
        subtitle={template.template_code}
        icon={<FileText size={18} />}
        breadcrumb={[{ label: 'Templates', path: '/templates' }, { label: template.template_code }]}
        action={
          <div className="flex items-center gap-2">
            {template.approval_status === 'approved' && (
              <Link to={`/templates/generate/${template.id}`}>
                <Button variant="primary" size="sm"><FilePlus size={14} className="mr-1" /> Generate Document</Button>
              </Link>
            )}
            {template.approval_status === 'submitted_for_approval' && canApprove && (
              <>
                <Button variant="primary" size="sm" loading={saving} onClick={() => applyDecision('approved')}>
                  <Check size={14} className="mr-1" /> Approve
                </Button>
                <Button variant="danger" size="sm" onClick={() => setRejectOpen(true)}>
                  <X size={14} className="mr-1" /> Reject
                </Button>
              </>
            )}
          </div>
        }
      />

      {msg && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">{msg}</div>
      )}

      <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm text-sky-800">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <span>Approved templates cannot be edited directly — create a new version.</span>
      </div>

      <Card>
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <Meta label="Status"><Badge variant={status.variant}>{status.label}</Badge></Meta>
          <Meta label="Type"><Badge variant="neutral">{template.template_type.replace(/_/g, ' ')}</Badge></Meta>
          <Meta label="Department">{template.department ?? '—'}</Meta>
          <Meta label="Visibility">{template.visibility_scope.replace(/_/g, ' ')}</Meta>
          <Meta label="Format">{template.template_format.replace(/_/g, ' ')}</Meta>
          <Meta label="Version">{template.version}</Meta>
          <Meta label="Submitted by">{template.submitted_by_profile?.full_name ?? template.submitted_by ?? '—'}</Meta>
          <Meta label="Submitted at">{template.submitted_at ? new Date(template.submitted_at).toLocaleDateString() : '—'}</Meta>
          <Meta label="Approved at">{template.approved_at ? new Date(template.approved_at).toLocaleDateString() : '—'}</Meta>
        </div>
        {template.description && (
          <div className="px-5 pb-5 text-sm text-gray-600">{template.description}</div>
        )}
        {template.approval_status === 'rejected' && template.rejection_reason && (
          <div className="px-5 pb-5">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <span className="font-medium">Rejection reason: </span>{template.rejection_reason}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="p-5 space-y-2">
          <h3 className="font-semibold text-gray-700">Template Body</h3>
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-4">
            {template.template_body ?? '—'}
          </pre>
        </div>
      </Card>

      <Card>
        <div className="p-5 space-y-3">
          <h3 className="font-semibold text-gray-700">Fields</h3>
          {fields.length === 0 ? (
            <p className="text-sm text-gray-400">No fields defined for this template.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Key</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Label</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {fields.map((f) => (
                    <tr key={f.id}>
                      <td className="px-4 py-2 text-sm font-mono text-sky-700">{f.field_key}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{f.field_label}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{f.field_type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2 text-sm">{f.is_required ? <Badge variant="info">Required</Badge> : <span className="text-gray-400">Optional</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Reject Template</h3>
              <p className="text-sm text-gray-500">Please provide a reason for rejecting this template.</p>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4}
                placeholder="Reason for rejection…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setRejectOpen(false); setRejectReason(''); }}>Cancel</Button>
                <Button variant="danger" size="sm" loading={saving} disabled={!rejectReason.trim()} onClick={() => applyDecision('rejected')}>
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-gray-800">{children}</div>
    </div>
  );
}
