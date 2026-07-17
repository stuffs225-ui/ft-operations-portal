import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, CheckCircle2, XCircle, AlertTriangle, ChevronRight, Plus, X, Check } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { nextDocNumber, insertWithDocNumberRetry } from '../lib/docNumbers';
import { MOCK_AFS_PREDELIVERY_REPORTS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import type { AfsPredeliveryReport, UserRole } from '../types';

type Tab = 'not_ready' | 'ready' | 'all';

// Pre-delivery reports are written by AFS + QC (and admin/ops) — mirrors the
// apdr_afs_write / apdr_admin_full INSERT policies in migration 045.
const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'afs_user', 'qc_user'];

interface ArrivalOption {
  id: string;
  project_id: string;
  project_vehicle_line_id: string | null;
  arrival_report_number: string;
  project_code: string;
  customer_name: string;
}

// ── New Pre-Delivery Report modal ───────────────────────────────────────────────
// Built from an arrival report that has no pre-delivery report yet (the FK is
// NOT NULL in migration 045). ready_for_delivery stays false: the QC Release Note
// gate (migration 076, R-015) governs delivery readiness, not this creation step.
function NewPredeliveryModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { profile } = useAuth();
  const [arrivals, setArrivals] = useState<ArrivalOption[]>([]);
  const [loadingArrivals, setLoadingArrivals] = useState(isSupabaseConfigured);
  const [arrivalId, setArrivalId] = useState('');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [chassisNumber, setChassisNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const sb = supabase;
    (async () => {
      const [arrRes, pdrRes] = await Promise.all([
        sb.from('afs_arrival_reports')
          .select('id, project_id, project_vehicle_line_id, arrival_report_number, project:projects(project_code, customer_name)')
          .order('arrival_date', { ascending: false }),
        sb.from('afs_predelivery_reports').select('arrival_report_id'),
      ]);
      const used = new Set((pdrRes.data ?? []).map((r) => (r as { arrival_report_id: string }).arrival_report_id));
      const rows = ((arrRes.data ?? []) as unknown as {
        id: string; project_id: string; project_vehicle_line_id: string | null; arrival_report_number: string;
        project?: { project_code: string; customer_name: string } | null;
      }[])
        .filter((a) => !used.has(a.id))
        .map((a) => ({
          id: a.id,
          project_id: a.project_id,
          project_vehicle_line_id: a.project_vehicle_line_id,
          arrival_report_number: a.arrival_report_number,
          project_code: a.project?.project_code ?? '—',
          customer_name: a.project?.customer_name ?? '—',
        }));
      setArrivals(rows);
      setLoadingArrivals(false);
    })();
  }, []);

  const selected = arrivals.find((a) => a.id === arrivalId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured || !supabase) { onSuccess(); onClose(); return; }
    if (!arrivalId || !selected) { setError('Select an arrival report.'); return; }
    const sb = supabase;

    setSaving(true);
    const year = new Date(reportDate).getFullYear();
    const { error: insErr } = await insertWithDocNumberRetry(
      () => nextDocNumber({ table: 'afs_predelivery_reports', column: 'predelivery_report_number', prefix: `PDR-${year}-` }),
      (predelivery_report_number) => sb.from('afs_predelivery_reports').insert({
        arrival_report_id: selected.id,
        project_id: selected.project_id,
        project_vehicle_line_id: selected.project_vehicle_line_id,
        predelivery_report_number,
        report_date: reportDate,
        chassis_number: chassisNumber.trim() || null,
        readiness_status: 'pending',
        inspector_id: profile?.id ?? null,
        created_by: profile?.id ?? null,
        remarks: remarks.trim() || null,
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
          <h3 className="text-sm font-semibold text-gray-900">New Pre-Delivery Report</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isSupabaseConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">Dev mode — not persisted.</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Arrival Report <span className="text-red-500">*</span></label>
            {loadingArrivals ? (
              <input disabled placeholder="Loading arrival reports…" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400" />
            ) : arrivals.length === 0 && isSupabaseConfigured ? (
              <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-2">
                No arrival reports without a pre-delivery report. Register an arrival first.
              </p>
            ) : (
              <select value={arrivalId} onChange={(e) => setArrivalId(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="">Select arrival report…</option>
                {arrivals.map((a) => (
                  <option key={a.id} value={a.id}>{a.arrival_report_number} — {a.project_code} — {a.customer_name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Report Date <span className="text-red-500">*</span></label>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Chassis Number</label>
              <input value={chassisNumber} onChange={(e) => setChassisNumber(e.target.value)} placeholder="Optional"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Remarks</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Optional"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 text-xs text-gray-600">
            Created as <span className="font-medium">Not Ready</span>. The QC Release Note is required before this report can be marked ready for delivery.
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">{error}</div>}
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving} disabled={!arrivalId && isSupabaseConfigured} icon={<Check size={14} />}>Create Report</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'not_ready', label: 'Not Ready' },
  { key: 'ready', label: 'Ready for Delivery' },
  { key: 'all', label: 'All' },
];

function readinessVariant(r: AfsPredeliveryReport) {
  if (r.ready_for_delivery && r.release_note_issued) return 'success';
  if (r.ready_for_delivery && !r.release_note_issued) return 'warning';
  return 'critical';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function DubaiAfsPredeliveryReports() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role as UserRole) : false;
  const [items, setItems] = useState<AfsPredeliveryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('not_ready');
  const [showCreate, setShowCreate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems(mockOrEmpty(MOCK_AFS_PREDELIVERY_REPORTS));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('afs_predelivery_reports')
        .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description)')
        .order('report_date', { ascending: false });
      setItems((data as unknown as AfsPredeliveryReport[]) ?? []);
      setLoading(false);
    })();
  }, [reloadKey]);

  const tabCounts = {
    not_ready: items.filter(r => !r.ready_for_delivery).length,
    ready: items.filter(r => r.ready_for_delivery).length,
    all: items.length,
  };

  const reports = items.filter(r => {
    if (tab === 'ready') return r.ready_for_delivery;
    if (tab === 'not_ready') return !r.ready_for_delivery;
    return true;
  });

  const blockers = reports.filter(r => !r.ready_for_delivery && (r.open_missing_items > 0 || r.open_ncrs > 0));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pre-Delivery Readiness"
        subtitle="AFS pre-delivery readiness checks and delivery approval. QC Release Note is required before marking ready for delivery."
        breadcrumb={[{ label: 'AFS Dashboard', href: '/dubai-afs' }, { label: 'Pre-Delivery Reports' }]}
        actions={
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>New Report</Button>
            )}
            <DataSourceBadge variant="auto" />
          </div>
        }
      />

      {showCreate && (
        <NewPredeliveryModal onClose={() => setShowCreate(false)} onSuccess={() => setReloadKey((k) => k + 1)} />
      )}

      {!loading && blockers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-800">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <span>
            <strong>{blockers.length}</strong> report{blockers.length !== 1 ? 's' : ''} have open missing items or NCRs — pre-delivery cannot be approved until all issues are resolved.
          </span>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'text-sky-700 border-b-2 border-sky-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            {!loading && tabCounts[t.key] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${tab === t.key ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-500'}`}>
                {tabCounts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No reports found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Report</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Checklist</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Issues</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Readiness</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Release Note</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Report Date</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reports.map(r => {
                  const hasIssues = r.open_missing_items > 0 || r.open_ncrs > 0;
                  return (
                    <tr key={r.id} className={`hover:bg-gray-50 ${!r.ready_for_delivery ? 'bg-orange-50/20' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <FileSearch size={13} className="text-sky-400 shrink-0" />
                          <span className="font-mono text-xs text-sky-700 font-semibold">{r.predelivery_report_number}</span>
                        </div>
                        {r.chassis_number && (
                          <div className="text-xs text-gray-500 mt-0.5 ml-5">Chassis: {r.chassis_number}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="font-mono text-xs text-sky-700">{r.project?.project_code ?? '—'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{r.vehicle_line?.vehicle_type ?? 'Project-wide'}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-sky-500 h-1.5 rounded-full"
                              style={{ width: r.checklist_items_total > 0 ? `${(r.checklist_items_passed / r.checklist_items_total) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{r.checklist_items_passed}/{r.checklist_items_total}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {hasIssues ? (
                          <div className="text-xs space-y-0.5">
                            {r.open_missing_items > 0 && (
                              <div className="text-red-600 flex items-center gap-1">
                                <XCircle size={10} /> {r.open_missing_items} missing
                              </div>
                            )}
                            {r.open_ncrs > 0 && (
                              <div className="text-red-600 flex items-center gap-1">
                                <XCircle size={10} /> {r.open_ncrs} NCR{r.open_ncrs !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Clear
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={readinessVariant(r)}>
                          {r.ready_for_delivery ? 'Ready' : 'Not Ready'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {r.release_note_issued
                          ? <Badge variant="success"><CheckCircle2 size={10} className="mr-1" />Issued</Badge>
                          : <Badge variant="critical"><XCircle size={10} className="mr-1" />Not Issued</Badge>
                        }
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{formatDate(r.report_date)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/dubai-afs/predelivery-reports/${r.id}`}>
                          <Button variant="ghost" size="sm">
                            View <ChevronRight size={12} />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
