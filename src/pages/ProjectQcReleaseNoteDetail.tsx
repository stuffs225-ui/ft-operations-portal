import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileCheck, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  MOCK_RELEASE_NOTES,
  MOCK_MATERIAL_NCRS,
  MOCK_PROJECT_QC_FINDINGS,
  MOCK_PROJECT_QC_INSPECTIONS,
} from '../data/mockQc';
import type { ReleaseNote, UserRole } from '../types';
import { recordQcEvent, recordQcAudit } from '../lib/qcAudit';

const CAN_ISSUE: UserRole[] = ['admin', 'operations_manager', 'qc_user'];

interface Blocker {
  label: string;
  ok: boolean;
  detail: string;
}

function releaseVariant(r: string): 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'default' {
  if (r === 'issued') return 'success';
  if (r === 'ready_to_issue') return 'info';
  if (r === 'blocked') return 'critical';
  return 'neutral';
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

async function fetchLiveBlockers(projectId: string): Promise<Blocker[]> {
  if (!supabase) return [];
  const [ncrRes, findRes, reworkRes, inspRes] = await Promise.all([
    supabase.from('material_ncrs').select('*', { count: 'exact', head: true }).eq('project_id', projectId).not('ncr_status', 'in', '(closed,cancelled)'),
    supabase.from('project_qc_findings').select('*', { count: 'exact', head: true }).eq('project_id', projectId).not('finding_status', 'in', '(closed,cancelled)'),
    supabase.from('project_qc_findings').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('rework_required', true).is('rework_completed_at', null).not('finding_status', 'in', '(closed,cancelled)'),
    supabase.from('project_qc_inspections').select('id, readiness_status').eq('project_id', projectId),
  ]);
  const openNcrs = ncrRes.count ?? 0;
  const openFindings = findRes.count ?? 0;
  const openRework = reworkRes.count ?? 0;
  const inspections = (inspRes.data ?? []) as { id: string; readiness_status: string }[];
  const allInspectionsReady = inspections.length > 0 && inspections.every(i => i.readiness_status === 'ready_for_release' || i.readiness_status === 'released');
  return [
    { label: 'Material NCRs all closed', ok: openNcrs === 0, detail: openNcrs > 0 ? `${openNcrs} open NCR(s)` : '' },
    { label: 'Project QC inspection ready for release', ok: allInspectionsReady, detail: !allInspectionsReady ? 'QC inspection not ready' : '' },
    { label: 'All QC findings closed', ok: openFindings === 0, detail: openFindings > 0 ? `${openFindings} open finding(s)` : '' },
    { label: 'All rework completed', ok: openRework === 0, detail: openRework > 0 ? `${openRework} rework pending` : '' },
  ];
}

function mockBlockers(projectId: string): Blocker[] {
  const openNcrs = MOCK_MATERIAL_NCRS.filter(n => n.project_id === projectId && n.ncr_status !== 'closed' && n.ncr_status !== 'cancelled');
  const openFindings = MOCK_PROJECT_QC_FINDINGS.filter(f => f.project_id === projectId && f.finding_status !== 'closed' && f.finding_status !== 'cancelled');
  const openRework = MOCK_PROJECT_QC_FINDINGS.filter(f => f.project_id === projectId && f.rework_required && !f.rework_completed_at && f.finding_status !== 'closed');
  const qcInspections = MOCK_PROJECT_QC_INSPECTIONS.filter(i => i.project_id === projectId);
  const allInspectionsReady = qcInspections.length > 0 && qcInspections.every(i => i.readiness_status === 'ready_for_release' || i.readiness_status === 'released');
  return [
    { label: 'Material NCRs all closed', ok: openNcrs.length === 0, detail: openNcrs.length > 0 ? `${openNcrs.length} open NCR(s)` : '' },
    { label: 'Project QC inspection ready for release', ok: allInspectionsReady, detail: !allInspectionsReady ? 'QC inspection not ready' : '' },
    { label: 'All QC findings closed', ok: openFindings.length === 0, detail: openFindings.length > 0 ? `${openFindings.length} open finding(s)` : '' },
    { label: 'All rework completed', ok: openRework.length === 0, detail: openRework.length > 0 ? `${openRework.length} rework pending` : '' },
  ];
}

export function ProjectQcReleaseNoteDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, profile } = useAuth();
  const canIssue = role ? CAN_ISSUE.includes(role) : false;

  const [releaseNote, setReleaseNote] = useState<ReleaseNote | null>(null);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [devMessage, setDevMessage] = useState('');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const found = MOCK_RELEASE_NOTES.find(r => r.id === id);
        if (found) {
          setReleaseNote({ ...found });
          setRemarks(found.remarks ?? '');
          setBlockers(mockBlockers(found.project_id));
        } else {
          setNotFound(true);
        }
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('release_notes')
        .select('*, project:projects(project_code, customer_name, manufacturing_location), vehicle_line:project_vehicle_lines(vehicle_type, description)')
        .eq('id', id!)
        .single();
      if (!data) { setNotFound(true); }
      else {
        const rn = data as unknown as ReleaseNote;
        setReleaseNote(rn);
        setRemarks(rn.remarks ?? '');
        const liveBlockers = await fetchLiveBlockers(rn.project_id);
        setBlockers(liveBlockers);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <PageLoader />;
  if (notFound || !releaseNote) {
    return (
      <div className="text-center py-16 text-gray-500">
        Release note not found.{' '}
        <Link to="/project-qc/release-notes" className="text-sky-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  const canIssueNow = blockers.every(b => b.ok) && releaseNote.release_status !== 'issued';

  function devUpdate(patch: Partial<ReleaseNote>, message: string) {
    setReleaseNote(prev => prev ? { ...prev, ...patch } : prev);
    setDevMessage(message);
    setTimeout(() => setDevMessage(''), 3000);
  }

  async function handleIssue() {
    if (!releaseNote || !canIssueNow) return;
    if (!isSupabaseConfigured || !supabase) {
      devUpdate({ release_status: 'issued', issued_at: new Date().toISOString() }, 'Dev: Release Note issued — Project is Ready for Delivery');
      return;
    }
    setSaving(true);
    // Re-verify live blockers before issuing — governance gate is enforced at write time
    const liveBlockers = await fetchLiveBlockers(releaseNote.project_id);
    setBlockers(liveBlockers);
    if (!liveBlockers.every(b => b.ok)) {
      setSaving(false);
      return;
    }
    const issuedAt = new Date().toISOString();
    const { error } = await supabase.from('release_notes').update({
      release_status: 'issued',
      issued_at: issuedAt,
      issued_by: profile?.id ?? null,
      remarks: remarks || null,
    }).eq('id', id!);
    if (!error) {
      setReleaseNote(prev => prev ? { ...prev, release_status: 'issued', issued_at: issuedAt, issued_by: profile?.id ?? null } : prev);
      void recordQcEvent(releaseNote.project_id, 'release_note_issued', `Release Note ${releaseNote.release_note_number} issued`, remarks || null, profile?.id ?? null, profile?.full_name ?? null, null);
      void recordQcAudit('release_note_issued', id!, `Release Note ${releaseNote.release_note_number} issued`, profile?.id ?? null);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title={releaseNote.release_note_number}
        subtitle="Release Note"
        breadcrumb={[{ label: 'Project QC', href: '/project-qc' }, { label: 'Release Notes', href: '/project-qc/release-notes' }, { label: releaseNote.release_note_number }]}
        actions={<Badge variant={releaseVariant(releaseNote.release_status)}>{releaseNote.release_status.replace(/_/g, ' ')}</Badge>}
      />

      {devMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">{devMessage}</div>
      )}

      {releaseNote.release_status === 'issued' && (
        <div className="bg-green-50 border border-green-400 rounded-xl px-5 py-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Project Ready for Delivery</p>
            <p className="text-xs text-green-700 mt-0.5">Release Note issued {releaseNote.issued_at ? formatDateTime(releaseNote.issued_at) : ''}</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Release Note Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Project</span><span className="font-mono text-xs">{releaseNote.project?.project_code ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{releaseNote.project?.customer_name ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Vehicle Line</span><span>{releaseNote.vehicle_line?.vehicle_type ?? 'Whole Project'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="capitalize">{releaseNote.release_type.replace(/_/g, ' ')}</span></div>
            {releaseNote.issued_at && <div className="flex justify-between"><span className="text-gray-500">Issued</span><span>{formatDateTime(releaseNote.issued_at)}</span></div>}
            {releaseNote.issued_by_profile?.full_name && <div className="flex justify-between"><span className="text-gray-500">Issued By</span><span>{releaseNote.issued_by_profile.full_name}</span></div>}
          </div>
        </Card>

        {/* Readiness Checklist */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Readiness Checklist</h3>
          <div className="space-y-3">
            {blockers.map((b, i) => (
              <div key={i} className="flex items-start gap-3">
                {b.ok
                  ? <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                  : <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />}
                <div>
                  <p className={`text-sm font-medium ${b.ok ? 'text-gray-700' : 'text-red-700'}`}>{b.label}</p>
                  {b.detail && <p className="text-xs text-red-500 mt-0.5">{b.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Blocking details */}
      {!canIssueNow && releaseNote.release_status !== 'issued' && (
        <Card className="p-5 bg-red-50 border-red-200">
          <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={15} /> Release Blocked
          </h3>
          <p className="text-sm text-red-700 mb-2">The following must be resolved before issuing this Release Note:</p>
          <ul className="space-y-1">
            {blockers.filter(b => !b.ok).map((b, i) => (
              <li key={i} className="text-sm text-red-700 flex items-center gap-2">
                <XCircle size={13} /> {b.detail || b.label}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Issue action */}
      {canIssue && canIssueNow && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FileCheck size={15} className="text-green-500" /> Issue Release Note
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks (optional)</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              Upload Release Note document — requires Supabase storage configuration.
            </div>
            <Button variant="primary" size="sm" disabled={saving} onClick={handleIssue}>
              <FileCheck size={14} className="mr-1" /> Issue Release Note
            </Button>
          </div>
        </Card>
      )}

      {releaseNote.remarks && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Remarks</h3>
          <p className="text-sm text-gray-700">{releaseNote.remarks}</p>
        </Card>
      )}
    </div>
  );
}
