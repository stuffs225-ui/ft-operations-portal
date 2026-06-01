import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileCheck, Printer, Download } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getMockGeneratedDocument } from '../data/mockTemplates';
import { downloadTextFile } from '../lib/reportExport';
import type { GeneratedDocument, GeneratedDocumentStatus } from '../types';

const STATUS_BADGE: Record<GeneratedDocumentStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'critical' | 'info' | 'neutral' }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  generated: { label: 'Generated', variant: 'success' },
  exported: { label: 'Exported', variant: 'info' },
  archived: { label: 'Archived', variant: 'default' },
};

export function GeneratedDocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<GeneratedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (!isSupabaseConfigured || !supabase) {
      const d = getMockGeneratedDocument(id);
      if (!d) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setDoc(d);
      setLoading(false);
      return;
    }
    supabase.from('generated_documents')
      .select('*, template:document_templates(template_name, template_code, template_type)')
      .eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setDoc(data as unknown as GeneratedDocument);
        setLoading(false);
      });
  }, [id]);

  function handleDownload() {
    if (!doc) return;
    downloadTextFile(`${doc.output_title || doc.generated_document_number}.txt`, doc.rendered_content ?? '', 'text/plain;charset=utf-8');
  }

  if (loading) {
    return <div className="px-5 py-10 text-center text-sm text-gray-400">Loading document…</div>;
  }

  if (notFound || !doc) {
    return (
      <div className="space-y-5">
        <PageHeader title="Generated Document" icon={<FileCheck size={18} />}
          breadcrumb={[{ label: 'Templates', path: '/templates' }, { label: 'Generated Documents', path: '/templates/generated' }, { label: 'Not found' }]} />
        <EmptyState icon={<FileCheck size={24} className="text-gray-400" />} title="Document not found"
          description="The generated document you are looking for does not exist."
          action={<Link to="/templates/generated"><Button variant="secondary" size="sm">Back to documents</Button></Link>} />
      </div>
    );
  }

  const status = STATUS_BADGE[doc.status];
  const valueEntries = Object.entries(doc.filled_values_json ?? {});

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title={doc.output_title}
        subtitle={doc.generated_document_number}
        icon={<FileCheck size={18} />}
        breadcrumb={[{ label: 'Templates', path: '/templates' }, { label: 'Generated Documents', path: '/templates/generated' }, { label: doc.generated_document_number }]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer size={14} className="mr-1" /> Print
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download size={14} className="mr-1" /> Download .txt
            </Button>
          </div>
        }
      />

      <Card>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Meta label="Status"><Badge variant={status.variant}>{status.label}</Badge></Meta>
          <Meta label="Template">{doc.template?.template_name ?? '—'}</Meta>
          <Meta label="Number"><span className="font-mono text-sky-700">{doc.generated_document_number}</span></Meta>
          <Meta label="Generated">{new Date(doc.generated_at).toLocaleString()}</Meta>
        </div>
      </Card>

      <Card>
        <div className="report-print-root p-5 space-y-2">
          <h3 className="font-semibold text-gray-700">Rendered Content</h3>
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-white border border-gray-200 rounded-lg p-4">
            {doc.rendered_content ?? '—'}
          </pre>
        </div>
      </Card>

      <Card>
        <div className="p-5 space-y-3">
          <h3 className="font-semibold text-gray-700">Filled Values</h3>
          {valueEntries.length === 0 ? (
            <p className="text-sm text-gray-400">No values recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Field</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {valueEntries.map(([k, v]) => (
                    <tr key={k}>
                      <td className="px-4 py-2 text-sm font-mono text-sky-700">{k}</td>
                      <td className="px-4 py-2 text-sm text-gray-800">{v || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
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
