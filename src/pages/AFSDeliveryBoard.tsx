import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Search, ChevronRight, Loader2, PackageX, CalendarClock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { fetchAfsDeliveryBoard, AFS_STAGES, type AfsBoard, type AfsBoardRow, type AfsVerdict } from '../lib/afsDeliveryBoardQueries';

const EMPTY: AfsBoard = { rows: [], counts: { total: 0, blocked: 0, ready: 0, delivered: 0, followupOverdue: 0 } };

function fmtDate(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'; }

const VERDICT_META: Record<AfsVerdict, { label: string; variant: 'success' | 'warning' | 'critical' | 'info' | 'neutral' }> = {
  delivered: { label: 'Delivered', variant: 'success' },
  ready: { label: 'Ready for Delivery', variant: 'success' },
  blocked: { label: 'Blocked', variant: 'critical' },
  in_progress: { label: 'In Progress', variant: 'info' },
  on_hold: { label: 'On Hold', variant: 'neutral' },
};

// Compact 6-dot journey: filled up to the current stage, delivered = all green.
function JourneySpine({ row }: { row: AfsBoardRow }) {
  return (
    <div className="flex items-center gap-1" title={AFS_STAGES[row.stageIndex]?.label}>
      {AFS_STAGES.map((s, i) => {
        const reached = i <= row.stageIndex;
        const isCurrent = i === row.stageIndex;
        const tone = row.verdict === 'delivered' ? 'bg-green-500'
          : row.verdict === 'blocked' && isCurrent ? 'bg-red-500'
          : reached ? 'bg-sky-500' : 'bg-gray-200';
        return <span key={s.key} className={`h-1.5 rounded-full ${isCurrent ? 'w-4' : 'w-2'} ${tone}`} />;
      })}
    </div>
  );
}

function Kpi({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: React.ReactNode }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-gray-500">{icon}{label}</div>
      <div className={`text-2xl font-bold mt-1 tabular-nums ${tone}`}>{value}</div>
    </Card>
  );
}

export function AFSDeliveryBoard() {
  const [board, setBoard] = useState<AfsBoard>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [blockedOnly, setBlockedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const b = await fetchAfsDeliveryBoard();
      if (cancelled) return;
      setBoard(b);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const q = search.trim().toLowerCase();
  const rows = useMemo(() => board.rows.filter((r) => {
    if (blockedOnly && !(r.verdict === 'blocked' || r.verdict === 'on_hold')) return false;
    if (!q) return true;
    return [r.projectCode, r.customer, r.vehicleType ?? ''].some((v) => v.toLowerCase().includes(q));
  }), [board.rows, q, blockedOnly]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Delivery Readiness Board"
        subtitle="Every Dubai follow-up on one board — where each project sits on the road to delivery and exactly what's blocking it."
        icon={<Plane size={18} />}
        breadcrumb={[{ label: 'AFS Dashboard', href: '/dubai-afs' }, { label: 'Delivery Board' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Active Follow-ups" value={board.counts.total} tone="text-gray-900" icon={<Plane size={13} className="text-sky-500" />} />
        <Kpi label="Blocked" value={board.counts.blocked} tone={board.counts.blocked > 0 ? 'text-red-600' : 'text-gray-900'} icon={<ShieldAlert size={13} className="text-red-500" />} />
        <Kpi label="Ready for Delivery" value={board.counts.ready} tone={board.counts.ready > 0 ? 'text-green-600' : 'text-gray-900'} icon={<CheckCircle2 size={13} className="text-green-500" />} />
        <Kpi label="Follow-up Overdue" value={board.counts.followupOverdue} tone={board.counts.followupOverdue > 0 ? 'text-amber-600' : 'text-gray-900'} icon={<CalendarClock size={13} className="text-amber-500" />} />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Project, customer, vehicle…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300" />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 select-none px-1 shrink-0">
          <input type="checkbox" checked={blockedOnly} onChange={(e) => setBlockedOnly(e.target.checked)} className="rounded border-gray-300 text-sky-600 focus:ring-sky-300" />
          Blocked only
        </label>
      </div>

      {loading ? (
        <Card className="p-10 flex items-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Loading delivery board…</Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-gray-400">No follow-ups match.</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Project', 'Journey', 'ETA', 'Missing', 'Pre-delivery', 'Status / Blockers', 'Next follow-up', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r) => {
                  const verdict = VERDICT_META[r.verdict];
                  return (
                    <tr key={r.followupId} className={`hover:bg-gray-50 ${r.verdict === 'blocked' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-sky-700">{r.projectCode}</span>
                          {!r.hasPn && <Badge variant="critical">No PN</Badge>}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{r.customer}{r.vehicleType ? ` · ${r.vehicleType}` : ''}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <JourneySpine row={r} />
                        <div className="text-[10px] text-gray-400 mt-1">{AFS_STAGES[r.stageIndex]?.label}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {r.etaStatus === 'arrived' ? <span className="text-green-600">Arrived</span> : (
                          <>
                            <div className="text-gray-600">{fmtDate(r.etaDate)}</div>
                            {r.etaDays !== null && r.dubaiStatus !== 'completed' && (
                              <div className={r.etaDays < 0 ? 'text-red-600 font-medium' : r.etaDays <= 7 ? 'text-amber-600' : 'text-gray-400'}>
                                {r.etaDays < 0 ? `${Math.abs(r.etaDays)}d overdue` : `${r.etaDays}d`}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.openMissingItems > 0
                          ? <span className={`inline-flex items-center gap-1 text-xs font-medium ${r.criticalMissing > 0 ? 'text-red-600' : 'text-amber-600'}`}><PackageX size={12} />{r.openMissingItems}</span>
                          : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {r.predeliveryReady === null ? <span className="text-gray-300">—</span>
                          : r.predeliveryReady ? <span className="text-green-600 font-medium">Ready</span>
                          : <span className="text-amber-600">{r.checklistTotal > 0 ? `${r.checklistPassed}/${r.checklistTotal}` : 'Not ready'}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={verdict.variant}>{verdict.label}</Badge>
                        {r.blockers.length > 0 && (
                          <div className="text-[11px] text-gray-500 mt-1 leading-snug max-w-[240px]">{r.blockers.join(' · ')}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <span className={r.followupOverdue ? 'text-amber-600 font-medium' : 'text-gray-500'}>{fmtDate(r.nextFollowupDate)}</span>
                        {r.followupOverdue && <div className="text-[10px] text-amber-500">overdue</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link to={`/dubai-afs/projects/${r.followupId}`} className="inline-flex items-center text-xs text-sky-700 hover:underline">
                          View <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
