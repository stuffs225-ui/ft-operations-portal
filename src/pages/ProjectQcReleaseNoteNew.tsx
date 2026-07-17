// Create a Release Note (draft). The R-015 gate (migration 076) blocks
// advancing a note to ready_to_issue/issued while any QC finding/NCR is open —
// so creation is always allowed as a draft, and this page shows the live gate
// status up-front so QC knows what still blocks issuance. Issuing itself happens
// on the Release Note detail page, which enforces the same checklist.

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileCheck, ArrowLeft, Check, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ProjectOption {
  id: string;
  project_code: string;
  so_number: string;
  customer_name: string;
}

interface VehicleLineOption {
  id: string;
  vehicle_type: string;
  description: string | null;
}

interface Blocker { label: string; ok: boolean; detail: string }

type ReleaseType = 'project_release' | 'vehicle_line_release' | 'partial_release';

async function fetchBlockers(projectId: string, vehicleLineId: string): Promise<Blocker[]> {
  if (!supabase) return [];
  const scopedFindings = vehicleLineId
    ? supabase.from('project_qc_findings').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('project_vehicle_line_id', vehicleLineId).not('finding_status', 'in', '(closed,cancelled)')
    : supabase.from('project_qc_findings').select('*', { count: 'exact', head: true }).eq('project_id', projectId).not('finding_status', 'in', '(closed,cancelled)');
  const [ncrRes, findRes, inspRes] = await Promise.all([
    supabase.from('material_ncrs').select('*', { count: 'exact', head: true }).eq('project_id', projectId).not('ncr_status', 'in', '(closed,cancelled)'),
    scopedFindings,
    supabase.from('project_qc_inspections').select('id, readiness_status').eq('project_id', projectId),
  ]);
  const openNcrs = ncrRes.count ?? 0;
  const openFindings = findRes.count ?? 0;
  const inspections = (inspRes.data ?? []) as { id: string; readiness_status: string }[];
  const allInspectionsReady = inspections.length > 0 && inspections.every(i => i.readiness_status === 'ready_for_release' || i.readiness_status === 'released');
  return [
    { label: 'Material NCRs all closed', ok: openNcrs === 0, detail: openNcrs > 0 ? `${openNcrs} open NCR(s)` : '' },
    { label: 'Project QC inspection ready for release', ok: allInspectionsReady, detail: !allInspectionsReady ? 'QC inspection not ready' : '' },
    { label: 'All QC findings closed', ok: openFindings === 0, detail: openFindings > 0 ? `${openFindings} open finding(s)` : '' },
  ];
}

