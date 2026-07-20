import { useState, useEffect } from 'react';
import { ShieldCheck, AlertOctagon, TrendingUp, Factory, PackageX, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchQcQuality, type QcQuality } from '../lib/qcQualityQueries';

const EMPTY: QcQuality = {
  material: { total: 0, decided: 0, accepted: 0, rejected: 0, passRate: null },
  project: { total: 0, decided: 0, accepted: 0, rejected: 0, passRate: null },
  suppliers: [], rootCauses: [], monthly: [], openNcrs: 0, criticalOpenNcrs: 0,
};

function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

// Pass-rate tone: strong ≥95%, ok ≥85%, weak below. Neutral when no data.
function rateTone(v: number | null): { text: string; bar: string } {
  if (v === null) return { text: 'text-gray-400', bar: 'bg-gray-200' };
  if (v >= 0.95) return { text: 'text-green-600', bar: 'bg-green-500' };
  if (v >= 0.85) return { text: 'text-amber-600', bar: 'bg-amber-500' };
  return { text: 'text-red-600', bar: 'bg-red-500' };
}

function HeroCard({ label, value, sub, tone, icon }: { label: string; value: string; sub: string; tone: string; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-gray-500">{icon}{label}</div>
      <div className={`text-3xl font-bold mt-1 tabular-nums ${tone}`}>{value}</div>
      <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>
    </Card>
  );
}

export function QCQualityIntelligence() {
  const [data, setData] = useState<QcQuality>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const d = await fetchQcQuality();
      if (cancelled) return;
      setData(d);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const matTone = rateTone(data.material.passRate);
  const projTone = rateTone(data.project.passRate);
  const maxSupplierBad = Math.max(1, ...data.suppliers.map((s) => s.rejected + s.ncrs));
  const rootTotal = data.rootCauses.reduce((s, r) => s + r.count, 0);
  const maxRoot = Math.max(1, ...data.rootCauses.map((r) => r.count));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quality Intelligence"
        subtitle="Pass rates, supplier defect trends, and root-cause analysis — the signals behind the inspection queues."
        breadcrumb={[{ label: 'QC Dashboard', href: '/qc' }, { label: 'Quality Intelligence' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      {loading ? (
        <Card className="p-10 flex items-center gap-2 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Analysing quality data…</Card>
      ) : (
        <>
          {/* Hero pass-rate band */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroCard
              label="Material QC Pass Rate" value={pct(data.material.passRate)} tone={matTone.text}
              sub={`${data.material.accepted} accepted · ${data.material.rejected} rejected of ${data.material.decided} decided`}
              icon={<PackageX size={13} className="text-violet-500" />}
            />
            <HeroCard
              label="Project QC First-Pass Yield" value={pct(data.project.passRate)} tone={projTone.text}
              sub={`${data.project.accepted} passed · ${data.project.rejected} failed of ${data.project.decided} decided`}
              icon={<Factory size={13} className="text-violet-500" />}
            />
            <HeroCard
              label="Open NCRs" value={String(data.openNcrs)} tone={data.openNcrs > 0 ? 'text-red-600' : 'text-gray-900'}
              sub="Non-conformances awaiting closure" icon={<AlertOctagon size={13} className="text-red-500" />}
            />
            <HeroCard
              label="Critical / High Open NCRs" value={String(data.criticalOpenNcrs)} tone={data.criticalOpenNcrs > 0 ? 'text-red-600' : 'text-gray-900'}
              sub="Highest-severity open non-conformances" icon={<AlertOctagon size={13} className="text-red-500" />}
            />
          </div>

          {/* 6-month material pass-rate trend */}
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-4">
              <TrendingUp size={15} className="text-violet-500" /> Material QC pass rate — last 6 months
            </div>
            {data.monthly.every((m) => m.passRate === null) ? (
              <div className="text-xs text-gray-400 py-6 text-center">No decided material inspections in the last 6 months.</div>
            ) : (
              <div className="flex items-end justify-between gap-3 h-40">
                {data.monthly.map((m) => {
                  const tone = rateTone(m.passRate);
                  const h = m.passRate === null ? 2 : Math.max(2, Math.round(m.passRate * 100));
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                      <span className={`text-[11px] font-semibold tabular-nums ${tone.text}`}>{pct(m.passRate)}</span>
                      <div className="w-full max-w-[44px] flex flex-col justify-end" style={{ height: '100%' }}>
                        <div className={`${tone.bar} rounded-t`} style={{ height: `${h}%` }} title={`${m.accepted} accepted / ${m.rejected} rejected`} />
                      </div>
                      <span className="text-[10px] text-gray-400">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Supplier defect league */}
            <Card className="overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700">
                Suppliers by defects — worst first
              </div>
              {data.suppliers.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">No supplier-linked material inspections yet.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {data.suppliers.slice(0, 8).map((s) => (
                    <div key={s.supplier} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-800 truncate">{s.supplier}</span>
                        <span className="text-[11px] text-gray-500 shrink-0 tabular-nums">
                          {s.rejected} rej · {s.ncrs} NCR · <span className={rateTone(1 - s.rejectRate).text}>{Math.round(s.rejectRate * 100)}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.round(((s.rejected + s.ncrs) / maxSupplierBad) * 100)}%` }} />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{s.inspected} decided inspection{s.inspected !== 1 ? 's' : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Root-cause Pareto */}
            <Card className="overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-700">
                NCR root causes — Pareto
              </div>
              {data.rootCauses.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-400">No NCRs with a recorded root cause.</div>
              ) : (
                <div className="p-4 space-y-2.5">
                  {data.rootCauses.slice(0, 8).map((r) => (
                    <div key={r.category}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm text-gray-700 truncate">{r.category}</span>
                        <span className="text-[11px] text-gray-500 shrink-0 tabular-nums">
                          {r.count} · {rootTotal > 0 ? Math.round((r.count / rootTotal) * 100) : 0}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.round((r.count / maxRoot) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {!isSupabaseConfigured && (
            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <ShieldCheck size={12} /> Showing sample data — connect Supabase for live quality metrics.
            </p>
          )}
        </>
      )}
    </div>
  );
}
