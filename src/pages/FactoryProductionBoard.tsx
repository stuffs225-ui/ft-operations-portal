import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileSpreadsheet, Loader2, Truck, ChevronRight } from 'lucide-react';
import ExcelJS from 'exceljs';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchProductionBoard, type ProductionBoardRow } from '../lib/productionBoardQueries';
import type { FactoryProductionStatus } from '../types';

const STATUS_LABEL: Partial<Record<FactoryProductionStatus, { label: string; variant: 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default' }>> = {
  not_started: { label: 'Not started', variant: 'neutral' },
  boq_pending: { label: 'Requirements', variant: 'warning' },
  pending_raw_materials: { label: 'Awaiting materials', variant: 'warning' },
  in_production: { label: 'In production', variant: 'info' },
  production_completed: { label: 'Completed', variant: 'success' },
  sent_to_qc: { label: 'Sent to QC', variant: 'success' },
};
function statusBadge(s: FactoryProductionStatus) {
  const m = STATUS_LABEL[s] ?? { label: s.replace(/_/g, ' '), variant: 'neutral' as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

type DepFilter = 'all' | 'AMB' | 'FT';

export function FactoryProductionBoard() {
  const [rows, setRows] = useState<ProductionBoardRow[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [search, setSearch] = useState('');
  const [dep, setDep] = useState<DepFilter>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await fetchProductionBoard();
      if (cancelled) return;
      setRows(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (dep !== 'all' && r.dep !== dep) return false;
      if (!q) return true;
      return [r.projectCode, r.client, r.soNumber, r.woNumber, r.description].some((v) => (v ?? '').toLowerCase().includes(q));
    });
  }, [rows, search, dep]);

  async function exportExcel() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Production Master List');
    ws.addRow(['NAFFCO — Production Master List']);
    ws.addRow([]);
    const header = ws.addRow(['Project', 'WO#', 'SO#', 'Client', 'Description', 'Qty', 'Dep', 'Chassis', 'Engineering', '% Completion', 'Manhours', 'Delivery', 'Status', 'Offline (Dubai)', 'Online (KSA)']);
    header.font = { bold: true };
    for (const r of filtered) {
      ws.addRow([
        r.projectCode, r.woNumber ?? '', r.soNumber, r.client, r.description, r.qty, r.dep,
        `${r.chassisReceived}/${r.chassisTotal}${r.chassisStatus ? ` — ${r.chassisStatus}` : ''}`,
        `${r.engineeringApproved}/${r.engineeringTotal}`,
        `${r.progressPct}%`, r.manhoursNeeded, r.deliverySchedule ?? '',
        (STATUS_LABEL[r.productionStatus]?.label ?? r.productionStatus),
        r.offlineNotes ?? '', r.onlineNotes ?? '',
      ]);
    }
    ws.columns.forEach((c) => { c.width = 18; });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'Production_Master_List.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Production Board"
        subtitle="Every factory project in one view — chassis, engineering, materials, progress and delivery. The Master List, live."
        breadcrumb={[{ label: 'Factory', href: '/factory' }, { label: 'Production Board' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<FileSpreadsheet size={14} />} onClick={() => void exportExcel()} disabled={filtered.length === 0}>Excel</Button>
            <DataSourceBadge variant="auto" />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Project, client, WO#, SO#…"
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 w-72" />
        </div>
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          {(['all', 'AMB', 'FT'] as DepFilter[]).map((d) => (
            <button key={d} onClick={() => setDep(d)}
              className={`px-3 py-1 rounded-md text-xs font-medium ${dep === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {d === 'all' ? 'All' : d}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">{loading ? '' : `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`}</span>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 px-4 py-10"><Loader2 size={16} className="animate-spin" /> Loading board…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Truck size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              {isSupabaseConfigured ? 'No projects in production yet. Projects appear here once a factory record is created.' : 'Connect Supabase to see live production data.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Project', 'WO#', 'Client', 'Vehicle', 'Qty', 'Chassis', 'Eng.', 'Progress', 'Manhours', 'Delivery', 'Status', ''].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r.projectId} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <Link to={`/factory/projects/${r.projectId}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">{r.projectCode}</Link>
                      <span className="ml-1.5 text-[10px] text-gray-400">{r.dep}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 font-mono">{r.woNumber ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 max-w-[140px] truncate">{r.client}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 max-w-[140px] truncate">{r.description}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-700">{r.qty || '—'}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className={r.chassisTotal > 0 && r.chassisReceived >= r.chassisTotal ? 'text-green-700' : 'text-amber-700'}>
                        {r.chassisReceived}/{r.chassisTotal || '?'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{r.engineeringApproved}/{r.engineeringTotal || '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-1.5 bg-gray-200 rounded-full">
                          <div className="h-1.5 bg-brand-600 rounded-full" style={{ width: `${r.progressPct}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{r.progressPct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{r.manhoursNeeded || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[120px] truncate">{r.deliverySchedule ?? '—'}</td>
                    <td className="px-3 py-2.5">{statusBadge(r.productionStatus)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <Link to={`/factory/projects/${r.projectId}/plan`}><Button variant="ghost" size="sm">Plan <ChevronRight size={12} /></Button></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
