import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Wrench, CheckCircle, Package, User } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_AFS_MAINTENANCE_REQUESTS } from '../data/mockAfs';
import type { AfsMaintenanceRequest, UserRole } from '../types';
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

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function AfterSalesMaintenanceDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, profile } = useAuth();
  const canManage = role ? CAN_MANAGE.includes(role) : false;

  const [request, setRequest] = useState<AfsMaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [devMessage, setDevMessage] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [partsNotes, setPartsNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const found = MOCK_AFS_MAINTENANCE_REQUESTS.find(r => r.id === id);
        if (found) {
          setRequest({ ...found });
          setInspectionNotes(found.inspection_notes ?? '');
          setPartsNotes(found.parts_notes ?? '');
          setResolutionNotes(found.resolution_notes ?? '');
        } else {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('afs_maintenance_requests')
        .select('*, project:projects(project_code, customer_name)')
        .eq('id', id!)
        .single();
      if (!data) {
        setNotFound(true);
      } else {
        const r = data as unknown as AfsMaintenanceRequest;
        setRequest(r);
        setInspectionNotes(r.inspection_notes ?? '');
        setPartsNotes(r.parts_notes ?? '');
        setResolutionNotes(r.resolution_notes ?? '');
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <PageLoader />;
  if (notFound || !request) {
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
    const currentRequest = request;
    if (!currentRequest) return;
    if (!isSupabaseConfigured || !supabase) {
      devUpdate({ maintenance_status: 'under_inspection', inspected_by: profile?.id ?? 'user', inspected_at: new Date().toISOString() }, 'Dev: Inspection started');
      return;
    }
    setSaving(true);
    const inspectedAt = new Date().toISOString();
    const { error } = await supabase.from('afs_maintenance_requests').update({
      maintenance_status: 'under_inspection',
      inspected_by: profile?.id ?? null,
      inspected_at: inspectedAt,
    }).eq('id', id!);
    if (!error) {
      setRequest(prev => prev ? { ...prev, maintenance_status: 'under_inspection', inspected_by: profile?.id ?? null, inspected_at: inspectedAt } : prev);
      void recordAfsEvent(currentRequest.project_id ?? '', 'inspection_started', `Inspection started for ${currentRequest.maintenance_request_number}`, null, profile?.id ?? null, profile?.full_name ?? null, null);
      void recordAfsAudit('inspection_started', id!, 'Inspection started', profile?.id ?? null);
    }
    setSaving(false);
  }

  async function handleSaveInspection() {
    const currentRequest = request;
    if (!currentRequest) return;
    if (!isSupabaseConfigured || !supabase) {
      devUpdate({ inspection_notes: inspectionNotes }, 'Dev: Inspection notes saved');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('afs_maintenance_requests').update({
      inspection_notes: inspectionNotes || null,
    }).eq('id', id!);
    if (!error) {
      setRequest(prev => prev ? { ...prev, inspection_notes: inspectionNotes || null } : prev);
      void recordAfsAudit('inspection_notes_updated', id!, 'Inspection notes updated', profile?.id ?? null);
    }
    setSaving(false);
  }

  async function handleMarkPartsWaiting() {
    const currentRequest = request;
    if (!currentRequest) return;
    if (!isSupabaseConfigured || !supabase) {
      devUpdate({ maintenance_status: 'parts_waiting', parts_required: true, parts_notes: partsNotes }, 'Dev: Status set to parts waiting');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('afs_maintenance_requests').update({
      maintenance_status: 'parts_waiting',
      parts_required: true,
      parts_notes: partsNotes || null,
    }).eq('id', id!);
    if (!error) {
      setRequest(prev => prev ? { ...prev, maintenance_status: 'parts_waiting', parts_required: true, parts_notes: partsNotes || null } : prev);
      void recordAfsAudit('parts_waiting', id!, 'Status set to parts waiting', profile?.id ?? null);
    }
    setSaving(false);
  }

  async function handleMarkInRepair() {
    const currentRequest = request;
    if (!currentRequest) return;
    if (!isSupabaseConfigured || !supabase) {
      devUpdate({ maintenance_status: 'in_repair' }, 'Dev: Status set to in repair');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('afs_maintenance_requests').update({
      maintenance_status: 'in_repair',
    }).eq('id', id!);
    if (!error) {
      setRequest(prev => prev ? { ...prev, maintenance_status: 'in_repair' } : prev);
      void recordAfsAudit('in_repair', id!, 'Status set to in repair', profile?.id ?? null);
    }
    setSaving(false);
  }

  async function handleComplete() {
    const currentRequest = request;
    if (!currentRequest) return;
    if (!resolutionNotes.trim()) { alert('Resolution notes are required to complete the request.'); return; }
    if (!isSupabaseConfigured || !supabase) {
      devUpdate({ maintenance_status: 'completed', resolution_notes: resolutionNotes, resolved_at: new Date().toISOString(), resolved_by: profile?.id ?? 'user' }, 'Dev: Request completed');
      return;
    }
    setSaving(true);
    const resolvedAt = new Date().toISOString();
    const { error } = await supabase.from('afs_maintenance_requests').update({
      maintenance_status: 'completed',
      resolution_notes: resolutionNotes,
      resolved_at: resolvedAt,
      resolved_by: profile?.id ?? null,
    }).eq('id', id!);
    if (!error) {
      setRequest(prev => prev ? { ...prev, maintenance_status: 'completed', resolution_notes: resolutionNotes, resolved_at: resolvedAt, resolved_by: profile?.id ?? null } : prev);
      void recordAfsEvent(currentRequest.project_id ?? '', 'maintenance_completed', `${currentRequest.maintenance_request_number} completed`, resolutionNotes, profile?.id ?? null, profile?.full_name ?? null, null);
      void recordAfsAudit('maintenance_completed', id!, `Request completed: ${currentRequest.maintenance_request_number}`, profile?.id ?? null);
    }
    setSaving(false);
  }

  async function handleClose() {
    const currentRequest = request;
    if (!currentRequest) return;
    if (!isSupabaseConfigured || !supabase) {
      devUpdate({ maintenance_status: 'closed', closed_at: new Date().toISOString(), closed_by: profile?.id ?? 'user' }, 'Dev: Request closed');
      return;
    }
    setSaving(true);
    const closedAt = new Date().toISOString();
    const { error } = await supabase.from('afs_maintenance_requests').update({
      maintenance_status: 'closed',
      closed_at: closedAt,
      closed_by: profile?.id ?? null,
    }).eq('id', id!);
    if (!error) {
      setRequest(prev => prev ? { ...prev, maintenance_status: 'closed', closed_at: closedAt, closed_by: profile?.id ?? null } : prev);
      void recordAfsAudit('maintenance_closed', id!, 'Request closed', profile?.id ?? null);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title={request.maintenance_request_number}
        subtitle="Maintenance Request"
        breadcrumb={[{ label: 'After Sales', href: '/after-sales' }, { label: 'Maintenance Requests', href: '/after-sales/maintenance' }, { label: request.maintenance_request_number }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={priorityVariant(request.priority)}>{request.priority}</Badge>
            <Badge variant={statusVariant(request.maintenance_status)}>{request.maintenance_status.replace(/_/g, ' ')}</Badge>
          </div>
        }
      />

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
            {request.inspected_at && <div className="flex justify-between"><span className="text-gray-500">Inspected</span><span>{formatDateTime(request.inspected_at)}</span></div>}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Description</h3>
          <p className="text-sm font-medium text-gray-700">{request.title}</p>
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
            <Button variant="secondary" size="sm" disabled={saving} onClick={handleStartInspection}>
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
                <Button variant="secondary" size="sm" disabled={saving} onClick={handleSaveInspection}>Save Notes</Button>
                {request.maintenance_status === 'under_inspection' && (
                  <>
                    <Button variant="secondary" size="sm" disabled={saving} onClick={handleMarkPartsWaiting}>
                      <Package size={14} className="mr-1" /> Parts Required
                    </Button>
                    <Button variant="secondary" size="sm" disabled={saving} onClick={handleMarkInRepair}>
                      <Wrench size={14} className="mr-1" /> Start Repair
                    </Button>
                  </>
                )}
                {request.maintenance_status === 'parts_waiting' && (
                  <Button variant="secondary" size="sm" disabled={saving} onClick={handleMarkInRepair}>
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
            <Button variant="primary" size="sm" disabled={saving} onClick={handleComplete}>
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
          <Button variant="secondary" size="sm" disabled={saving} onClick={handleClose}>Close Request</Button>
        </Card>
      )}

      {/* Resolution summary */}
      {request.resolved_at && (
        <Card className="p-5 bg-green-50 border-green-200">
          <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
            <CheckCircle size={15} /> Resolved
          </h3>
          {request.resolution_notes && <p className="text-sm text-green-700">{request.resolution_notes}</p>}
          <p className="text-xs text-green-600 mt-1">Resolved {formatDateTime(request.resolved_at)}</p>
        </Card>
      )}
    </div>
  );
}
