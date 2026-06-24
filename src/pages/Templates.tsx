import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Search, ChevronRight, CheckSquare, FilePlus } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_TEMPLATES } from '../data/mockTemplates';
import type { DocumentTemplate, TemplateApprovalStatus, UserRole } from '../types';

type TemplateTab = 'approved' | 'department' | 'pending' | 'my_submitted';

const TABS: { key: TemplateTab; label: string }[] = [
  { key: 'approved', label: 'Approved' },
  { key: 'department', label: 'Department' },
  { key: 'pending', label: 'Pending Approval' },
  { key: 'my_submitted', label: 'My Submitted' },
];

const STATUS_BADGE: Record<TemplateApprovalStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'critical' | 'info' | 'neutral' }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  submitted_for_approval: { label: 'Pending Approval', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'critical' },
  archived: { label: 'Archived', variant: 'default' },
};

const APPROVAL_ROLES: UserRole[] = ['admin', 'operations_manager'];

export function Templates() {
  const { profile, role } = useAuth();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TemplateTab>('approved');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      Promise.resolve().then(() => {
        setTemplates(MOCK_TEMPLATES);
        setLoading(false);
      });
      return;
    }
    supabase.from('document_templates').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setTemplates((data as unknown as DocumentTemplate[]) ?? []);
        setLoading(false);
      });
  }, []);

  const canApprove = role ? APPROVAL_ROLES.includes(role) : false;

  const filtered = useMemo(() => {
    let list = templates;
    switch (tab) {
      case 'approved':
        list = list.filter((t) => t.approval_status === 'approved');
        break;
      case 'department':
        list = profile?.department
          ? list.filter((t) => t.department === profile.department)
          : list.filter((t) => t.visibility_scope === 'department');
        break;
      case 'pending':
        list = list.filter((t) => t.approval_status === 'submitted_for_approval');
        break;
      case 'my_submitted':
        list = list.filter((t) => t.submitted_by === profile?.id);
        break;
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.template_name.toLowerCase().includes(q) ||
        t.template_code.toLowerCase().includes(q) ||
        t.template_type.toLowerCase().includes(q),
      );
    }
    return list;
  }, [templates, tab, search, profile]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Template Library"
        subtitle="Document templates and fillable forms across departments"
        actions={
          <div className="flex items-center gap-2">
            {canApprove && (
              <Link to="/templates/approvals">
                <Button variant="secondary" size="sm">
                  <CheckSquare size={14} className="mr-1" /> Approvals
                </Button>
              </Link>
            )}
            <Link to="/templates/generated">
              <Button variant="secondary" size="sm">
                <FilePlus size={14} className="mr-1" /> Generated Documents
              </Button>
            </Link>
            <Link to="/templates/new">
              <Button variant="primary" size="sm">
                <Plus size={14} className="mr-1" /> New Template
              </Button>
            </Link>
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'text-sky-700 border-b-2 border-sky-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, type…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300 w-full"
            />
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<FileText size={24} className="text-gray-400" />}
              title="No templates found"
              description="Create a new template to get started."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Code</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Department</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Visibility</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">{t.template_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{t.template_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">{t.template_type.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{t.department ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{t.visibility_scope.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[t.approval_status].variant}>
                        {STATUS_BADGE[t.approval_status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/templates/${t.id}`}>
                        <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
