import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, AlertTriangle, GitBranch, PauseCircle, Package,
  CheckCircle2, Wrench, ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { getFactoryAdminConsole, type FactoryConsoleResult } from '../lib/factoryAdminConsoleQueries';

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

export function FactoryAdminConsole() {
  const [data, setData] = useState<FactoryConsoleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    getFactoryAdminConsole().then((res) => {
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
        title="Factory Admin Console"
        subtitle="Missing work orders, stalled production, open material requests and QC-ready output — admin oversight of the factory."
        breadcrumb={[{ label: 'Admin', href: '/admin-dashboard' }, { label: 'Factory Admin Console' }]}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={refresh} disabled={loading}>Refresh</Button>}
      />

      {data?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {data.error}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Missing WO" value={loading ? '—' : String(data?.missingWo.length ?? 0)} tone={(data?.missingWo.length ?? 0) > 0 ? 'rose' : undefined} icon={<GitBranch size={12} />} />
        <Kpi label="Stalled production" value={loading ? '—' : String(data?.stalled.length ?? 0)} tone={(data?.stalled.length ?? 0) > 0 ? 'rose' : undefined} icon={<PauseCircle size={12} />} />
        <Kpi label="Open material requests" value={loading ? '—' : String(data?.openRmrs.length ?? 0)} tone={(data?.openRmrs.length ?? 0) > 0 ? 'amber' : undefined} icon={<Package size={12} />} />
        <Kpi label="Ready for QC" value={loading ? '—' : String(data?.readyForQc.length ?? 0)} tone={(data?.readyForQc.length ?? 0) > 0 ? 'amber' : undefined} icon={<CheckCircle2 size={12} />} />
        <Kpi label="In production" value={loading ? '—' : String(data?.inProductionCount ?? 0)} icon={<Wrench size={12} />} />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 h-40 animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Missing WO */}
          <Section title="Projects Missing a Work Order" count={data?.missingWo.length ?? 0} icon={<GitBranch size={14} className="text-rose-600" />} accent="bg-rose-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Project</th><th className={TH}>Customer</th><th className={cn(TH, 'text-right')}>Waiting</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.missingWo ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">Every Saudi project has a confirmed WO.</td></tr>}
                  {(data?.missingWo ?? []).slice(0, 12).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className={cn(TD, 'font-medium text-gray-900')}>{p.projectCode}</td>
                      <td className={cn(TD, 'text-gray-500 text-xs')}>{p.customerName}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(p.daysWaiting, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.missingWo.length ?? 0) > 0 && (
              <Link to="/wo-pn-gate" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                Open WO / PN gate <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* Stalled production */}
          <Section title="Stalled Production" count={data?.stalled.length ?? 0} icon={<PauseCircle size={14} className="text-rose-600" />} accent="bg-rose-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Project</th><th className={TH}>Blocked on</th><th className={cn(TH, 'text-right')}>Since update</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.stalled ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">No production on hold or overdue for update.</td></tr>}
                  {(data?.stalled ?? []).slice(0, 12).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className={TD}><div className="font-medium text-gray-900">{r.projectCode}</div><div className="text-[11px] text-gray-400">{r.customerName}</div></td>
                      <td className={cn(TD, 'text-xs text-red-600')}>{r.reason}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(r.daysSinceUpdate, 30)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.stalled.length ?? 0) > 0 && (
              <Link to="/factory/monthly-updates" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                Open monthly updates <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* Open raw-material requests */}
          <Section title="Open Raw-Material Requests" count={data?.openRmrs.length ?? 0} icon={<Package size={14} className="text-amber-600" />} accent="bg-amber-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Request</th><th className={TH}>Project / Status</th><th className={cn(TH, 'text-right')}>Waiting</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.openRmrs ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">No open raw-material requests.</td></tr>}
                  {(data?.openRmrs ?? []).slice(0, 12).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className={TD}><Link to="/factory/raw-material-requests" className="font-medium text-gray-900 hover:text-brand-600">{r.requestNumber}</Link><div className="text-[11px] text-gray-400 capitalize">{r.requestType}</div></td>
                      <td className={cn(TD, 'text-gray-500 text-xs')}>{r.projectCode ?? '—'} · <span className="capitalize">{r.status}</span></td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(r.daysWaiting, 14)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.openRmrs.length ?? 0) > 12 && (
              <Link to="/factory/raw-material-requests" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                View all {data?.openRmrs.length} <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* Completed awaiting QC */}
          <Section title="Completed — Awaiting QC" count={data?.readyForQc.length ?? 0} icon={<CheckCircle2 size={14} className="text-sky-600" />} accent="bg-sky-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Project</th><th className={TH}>Customer</th><th className={cn(TH, 'text-right')}>Waiting</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.readyForQc ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">Nothing waiting on QC hand-off.</td></tr>}
                  {(data?.readyForQc ?? []).slice(0, 12).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className={cn(TD, 'font-medium text-gray-900')}>{r.projectCode}</td>
                      <td className={cn(TD, 'text-gray-500 text-xs')}>{r.customerName}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(r.daysWaiting, 7)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.readyForQc.length ?? 0) > 0 && (
              <Link to="/factory/send-to-qc" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                Open QC hand-off <ArrowRight size={12} />
              </Link>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
