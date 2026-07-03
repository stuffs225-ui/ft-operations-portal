// ── Shared Store / Warehouse workspace UI primitives ──────────────────────────
// Local, store-only presentational helpers. Pure UI — no data fetching, no
// business logic, no workflow actions, no mutations. Reuses the app's
// brand/semantic Tailwind tokens.
// ──────────────────────────────────────────────────────────────────────────────

import { AlertTriangle, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StatusTab<K extends string> {
  key: K;
  label: string;
}

/**
 * Status filter tabs with a live count badge per tab. Counts are supplied by the
 * caller (derived from already-loaded rows — no new query). Restrained brand
 * accent on the active tab; neutral otherwise.
 */
export function StatusTabsWithCounts<K extends string>({
  tabs,
  active,
  counts,
  onSelect,
  className,
}: {
  tabs: StatusTab<K>[];
  active: K;
  counts: Record<string, number>;
  onSelect: (key: K) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto pb-1 border-b border-gray-200', className)}>
      {tabs.map((tab) => {
        const count = counts[tab.key] ?? 0;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors -mb-px',
              isActive ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded',
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Photo-completeness meter for vehicle receipts (n / 5 required photos:
 * front · rear · left · right · chassis). Purely presentational — it renders the
 * `count` / `total` the caller already derived from loaded rows. Red while
 * incomplete (the 5-photo acceptance gate is unmet), green when complete.
 */
export function PhotoMeter({
  count,
  total = 5,
  className,
}: {
  count: number;
  total?: number;
  className?: string;
}) {
  const complete = count >= total;
  return (
    <div className={cn('inline-flex items-center gap-2', className)} title={`${count} of ${total} required photos uploaded`}>
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 w-3 rounded-full',
              i < count ? (complete ? 'bg-emerald-500' : 'bg-red-400') : 'bg-gray-200',
            )}
          />
        ))}
      </div>
      <span className={cn('text-xs font-semibold tabular-nums', complete ? 'text-emerald-700' : 'text-red-600')}>
        {count}/{total}
      </span>
    </div>
  );
}

/**
 * Display-only flag for a vehicle whose 5-photo gate is unmet. Surfaces the
 * existing rule (accept requires all 5 photos); it enforces nothing on its own.
 */
export function AcceptGateFlag({ complete, className }: { complete: boolean; className?: string }) {
  if (complete) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700', className)}
        title="All 5 required photos present — vehicle can be accepted."
      >
        <CheckCircle2 size={12} className="shrink-0" /> Photos complete
      </span>
    );
  }
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-[11px] font-medium text-red-600', className)}
      title="Vehicle cannot be accepted until all 5 required photos (front, rear, left, right, chassis) are uploaded."
    >
      <AlertTriangle size={12} className="shrink-0" /> Accept blocked — photos incomplete
    </span>
  );
}

/**
 * Explicit read-only banner for the QC Handoff view — QC owns the pass/fail/NCR
 * decision; Store only views the status here.
 */
export function ReadOnlyBanner({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-600', className)}>
      <Lock size={14} className="shrink-0 mt-0.5 text-gray-400" />
      <span>
        {children ?? (
          <>
            <span className="font-semibold text-gray-700">Read-only view. </span>
            QC owns pass / fail / NCR decisions. Store can view handoff status here but cannot change QC outcomes.
          </>
        )}
      </span>
    </div>
  );
}
