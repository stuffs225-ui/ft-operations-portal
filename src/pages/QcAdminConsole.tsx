import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw, AlertTriangle, ClipboardCheck, AlertOctagon,
  Wrench, ShieldX, Microscope, ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { getQcAdminConsole, type QcConsoleResult } from '../lib/qcAdminConsoleQueries';

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

function severityChip(sev: string) {
  const s = (sev ?? '').toLowerCase();
  const tone = s === 'critical' || s === 'major' ? 'bg-rose-50 text-rose-700'
    : s === 'minor' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600';
  return <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] capitalize', tone)}>{sev || '—'}</span>;
}

export function QcAdminConsole() {
  const [data, setData] = useState<QcConsoleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    getQcAdminConsole().then((res) => {
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
        title="QC Admin Console"
        subtitle="QC backlog, open NCRs and findings, and blocked releases — admin oversight of quality."
        breadcrumb={[{ label: 'Admin', href: '/admin-dashboard' }, { label: 'QC Admin Console' }]}
        actions={<Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={refresh} disabled={loading}>Refresh</Button>}
      />

      {data?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {data.error}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Materials awaiting QC" value={loading ? '—' : String(data?.waitingQc.length ?? 0)} tone={(data?.waitingQc.length ?? 0) > 0 ? 'amber' : undefined} icon={<ClipboardCheck size={12} />} />
        <Kpi label="In progress" value={loading ? '—' : String(data?.inProgressCount ?? 0)} icon={<Microscope size={12} />} />
        <Kpi label="Open NCRs" value={loading ? '—' : String(data?.openNcrs.length ?? 0)} tone={(data?.openNcrs.length ?? 0) > 0 ? 'rose' : undefined} icon={<AlertOctagon size={12} />} />
        <Kpi label="Open findings" value={loading ? '—' : String(data?.openFindings.length ?? 0)} tone={(data?.openFindings.length ?? 0) > 0 ? 'amber' : undefined} icon={<Wrench size={12} />} />
        <Kpi label="Blocked releases" value={loading ? '—' : String(data?.blockedReleases.length ?? 0)} tone={(data?.blockedReleases.length ?? 0) > 0 ? 'rose' : undefined} icon={<ShieldX size={12} />} />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 h-40 animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Materials awaiting QC */}
          <Section title="Materials Awaiting QC" count={data?.waitingQc.length ?? 0} icon={<ClipboardCheck size={14} className="text-amber-600" />} accent="bg-amber-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Inspection</th><th className={TH}>Project</th><th className={cn(TH, 'text-right')}>Waiting</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.waitingQc ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400">No materials waiting on QC.</td></tr>}
                  {(data?.waitingQc ?? []).slice(0, 12).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className={cn(TD, 'font-medium text-gray-900')}>{r.inspectionNumber}</td>
                      <td className={cn(TD, 'text-gray-500 text-xs')}>{r.projectCode ?? '—'}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(r.daysWaiting, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.waitingQc.length ?? 0) > 0 && (
              <Link to="/material-qc/inspections" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                Open material inspections <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* Open NCRs */}
          <Section title="Open NCRs" count={data?.openNcrs.length ?? 0} icon={<AlertOctagon size={14} className="text-rose-600" />} accent="bg-rose-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>NCR</th><th className={TH}>Severity</th><th className={TH}>Status</th><th className={cn(TH, 'text-right')}>Open</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.openNcrs ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-400">No open NCRs.</td></tr>}
                  {(data?.openNcrs ?? []).slice(0, 12).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className={TD}><Link to={`/material-qc/ncrs/${r.id}`} className="font-medium text-gray-900 hover:text-brand-600">{r.ncrNumber}</Link><div className="text-[11px] text-gray-400">{r.projectCode ?? '—'}</div></td>
                      <td className={TD}>{severityChip(r.severity)}</td>
                      <td className={cn(TD, 'text-xs text-gray-500 capitalize')}>{r.status}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(r.daysOpen, 14)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.openNcrs.length ?? 0) > 12 && (
              <Link to="/material-qc/ncrs" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                View all {data?.openNcrs.length} <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* Open findings */}
          <Section title="Open Project-QC Findings" count={data?.openFindings.length ?? 0} icon={<Wrench size={14} className="text-amber-600" />} accent="bg-amber-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Finding</th><th className={TH}>Severity</th><th className={TH}>Flag</th><th className={cn(TH, 'text-right')}>Open</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.openFindings ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-400">No open findings.</td></tr>}
                  {(data?.openFindings ?? []).slice(0, 12).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className={TD}><Link to={`/project-qc/findings/${r.id}`} className="font-medium text-gray-900 hover:text-brand-600">{r.findingNumber}</Link><div className="text-[11px] text-gray-400">{r.projectCode ?? '—'}</div></td>
                      <td className={TD}>{severityChip(r.severity)}</td>
                      <td className={cn(TD, 'text-xs')}>{r.reworkRequired ? <span className="text-red-600 font-medium">Rework due</span> : <span className="text-gray-400 capitalize">{r.status}</span>}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(r.daysOpen, 14)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.openFindings.length ?? 0) > 12 && (
              <Link to="/project-qc/findings" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                View all {data?.openFindings.length} <ArrowRight size={12} />
              </Link>
            )}
          </Section>

          {/* Blocked releases */}
          <Section title="Blocked Releases" count={data?.blockedReleases.length ?? 0} icon={<ShieldX size={14} className="text-rose-600" />} accent="bg-rose-500">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100"><tr><th className={TH}>Project</th><th className={cn(TH, 'text-right')}>Blocked</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(data?.blockedReleases ?? []).length === 0 && <tr><td colSpan={2} className="px-4 py-6 text-center text-xs text-gray-400">No blocked releases.</td></tr>}
                  {(data?.blockedReleases ?? []).slice(0, 12).map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className={cn(TD, 'font-medium text-gray-900')}>{r.projectCode ?? '—'}</td>
                      <td className={cn(TD, 'text-right tabular-nums')}>{ageCell(r.daysBlocked, 7)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.blockedReleases.length ?? 0) > 0 && (
              <Link to="/project-qc/release-notes" className="flex items-center gap-1 px-4 py-2 text-xs text-brand-600 hover:underline border-t border-gray-100">
                Open release notes <ArrowRight size={12} />
              </Link>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
