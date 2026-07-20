import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plane, Clock, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_DUBAI_FOLLOWUPS, MOCK_DUBAI_ETA_HISTORY } from '../data/mockAfs';
import { recordAfsEvent, recordAfsAudit } from '../lib/afsAudit';
import type { DubaiProjectFollowup, DubaiEtaHistory, UserRole } from '../types';

const CAN_UPDATE: UserRole[] = ['admin', 'operations_manager'];

function etaVariant(s: string): 'neutral' | 'warning' | 'success' | 'info' | 'critical' | 'default' {
  if (s === 'delayed') return 'warning';
  if (s === 'on_track') return 'success';
  if (s === 'arrived') return 'info';
  return 'neutral';
}

export function DubaiAfsProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, profile } = useAuth();
  const canUpdate = role ? CAN_UPDATE.includes(role) : false;

  const [followup, setFollowup] = useState<DubaiProjectFollowup | undefined>(undefined);
  const [etaHistory, setEtaHistory] = useState<DubaiEtaHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [devMessage, setDevMessage] = useState('');
  const [newEta, setNewEta] = useState('');
  const [etaReason, setEtaReason] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const base = MOCK_DUBAI_FOLLOWUPS.find(f => f.id === id);
        setFollowup(base);
        setEtaHistory(MOCK_DUBAI_ETA_HISTORY.filter(h => h.dubai_followup_id === id));
        setLoading(false);
        return;
      }
      const [fpRes, histRes] = await Promise.all([
        supabase
          .from('dubai_project_followups')
          .select('*, project:projects(project_code, customer_name, manufacturing_location), vehicle_line:project_vehicle_lines(vehicle_type, description, quantity)')
          .eq('id', id!)
          .single(),
        supabase
          .from('dubai_eta_history')
          .select('*')
          .eq('dubai_followup_id', id!)
          .order('changed_at', { ascending: false }),
      ]);
      setFollowup((fpRes.data as unknown as DubaiProjectFollowup) ?? undefined);
      setEtaHistory((histRes.data as unknown as DubaiEtaHistory[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <PageLoader />;

  if (!followup) {
    return (
      <div className="text-center py-16 text-gray-500">
        Follow-up not found.{' '}
        <Link to="/dubai-afs/projects" className="text-sky-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  function devUpdate(patch: Partial<DubaiProjectFollowup>, msg: string) {
    setFollowup(prev => prev ? { ...prev, ...patch } : prev);
    setDevMessage(msg);
    setTimeout(() => setDevMessage(''), 3000);
  }

  async function handleUpdateEta() {
    if (!followup) return;
    if (!newEta) { setSaveError('New ETA date is required.'); return; }
    if (!etaReason.trim()) { setSaveError('Reason for ETA change is required.'); return; }
    if (!followup.pn_reference_id) { setSaveError('PN is required before updating Dubai follow-up.'); return; }
    setSaveError(null);

    if (!isSupabaseConfigured || !supabase) {
      devUpdate({ eta_date: newEta, eta_status: 'changed' }, 'Dev: ETA updated');
      setNewEta(''); setEtaReason('');
      return;
    }

    const { error } = await supabase
      .from('dubai_project_followups')
      .update({ eta_date: newEta, eta_status: 'changed' })
      .eq('id', id!);
    if (error) { setSaveError(error.message); return; }

    if (profile?.id) {
      const { error: histErr } = await supabase.from('dubai_eta_history').insert({
        dubai_followup_id: id!,
        project_id: followup.project_id,
        new_eta: newEta,
        old_eta: followup.eta_date,
        changed_by: profile.id,
        changed_at: new Date().toISOString(),
        reason: etaReason,
      });
      if (histErr) {
        // The reason lives only in this history row (governance: every ETA change
        // needs a documented reason) — losing it silently is not acceptable.
        setSaveError(`ETA saved, but the change reason could not be recorded: ${histErr.message}`);
      }
    }

    void recordAfsEvent(followup.project_id, 'eta_changed', `ETA updated for ${followup.project?.project_code}`, etaReason, profile?.id ?? null, profile?.full_name ?? null, { old_eta: followup.eta_date, new_eta: newEta });
    void recordAfsAudit('eta_changed', id!, `ETA changed for follow-up ${id}`, profile?.id ?? null);

    setFollowup(prev => prev ? { ...prev, eta_date: newEta, eta_status: 'changed' } : prev);
    setEtaHistory(prev => profile?.id ? [{ id: `tmp-${Date.now()}`, dubai_followup_id: id!, project_id: followup.project_id, project_vehicle_line_id: null, old_eta: followup.eta_date, new_eta: newEta, changed_by: profile.id, changed_at: new Date().toISOString(), reason: etaReason, remarks: null }, ...prev] : prev);
    setNewEta(''); setEtaReason('');
  }

  async function handleUpdateRemarks() {
    if (!followup) return;
    if (!followup.pn_reference_id) { setSaveError('PN is required before updating Dubai follow-up.'); return; }
    setSaveError(null);

    if (!isSupabaseConfigured || !supabase) {
      devUpdate({ remarks }, 'Dev: Remarks updated');
      return;
    }

    const { error } = await supabase
      .from('dubai_project_followups')
      .update({ remarks: remarks.trim() || null })
      .eq('id', id!);
    if (error) { setSaveError(error.message); return; }

    void recordAfsAudit('followup_updated', id!, 'Follow-up remarks updated', profile?.id ?? null);
    setFollowup(prev => prev ? { ...prev, remarks: remarks.trim() || null } : prev);
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link to="/dubai-afs/projects" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader
          title={followup.project?.project_code ?? 'Dubai Follow-up'}
          subtitle={followup.vehicle_line?.vehicle_type ?? 'Project-wide'}
          breadcrumb={[{ label: 'Dubai / AFS', href: '/dubai-afs' }, { label: 'Follow-ups', href: '/dubai-afs/projects' }, { label: followup.project?.project_code ?? id! }]}
        />
        <Badge variant={etaVariant(followup.eta_status)}>{followup.eta_status.replace(/_/g, ' ')}</Badge>
      </div>

      {!followup.pn_reference_id && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle size={16} /> PN not confirmed — Dubai tracking is blocked until PN is entered via the WO/PN Gate.
        </div>
      )}

      {devMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">{devMessage}</div>
      )}

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{saveError}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Follow-up Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Project</span><span className="font-mono text-xs">{followup.project?.project_code}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{followup.project?.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Vehicle Line</span><span>{followup.vehicle_line?.vehicle_type ?? 'Project-wide'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Dubai PO</span><span>{followup.dubai_po_number ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Dubai PO Date</span><span>{followup.dubai_po_date ? new Date(followup.dubai_po_date).toLocaleDateString('en-GB') : '—'}</span></div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">ETA & Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge variant="neutral">{followup.dubai_status.replace(/_/g, ' ')}</Badge></div>
            <div className="flex justify-between"><span className="text-gray-500">ETA Date</span><span>{followup.eta_date ? new Date(followup.eta_date).toLocaleDateString('en-GB') : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">ETA Status</span><Badge variant={etaVariant(followup.eta_status)}>{followup.eta_status.replace(/_/g, ' ')}</Badge></div>
            <div className="flex justify-between"><span className="text-gray-500">Last Follow-up</span><span>{followup.last_followup_date ? new Date(followup.last_followup_date).toLocaleDateString('en-GB') : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Next Follow-up</span><span>{followup.next_followup_date ? new Date(followup.next_followup_date).toLocaleDateString('en-GB') : '—'}</span></div>
          </div>
        </Card>
      </div>

      {canUpdate && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock size={15} className="text-amber-500" /> Update ETA
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New ETA Date <span className="text-red-500">*</span></label>
              <input type="date" value={newEta} onChange={e => setNewEta(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason <span className="text-red-500">*</span></label>
              <input type="text" value={etaReason} onChange={e => setEtaReason(e.target.value)}
                placeholder="Reason for change"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
          </div>
          <Button variant="primary" size="sm" className="mt-3" onClick={handleUpdateEta}>
            <Plane size={14} className="mr-1" /> Update ETA
          </Button>
        </Card>
      )}

      {canUpdate && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Remarks</h3>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
            placeholder="Add follow-up remarks…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
          <Button variant="secondary" size="sm" className="mt-2" onClick={handleUpdateRemarks}>Save Remarks</Button>
        </Card>
      )}

      <Card>
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">ETA Change History ({etaHistory.length})</h3>
        </div>
        {etaHistory.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">No ETA changes recorded.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {etaHistory.map(h => (
              <div key={h.id} className="px-5 py-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-500">{new Date(h.changed_at).toLocaleDateString('en-GB')}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium">{new Date(h.new_eta).toLocaleDateString('en-GB')}</span>
                  {h.old_eta && <span className="text-xs text-gray-400">(was {new Date(h.old_eta).toLocaleDateString('en-GB')})</span>}
                </div>
                <p className="text-xs text-gray-600 mt-1">{h.reason}</p>
                {h.remarks && <p className="text-xs text-gray-400 mt-0.5">{h.remarks}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
