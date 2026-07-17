// Create a Project / Vehicle QC Inspection — the entry point QC uses to open an
// inspection against a project (optionally a specific vehicle line / factory
// record sent to QC). Auto-numbered PQC-YYYY-#### by the DB trigger.

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ClipboardCheck, ArrowLeft, Check } from 'lucide-react';
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
  quantity: number;
}

export function ProjectQcInspectionNew() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [lines, setLines] = useState<VehicleLineOption[]>([]);
  const [vehicleLineId, setVehicleLineId] = useState('');
  const [remarks, setRemarks] = useState('');
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

  // Load the selected project's vehicle lines (safe view — no cost columns).
  useEffect(() => {
    if (!projectId || !isSupabaseConfigured || !supabase) {
      void Promise.resolve().then(() => { setLines([]); setVehicleLineId(''); });
      return;
    }
    (async () => {
      const { data } = await supabase!
        .from('project_vehicle_lines_safe')
        .select('id, vehicle_type, description, quantity')
        .eq('project_id', projectId);
      setLines((data as VehicleLineOption[]) ?? []);
      setVehicleLineId('');
    })();
  }, [projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      navigate('/project-qc/inspections');
      return;
    }
    if (!projectId) {
      setError('Select a project to inspect.');
      return;
    }

    setSaving(true);

    const { data, error: insErr } = await supabase
      .from('project_qc_inspections')
      .insert({
        project_id: projectId,
        project_vehicle_line_id: vehicleLineId || null,
        inspection_status: 'pending',
        inspection_result: 'pending',
        readiness_status: 'not_ready',
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

    navigate(`/project-qc/inspections/${(data as { id: string }).id}`);
  }

  return (
    <div>
      <PageHeader
        title="New Project QC Inspection"
        subtitle="Open a vehicle / project quality inspection."
        icon={<ClipboardCheck size={18} />}
        breadcrumb={[
          { label: 'Project QC', href: '/project-qc' },
          { label: 'Inspections', href: '/project-qc/inspections' },
          { label: 'New' },
        ]}
        actions={
          <Link to="/project-qc/inspections">
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
                <option key={p.id} value={p.id}>
                  {p.project_code} — {p.so_number} — {p.customer_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Vehicle Line (optional)</label>
            <select
              value={vehicleLineId}
              onChange={(e) => setVehicleLineId(e.target.value)}
              disabled={!projectId || lines.length === 0}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-50"
            >
              <option value="">Whole project</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.vehicle_type}{l.description ? ` — ${l.description}` : ''} · {l.quantity} unit{l.quantity === 1 ? '' : 's'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Leave as “Whole project” for a full-project inspection.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Inspection scope, reference to factory handoff…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-800">{error}</div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={saving} disabled={!projectId && isSupabaseConfigured} icon={<Check size={15} />}>
              Open Inspection
            </Button>
            <Link to="/project-qc/inspections">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
