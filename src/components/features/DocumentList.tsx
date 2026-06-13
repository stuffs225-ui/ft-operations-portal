import { FileText, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import { openSignedUrl, formatFileSize } from '../../lib/documents';
import type { ProjectDocument } from '../../types';

const STATUS_STYLES: Record<string, string> = {
  uploaded:     'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  approved:     'bg-green-100 text-green-700',
  rejected:     'bg-red-100 text-red-700',
  superseded:   'bg-gray-100 text-gray-500',
  expired:      'bg-red-50 text-red-400',
};

interface DocumentListProps {
  documents: ProjectDocument[];
  bucket: string;
  emptyMessage?: string;
}

export function DocumentList({
  documents,
  bucket,
  emptyMessage = 'No documents attached.',
}: DocumentListProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-gray-400 italic">{emptyMessage}</p>;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2 text-left">Document</th>
            <th className="px-3 py-2 text-left hidden sm:table-cell">Type</th>
            <th className="px-3 py-2 text-left hidden md:table-cell">Date</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Download</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <FileText size={12} className="text-gray-400 shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">{doc.file_name}</div>
                    {doc.file_size != null && (
                      <div className="text-[10px] text-gray-400">{formatFileSize(doc.file_size)}</div>
                    )}
                    {doc.remarks && (
                      <div className="text-[10px] text-gray-400 truncate max-w-[200px]" title={doc.remarks}>{doc.remarks}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-gray-600 hidden sm:table-cell capitalize">
                {doc.document_type.replace(/_/g, ' ')}
              </td>
              <td className="px-3 py-2.5 text-gray-500 hidden md:table-cell">
                {new Date(doc.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-3 py-2.5">
                <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold', STATUS_STYLES[doc.status] ?? 'bg-gray-100 text-gray-500')}>
                  {doc.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                {doc.storage_path ? (
                  <button
                    onClick={() => void openSignedUrl(bucket, doc.storage_path!)}
                    className="p-1 rounded text-gray-400 hover:text-brand-600 transition-colors"
                    title="Download"
                  >
                    <Download size={13} />
                  </button>
                ) : (
                  <span className="text-[10px] text-gray-300">no file</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
