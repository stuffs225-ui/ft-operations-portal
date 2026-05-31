import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Wrench, CheckCircle, Package, User } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { MOCK_AFS_MAINTENANCE_REQUESTS } from '../data/mockAfs';
import type { AfsMaintenanceRequest, UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { recordAfsEvent, recordAfsAudit } from '../lib/afsAudit';

const CAN_MANAGE: UserRole[] = ['admin', 'operations_manager', 'afs_user'];

function priorityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'warning';
  if (s === 'medium') return 'info';
  return 'neutral';
}

function statusVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'open' || s === 'assigned') return 'critical';
  if (s === 'under_inspection' || s === 'parts_waiting' || s === 'in_repair') return 'warning';
  if (s === 'completed' || s === 'closed') return 'success';
  return 'neutral';
}

export function AfterSalesMaintenanceDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, profile } = useAuth();
  const canManage = role ? CAN_MANAGE.includes(role) : false;

  const base = MOCK_AFS_MAINTENANCE_REQUESTS.find(r => r.id === id);
  const [request, setRequest] = useState<AfsMaintenanceRequest | undefined>(base);
  const [devMessage, setDevMessage] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState(base?.inspection_notes ?? '');
  const [partsNotes, setPartsNotes] = useState(base?.parts_notes ?? '');
  const [resolutionNotes, setResolutionNotes] = useState(base?.resolution_notes ?? '');

  if (!request) {
    return (
      <div className="text-center py-16 text-gray-500">
        Maintenance request not found.{' '}
        <Link to="/after-sales/maintenance" className="text-sky-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  const isClosed = request.maintenance_status === 'closed' || request.maintenance_status === 'cancelled';

  function devUpdate(patch: Partial<AfsMaintenanceRequest>, msg: string) {
    setRequest(prev => prev ? { ...prev, ...patch } : prev);
    setDevMessage(msg);
    setTimeout(() => setDevMessage(''), 3000);
  }

  async function handleStartInspection() {
    if (!request) return;
    if (!isSupabaseConfigured) {
      devUpdate({ maintenance_status: 'under_inspection', inspected_by: profile?.id ?? 'user', inspected_at: new Date().toISOString() }, 'Dev: Inspection started');
      return;
    }
    await recordAfsEvent(request.project_id ?? '', 'inspection_started', `Inspection started for ${request.maintenance_request_number}`, null, profile?.id ?? null, profile?.full_name ?? null, null);
    await recordAfsAudit('inspection_started', id!, `Inspection started`, profile?.id ?? null);
  }

  async function handleSaveInspection() {
    if (!request) return;
    if (!isSupabaseConfigured) {
      devUpdate({ inspection_notes: inspectionNotes }, 'Dev: Inspection notes saved');
      return;
    }
    await recordAfsAudit('inspection_notes_updated', id!, 'Inspection notes updated', profile?.id ?? null);
  }

  async function handleMarkPartsWaiting() {
    if (!request) return;
    if (!isSupabaseConfigured) {
      devUpdate({ maintenance_status: 'parts_waiting', parts_required: true, parts_notes: partsNotes }, 'Dev: Status set to parts waiting');
      return;
    }
    await recordAfsAudit('parts_waiting', id!, 'Status set to parts waiting', profile?.id ?? null);
  }

  async function handleMarkInRepair() {
    if (!request) return;
    if (!isSupabaseConfigured) {
      devUpdate({ maintenance_status: 'in_repair' }, 'Dev: Status set to in repair');
      return;
    }
    await recordAfsAudit('in_repair', id!, 'Status set to in repair', profile?.id ?? null);
  }

  async function handleComplete() {
    if (!request) return;
    if (!resolutionNotes.trim()) { alert('Resolution notes are required to complete the request.'); return; }
    if (!isSupabaseConfigured) {
      devUpdate({ maintenance_status: 'completed', resolution_notes: resolutionNotes, resolved_at: new Date().toISOString(), resolved_by: profile?.id ?? 'user' }, 'Dev: Request completed');
      return;
    }
    await recordAfsEvent(request.project_id ?? '', 'maintenance_completed', `${request.maintenance_request_number} completed`, resolutionNotes, profile?.id ?? null, profile?.full_name ?? null, null);
    await recordAfsAudit('maintenance_completed', id!, `Request completed: ${request.maintenance_request_number}`, profile?.id ?? null);
  }

  async function handleClose() {
    if (!request) return;
    if (!isSupabaseConfigured) {
      devUpdate({ maintenance_status: 'closed', closed_at: new Date().toISOString(), closed_by: profile?.id ?? 'user' }, 'Dev: Request closed');
      return;
    }
    await recordAfsAudit('maintenance_closed', id!, `Request closed`, profile?.id ?? null);
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link to="/after-sales/maintenance" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader title={request.maintenance_request_number} subtitle="Maintenance Request" />
        <Badge variant={priorityVariant(request.priority)}>{request.priority}</Badge>
        <Badge variant={statusVariant(request.maintenance_status)}>{request.maintenance_status.replace(/_/g, ' ')}</Badge>
      </div>

      {devMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">{devMessage}</div>
      )}

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700">
          Dev Mode — actions update local state only.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Request Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{request.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Project</span><span className="font-mono text-xs">{request.project?.project_code ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Chassis No.</span><span>{request.chassis_number ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Issue Type</span><span className="capitalize">{request.issue_type.replace(/_/g, ' ')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Reported</span><span>{new Date(request.reported_date).toLocaleDateString('en-GB')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Assigned To</span><span>{request.assigned_to_profile?.full_name ?? '—'}</span></div>
            {request.wo_reference && <div className="flex justify-between"><span className="text-gray-500">WO Ref</span><span className="font-mono text-xs">{request.wo_reference}</span></div>}
            {request.pn_reference && <div className="flex justify-between"><span className="text-gray-500">PN Ref</span><span className="font-mono text-xs">{request.pn_reference}</span></div>}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Description</h3>
          <p className="text-sm text-gray-700">{request.title}</p>
          <p className="text-sm text-gray-600 mt-2">{request.description}</p>
        </Card>
      </div>

      {/* Inspection */}
      {canManage && !isClosed && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <User size={15} className="text-sky-500" /> Inspection
          </h3>
          {request.maintenance_status === 'open' || request.maintenance_status === 'assigned' ? (
            <Button variant="secondary" size="sm" onClick={handleStartInspection}>
              Start Inspection
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Inspection Notes</label>
                <textarea value={inspectionNotes} onChange={e => setInspectionNotes(e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" size="sm" onClick={handleSaveInspection}>Save Notes</Button>
                {request.maintenance_status === 'under_inspection' && (
                  <>
                    <Button variant="secondary" size="sm" onClick={handleMarkPartsWaiting}>
                      <Package size={14} className="mr-1" /> Parts Required
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleMarkInRepair}>
                      <Wrench size={14} className="mr-1" /> Start Repair
                    </Button>
                  </>
                )}
                {request.maintenance_status === 'parts_waiting' && (
                  <Button variant="secondary" size="sm" onClick={handleMarkInRepair}>
                    <Wrench size={14} className="mr-1" /> Start Repair
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Parts */}
      {request.parts_required && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Package size={15} className="text-orange-500" /> Parts Required
          </h3>
          {canManage && !isClosed ? (
            <div className="space-y-2">
              <textarea value={partsNotes} onChange={e => setPartsNotes(e.target.value)} rows={2}
                placeholder="Describe parts needed…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
          ) : (
            <p className="text-sm text-gray-700">{request.parts_notes ?? 'No parts notes.'}</p>
          )}
        </Card>
      )}

      {/* Complete / Close */}
      {canManage && !isClosed && ['in_repair', 'under_inspection', 'parts_waiting'].includes(request.maintenance_status) && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle size={15} className="text-green-500" /> Complete Request
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Resolution Notes <span className="text-red-500">*</span></label>
              <textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} rows={3}
                placeholder="Describe how the issue was resolved…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <Button variant="primary" size="sm" onClick={handleComplete}>
              <CheckCircle size={14} className="mr-1" /> Mark Completed
            </Button>
          </div>
        </Card>
      )}

      {/* Close after completion */}
      {canManage && request.maintenance_status === 'completed' && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Close Request</h3>
          <p className="text-xs text-gray-500 mb-3">Resolution notes are on file. Close the request to archive it.</p>
          <Button variant="secondary" size="sm" onClick={handleClose}>Close Request</Button>
        </Card>
      )}

      {/* Resolution summary */}
      {request.resolved_at && (
        <Card className="p-5 bg-green-50 border-green-200">
          <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
            <CheckCircle size={15} /> Resolved
          </h3>
          {request.resolution_notes && <p className="text-sm text-green-700">{request.resolution_notes}</p>}
          <p className="text-xs text-green-600 mt-1">Resolved {new Date(request.resolved_at).toLocaleDateString('en-GB')}</p>
        </Card>
      )}
    </div>
  );
}
