import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileSpreadsheet, Loader2, ShoppingCart, AlertTriangle, ShieldCheck, Truck } from 'lucide-react';
import ExcelJS from 'exceljs';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchProcurementPipeline, type ProcurementPipeline, type PipelinePO } from '../lib/procurementPipelineQueries';

function fmtDate(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-GB') : '—'; }
function fmtSAR(n: number) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) + ' SAR'; }
function label(s: string) { return s.replace(/_/g, ' '); }

function Kpi({ label, value, tone, icon }: { label: string; value: string | number; tone: string; icon: React.ReactNode }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-gray-500">{icon}{label}</div>
      <div className={`text-xl font-bold mt-1 ${tone}`}>{value}</div>
    </Card>
  );
}

export function ProcurementPipeline() {
  const [data, setData] = useState<ProcurementPipeline>({ prs: [], awaitingApproval: [], inFlight: [] });
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const d = await fetchProcurementPipeline();
      if (cancelled) return;
      setData(d);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const q = search.trim().toLowerCase();
  const prs = useMemo(() => data.prs.filter((p) => !q || [p.prNumber, p.projectCode, p.client].some((v) => v.toLowerCase().includes(q))), [data.prs, q]);
  const inFlight = useMemo(() => {
    const rows = data.inFlight.filter((p) => !q || [p.poNumber, p.projectCode, p.supplier].some((v) => v.toLowerCase().includes(q)));
    return rows.sort((a, b) => (a.overdue === b.overdue ? (a.daysToEta ?? 0) - (b.daysToEta ?? 0) : a.overdue ? -1 : 1));
  }, [data.inFlight, q]);
  const awaiting = useMemo(() => data.awaitingApproval.filter((p) => !q || [p.poNumber, p.projectCode, p.supplier].some((v) => v.toLowerCase().includes(q))), [data.awaitingApproval, q]);

  const overdueCount = data.inFlight.filter((p) => p.overdue).length;
  const inFlightValue = data.inFlight.reduce((s, p) => s + p.value, 0);

  async function exportExcel() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Procurement Pipeline');
    ws.addRow(['Purchase Requests to order']).font = { bold: true };
    ws.addRow(['PR#', 'Project', 'Client', 'Status', 'Raised']);
    prs.forEach((p) => ws.addRow([p.prNumber, p.projectCode, p.client, label(p.status), fmtDate(p.createdAt)]));
    ws.addRow([]);
    ws.addRow(['Purchase Orders in flight']).font = { bold: true };
    ws.addRow(['PO#', 'Supplier', 'Project', 'Status', 'ETA', 'Overdue', 'Value']);
    inFlight.forEach((p) => ws.addRow([p.poNumber, p.supplier, p.projectCode, label(p.status), fmtDate(p.etaDate), p.overdue ? 'YES' : '', p.value]));
    ws.columns.forEach((c) => { c.width = 20; });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'Procurement_Pipeline.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  function poRow(p: PipelinePO) {
    return (
      <tr key={p.id} className={`hover:bg-gray-50 ${p.overdue ? 'bg-red-50/40' : ''}`}>
        <td className="px-3 py-2">
          <Link to={`/procurement/purchase-orders/${p.id}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">{p.poNumber}</Link>
        </td>
        <td className="px-3 py-2 text-xs text-gray-700 max-w-[150px] truncate">{p.supplier}</td>
        <td className="px-3 py-2 text-xs font-mono text-gray-600">{p.projectCode}</td>
        <td className="px-3 py-2"><Badge variant={p.status === 'delayed' ? 'critical' : 'info'}>{label(p.status)}</Badge></td>
        <td className="px-3 py-2 text-xs text-gray-600">
          {fmtDate(p.etaDate)}
          {p.overdue && <span className="ml-1.5 text-[10px] font-semibold text-red-600">{Math.abs(p.daysToEta ?? 0)}d overdue</span>}
        </td>
        <td className="px-3 py-2 text-xs text-gray-700 tabular-nums">{fmtSAR(p.value)}</td>
      </tr>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Procurement Pipeline"
        subtitle="Every open purchase request and in-flight purchase order across all projects — what to order, what's coming, and what's overdue."
        breadcrumb={[{ label: 'Procurement', href: '/procurement' }, { label: 'Pipeline' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<FileSpreadsheet size={14} />} onClick={() => void exportExcel()} disabled={prs.length === 0 && inFlight.length === 0}>Excel</Button>
            <DataSourceBadge variant="auto" />
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="PRs to order" value={data.prs.length} tone="text-amber-700" icon={<ShoppingCart size={13} className="text-amber-500" />} />
        <Kpi label="POs in flight" value={data.inFlight.length} tone="text-sky-700" icon={<Truck size={13} className="text-sky-500" />} />
        <Kpi label="Overdue POs" value={overdueCount} tone={overdueCount > 0 ? 'text-red-600' : 'text-gray-900'} icon={<AlertTriangle size={13} className="text-red-500" />} />
        <Kpi label="Awaiting approval" value={data.awaitingApproval.length} tone="text-violet-700" icon={<ShieldCheck size={13} className="text-violet-500" />} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="PR#, PO#, project, supplier…"
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 w-72" />
        </div>
        <span className="ml-auto text-xs text-gray-400">In-flight value: <span className="font-semibold text-gray-700">{fmtSAR(inFlightValue)}</span></span>
      </div>

      {loading ? (
        <Card className="p-10 flex items-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading pipeline…</Card>
      ) : !isSupabaseConfigured ? (
        <Card className="p-10 text-center text-sm text-gray-500">Connect Supabase to see live procurement data.</Card>
      ) : (
        <>
          {/* PRs to order */}
          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-xs font-semibold text-amber-800">Purchase Requests to order ({prs.length})</div>
            {prs.length === 0 ? <div className="px-4 py-6 text-center text-xs text-gray-400">Nothing awaiting a PO.</div> : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100"><tr>{['PR#', 'Project', 'Client', 'Status', 'Raised'].map((h) => <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {prs.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2"><Link to={`/procurement/requests/${p.id}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">{p.prNumber}</Link></td>
                      <td className="px-3 py-2 text-xs font-mono text-gray-600">{p.projectCode}</td>
                      <td className="px-3 py-2 text-xs text-gray-700 max-w-[150px] truncate">{p.client}</td>
                      <td className="px-3 py-2"><Badge variant="warning">{label(p.status)}</Badge></td>
                      <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </Card>

          {/* Awaiting approval */}
          {awaiting.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-2.5 bg-violet-50 border-b border-violet-100 text-xs font-semibold text-violet-800">POs awaiting approval ({awaiting.length})</div>
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100"><tr>{['PO#', 'Supplier', 'Project', 'Status', 'ETA', 'Value'].map((h) => <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">{awaiting.map(poRow)}</tbody>
              </table></div>
            </Card>
          )}

          {/* In flight */}
          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 bg-sky-50 border-b border-sky-100 text-xs font-semibold text-sky-800">Purchase Orders in flight ({inFlight.length}) — overdue first</div>
            {inFlight.length === 0 ? <div className="px-4 py-6 text-center text-xs text-gray-400">No POs in flight.</div> : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100"><tr>{['PO#', 'Supplier', 'Project', 'Status', 'ETA', 'Value'].map((h) => <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">{inFlight.map(poRow)}</tbody>
              </table></div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
