import { useState, useEffect } from 'react';
import { Loader2, ListChecks } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { recordFactoryEvent } from '../../lib/factoryAudit';
import type { FactoryRecordStep, FactoryProcessStep } from '../../types';

// Weighted progress: each step contributes (completion% × weight); the total is
// normalised by the sum of weights, so it is correct even if weights don't sum to
// exactly 100. Returns a rounded integer (factory_records.progress_percentage is int).
function computeStepProgress(steps: { weight: number; completion_pct: number }[]): number {
  const w = steps.reduce((s, x) => s + x.weight, 0);
  if (w <= 0) return 0;
  return Math.round(steps.reduce((s, x) => s + x.completion_pct * x.weight, 0) / w);
}

const COMPLETION_OPTIONS = [0, 25, 50, 75, 100];

// Dev-mode fallback template (live mode reads factory_process_steps).
const DEV_TEMPLATE: Pick<FactoryProcessStep, 'name' | 'weight' | 'sort_order'>[] = [
  { name: 'Cutting & Preparation', weight: 10, sort_order: 1 },
  { name: 'Welding & Fabrication', weight: 25, sort_order: 2 },
  { name: 'Assembly & Fit-out', weight: 30, sort_order: 3 },
  { name: 'Painting & Finishing', weight: 15, sort_order: 4 },
  { name: 'Testing & Commissioning', weight: 20, sort_order: 5 },
];

// Per production-record process-step panel: sets up a snapshot from the factory's
// template, lets the factory tick completion per step, and derives the record's
// progress % (written back to factory_records). onProgress lets the parent update
// its row without a full reload.
export function FactoryRecordSteps({ recordId, projectId, canEdit, onProgress }: {
  recordId: string;
  projectId: string;
  canEdit: boolean;
  onProgress: (pct: number) => void;
}) {
  const [steps, setSteps] = useState<FactoryRecordStep[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    // factory_record_steps / factory_process_steps aren't in the generated DB types yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await sb.from('factory_record_steps').select('*').eq('factory_record_id', recordId).order('sort_order');
      if (cancelled) return;
      setSteps((data as unknown as FactoryRecordStep[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [recordId]);

  async function setupSteps() {
    setBusy(true); setError(null);

    if (!isSupabaseConfigured || !supabase) {
      const local = DEV_TEMPLATE.map((t, i) => ({
        id: `dev-step-${i}`, factory_record_id: recordId, project_id: projectId,
        step_name: t.name, weight: t.weight, sort_order: t.sort_order, completion_pct: 0,
      })) as FactoryRecordStep[];
      setSteps(local);
      onProgress(0);
      setBusy(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: tmpl } = await sb.from('factory_process_steps').select('*').eq('is_active', true).order('sort_order');
    const templates = (tmpl as unknown as FactoryProcessStep[]) ?? [];
    if (templates.length === 0) {
      setError('No process steps are defined yet — add them under Manage Lists → Factory Process Steps.');
      setBusy(false);
      return;
    }
    const { error: insErr } = await sb.from('factory_record_steps').insert(
      templates.map((t) => ({
        factory_record_id: recordId, project_id: projectId,
        step_name: t.name, weight: t.weight, sort_order: t.sort_order, completion_pct: 0,
      })),
    );
    if (insErr) { setError(insErr.message); setBusy(false); return; }
    const { data } = await sb.from('factory_record_steps').select('*').eq('factory_record_id', recordId).order('sort_order');
    const rows = (data as unknown as FactoryRecordStep[]) ?? [];
    setSteps(rows);
    onProgress(computeStepProgress(rows));
    recordFactoryEvent('factory_record', recordId, projectId, 'factory_steps_set_up',
      `Process-step checklist set up (${rows.length} steps)`, null, { steps: rows.map((r) => r.step_name) });
    setBusy(false);
  }

  async function updateCompletion(step: FactoryRecordStep, pct: number) {
    const next = steps.map((s) => (s.id === step.id ? { ...s, completion_pct: pct } : s));
    setSteps(next);
    const progress = computeStepProgress(next);
    onProgress(progress);

    if (!isSupabaseConfigured || !supabase) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error: stepErr } = await sb.from('factory_record_steps').update({ completion_pct: pct }).eq('id', step.id);
    if (stepErr) { setError(stepErr.message); return; }
    await sb.from('factory_records').update({ progress_percentage: progress }).eq('id', recordId);
    recordFactoryEvent('factory_record', recordId, projectId, 'factory_progress_derived',
      `Progress ${progress}% (derived from process steps)`, null, { step: step.step_name, completion_pct: pct });
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-gray-500 py-2"><Loader2 size={14} className="animate-spin" /> Loading steps…</div>;
  }

  if (steps.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500">
          Progress can be derived from weighted process steps instead of a manual number.
        </p>
        {canEdit ? (
          <Button size="sm" variant="outline" icon={<ListChecks size={13} />} loading={busy} onClick={() => void setupSteps()}>
            Set up process steps
          </Button>
        ) : (
          <p className="text-xs text-gray-400">No process steps set up for this record.</p>
        )}
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">{error}</p>}
      </div>
    );
  }

  const progress = computeStepProgress(steps);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5"><ListChecks size={13} className="text-brand-500" /> Process Steps</p>
        <span className="text-xs text-gray-600">Derived progress: <span className="font-semibold text-brand-700">{progress}%</span></span>
      </div>
      <div className="border border-gray-100 rounded-lg divide-y divide-gray-50">
        {steps.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <span className="text-xs font-medium text-gray-800">{s.step_name}</span>
              <Badge variant="neutral" size="sm" className="ml-2">w {s.weight}</Badge>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {COMPLETION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  disabled={!canEdit || Number(s.completion_pct) === opt}
                  onClick={() => void updateCompletion(s, opt)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    Number(s.completion_pct) === opt
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50'
                  }`}
                >
                  {opt}%
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">{error}</p>}
      {!canEdit && <p className="text-[11px] text-gray-400">Read-only — factory role required to update.</p>}
    </div>
  );
}
