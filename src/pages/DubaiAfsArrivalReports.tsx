import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Plus, X, Check } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { nextDocNumber, insertWithDocNumberRetry } from '../lib/docNumbers';
import { MOCK_AFS_ARRIVAL_REPORTS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import type { AfsArrivalReport, ArrivalStatus, UserRole } from '../types';

type Tab = 'all' | ArrivalStatus;

// Arrival reports are written by AFS (and admin/ops) — mirrors the aar_afs_write /
// aar_admin_full INSERT policies in migration 043.
const CAN_REGISTER: UserRole[] = ['admin', 'operations_manager', 'afs_user'];

interface FollowupOption {
  id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  project_code: string;
  customer_name: string;
  vehicle_type: string | null;
}

// ── Register Arrival modal ──────────────────────────────────────────────────────
// A vehicle arrival is registered against an existing Dubai follow-up (the FK is
// NOT NULL in migration 043), carrying the follow-up's project + vehicle line.
function RegisterArrivalModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { profile } = useAuth();
  const [followups, setFollowups] = useState<FollowupOption[]>([]);
  const [loadingFollowups, setLoadingFollowups] = useState(isSupabaseConfigured);
  const [followupId, setFollowupId] = useState('');
  const [arrivalDate, setArrivalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [arrivalStatus, setArrivalStatus] = useState<ArrivalStatus>('arrived');
  const [expectedQty, setExpectedQty] = useState('1');
  const [receivedQty, setReceivedQty] = useState('1');
  const [storageLocation, setStorageLocation] = useState('');
  const [conditionOnArrival, setConditionOnArrival] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const sb = supabase;
    (async () => {
      const { data } = await sb
        .from('dubai_project_followups')
        .select('id, project_id, project_vehicle_line_id, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type)')
        .not('dubai_status', 'in', '("cancelled")')
        .order('updated_at', { ascending: false });
      const rows = ((data ?? []) as unknown as {
        id: string; project_id: string; project_vehicle_line_id: string | null;
        project?: { project_code: string; customer_name: string } | null;
        vehicle_line?: { vehicle_type: string | null } | null;
      }[]).map((f) => ({
        id: f.id,
        project_id: f.project_id,
        project_vehicle_line_id: f.project_vehicle_line_id,
        project_code: f.project?.project_code ?? '—',
        customer_name: f.project?.customer_name ?? '—',
        vehicle_type: f.vehicle_line?.vehicle_type ?? null,
      }));
      setFollowups(rows);
      setLoadingFollowups(false);
    })();
  }, []);

  const selected = followups.find((f) => f.id === followupId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured || !supabase) { onSuccess(); onClose(); return; }
    if (!followupId || !selected) { setError('Select a Dubai follow-up.'); return; }
    const sb = supabase;

    setSaving(true);
    const year = new Date(arrivalDate).getFullYear();
    const { error: insErr } = await insertWithDocNumberRetry(
      () => nextDocNumber({ table: 'afs_arrival_reports', column: 'arrival_report_number', prefix: `ARR-${year}-` }),
      (arrival_report_number) => sb.from('afs_arrival_reports').insert({
        dubai_followup_id: selected.id,
        project_id: selected.project_id,
        project_vehicle_line_id: selected.project_vehicle_line_id,
        arrival_report_number,
        arrival_date: arrivalDate,
        arrival_status: arrivalStatus,
        received_quantity: Number(receivedQty) || 0,
        expected_quantity: Number(expectedQty) || 0,
        storage_location: storageLocation.trim() || null,
        condition_on_arrival: conditionOnArrival.trim() || null,
        received_by: profile?.id ?? null,
        created_by: profile?.id ?? null,
      }),
    );
    if (insErr) { setError(insErr.message); setSaving(false); return; }
    setSaving(false);
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Register Arrival</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isSupabaseConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">Dev mode — not persisted.</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Dubai Follow-up <span className="text-red-500">*</span></label>
            {loadingFollowups ? (
              <input disabled placeholder="Loading follow-ups…" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400" />
            ) : followups.length === 0 && isSupabaseConfigured ? (
              <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-2">
                No active Dubai follow-ups. Start one from the Follow-ups page first.
              </p>
            ) : (
              <select value={followupId} onChange={(e) => setFollowupId(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="">Select follow-up…</option>
                {followups.map((f) => (
                  <option key={f.id} value={f.id}>{f.project_code} — {f.customer_name}{f.vehicle_type ? ` · ${f.vehicle_type}` : ''}</option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Arrival Date <span className="text-red-500">*</span></label>
              <input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
              <select value={arrivalStatus} onChange={(e) => setArrivalStatus(e.target.value as ArrivalStatus)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="arrived">Arrived</option>
                <option value="partially_arrived">Partially arrived</option>
                <option value="pending">Pending</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expected Qty</label>
              <input type="number" min="0" value={expectedQty} onChange={(e) => setExpectedQty(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Received Qty</label>
              <input type="number" min="0" value={receivedQty} onChange={(e) => setReceivedQty(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Storage Location</label>
            <input value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} placeholder="e.g. Yard B, Bay 12"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Condition on Arrival</label>
            <textarea value={conditionOnArrival} onChange={(e) => setConditionOnArrival(e.target.value)} rows={2} placeholder="Notes on condition, damage, etc."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">{error}</div>}
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving} disabled={!followupId && isSupabaseConfigured} icon={<Check size={14} />}>Register Arrival</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'partially_arrived', label: 'Partial' },
  { key: 'pending', label: 'Pending' },
  { key: 'delayed', label: 'Delayed' },
];

function arrivalVariant(s: ArrivalStatus): 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'arrived') return 'success';
  if (s === 'partially_arrived') return 'warning';
  if (s === 'delayed') return 'critical';
  return 'neutral';
}

export function DubaiAfsArrivalReports() {
  const { role } = useAuth();
  const canRegister = role ? CAN_REGISTER.includes(role as UserRole) : false;
  const [items, setItems] = useState<AfsArrivalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [showRegister, setShowRegister] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems(mockOrEmpty(MOCK_AFS_ARRIVAL_REPORTS));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('afs_arrival_reports')
        .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description)')
        .order('arrival_date', { ascending: false });
      setItems((data as unknown as AfsArrivalReport[]) ?? []);
      setLoading(false);
    })();
  }, [reloadKey]);

  const reports = items.filter(r => tab === 'all' ? true : r.arrival_status === tab);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Arrival Reports"
        subtitle="AFS vehicle arrival registrations and condition on arrival"
        breadcrumb={[{ label: 'Dubai / AFS', href: '/dubai-afs' }, { label: 'Arrival Reports' }]}
        actions={canRegister ? (
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowRegister(true)}>Register Arrival</Button>
        ) : undefined}
      />
      <DataSourceBadge variant="auto" />

      {showRegister && (
        <RegisterArrivalModal onClose={() => setShowRegister(false)} onSuccess={() => setReloadKey((k) => k + 1)} />
      )}

      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-white border border-b-white border-gray-100 text-sky-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <Card>
          {reports.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">No arrival reports found.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {reports.map(r => (
                <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Plane size={14} className="text-sky-500" />
                      <span className="text-sm font-mono font-semibold text-sky-700">{r.arrival_report_number}</span>
                      <Badge variant={arrivalVariant(r.arrival_status)}>{r.arrival_status.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="text-sm text-gray-700 mt-1">{r.project?.customer_name} — {r.vehicle_line?.vehicle_type ?? 'Project-wide'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Arrived: {new Date(r.arrival_date).toLocaleDateString('en-GB')} ·
                      {r.received_quantity}/{r.expected_quantity} units ·
                      {r.storage_location ?? 'No location set'}
                    </div>
                  </div>
                  <Link to={`/dubai-afs/arrival-reports/${r.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
