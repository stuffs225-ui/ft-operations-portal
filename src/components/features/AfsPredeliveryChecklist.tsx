import { useState, useEffect } from 'react';
import { Loader2, ListChecks, Check, X, Minus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { UserRole } from '../../types';

const CAN_EDIT: UserRole[] = ['admin', 'operations_manager', 'afs_user', 'qc_user'];

type Result = 'pending' | 'pass' | 'fail' | 'na';

interface ChecklistRow {
  id: string;
  predelivery_report_id: string;
  item_name: string;
  sort_order: number;
  result: Result;
}

const RESULT_BTNS: { value: Result; label: string; icon: React.ReactNode; active: string }[] = [
  { value: 'pass', label: 'Pass', icon: <Check size={12} />, active: 'bg-green-600 text-white' },
  { value: 'fail', label: 'Fail', icon: <X size={12} />, active: 'bg-red-600 text-white' },
  { value: 'na', label: 'N/A', icon: <Minus size={12} />, active: 'bg-gray-500 text-white' },
];

function counts(rows: ChecklistRow[]) {
  const total = rows.filter((r) => r.result !== 'na').length;
  const passed = rows.filter((r) => r.result === 'pass').length;
  return { total, passed };
}

// Pre-delivery checklist for one AFS report. Instantiates a snapshot from the
// AFS-defined template and records pass/fail/na per item, keeping the report's
// checklist_items_total / _passed counters in sync so the readiness view reflects it.
export function AfsPredeliveryChecklist({ reportId, onCountsChange }: {
  reportId: string;
  onCountsChange?: (passed: number, total: number) => void;
}) {
  const { role } = useAuth();
  const canEdit = role ? CAN_EDIT.includes(role as UserRole) : false;
  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await sb.from('afs_predelivery_checklist_results').select('*')
        .eq('predelivery_report_id', reportId).order('sort_order');
      if (cancelled) return;
      setRows((data as ChecklistRow[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reportId]);

  async function syncReportCounts(next: ChecklistRow[]) {
    if (!isSupabaseConfigured || !supabase) return;
    const { passed, total } = counts(next);
    onCountsChange?.(passed, total);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await sb.from('afs_predelivery_reports')
      .update({ checklist_items_passed: passed, checklist_items_total: total })
      .eq('id', reportId);
  }

  async function setupChecklist() {
    setBusy(true); setError(null);
    if (!isSupabaseConfigured || !supabase) { setError('Connect Supabase to use the checklist.'); setBusy(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: tmpl } = await sb.from('afs_predelivery_checklist_items').select('*')
      .eq('is_active', true).order('sort_order');
    const templates = (tmpl as { name: string; sort_order: number }[]) ?? [];
    if (templates.length === 0) {
      setError('No checklist items defined yet — add them under Manage Lists → AFS Pre-Delivery Checklist.');
      setBusy(false); return;
    }
    const { error: insErr } = await sb.from('afs_predelivery_checklist_results').insert(
      templates.map((t) => ({ predelivery_report_id: reportId, item_name: t.name, sort_order: t.sort_order, result: 'pending' })),
    );
    if (insErr) { setError(insErr.message); setBusy(false); return; }
    const { data } = await sb.from('afs_predelivery_checklist_results').select('*')
      .eq('predelivery_report_id', reportId).order('sort_order');
    const next = (data as ChecklistRow[]) ?? [];
    setRows(next);
    await syncReportCounts(next);
    setBusy(false);
  }

  async function setResult(row: ChecklistRow, result: Result) {
    const next = rows.map((r) => (r.id === row.id ? { ...r, result } : r));
    setRows(next);
    if (!isSupabaseConfigured || !supabase) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error: err } = await sb.from('afs_predelivery_checklist_results').update({ result }).eq('id', row.id);
    if (err) { setError(err.message); return; }
    await syncReportCounts(next);
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-gray-500 py-2"><Loader2 size={14} className="animate-spin" /> Loading checklist…</div>;
  }

  const { passed, total } = counts(rows);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5"><ListChecks size={14} className="text-sky-500" /> Pre-Delivery Checklist</h3>
        {rows.length > 0 && (
          <span className="text-xs text-gray-600"><span className="font-semibold text-green-700">{passed}</span> / {total} passed</span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">No checklist recorded for this report yet.</p>
          {canEdit ? (
            <Button size="sm" variant="outline" icon={<ListChecks size={13} />} loading={busy} onClick={() => void setupChecklist()}>
              Set up checklist
            </Button>
          ) : (
            <p className="text-xs text-gray-400">An AFS user can set up the checklist.</p>
          )}
        </div>
      ) : (
        <div className="border border-gray-100 rounded-lg divide-y divide-gray-50">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-xs text-gray-800 min-w-0">{row.item_name}</span>
              <div className="flex items-center gap-1 shrink-0">
                {RESULT_BTNS.map((b) => (
                  <button
                    key={b.value}
                    disabled={!canEdit}
                    onClick={() => void setResult(row, b.value)}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors disabled:opacity-50 ${
                      row.result === b.value ? b.active : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {b.icon}{b.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">{error}</p>}
    </Card>
  );
}
