import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, Search, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { StatusBadge } from '@/components/status/status-badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MOCK_GENERATED_DOCUMENTS } from '@/data/mockTemplates';
import type { GeneratedDocument } from '@/types';

export function GeneratedDocuments() {
  const [docs, setDocs] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      Promise.resolve().then(() => {
        setDocs(MOCK_GENERATED_DOCUMENTS);
        setLoading(false);
      });
      return;
    }
    supabase.from('generated_documents').select('*, template:document_templates(template_name, template_code, template_type)')
      .order('generated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setDocs((data as unknown as GeneratedDocument[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!search) return docs;
    const q = search.toLowerCase();
    return docs.filter((d) =>
      d.output_title.toLowerCase().includes(q) ||
      d.generated_document_number.toLowerCase().includes(q),
    );
  }, [docs, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Generated Documents"
        subtitle="Documents produced from fillable templates"
        breadcrumb={[{ label: 'Templates', href: '/templates' }, { label: 'Generated Documents' }]}
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or number…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300 w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-4"><PageLoader /></div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState icon={<FileCheck size={24} className="text-gray-400" />} title="No generated documents"
              description="Generate a document from an approved template to see it here." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Number</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Template</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Generated</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">{d.generated_document_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{d.output_title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{d.template?.template_name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{new Date(d.generated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Link to={`/templates/generated/${d.id}`}>
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
