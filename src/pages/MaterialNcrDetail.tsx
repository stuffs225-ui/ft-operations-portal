import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { MOCK_MATERIAL_NCRS } from '../data/mockQc';
import type { MaterialNcr, NcrStatus, UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { recordQcAudit, recordQcEvent } from '../lib/qcAudit';

const CAN_CLOSE: UserRole[] = ['admin', 'operations_manager', 'qc_user'];
const CAN_REJECT_CLOSURE: UserRole[] = ['admin', 'operations_manager'];

function severityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'warning';
  if (s === 'medium') return 'info';
  return 'neutral';
}

function statusVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'open') return 'critical';
  if (s === 'assigned' || s === 'corrective_action_in_progress') return 'warning';
  if (s === 'pending_evidence') return 'info';
  if (s === 'closed') return 'success';
  return 'neutral';
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function MaterialNcrDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, profile } = useAuth();
  const canClose = role ? CAN_CLOSE.includes(role) : false;
  const canRejectClosure = role ? CAN_REJECT_CLOSURE.includes(role) : false;

  const base = MOCK_MATERIAL_NCRS.find(n => n.id === id);
  const [ncr, setNcr] = useState<MaterialNcr | undefined>(base);
  const [correctiveAction, setCorrectiveAction] = useState(base?.corrective_action ?? '');
  const [preventiveAction, setPreventiveAction] = useState(base?.preventive_action ?? '');
  const [rootCause, setRootCause] = useState(base?.root_cause_category ?? '');
  const [closureRemarks, setClosureRemarks] = useState('');
  const [devMessage, setDevMessage] = useState('');

  if (!ncr) {
    return (
      <div className="text-center py-16 text-gray-500">
        NCR not found.{' '}
        <Link to="/material-qc/ncrs" className="text-sky-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  function devUpdate(patch: Partial<MaterialNcr>, message: string) {
    setNcr(prev => prev ? { ...prev, ...patch } : prev);
    setDevMessage(message);
    setTimeout(() => setDevMessage(''), 3000);
  }

  async function handleClose() {
    if (!ncr) return;
    if (!correctiveAction.trim()) { alert('Corrective action is required to close the NCR.'); return; }
    if (!closureRemarks.trim()) { alert('Closure remarks or evidence is required.'); return; }
    if (!isSupabaseConfigured) {
      devUpdate({ ncr_status: 'closed', corrective_action: correctiveAction, preventive_action: preventiveAction, closed_at: new Date().toISOString() }, 'Dev: NCR closed');
      return;
    }
    await recordQcEvent(ncr.project_id, 'material_ncr_closed', `NCR ${ncr.ncr_number} closed`, closureRemarks, profile?.id ?? null, profile?.full_name ?? null, null);
    await recordQcAudit('ncr_closed', id!, `NCR ${ncr.ncr_number} closed`, profile?.id ?? null);
  }

  async function handleUpdate(_status: NcrStatus) {
    if (!isSupabaseConfigured) {
      devUpdate({ ncr_status: _status, corrective_action: correctiveAction, root_cause_category: rootCause }, `Dev: NCR status updated to ${_status}`);
      return;
    }
  }

  const isClosed = ncr.ncr_status === 'closed' || ncr.ncr_status === 'cancelled';

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link to="/material-qc/ncrs" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader
          title={ncr.ncr_number}
          subtitle="Non-Conformance Report"
        />
        <Badge variant={severityVariant(ncr.severity)}>{ncr.severity}</Badge>
      </div>

      {devMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">{devMessage}</div>
      )}

      {ncr.severity === 'critical' && ncr.ncr_status !== 'closed' && (
        <div className="bg-red-50 border border-red-400 rounded-xl px-5 py-3 text-sm text-red-800 font-medium flex items-center gap-2">
          <AlertTriangle size={16} /> Critical NCR — Requires immediate attention. This blocks Release Note issuance.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">NCR Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge variant={statusVariant(ncr.ncr_status)}>{ncr.ncr_status.replace(/_/g, ' ')}</Badge></div>
            <div className="flex justify-between"><span className="text-gray-500">Item</span><span>{ncr.item?.item_name ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Project</span><span className="font-mono text-xs">{ncr.project?.project_code ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Inspection</span><Link to={`/material-qc/inspections/${ncr.material_qc_inspection_id}`} className="text-sky-600 text-xs hover:underline">View Inspection</Link></div>
            <div className="flex justify-between"><span className="text-gray-500">Due Date</span><span>{ncr.due_date ? new Date(ncr.due_date).toLocaleDateString('en-GB') : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{formatDateTime(ncr.created_at)}</span></div>
            {ncr.closed_at && <div className="flex justify-between"><span className="text-gray-500">Closed</span><span>{formatDateTime(ncr.closed_at)}</span></div>}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Description</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{ncr.description}</p>
          {ncr.remarks && <p className="text-xs text-gray-500 mt-3 italic">{ncr.remarks}</p>}
        </Card>
      </div>

      {/* Workflow fields */}
      {!isClosed && canClose && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">NCR Workflow</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Root Cause Category</label>
              <input type="text" value={rootCause} onChange={e => setRootCause(e.target.value)}
                placeholder="e.g. Supplier Quality, Transport Damage, Design Issue"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Corrective Action <span className="text-red-500">*</span></label>
              <textarea value={correctiveAction} onChange={e => setCorrectiveAction(e.target.value)} rows={3}
                placeholder="What action will be taken to fix this non-conformance?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Preventive Action</label>
              <textarea value={preventiveAction} onChange={e => setPreventiveAction(e.target.value)} rows={2}
                placeholder="How will we prevent recurrence?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <Button variant="secondary" size="sm" onClick={() => handleUpdate('corrective_action_in_progress')}>
              Save Updates
            </Button>
          </div>
        </Card>
      )}

      {/* Closure */}
      {!isClosed && canClose && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Close NCR</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Closure Evidence / Notes <span className="text-red-500">*</span></label>
              <textarea value={closureRemarks} onChange={e => setClosureRemarks(e.target.value)} rows={3}
                placeholder="Describe the evidence of closure, or reference a document."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              Document upload (NCR evidence) requires Supabase storage configuration.
            </div>
            <Button variant="primary" size="sm" onClick={handleClose}>
              <CheckCircle size={14} className="mr-1" /> Close NCR
            </Button>
          </div>
        </Card>
      )}

      {/* Closed state */}
      {ncr.ncr_status === 'closed' && (
        <Card className="p-5 bg-green-50 border-green-200">
          <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
            <CheckCircle size={15} /> NCR Closed
          </h3>
          {ncr.corrective_action && <p className="text-sm text-green-700"><strong>Corrective action:</strong> {ncr.corrective_action}</p>}
          {ncr.closed_at && <p className="text-xs text-green-600 mt-1">Closed {formatDateTime(ncr.closed_at)}</p>}
        </Card>
      )}

      {/* Reject closure (admin only) */}
      {ncr.ncr_status === 'pending_evidence' && canRejectClosure && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Reject Closure</h3>
          <p className="text-xs text-gray-500 mb-3">If the provided closure evidence is insufficient, reject the closure request.</p>
          <Button variant="secondary" size="sm" className="border-red-200 text-red-700"
            onClick={() => devUpdate({ ncr_status: 'rejected_closure' }, 'Dev: Closure rejected')}>
            Reject Closure
          </Button>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FileText size={15} className="text-gray-400" /> Documents
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
          NCR evidence upload requires Supabase storage configuration.
        </div>
      </Card>
    </div>
  );
}
