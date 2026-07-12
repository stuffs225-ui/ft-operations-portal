// Execution Status glance — a compact, STRICTLY read-only strip on
// ProjectDetail showing general execution progress (procurement / POs /
// factory / store / QC) as labeled chips. No edit paths, no cost figures
// (POs come through the 060 cost-masked view; only counts and statuses are
// selected). Sources a role cannot read simply show "—" — RLS is never
// widened for this component.

import { useEffect, useState } from 'react';
import { ShoppingCart, Package, Factory, Warehouse, BadgeCheck } from 'lucide-react';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/skeleton';
import { getExecutionGlance, type ExecutionGlanceData, type GlanceSection } from '../../lib/salesWorkspaceQueries';

const nice = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function GlanceChip({ icon, label, section, unit }: {
  icon: React.ReactNode;
  label: string;
  section: GlanceSection;
  unit: string;
}) {
  const blocked = section.count === null;
  const empty = section.count === 0;
  return (
    <div className="flex items-start gap-2 border border-gray-100 rounded-lg px-3 py-2 min-w-0">
      <span className="text-gray-300 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-400">{label}</div>
        {blocked ? (
          <div className="text-sm text-gray-300">—</div>
        ) : empty ? (
          <div className="text-sm text-gray-400">None yet</div>
        ) : (
          <>
            <div className="text-sm font-semibold text-gray-800">
              {section.count} {unit}{section.count === 1 ? '' : 's'}
              {section.extra && <span className="text-brand-600"> · {section.extra}</span>}
            </div>
            {section.latestStatus && (
              <div className="text-[11px] text-gray-500 truncate">
                {nice(section.latestStatus)}
                {fmtDate(section.latestDate) && <span className="text-gray-400"> · {fmtDate(section.latestDate)}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ExecutionGlance({ projectId }: { projectId: string }) {
  const [data, setData] = useState<ExecutionGlanceData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() =>
      getExecutionGlance(projectId).then((d) => { if (!cancelled) setData(d); }),
    );
    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <Card className="p-5 md:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Execution Status</h3>
        <span className="text-[10px] text-gray-400 uppercase tracking-[0.05em]">Read-only overview</span>
      </div>
      {!data ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <GlanceChip icon={<ShoppingCart size={14} />} label="Procurement" section={data.procurement} unit="PR" />
          <GlanceChip icon={<Package size={14} />} label="Purchase Orders" section={data.purchaseOrders} unit="PO" />
          <GlanceChip icon={<Factory size={14} />} label="Factory" section={data.factory} unit="record" />
          <GlanceChip icon={<Warehouse size={14} />} label="Store Receipts" section={data.store} unit="receipt" />
          <GlanceChip icon={<BadgeCheck size={14} />} label="Material QC" section={data.qc} unit="inspection" />
        </div>
      )}
    </Card>
  );
}
