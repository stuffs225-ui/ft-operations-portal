import { useState, useEffect } from 'react';
import { Wrench, Plus, X, Check } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { nextDocNumber, insertWithDocNumberRetry } from '../lib/docNumbers';
import { MOCK_AFS_CONDITION_REPORTS } from '../data/mockAfs';
import { mockOrEmpty } from '../lib/dataMode';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import type { AfsConditionReport, ConditionReportStatus, ConditionStatus, UserRole } from '../types';

type Tab = 'all' | ConditionReportStatus;

// Condition reports are written by AFS (and admin/ops) — mirrors the acr_afs_all /
// acr_admin_full INSERT policies in migration 046.
const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'afs_user'];

interface ProjectOption {
  id: string;
  project_vehicle_line_id: string | null;
  project_code: string;
  customer_name: string;
  vehicle_type: string | null;
}

// ── New Condition Report modal ──────────────────────────────────────────────────
// Raised against a project that is being followed in Dubai (post-arrival condition
// assessment). description is NOT NULL in migration 046.
function NewConditionModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(isSupabaseConfigured);
  const [projectId, setProjectId] = useState('');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [chassisNumber, setChassisNumber] = useState('');
  const [overallCondition, setOverallCondition] = useState<ConditionStatus>('good');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const sb = supabase;
    (async () => {
      // Projects under Dubai follow-up are the ones AFS can assess on arrival.
      const { data } = await sb
        .from('dubai_project_followups')
        .select('project_id, project_vehicle_line_id, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type)')
        .order('updated_at', { ascending: false });
      const seen = new Set<string>();
      const rows: ProjectOption[] = [];
      for (const f of (data ?? []) as unknown as {
        project_id: string; project_vehicle_line_id: string | null;
        project?: { project_code: string; customer_name: string } | null;
        vehicle_line?: { vehicle_type: string | null } | null;
      }[]) {
        const key = `${f.project_id}:${f.project_vehicle_line_id ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          id: f.project_id,
          project_vehicle_line_id: f.project_vehicle_line_id,
          project_code: f.project?.project_code ?? '—',
          customer_name: f.project?.customer_name ?? '—',
          vehicle_type: f.vehicle_line?.vehicle_type ?? null,
        });
      }
      setProjects(rows);
      setLoadingProjects(false);
    })();
  }, []);

  const selectedKey = projectId;
  const selected = projects.find((p) => `${p.id}:${p.project_vehicle_line_id ?? ''}` === selectedKey);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured || !supabase) { onSuccess(); onClose(); return; }
    if (!selected) { setError('Select a project.'); return; }
    if (!description.trim()) { setError('Description is required.'); return; }
    const sb = supabase;

    setSaving(true);
    const year = new Date(reportDate).getFullYear();
    const { error: insErr } = await insertWithDocNumberRetry(
      () => nextDocNumber({ table: 'afs_condition_reports', column: 'condition_report_number', prefix: `CND-${year}-` }),
      (condition_report_number) => sb.from('afs_condition_reports').insert({
        project_id: selected.id,
        project_vehicle_line_id: selected.project_vehicle_line_id,
        condition_report_number,
        report_date: reportDate,
        chassis_number: chassisNumber.trim() || null,
        overall_condition: overallCondition,
        report_status: 'open',
        description: description.trim(),
        reported_by: profile?.id ?? null,
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
          <h3 className="text-sm font-semibold text-gray-900">New Condition Report</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isSupabaseConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">Dev mode — not persisted.</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Project <span className="text-red-500">*</span></label>
            {loadingProjects ? (
              <input disabled placeholder="Loading projects…" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400" />
            ) : projects.length === 0 && isSupabaseConfigured ? (
              <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-2">
                No Dubai projects under follow-up. Start a follow-up first.
              </p>
            ) : (
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={`${p.id}:${p.project_vehicle_line_id ?? ''}`} value={`${p.id}:${p.project_vehicle_line_id ?? ''}`}>
                    {p.project_code} — {p.customer_name}{p.vehicle_type ? ` · ${p.vehicle_type}` : ''}
                  </option>
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
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Overall Condition</label>
              <select value={overallCondition} onChange={(e) => setOverallCondition(e.target.value as ConditionStatus)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="good">Good</option>
                <option value="minor_damage">Minor damage</option>
                <option value="major_damage">Major damage</option>
                <option value="requires_repair">Requires repair</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Chassis Number</label>
            <input value={chassisNumber} onChange={(e) => setChassisNumber(e.target.value)} placeholder="Optional"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description <span className="text-red-500">*</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required placeholder="Describe the condition / findings"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">{error}</div>}
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving} disabled={!projectId && isSupabaseConfigured} icon={<Check size={14} />}>Create Report</Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

function condVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'open') return 'critical';
  if (s === 'under_review') return 'warning';
  if (s === 'resolved' || s === 'closed') return 'success';
  return 'neutral';
}

function overallVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'major_damage' || s === 'requires_repair') return 'critical';
  if (s === 'minor_damage') return 'warning';
  if (s === 'good') return 'success';
  return 'neutral';
}

export function DubaiAfsConditionReports() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role as UserRole) : false;
  const [items, setItems] = useState<AfsConditionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setItems(mockOrEmpty(MOCK_AFS_CONDITION_REPORTS));
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('afs_condition_reports')
        .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description)')
        .order('report_date', { ascending: false });
      setItems((data as unknown as AfsConditionReport[]) ?? []);
      setLoading(false);
    })();
  }, [reloadKey]);

  const reports = items.filter(r => tab === 'all' ? true : r.report_status === tab);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Condition Reports"
        subtitle="Post-arrival vehicle condition assessments"
        breadcrumb={[{ label: 'Dubai / AFS', href: '/dubai-afs' }, { label: 'Condition Reports' }]}
        actions={canCreate ? (
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>New Report</Button>
        ) : undefined}
      />
      <DataSourceBadge variant="auto" />

      {showCreate && (
        <NewConditionModal onClose={() => setShowCreate(false)} onSuccess={() => setReloadKey((k) => k + 1)} />
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
            <div className="px-5 py-10 text-center text-sm text-gray-400">No condition reports found.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {reports.map(r => (
                <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Wrench size={14} className="text-purple-500" />
                      <span className="text-sm font-mono font-semibold text-sky-700">{r.condition_report_number}</span>
                      <Badge variant={overallVariant(r.overall_condition)}>{r.overall_condition.replace(/_/g, ' ')}</Badge>
                      <Badge variant={condVariant(r.report_status)}>{r.report_status.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="text-sm text-gray-700 mt-1">{r.project?.customer_name} — {r.vehicle_line?.vehicle_type ?? 'Project-wide'}</div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{r.description}</p>
                  </div>
                  <Button variant="ghost" size="sm" disabled>View</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
