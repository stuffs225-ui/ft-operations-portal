import { useState, useRef } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { openSignedUrl, formatFileSize } from '../../lib/documents';
import { DocumentList } from '../features/DocumentList';
import type { ProjectDocument } from '../../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface UploadSpec {
  bucket: string;
  table: string;
  foreignKey: { field: string; value: string };
  uploadedBy: string | null;
  documentTypeOptions: { value: string; label: string }[];
  extraFields?: Record<string, unknown>;
}

interface DocumentPanelProps {
  documents: ProjectDocument[];
  bucket: string;
  canUpload: boolean;
  upload?: UploadSpec;
  onUploaded?: (doc: unknown) => void;
  emptyMessage?: string;
}

export function DocumentPanel({
  documents,
  bucket,
  canUpload,
  upload,
  onUploaded,
  emptyMessage,
}: DocumentPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docType, setDocType] = useState(upload?.documentTypeOptions[0]?.value ?? 'other');
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file || !upload || !isSupabaseConfigured || !supabase) return;
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File exceeds the 10 MB limit.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uploadPath = `${upload.foreignKey.value}/${docType}/${Date.now()}_${safeName}`;

    const { data: storageData, error: storageErr } = await supabase.storage
      .from(upload.bucket)
      .upload(uploadPath, file, { upsert: false });

    const storagePath = storageErr ? null : (storageData?.path ?? null);
    if (storageErr) {
      console.error('[DocumentPanel] storage upload failed:', storageErr.message);
    }

    const insertPayload: Record<string, unknown> = {
      [upload.foreignKey.field]: upload.foreignKey.value,
      document_type: docType,
      file_name: docType === 'other' && customName.trim() ? customName.trim() : file.name,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: upload.uploadedBy,
      remarks: remarks.trim() || null,
      ...(upload.extraFields ?? {}),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: insertErr } = await (supabase as any)
      .from(upload.table)
      .insert(insertPayload)
      .select()
      .single();

    setUploading(false);

    if (insertErr) {
      setUploadError(insertErr.message);
      return;
    }

    setFile(null);
    setRemarks('');
    setCustomName('');
    if (inputRef.current) inputRef.current.value = '';
    onUploaded?.(inserted);
  }

  const projectDocs = documents;

  return (
    <div className="space-y-4">
      {canUpload && upload && isSupabaseConfigured && (
        <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {upload.documentTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">File (max 10 MB)</label>
              <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-lg cursor-pointer hover:border-brand-400 transition-colors">
                <Upload size={14} className={file ? 'text-brand-500' : 'text-gray-400'} />
                <span className={`text-sm truncate ${file ? 'text-brand-700 font-medium' : 'text-gray-400'}`}>
                  {file ? `${file.name} (${formatFileSize(file.size)})` : 'Choose file…'}
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    setUploadError(null);
                    const f = e.target.files?.[0] ?? null;
                    setFile(f);
                    setCustomName(f?.name ?? '');
                  }}
                />
              </label>
            </div>
          </div>
          {docType === 'other' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Document Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Give this document a name…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Remarks (optional)</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any notes about this document…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {file && file.size > MAX_FILE_SIZE && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle size={11} /> File exceeds the 10 MB limit.
            </p>
          )}
          {uploadError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle size={11} /> {uploadError}
            </p>
          )}
          <button
            onClick={() => void handleUpload()}
            disabled={!file || uploading || (file?.size ?? 0) > MAX_FILE_SIZE}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading…' : 'Upload Document'}
          </button>
        </div>
      )}

      <DocumentList
        documents={projectDocs}
        bucket={bucket}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}

export { openSignedUrl };