export function ProjectQcReleaseNoteNew() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [releaseType, setReleaseType] = useState<ReleaseType>('project_release');
  const [lines, setLines] = useState<VehicleLineOption[]>([]);
  const [vehicleLineId, setVehicleLineId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [blockers, setBlockers] = useState<Blocker[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase
      .from('projects')
      .select('id, project_code, so_number, customer_name')
      .in('project_status', ['approved', 'active'])
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => setProjects((data as ProjectOption[]) ?? []));
  }, []);

  useEffect(() => {
    if (!projectId || !isSupabaseConfigured || !supabase) {
      void Promise.resolve().then(() => { setLines([]); setBlockers(null); setVehicleLineId(''); });
      return;
    }
    (async () => {
      const { data } = await supabase!
        .from('project_vehicle_lines_safe')
        .select('id, vehicle_type, description')
        .eq('project_id', projectId);
      setLines((data as VehicleLineOption[]) ?? []);
      setVehicleLineId('');
    })();
  }, [projectId]);

  // Refresh the R-015 gate preview whenever the scope changes.
  useEffect(() => {
    if (!projectId || !isSupabaseConfigured || !supabase) {
      void Promise.resolve().then(() => setBlockers(null));
      return;
    }
    let cancelled = false;
    void fetchBlockers(projectId, releaseType === 'vehicle_line_release' ? vehicleLineId : '')
      .then((b) => { if (!cancelled) setBlockers(b); });
    return () => { cancelled = true; };
  }, [projectId, vehicleLineId, releaseType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      navigate('/project-qc/release-notes');
      return;
    }
    if (!projectId) {
      setError('Select a project.');
      return;
    }
    if (releaseType === 'vehicle_line_release' && !vehicleLineId) {
      setError('Select the vehicle line for a vehicle-line release.');
      return;
    }

    setSaving(true);

    const { data, error: insErr } = await supabase
      .from('release_notes')
      .insert({
        project_id: projectId,
        release_type: releaseType,
        project_vehicle_line_id: releaseType === 'vehicle_line_release' ? vehicleLineId : null,
        release_status: 'draft',
        remarks: remarks.trim() || null,
        created_by: profile?.id ?? null,
      })
      .select('id')
      .single();

    if (insErr) {
      setError(insErr.message);
      setSaving(false);
      return;
    }

    navigate(`/project-qc/release-notes/${(data as { id: string }).id}`);
  }

  const allClear = blockers != null && blockers.every((b) => b.ok);

  return (
    <div>
      <PageHeader
        title="New Release Note"
        subtitle="Draft a release note. Issuance is gated on closed NCRs and QC findings (R-015)."
        icon={<FileCheck size={18} />}
        breadcrumb={[
          { label: 'Project QC', href: '/project-qc' },
          { label: 'Release Notes', href: '/project-qc/release-notes' },
          { label: 'New' },
        ]}
        actions={
          <Link to="/project-qc/release-notes">
            <Button variant="ghost" icon={<ArrowLeft size={15} />}>Back</Button>
          </Link>
        }
        className="mb-6"
      />

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-xs text-amber-800">
          Dev mode — form submission returns to the list without persisting data.
        </div>
      )}

      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Project / SO <span className="text-red-500">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              disabled={!isSupabaseConfigured}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-50"
            >
              <option value="">{isSupabaseConfigured ? 'Select a project…' : 'Not available in dev mode'}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.project_code} — {p.so_number} — {p.customer_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Release Type</label>
            <select
              value={releaseType}
              onChange={(e) => setReleaseType(e.target.value as ReleaseType)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="project_release">Full project release</option>
              <option value="vehicle_line_release">Vehicle-line release</option>
              <option value="partial_release">Partial release</option>
            </select>
          </div>

          {releaseType === 'vehicle_line_release' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Vehicle Line <span className="text-red-500">*</span>
              </label>
              <select
                value={vehicleLineId}
                onChange={(e) => setVehicleLineId(e.target.value)}
                disabled={!projectId || lines.length === 0}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-50"
              >
                <option value="">Select a vehicle line…</option>
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>{l.vehicle_type}{l.description ? ` — ${l.description}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* R-015 gate preview */}
          {projectId && blockers && (
            <div className={`rounded-lg border px-4 py-3 ${allClear ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-xs font-semibold mb-2 ${allClear ? 'text-green-800' : 'text-amber-800'}`}>
                {allClear ? 'All release gates clear — this note can be issued after creation.' : 'Release gates (R-015) — note can be drafted now, but not issued until these clear:'}
              </p>
              <ul className="space-y-1">
                {blockers.map((b) => (
                  <li key={b.label} className="flex items-center gap-2 text-sm">
                    {b.ok
                      ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                      : <XCircle size={14} className="text-amber-500 shrink-0" />}
                    <span className={b.ok ? 'text-gray-600' : 'text-gray-800'}>{b.label}</span>
                    {!b.ok && b.detail && <span className="text-xs text-amber-700">· {b.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Release scope, hand-over notes…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-800">{error}</div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving} disabled={!projectId && isSupabaseConfigured} icon={<Check size={15} />}>
              Create Draft Release Note
            </Button>
            <Link to="/project-qc/release-notes">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
