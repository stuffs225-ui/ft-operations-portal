import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, AlertTriangle, Wrench, PackageX, Clock,
  ClipboardList, Plane, ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '../components/ui/Button';
import { cn, formatDate } from '../lib/utils';
import { getAfsAdminConsole, type AfsConsoleResult } from '../lib/afsAdminConsoleQueries';

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

function priorityChip(p: string) {
  const s = (p ?? '').toLowerCase();
  const tone = s === 'urgent' || s === 'high' ? 'bg-rose-50 text-rose-700'
    : s === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600';
  return <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] capitalize', tone)}>{p || '—'}</span>;
}

export function AfsAdminConsole() {
  const [data, setData] = useState<AfsConsoleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    getAfsAdminConsole().then((res) => {
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
        title="Dubai / AFS Admin Console"
        subtitle="Maintenance backlog, missing items, ETA delays and pre-delivery readiness — admin oversight of Dubai followup & after-sales."
        breadcrumb={[{ label: 'Admin', href: '/admin-dashboard' }, { label: 'Dubai / AFS Admin Console' }]}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={refresh} disabled={loading}>Refresh</Button>}
      />

      {data?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {data.error}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Open maintenance" value={loading ? '—' : String(data?.openMaintenance.length ?? 0)} tone={(data?.openMaintenance.length ?? 0) > 0 ? 'amber' : undefined} icon={<Wrench size={12} />} />
        <Kpi label="Missing items" value={loading ? '—' : String(data?.missingItems.length ?? 0)} tone={(data?.missingItems.length ?? 0) > 0 ? 'rose' : undefined} icon={<PackageX size={12} />} />
        <Kpi label="ETA delays" value={loading ? '—' : String(data?.etaDelays.length ?? 0)} tone={(data?.etaDelays.length ?? 0) > 0 ? 'rose' : undefined} icon={<Clock size={12} />} />
        <Kpi label="Pre-delivery not ready" value={loading ? '—' : String(data?.predeliveryNotReady.length ?? 0)} tone={(data?.predeliveryNotReady.length ?? 0) > 0 ? 'amber' : undefined} icon={<ClipboardList size={12} />} />
        <Kpi label="Arrived" value={loading ? '—' : String(data?.arrivedCount ?? 0)} icon={<Plane size={12} />} />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 h-40 animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Open maintenance */}
          <Section title="Open Maintenance Requests" count={data?.openMaintenance.length ?? 0} icon={<Wrench size={14} className="text-amber-600" />} accent="bg-amber-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Request</th><th className={TH}>Priority</th><th className={TH}>Status</th><th className={cn(TH, 'text-right')}>Open</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.openMaintenance ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-400">No open maintenance requests.</td></tr>}
                  {(data?.openMaintenance ?? []).slice(0, 12).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className={TD}><Link to={`/after-sales/maintenance/${r.id}`} className="font-medium text-gray-900 hover:text-brand-600">{r.requestNumber}</Link><div className="text-[11px] text-gray-400">{r.customerName}</div></td>
                      <td className={TD}>{priorityChip(r.priority)}</td>
                      <td className={cn(TD, 'text-xs text-gray-500 capitalize')}>{r.status}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(r.daysOpen, 14)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.openMaintenance.length ?? 0) > 0 && (
              <Link to="/after-sales/maintenance" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                Open maintenance queue <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* Missing items */}
          <Section title="Unresolved Missing Items" count={data?.missingItems.length ?? 0} icon={<PackageX size={14} className="text-rose-600" />} accent="bg-rose-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Item</th><th className={TH}>Project / Status</th><th className={cn(TH, 'text-right')}>Open</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.missingItems ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">No unresolved missing items.</td></tr>}
                  {(data?.missingItems ?? []).slice(0, 12).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className={cn(TD, 'text-gray-900')}>{r.itemName}</td>
                      <td className={cn(TD, 'text-gray-500 text-xs')}>{r.projectCode ?? '—'} · <span className="capitalize">{r.status}</span></td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(r.daysOpen, 14)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.missingItems.length ?? 0) > 0 && (
              <Link to="/dubai-afs/missing-items" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                Open missing items <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* ETA delays */}
          <Section title="Delayed ETAs" count={data?.etaDelays.length ?? 0} icon={<Clock size={14} className="text-rose-600" />} accent="bg-rose-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Project / PO</th><th className={TH}>ETA</th><th className={TH}>Status</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.etaDelays ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">No delayed ETAs.</td></tr>}
                  {(data?.etaDelays ?? []).slice(0, 12).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className={TD}><div className="text-gray-900 text-xs">{r.projectCode ?? '—'}</div><div className="text-[11px] text-gray-400">{r.poNumber ?? '—'}</div></td>
                      <td className={cn(TD, 'text-xs text-gray-600')}>{r.etaDate ? formatDate(r.etaDate) : '—'}</td>
                      <td className={cn(TD, 'text-xs')}><span className="inline-flex items-center rounded-md bg-rose-50 text-rose-700 px-1.5 py-0.5 capitalize">{r.etaStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.etaDelays.length ?? 0) > 0 && (
              <Link to="/dubai-afs/eta" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                Open ETA tracking <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* Pre-delivery not ready */}
          <Section title="Pre-Delivery Not Ready" count={data?.predeliveryNotReady.length ?? 0} icon={<ClipboardList size={14} className="text-amber-600" />} accent="bg-amber-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Report</th><th className={TH}>Project</th><th className={cn(TH, 'text-right')}>Waiting</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.predeliveryNotReady ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">All pre-delivery reports are ready.</td></tr>}
                  {(data?.predeliveryNotReady ?? []).slice(0, 12).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className={cn(TD, 'font-medium text-gray-900')}>{r.reportNumber}</td>
                      <td className={cn(TD, 'text-gray-500 text-xs')}>{r.projectCode ?? '—'}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(r.daysWaiting, 7)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.predeliveryNotReady.length ?? 0) > 0 && (
              <Link to="/dubai-afs/predelivery-reports" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                Open pre-delivery reports <ArrowRight size={12} />
              </Link>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
