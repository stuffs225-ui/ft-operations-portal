import { useState } from 'react';
import { FileText, Upload, Search, Download, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';

type DocumentStatus = 'Uploaded' | 'Under Review' | 'Approved' | 'Rejected' | 'Superseded' | 'Expired';

interface DocumentRecord {
  id: string;
  type: string;
  related_entity: string;
  entity_id: string;
  uploaded_by: string;
  uploaded_at: string;
  status: DocumentStatus;
  version: string;
  remarks?: string;
  file_name: string;
}

const STATUS_STYLES: Record<DocumentStatus, string> = {
  Uploaded: 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Superseded: 'bg-gray-100 text-gray-500',
  Expired: 'bg-red-50 text-red-400',
};

const MOCK_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'doc001',
    type: 'Quotation PDF',
    related_entity: 'Quotation',
    entity_id: 'QT-2025-0088',
    uploaded_by: 'Sara Khalid',
    uploaded_at: '2025-01-15T09:10:00Z',
    status: 'Approved',
    version: 'v1.0',
    file_name: 'QT-2025-0088_CivilDefense.pdf',
  },
  {
    id: 'doc002',
    type: 'Customer PO / Contract',
    related_entity: 'Sales Order',
    entity_id: 'SO-2025-0041',
    uploaded_by: 'Tariq Al-Mansouri',
    uploaded_at: '2025-01-14T14:22:00Z',
    status: 'Approved',
    version: 'v1.0',
    file_name: 'PO_CivilDefense_Jan2025.pdf',
  },
  {
    id: 'doc003',
    type: 'BOM',
    related_entity: 'Work Order',
    entity_id: 'WO-2025-0013',
    uploaded_by: 'Mohammed Bin Saud',
    uploaded_at: '2025-01-13T10:05:00Z',
    status: 'Approved',
    version: 'v2.1',
    remarks: 'Revised after material substitution',
    file_name: 'BOM_WO-2025-0013_rev2.xlsx',
  },
  {
    id: 'doc004',
    type: 'GA Drawing',
    related_entity: 'Work Order',
    entity_id: 'WO-2025-0013',
    uploaded_by: 'Mohammed Bin Saud',
    uploaded_at: '2025-01-12T09:30:00Z',
    status: 'Under Review',
    version: 'v1.0',
    file_name: 'GA_WO-2025-0013.dwg',
  },
  {
    id: 'doc005',
    type: 'PO to Supplier',
    related_entity: 'Purchase Order',
    entity_id: 'PO-2025-0041',
    uploaded_by: 'Khalid Ibrahim',
    uploaded_at: '2025-01-11T16:15:00Z',
    status: 'Approved',
    version: 'v1.0',
    file_name: 'PO-2025-0041_Hydraulics.pdf',
  },
  {
    id: 'doc006',
    type: 'Raw Material Excel',
    related_entity: 'Purchase Order',
    entity_id: 'PO-2025-0041',
    uploaded_by: 'Khalid Ibrahim',
    uploaded_at: '2025-01-11T16:10:00Z',
    status: 'Uploaded',
    version: 'v1.0',
    file_name: 'MaterialList_PO-2025-0041.xlsx',
  },
  {
    id: 'doc007',
    type: 'Vehicle Photos',
    related_entity: 'Project QC',
    entity_id: 'QCI-2025-0007',
    uploaded_by: 'Layla Nasser',
    uploaded_at: '2025-01-10T11:40:00Z',
    status: 'Rejected',
    version: 'v1.0',
    remarks: 'Photos blurry — chassis number not legible',
    file_name: 'Photos_VehicleQC_Jan10.zip',
  },
  {
    id: 'doc008',
    type: 'Detail Drawing',
    related_entity: 'Work Order',
    entity_id: 'WO-2025-0011',
    uploaded_by: 'Mohammed Bin Saud',
    uploaded_at: '2025-01-08T08:55:00Z',
    status: 'Superseded',
    version: 'v1.0',
    remarks: 'Replaced by v2.0',
    file_name: 'Detail_WO-2025-0011_v1.pdf',
  },
];

interface DocumentListProps {
  entityId?: string;
  entityType?: string;
  showUploadButton?: boolean;
}

export function DocumentList({ entityId, entityType, showUploadButton = true }: DocumentListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'All'>('All');

  const docs = MOCK_DOCUMENTS.filter((d) => {
    const matchesEntity = !entityId || d.entity_id === entityId;
    const matchesType = !entityType || d.related_entity === entityType;
    const matchesSearch =
      !search ||
      d.type.toLowerCase().includes(search.toLowerCase()) ||
      d.entity_id.toLowerCase().includes(search.toLowerCase()) ||
      d.uploaded_by.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesEntity && matchesType && matchesSearch && matchesStatus;
  });

  const statuses: Array<DocumentStatus | 'All'> = ['All', 'Uploaded', 'Under Review', 'Approved', 'Rejected', 'Superseded', 'Expired'];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-2 py-1 rounded text-[11px] font-medium transition-colors',
                statusFilter === s ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {showUploadButton && (
          <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 text-white rounded-lg text-xs font-medium hover:bg-brand-800 transition-colors">
            <Upload size={13} />
            Upload
          </button>
        )}
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left">Document Type</th>
              <th className="px-3 py-2 text-left hidden sm:table-cell">Related To</th>
              <th className="px-3 py-2 text-left hidden md:table-cell">Uploaded By</th>
              <th className="px-3 py-2 text-left hidden lg:table-cell">Date</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left hidden xl:table-cell">Ver.</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <FileText size={12} className="text-gray-400 shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">{doc.type}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{doc.file_name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 hidden sm:table-cell">
                  <div className="text-gray-600">{doc.related_entity}</div>
                  <div className="text-[10px] text-brand-600 font-mono">{doc.entity_id}</div>
                </td>
                <td className="px-3 py-2.5 text-gray-600 hidden md:table-cell">{doc.uploaded_by}</td>
                <td className="px-3 py-2.5 text-gray-500 hidden lg:table-cell">
                  {new Date(doc.uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold', STATUS_STYLES[doc.status])}>
                    {doc.status}
                  </span>
                  {doc.remarks && (
                    <div className="text-[10px] text-gray-400 mt-0.5 max-w-[180px] truncate" title={doc.remarks}>
                      {doc.remarks}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-gray-500 font-mono hidden xl:table-cell">{doc.version}</td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-1 rounded text-gray-400 hover:text-brand-600 transition-colors" title="Preview">
                      <Eye size={12} />
                    </button>
                    <button className="p-1 rounded text-gray-400 hover:text-brand-600 transition-colors" title="Download">
                      <Download size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {docs.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-400">No documents match the current filter.</div>
        )}
      </div>
    </div>
  );
}
