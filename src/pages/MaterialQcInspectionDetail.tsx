import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { MOCK_MATERIAL_QC_INSPECTIONS, MOCK_MATERIAL_NCRS } from '../data/mockQc';
import type { MaterialQcInspection, InspectionStatus, MaterialInspectionResult, UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { recordQcAudit, recordQcEvent } from '../lib/qcAudit';

const CAN_ACT: UserRole[] = ['admin', 'operations_manager', 'qc_user'];

function resultVariant(r: string): 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'default' {
  if (r === 'accepted') return 'success';
  if (r === 'accepted_with_comments') return 'warning';
  if (r === 'rejected') return 'critical';
  if (r === 'pending_supplier_clarification') return 'warning';
  if (r === 'pending_rework') return 'info';
  return 'neutral';
}

function statusVariant(s: string): 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default' {
  if (s === 'in_progress') return 'info';
  if (s === 'completed') return 'success';
  if (s === 'cancelled') return 'critical';
  return 'neutral';
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function MaterialQcInspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, profile } = useAuth();
  const canAct = role ? CAN_ACT.includes(role) : false;

  const base = MOCK_MATERIAL_QC_INSPECTIONS.find(i => i.id === id);
  const [inspection, setInspection] = useState<MaterialQcInspection | undefined>(base);
  const [rejectionReason, setRejectionReason] = useState('');
  const [remarks, setRemarks] = useState(base?.remarks ?? '');
  const [devMessage, setDevMessage] = useState('');

  const linkedNcrs = MOCK_MATERIAL_NCRS.filter(n => n.material_qc_inspection_id === id);

  if (!inspection) {
    return (
      <div className="text-center py-16 text-gray-500">
        Inspection not found.{' '}
        <Link to="/material-qc/inspections" className="text-sky-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  function devUpdate(patch: Partial<MaterialQcInspection>, message: string) {
    setInspection(prev => prev ? { ...prev, ...patch } : prev);
    setDevMessage(message);
    setTimeout(() => setDevMessage(''), 3000);
  }

  async function handleAction(
    status: InspectionStatus,
    result: MaterialInspectionResult,
    eventType: string,
    eventTitle: string,
  ) {
    if (!isSupabaseConfigured) {
      devUpdate({ inspection_status: status, inspection_result: result, inspected_at: new Date().toISOString() }, `Dev: ${eventTitle}`);
      return;
    }
    await recordQcEvent(inspection!.project_id, eventType, eventTitle, null, profile?.id ?? null, profile?.full_name ?? null, null);
    await recordQcAudit(eventType, id!, eventTitle, profile?.id ?? null);
    navigate('/material-qc/inspections');
  }

  const isCompleted = inspection.inspection_status === 'completed';
  const isPending = inspection.inspection_status === 'pending';
  const isInProgress = inspection.inspection_status === 'in_progress';

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link to="/material-qc/inspections" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader
          title={inspection.inspection_number}
          subtitle={`Material QC Inspection — ${inspection.item?.item_name ?? 'Unknown item'}`}
        />
      </div>

      {devMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">
          {devMessage}
        </div>
      )}

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700">
          Dev Mode — actions update local state only and are not persisted.
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Item Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Item Name</span><span className="font-medium">{inspection.item?.item_name ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Item Code</span><span className="font-mono text-xs">{inspection.item?.item_code ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="capitalize">{inspection.item?.material_category ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Qty Received</span><span>{inspection.item?.quantity_received ?? '—'} {inspection.item?.unit ?? ''}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Project</span><span className="font-mono text-xs">{inspection.project?.project_code ?? 'Unallocated'}</span></div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Inspection Status</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant(inspection.inspection_status)}>{inspection.inspection_status.replace(/_/g, ' ')}</Badge>
              <Badge variant={resultVariant(inspection.inspection_result)}>{inspection.inspection_result.replace(/_/g, ' ')}</Badge>
            </div>
            {inspection.inspected_at && (
              <div className="text-sm text-gray-600">Inspected: {formatDateTime(inspection.inspected_at)}</div>
            )}
            {inspection.inspected_by_profile?.full_name && (
              <div className="text-sm text-gray-600">By: {inspection.inspected_by_profile.full_name}</div>
            )}
            {inspection.remarks && (
              <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{inspection.remarks}</div>
            )}
            {inspection.rejection_reason && (
              <div className="text-sm text-red-700 bg-red-50 rounded-lg p-3">
                <strong>Rejection reason:</strong> {inspection.rejection_reason}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Medical serial section */}
      {inspection.medical_serial_number_id && (
        <Card className="p-5 border-purple-200 bg-purple-50">
          <h3 className="text-sm font-semibold text-purple-800 mb-2">Medical Serial Number</h3>
          <p className="text-sm text-purple-700">Serial ID: <code className="bg-white px-1 rounded text-xs">{inspection.medical_serial_number_id}</code></p>
          <p className="text-xs text-purple-600 mt-1">This inspection is linked to a specific medical serial number record. Verify serial against device label during inspection.</p>
        </Card>
      )}

      {/* Actions */}
      {canAct && !isCompleted && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">QC Actions</h3>
          <div className="space-y-4">
            {isPending && (
              <Button variant="secondary" size="sm" onClick={() => handleAction('in_progress', 'pending', 'material_qc_started', `QC started for ${inspection.inspection_number}`)}>
                <ClipboardCheck size={14} className="mr-1" /> Start Inspection
              </Button>
            )}

            {isInProgress && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Remarks (optional)</label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" onClick={() => handleAction('completed', 'accepted', 'material_qc_accepted', `${inspection.inspection_number} accepted`)}>
                    <CheckCircle size={14} className="mr-1" /> Accept
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleAction('completed', 'accepted_with_comments', 'material_qc_accepted', `${inspection.inspection_number} accepted with comments`)}>
                    Accept with Comments
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleAction('completed', 'pending_supplier_clarification', 'material_qc_started', `${inspection.inspection_number} pending supplier clarification`)}>
                    Pending Supplier Clarification
                  </Button>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-xs font-medium text-red-600 mb-1">Rejection Reason <span className="text-red-500">*</span></label>
                  <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={2}
                    placeholder="Required if rejecting. An NCR will be automatically created."
                    className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2 border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (!rejectionReason.trim()) {
                        alert('Rejection reason is required.');
                        return;
                      }
                      handleAction('completed', 'rejected', 'material_qc_rejected', `${inspection.inspection_number} rejected — NCR created`);
                    }}
                  >
                    <XCircle size={14} className="mr-1" /> Reject &amp; Create NCR
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Linked NCRs */}
      {linkedNcrs.length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-500" /> Linked NCRs
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {linkedNcrs.map(n => (
              <div key={n.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-mono text-sky-700">{n.ncr_number}</span>
                  <Badge variant={n.ncr_status === 'closed' ? 'success' : 'warning'} className="ml-2">{n.ncr_status.replace(/_/g, ' ')}</Badge>
                  <p className="text-xs text-gray-500 mt-0.5">{n.description.slice(0, 80)}…</p>
                </div>
                <Link to={`/material-qc/ncrs/${n.id}`}><Button variant="ghost" size="sm">View</Button></Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Documents */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FileText size={15} className="text-gray-400" /> Inspection Documents
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
          {inspection.attachments_count > 0
            ? `${inspection.attachments_count} document(s) attached. Document upload requires Supabase storage.`
            : 'No documents attached yet. Document upload requires Supabase storage configuration.'}
        </div>
      </Card>
    </div>
  );
}
