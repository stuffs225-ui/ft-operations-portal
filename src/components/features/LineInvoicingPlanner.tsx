// Per-line invoicing months — the salesman picks, for each vehicle line,
// how many units get invoiced in which month. Allocations are saved through
// the audited set_line_invoicing_plan RPC (migration 104) into
// project_invoicing_schedule — the single financial source of truth — so they
// appear immediately on the Sales Dashboard and the Admin schedule page.
//
// Pre-migration safe: rows are read without enum literals and the RPC's
// absence surfaces as a clear "apply migration 104" message.

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { ProjectVehicleLine } from '../../types';
import { formatSAR } from '../../lib/currency';

interface Allocation {
  year: number;
  month: number;
  quantity: number;
}

interface PlanRow {
  id: string;
  lineId: string;
  year: number;
  month: number;
  quantity: number;
  amount: number;
  status: string;
}

interface LineInvoicingPlannerProps {
  projectId: string;
  lines: ProjectVehicleLine[];
  canPlan: boolean;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

export function LineInvoicingPlanner({ projectId, lines, canPlan }: LineInvoicingPlannerProps) {
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Allocation[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    // No enum literal in the query → safe before migration 104 is applied
    // (rows simply won't carry the sales_line_plan source yet).
    const { data, error: err } = await supabase
      .from('project_invoicing_schedule')
      .select('*')
      .eq('project_id', projectId)
      .order('current_invoice_date', { ascending: true });
    if (err || !data) return;
    setPlanRows(
      (data as Record<string, unknown>[])
        .filter((r) => r.source === 'sales_line_plan' && r.project_vehicle_line_id)
        .map((r) => {
          const d = new Date(String(r.current_invoice_date));
          return {
            id: String(r.id),
            lineId: String(r.project_vehicle_line_id),
            year: d.getUTCFullYear(),
            month: d.getUTCMonth() + 1,
            quantity: Number(r.planned_quantity ?? 0),
            amount: Number(r.invoice_amount ?? 0),
            status: String(r.status),
          };
        }),
    );
  }, [projectId]);

  useEffect(() => {
    // Microtask defer — keeps the effect body free of synchronous setState
    // (react-hooks/set-state-in-effect), matching the codebase pattern.
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) void load(); });
    return () => { cancelled = true; };
  }, [load, reloadKey]);

  function startEdit(line: ProjectVehicleLine) {
    const existing = planRows
      .filter((r) => r.lineId === line.id)
      .map((r) => ({ year: r.year, month: r.month, quantity: r.quantity }));
    setDraft(existing.length ? existing : [{ year: CURRENT_YEAR, month: new Date().getMonth() + 1, quantity: line.quantity }]);
    setEditingLineId(line.id);
    setError(null);
  }

  async function save(line: ProjectVehicleLine) {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const allocations = draft.filter((a) => a.quantity > 0);
    const { error: err } = await supabase.rpc('set_line_invoicing_plan', {
      p_line_id: line.id,
      p_allocations: allocations,
    });
    setSaving(false);
    if (err) {
      const msg = /function .*set_line_invoicing_plan/i.test(err.message)
        ? 'This feature needs migration 104 — apply supabase/migrations/104_line_invoicing_plan.sql in the SQL Editor first.'
        : err.message;
      setError(msg);
      return;
    }
    setEditingLineId(null);
    setReloadKey((k) => k + 1);
  }

  const inputCls = 'border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white';

  return (
    <Card className="p-5 md:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-brand-600" />
          <h3 className="text-sm font-semibold text-gray-900">Invoicing Months per Line</h3>
        </div>
        <Link
          to={`/projects/${projectId}/invoicing`}
          className="text-xs font-medium text-brand-600 hover:underline whitespace-nowrap"
        >
          Full schedule →
        </Link>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-gray-400">No vehicle lines on this project.</p>
      ) : (
        <div className="space-y-3">
          {lines.map((line) => {
            const rows = planRows.filter((r) => r.lineId === line.id);
            const allocated = rows.reduce((s, r) => s + r.quantity, 0);
            const isEditing = editingLineId === line.id;
            const draftTotal = draft.reduce((s, a) => s + (a.quantity || 0), 0);

            return (
              <div key={line.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {line.line_number}. {line.vehicle_type}
                    </div>
                    <div className="text-xs text-gray-500">
                      {allocated}/{line.quantity} unit{line.quantity === 1 ? '' : 's'} planned
                      {allocated < line.quantity && (
                        <span className="text-amber-600"> · {line.quantity - allocated} not planned yet</span>
                      )}
                    </div>
                  </div>
                  {canPlan && !isEditing && (
                    <Button size="sm" variant="secondary" icon={<Pencil size={13} />} onClick={() => startEdit(line)}>
                      {rows.length ? 'Edit plan' : 'Plan months'}
                    </Button>
                  )}
                </div>

                {/* Existing allocations as chips */}
                {!isEditing && rows.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {rows.map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1 text-xs bg-brand-50 text-brand-700 border border-brand-100 rounded-full px-2.5 py-1"
                      >
                        <span className="font-semibold">{MONTH_LABELS[r.month - 1]} {r.year}</span>
                        × {r.quantity}
                        {r.amount > 0 && <span className="text-brand-500">({formatSAR(r.amount)})</span>}
                        {r.status === 'invoiced' && <Badge variant="success" size="sm">Invoiced</Badge>}
                      </span>
                    ))}
                  </div>
                )}

                {/* Inline editor */}
                {isEditing && (
                  <div className="mt-3 space-y-2 bg-gray-50 rounded-lg p-3">
                    {draft.map((a, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <select
                          value={a.month}
                          onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, month: Number(e.target.value) } : x)))}
                          className={inputCls}
                        >
                          {MONTH_LABELS.map((m, mi) => <option key={m} value={mi + 1}>{m}</option>)}
                        </select>
                        <select
                          value={a.year}
                          onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, year: Number(e.target.value) } : x)))}
                          className={inputCls}
                        >
                          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <input
                          type="number"
                          min={1}
                          max={line.quantity}
                          value={a.quantity || ''}
                          onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))}
                          className={`${inputCls} w-20`}
                          placeholder="Qty"
                        />
                        <span className="text-xs text-gray-400">unit{a.quantity === 1 ? '' : 's'}</span>
                        <button
                          onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
                          className="p-1 text-gray-400 hover:text-red-500"
                          title="Remove"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => setDraft((d) => [...d, { year: CURRENT_YEAR, month: new Date().getMonth() + 1, quantity: 1 }])}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        <Plus size={13} /> Add month
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${draftTotal > line.quantity ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {draftTotal}/{line.quantity} allocated
                        </span>
                        <Button size="sm" variant="ghost" icon={<X size={13} />} onClick={() => setEditingLineId(null)} disabled={saving}>
                          Cancel
                        </Button>
                        <Button size="sm" loading={saving} disabled={draftTotal > line.quantity} onClick={() => void save(line)}>
                          Save plan
                        </Button>
                      </div>
                    </div>
                    {error && <p className="text-xs text-red-600">{error}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-gray-400 mt-3">
        Planned months feed the invoicing schedule directly (amounts are net, qty × unit value) and show up on the Sales Dashboard.
      </p>
    </Card>
  );
}
