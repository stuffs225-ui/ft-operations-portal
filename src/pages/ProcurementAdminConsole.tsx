import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, RefreshCw, AlertTriangle, ShoppingCart, PackageX,
  Truck, Clock, ArrowRight, FileWarning, Star,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '../components/ui/Button';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { getProcurementAdminConsole, type ProcurementConsoleResult } from '../lib/procurementAdminConsoleQueries';

function sarK(v: number): string {
  if (v === 0) return '—';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

function Kpi({ label, value, tone, icon }: { label: string; value: string; tone?: 'rose' | 'amber'; icon: React.ReactNode }) {
  const num = tone === 'rose' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : 'text-gray-900';
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1">{icon}{label}</div>
      <div className={cn('text-xl font-bold tabular-nums', num)}>{value}</div>
    </div>
  );
}

function Section({ title, count, icon, accent, children }: { title: string; count: number; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className={cn('w-0.5 h-4 rounded-full inline-block', accent)} />
        {icon}
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <span className="ml-auto text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 tabular-nums">{count}</span>
      </div>
      {children}
    </div>
  );
}

const TH = 'px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide';
const TD = 'px-4 py-2.5 text-sm';

export function ProcurementAdminConsole() {
  const [data, setData] = useState<ProcurementConsoleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    getProcurementAdminConsole().then((res) => {
      if (!alive) return;
      setData(res);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [reloadKey]);

  function refresh() { setLoading(true); setReloadKey((k) => k + 1); }

  const pendingValue = (data?.pendingPos ?? []).reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Procurement Admin Console"
        subtitle="Approval backlog, unsourced items, at-risk suppliers, and ETA slips — admin oversight."
        breadcrumb={[{ label: 'Admin', href: '/admin-dashboard' }, { label: 'Procurement Admin Console' }]}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={refresh} disabled={loading}>Refresh</Button>}
      />

      {data?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {data.error}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="POs awaiting approval" value={loading ? '—' : String(data?.pendingPos.length ?? 0)} tone={(data?.pendingPos.length ?? 0) > 0 ? 'rose' : undefined} icon={<ShieldCheck size={12} />} />
        <Kpi label="Value pending" value={loading ? '—' : sarK(pendingValue)} icon={<ShoppingCart size={12} />} />
        <Kpi label="Items without PO" value={loading ? '—' : String(data?.prWithoutPo.length ?? 0)} tone={(data?.prWithoutPo.length ?? 0) > 0 ? 'amber' : undefined} icon={<PackageX size={12} />} />
        <Kpi label="Delayed POs" value={loading ? '—' : String(data?.delayedPoCount ?? 0)} tone={(data?.delayedPoCount ?? 0) > 0 ? 'amber' : undefined} icon={<Truck size={12} />} />
        <Kpi label="At-risk suppliers" value={loading ? '—' : String(data?.weakSuppliers.length ?? 0)} tone={(data?.weakSuppliers.length ?? 0) > 0 ? 'rose' : undefined} icon={<AlertTriangle size={12} />} />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 h-40 animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* POs awaiting approval */}
          <Section title="POs Awaiting Approval" count={data?.pendingPos.length ?? 0} icon={<ShieldCheck size={14} className="text-rose-600" />} accent="bg-rose-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>PO / Supplier</th><th className={TH}>Project</th><th className={cn(TH, 'text-right')}>Value</th><th className={cn(TH, 'text-right')}>Waiting</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.pendingPos ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-400">No POs waiting for approval.</td></tr>}
                  {(data?.pendingPos ?? []).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className={TD}><Link to={`/procurement/purchase-orders/${p.id}`} className="font-medium text-gray-900 hover:text-brand-600">{p.poNumber}</Link><div className="text-[11px] text-gray-400">{p.supplierName}</div></td>
                      <td className={cn(TD, 'text-gray-500 text-xs')}>{p.projectCode ?? '—'}</td>
                      <td className={cn(TD, 'text-right tabular-nums text-gray-900')} title={formatCurrency(p.value, p.currency)}>{sarK(p.value)}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}><span className={p.daysWaiting >= 2 ? 'text-red-600 font-semibold' : 'text-gray-500'}>{p.daysWaiting}d</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* PR items without PO */}
          <Section title="Items Without a PO" count={data?.prWithoutPo.length ?? 0} icon={<PackageX size={14} className="text-amber-600" />} accent="bg-amber-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Item</th><th className={TH}>PR / Project</th><th className={cn(TH, 'text-right')}>Waiting</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.prWithoutPo ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">Every requested item has a PO.</td></tr>}
                  {(data?.prWithoutPo ?? []).slice(0, 12).map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className={cn(TD, 'text-gray-900')}>{it.itemName}</td>
                      <td className={cn(TD, 'text-gray-500 text-xs')}>{it.prNumber ?? '—'}{it.projectCode ? ` · ${it.projectCode}` : ''}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}><span className={it.daysWaiting >= 7 ? 'text-red-600 font-semibold' : 'text-gray-500'}>{it.daysWaiting}d</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.prWithoutPo.length ?? 0) > 12 && (
              <Link to="/procurement/pr-items-without-po" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                View all {data?.prWithoutPo.length} <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* At-risk suppliers */}
          <Section title="At-Risk Suppliers" count={data?.weakSuppliers.length ?? 0} icon={<AlertTriangle size={14} className="text-rose-600" />} accent="bg-rose-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Supplier</th><th className={TH}>Rating</th><th className={TH}>Flag</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.weakSuppliers ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">No at-risk suppliers.</td></tr>}
                  {(data?.weakSuppliers ?? []).map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className={TD}><Link to={`/procurement/suppliers/${s.id}`} className="font-medium text-gray-900 hover:text-brand-600">{s.name}</Link><div className="text-[11px] text-gray-400">{s.category ?? '—'}</div></td>
                      <td className={cn(TD, 'whitespace-nowrap')}>{s.qualityRating != null ? <span className="inline-flex items-center gap-0.5 text-amber-600"><Star size={12} className="fill-amber-400" />{s.qualityRating}/5</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                      <td className={cn(TD, 'text-xs text-red-600')}>{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ETA slips */}
          <Section title="Recent ETA Slips" count={data?.etaSlips.length ?? 0} icon={<Clock size={14} className="text-indigo-600" />} accent="bg-indigo-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Project / Type</th><th className={TH}>Old → New</th><th className={cn(TH, 'text-right')}>Slip</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.etaSlips ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">No ETA slips recorded.</td></tr>}
                  {(data?.etaSlips ?? []).slice(0, 12).map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className={TD}><div className="text-gray-900 text-xs">{e.projectCode ?? '—'}</div><div className="text-[11px] text-gray-400">{e.entityType.replace(/_/g, ' ')}</div></td>
                      <td className={cn(TD, 'text-xs text-gray-600 whitespace-nowrap')}>{e.oldEta ? formatDate(e.oldEta) : '—'} → {e.newEta ? formatDate(e.newEta) : '—'}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}><span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><FileWarning size={11} />+{e.daysSlipped}d</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.etaSlips.length ?? 0) > 12 && (
              <Link to="/procurement/eta-history" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                View ETA history <ArrowRight size={12} />
              </Link>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
