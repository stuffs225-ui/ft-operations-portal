import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, AlertTriangle, PackageX, ClipboardCheck,
  HandHelping, Boxes, ArrowRight, ShieldQuestion,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { getStoreAdminConsole, type StoreConsoleResult } from '../lib/storeAdminConsoleQueries';

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

function ageCell(days: number, threshold: number) {
  return <span className={days >= threshold ? 'text-red-600 font-semibold' : 'text-gray-500'}>{days}d</span>;
}

export function StoreAdminConsole() {
  const [data, setData] = useState<StoreConsoleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    getStoreAdminConsole().then((res) => {
      if (!alive) return;
      setData(res);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [reloadKey]);

  function refresh() { setLoading(true); setReloadKey((k) => k + 1); }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Store Admin Console"
        subtitle="Unallocated stock, QC backlog, custody bottlenecks and un-checked serials — admin oversight of the store."
        breadcrumb={[{ label: 'Admin', href: '/admin-dashboard' }, { label: 'Store Admin Console' }]}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={refresh} disabled={loading}>Refresh</Button>}
      />

      {data?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {data.error}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Unallocated items" value={loading ? '—' : String(data?.unallocated.length ?? 0)} tone={(data?.unallocated.length ?? 0) > 0 ? 'amber' : undefined} icon={<PackageX size={12} />} />
        <Kpi label="Pending QC" value={loading ? '—' : String(data?.pendingQc.length ?? 0)} tone={(data?.pendingQc.length ?? 0) > 0 ? 'amber' : undefined} icon={<ClipboardCheck size={12} />} />
        <Kpi label="Custody awaiting action" value={loading ? '—' : String(data?.custodyActions.length ?? 0)} tone={(data?.custodyActions.length ?? 0) > 0 ? 'rose' : undefined} icon={<HandHelping size={12} />} />
        <Kpi label="Serials to QC" value={loading ? '—' : String(data?.serialQc.length ?? 0)} tone={(data?.serialQc.length ?? 0) > 0 ? 'amber' : undefined} icon={<ShieldQuestion size={12} />} />
        <Kpi label="In store" value={loading ? '—' : String(data?.inStoreCount ?? 0)} icon={<Boxes size={12} />} />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 h-40 animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Unallocated materials */}
          <Section title="Unallocated Materials" count={data?.unallocated.length ?? 0} icon={<PackageX size={14} className="text-amber-600" />} accent="bg-amber-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Item</th><th className={TH}>Receipt</th><th className={cn(TH, 'text-right')}>Qty</th><th className={cn(TH, 'text-right')}>Waiting</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.unallocated ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-400">Every received item is allocated to a project.</td></tr>}
                  {(data?.unallocated ?? []).slice(0, 12).map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className={cn(TD, 'text-gray-900')}>{it.itemName}<div className="text-[11px] text-gray-400">{it.itemCode ?? it.category}</div></td>
                      <td className={cn(TD, 'text-gray-500 text-xs')}>{it.receiptNumber ?? '—'}</td>
                      <td className={cn(TD, 'text-right tabular-nums text-gray-700')}>{it.quantity} <span className="text-gray-400 text-xs">{it.unit}</span></td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(it.daysWaiting, 7)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.unallocated.length ?? 0) > 12 && (
              <Link to="/store/unallocated" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                View all {data?.unallocated.length} <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* Pending QC */}
          <Section title="Items Pending QC" count={data?.pendingQc.length ?? 0} icon={<ClipboardCheck size={14} className="text-amber-600" />} accent="bg-amber-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Item</th><th className={TH}>Project</th><th className={cn(TH, 'text-right')}>Qty</th><th className={cn(TH, 'text-right')}>Waiting</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.pendingQc ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-400">Nothing waiting on QC hand-off.</td></tr>}
                  {(data?.pendingQc ?? []).slice(0, 12).map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <td className={cn(TD, 'text-gray-900')}>{it.itemName}<div className="text-[11px] text-gray-400">{it.itemCode ?? it.category}</div></td>
                      <td className={cn(TD, 'text-gray-500 text-xs')}>{it.projectCode ?? '—'}</td>
                      <td className={cn(TD, 'text-right tabular-nums text-gray-700')}>{it.quantity} <span className="text-gray-400 text-xs">{it.unit}</span></td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(it.daysWaiting, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.pendingQc.length ?? 0) > 0 && (
              <Link to="/store/qc-handoff" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                Open QC hand-off <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* Custody awaiting action */}
          <Section title="Custody Awaiting Action" count={data?.custodyActions.length ?? 0} icon={<HandHelping size={14} className="text-rose-600" />} accent="bg-rose-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Custody</th><th className={TH}>Project / To</th><th className={TH}>Blocked on</th><th className={cn(TH, 'text-right')}>Waiting</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.custodyActions ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-400">No custody records waiting for approval or acceptance.</td></tr>}
                  {(data?.custodyActions ?? []).slice(0, 12).map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className={TD}><Link to={`/custody/${c.id}`} className="font-medium text-gray-900 hover:text-brand-600">{c.custodyNumber}</Link><div className="text-[11px] text-gray-400 capitalize">{c.issueType}</div></td>
                      <td className={cn(TD, 'text-gray-500 text-xs')}>{c.projectCode ?? '—'}{c.issuedToRole ? ` · ${c.issuedToRole.replace(/_/g, ' ')}` : ''}</td>
                      <td className={cn(TD, 'text-xs text-red-600')}>{c.reason}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(c.daysWaiting, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.custodyActions.length ?? 0) > 12 && (
              <Link to="/custody" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                View all {data?.custodyActions.length} <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* Serials awaiting QC */}
          <Section title="Serials Awaiting QC" count={data?.serialQc.length ?? 0} icon={<ShieldQuestion size={14} className="text-indigo-600" />} accent="bg-indigo-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Serial</th><th className={TH}>Project</th><th className={TH}>Status</th><th className={cn(TH, 'text-right')}>Waiting</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.serialQc ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-400">All serials have cleared QC.</td></tr>}
                  {(data?.serialQc ?? []).slice(0, 12).map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className={cn(TD, 'font-medium text-gray-900')}>{s.serialNumber}</td>
                      <td className={cn(TD, 'text-gray-500 text-xs')}>{s.projectCode ?? '—'}</td>
                      <td className={cn(TD, 'text-xs')}><span className="inline-flex items-center rounded-md bg-amber-50 text-amber-700 px-1.5 py-0.5 capitalize">{s.qcStatus.replace(/_/g, ' ')}</span></td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(s.daysWaiting, 5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.serialQc.length ?? 0) > 0 && (
              <Link to="/store/serials" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                Open serial register <ArrowRight size={12} />
              </Link>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
