import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Check, X, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_TEMPLATES } from '../data/mockTemplates';
import type { DocumentTemplate, TemplateApprovalStatus } from '../types';

type ApprovalTab = 'pending' | 'approved' | 'rejected';

const TABS: { key: ApprovalTab; label: string; status: TemplateApprovalStatus }[] = [
  { key: 'pending', label: 'Pending', status: 'submitted_for_approval' },
  { key: 'approved', label: 'Approved', status: 'approved' },
  { key: 'rejected', label: 'Rejected', status: 'rejected' },
];

export function TemplateApprovals() {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ApprovalTab>('pending');

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setTemplates(MOCK_TEMPLATES);
      setLoading(false);
      return;
    }
    supabase.from('document_templates').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setTemplates((data as unknown as DocumentTemplate[]) ?? []);
        setLoading(false);
      });
  }, []);

  const activeStatus = TABS.find((t) => t.key === tab)!.status;
  const filtered = useMemo(
    () => templates.filter((t) => t.approval_status === activeStatus),
    [templates, activeStatus],
  );

  async function applyDecision(template: DocumentTemplate, decision: 'approved' | 'rejected') {
    if (decision === 'rejected' && !rejectReason.trim()) return;
    setSaving(true);
    const now = new Date().toISOString();
    const patch =
      decision === 'approved'
        ? { approval_status: 'approved' as const, approved_by: profile?.id ?? null, approved_at: now }
        : { approval_status: 'rejected' as const, rejected_by: profile?.id ?? null, rejected_at: now, rejection_reason: rejectReason.trim() };

    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 400));
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? { ...t, ...patch } : t)));
      setSaving(false);
      setRejectId(null);
      setRejectReason('');
      setMsg('Dev mode — changes not persisted');
      return;
    }
    const { error } = await supabase.from('document_templates').update(patch).eq('id', template.id);
    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }
    setTemplates((prev) => prev.map((t) => (t.id === template.id ? { ...t, ...patch } : t)));
    setSaving(false);
    setRejectId(null);
    setRejectReason('');
  }

  const rejectTarget = filtered.find((t) => t.id === rejectId) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Template Approvals"
        subtitle="Review and approve submitted document templates"
        icon={<CheckSquare size={18} />}
        breadcrumb={[{ label: 'Templates', path: '/templates' }, { label: 'Approvals' }]}
      />

      {msg && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">{msg}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-gray-100">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
                tab === t.key ? 'text-sky-700 border-b-2 border-sky-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState icon={<CheckSquare size={24} className="text-gray-400" />} title="Nothing here"
              description="No templates in this state." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Code</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Department</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Submitter</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">{t.template_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{t.template_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{t.department ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{t.submitted_by_profile?.full_name ?? t.submitted_by ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {tab === 'pending' && (
                          <>
                            <Button variant="primary" size="sm" loading={saving} onClick={() => applyDecision(t, 'approved')}>
                              <Check size={14} className="mr-1" /> Approve
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => { setRejectId(t.id); setRejectReason(''); }}>
                              <X size={14} className="mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {tab !== 'pending' && (
                          <Badge variant={tab === 'approved' ? 'success' : 'critical'}>
                            {tab === 'approved' ? 'Approved' : 'Rejected'}
                          </Badge>
                        )}
                        <Link to={`/templates/${t.id}`}>
                          <Button variant="ghost" size="sm">Review <ChevronRight size={14} /></Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Reject Template</h3>
              <p className="text-sm text-gray-500">Provide a reason for rejecting <span className="font-medium">{rejectTarget.template_name}</span>.</p>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4}
                placeholder="Reason for rejection…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setRejectId(null); setRejectReason(''); }}>Cancel</Button>
                <Button variant="danger" size="sm" loading={saving} disabled={!rejectReason.trim()} onClick={() => applyDecision(rejectTarget, 'rejected')}>
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
