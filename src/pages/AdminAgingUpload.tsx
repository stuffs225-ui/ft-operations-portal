// ── Admin: Monthly Aging Upload (C3 ingestion) ────────────────────────────────
// Admin uploads the Finance monthly collection/aging workbook. The tool keeps
// only rows for OUR sales staff (matched by name), diffs against last month
// (New vs Recurring), shows a reviewable preview with manual overrides for any
// name the auto-match missed, and commits a snapshot the salesmen then see and
// clarify on their Collection & Aging page.

import { useMemo, useState } from 'react';
import { UploadCloud, Users, AlertCircle, CheckCircle2, Info, FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { getSalesmanOptions, type SalesmanOption } from '../lib/salesWorkspaceQueries';
import {
  parseAgingWorkbook, buildAgingPreview, getPreviousAgingKeys, commitAgingSnapshot,
  nameTokens, type RawAgingRow, type AgingPreview,
} from '../lib/agingImport';

function sar(v: number): string {
  return v.toLocaleString('en-SA', { maximumFractionDigits: 0 });
}
function firstOfMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
const normName = (n: string) => nameTokens(n).join(' ');

export function AdminAgingUpload() {
  const { profile } = useAuth();
  const [month, setMonth] = useState(firstOfMonth(new Date()));
  const [rows, setRows] = useState<RawAgingRow[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [salesmen, setSalesmen] = useState<SalesmanOption[]>([]);
  const [prevKeys, setPrevKeys] = useState<Set<string>>(new Set());
  const [manualMap, setManualMap] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const preview: AgingPreview | null = useMemo(
    () => (rows.length ? buildAgingPreview(rows, salesmen, prevKeys, manualMap) : null),
    [rows, salesmen, prevKeys, manualMap],
  );

  async function onFile(file: File) {
    setParsing(true); setError(null); setDone(null); setManualMap({});
    try {
      const buf = await file.arrayBuffer();
      const [{ rows: parsed, sheetsRead }, sm, prev] = await Promise.all([
        parseAgingWorkbook(buf),
        getSalesmanOptions(),
        getPreviousAgingKeys(month),
      ]);
      if (prev.unavailable) setUnavailable(true);
      if (sheetsRead.length === 0) {
        setError('No "Normal Customers" or "Government Customers" sheet found in this file.');
      }
      setRows(parsed); setSheets(sheetsRead); setSalesmen(sm); setPrevKeys(prev.keys);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the workbook.');
    } finally {
      setParsing(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setCommitting(true); setError(null);
    const res = await commitAgingSnapshot(month, preview, profile?.id ?? null);
    setCommitting(false);
    if (res.unavailable) { setUnavailable(true); return; }
    if (!res.ok) { setError(res.error ?? 'Commit failed.'); return; }
    setDone(`Published ${res.inserted} items for ${month}. Salesmen can now see and clarify their items.`);
    setRows([]); // reset the staging area
  }

  function assign(name: string, salesmanId: string) {
    setManualMap((m) => ({ ...m, [normName(name)]: salesmanId }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Aging Upload"
        subtitle="Upload the Finance collection/aging workbook — matched to our sales staff and published to their Collection & Aging page."
      />

      {unavailable && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Collection &amp; Aging tables are not present yet — apply migration 107 first.</p>
        </div>
      )}

      {/* Controls */}
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Snapshot month</label>
            <input type="month" value={month.slice(0, 7)}
              onChange={(e) => setMonth(`${e.target.value}-01`)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700">
              <UploadCloud size={15} /> {parsing ? 'Reading…' : 'Choose workbook (.xlsx)'}
            </span>
            <input type="file" accept=".xlsx" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />
          </label>
          {sheets.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <FileSpreadsheet size={13} /> Read: {sheets.join(', ')}
            </span>
          )}
        </div>
      </Card>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {done && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-800">{done}</p>
        </div>
      )}

      {preview && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Rows read" value={String(preview.totalRows)} />
            <Stat label="Matched to our staff" value={String(preview.matchedRows)} tone="emerald" />
            <Stat label="Salesmen" value={String(preview.perSalesman.length)} />
            <Stat label="Unmatched (skipped)" value={String(preview.unmatched.length)} tone="amber" />
          </div>

          {/* Ambiguous / unmatched — manual assignment */}
          {(preview.ambiguous.length > 0 || preview.unmatched.length > 0) && (
            <Card padding="none">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <Users size={15} className="text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-800">Names not matched to a salesman</h3>
                <span className="text-xs text-gray-400">assign manually to include them</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {preview.ambiguous.map((u) => (
                  <AssignRow key={u.name} name={u.name} count={u.count} amount={null}
                    salesmen={salesmen} tone="ambiguous" onAssign={assign} />
                ))}
                {preview.unmatched.map((u) => (
                  <AssignRow key={u.name} name={u.name} count={u.count} amount={u.amount}
                    salesmen={salesmen} tone="unmatched" onAssign={assign} />
                ))}
              </div>
            </Card>
          )}

          {/* Per-salesman preview */}
          {preview.perSalesman.map((s) => {
            const newCount = s.items.filter((i) => !i.isRecurring).length;
            const recCount = s.items.length - newCount;
            return (
              <Card key={s.salesmanId} padding="none">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-800">{s.salesmanName}</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="info" size="sm">{newCount} new</Badge>
                    <Badge variant="warning" size="sm">{recCount} recurring</Badge>
                    <span className="font-semibold tabular-nums text-gray-700">SAR {sar(s.total)}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-[0.04em] text-gray-500">Customer</th>
                        <th className="text-right px-4 py-2 text-xs font-medium uppercase tracking-[0.04em] text-gray-500">Amount (SAR)</th>
                        <th className="text-right px-4 py-2 text-xs font-medium uppercase tracking-[0.04em] text-gray-500">Aging</th>
                        <th className="text-left px-4 py-2 text-xs font-medium uppercase tracking-[0.04em] text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {s.items.map((it) => (
                        <tr key={it.key} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-800">{it.customerName}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{sar(it.amount)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-500">{it.worstDays}d</td>
                          <td className="px-4 py-2">
                            {it.isRecurring
                              ? <Badge variant="warning" size="sm">Recurring</Badge>
                              : <Badge variant="info" size="sm">New</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}

          {/* Commit */}
          <div className="flex items-center justify-end gap-3">
            <p className="text-xs text-gray-400">Re-uploading a month replaces its snapshot.</p>
            <Button loading={committing} disabled={preview.matchedRows === 0}
              icon={<CheckCircle2 size={15} />} onClick={() => void commit()}>
              Publish {preview.matchedRows} items for {month.slice(0, 7)}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'emerald' | 'amber' }) {
  const color = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-gray-900';
  return (
    <Card className="p-4">
      <div className="text-xs text-gray-500 uppercase tracking-[0.04em] mb-1">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
    </Card>
  );
}

function AssignRow({
  name, count, amount, salesmen, tone, onAssign,
}: {
  name: string; count: number; amount: number | null;
  salesmen: SalesmanOption[]; tone: 'ambiguous' | 'unmatched';
  onAssign: (name: string, salesmanId: string) => void;
}) {
  return (
    <div className="px-5 py-2.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="text-sm text-gray-800">{name}</span>
        <span className="text-xs text-gray-400 ml-2">
          {count} row{count > 1 ? 's' : ''}{amount != null ? ` · SAR ${sar(amount)}` : ''}
          {tone === 'ambiguous' ? ' · matches several' : ''}
        </span>
      </div>
      <select defaultValue="" onChange={(e) => e.target.value && onAssign(name, e.target.value)}
        className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white shrink-0">
        <option value="">Skip — not our staff</option>
        {salesmen.map((s) => <option key={s.id} value={s.id}>Assign → {s.name}</option>)}
      </select>
    </div>
  );
}
