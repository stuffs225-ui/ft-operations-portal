// ── Shared Procurement workspace UI primitives ────────────────────────────────
// Local, procurement-only presentational helpers used across the procurement
// pages. Pure UI — no data fetching, no business logic, no workflow actions.
// Reuses the app's brand/semantic Tailwind tokens.
// ──────────────────────────────────────────────────────────────────────────────

import { AlertTriangle } from 'lucide-react';
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
 * Display-only flag for POs that require approval (value ≥ SAR 10,000). Driven by
 * the existing `approval_required` boolean — it never reads or exposes the cost
 * value, and it grants no approval power. Procurement User remains view-only.
 */
export function ThresholdFlag({ className }: { className?: string }) {
  return (
    <span
      title="PO ≥ SAR 10,000 — requires Admin / Operations Manager approval before sending to supplier."
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 whitespace-nowrap',
        className,
      )}
    >
      <AlertTriangle size={9} className="shrink-0" />
      ≥ SAR 10K
    </span>
  );
}

export interface PriorityLens<K extends string> {
  key: K;
  label: string;
  count: number;
  /** When true and count > 0, render with red (critical) emphasis. */
  critical?: boolean;
}

/**
 * A compact row of "priority lens" chips that jump to an urgent subset (e.g.
 * Pending Approval, Delayed). Clicking a lens calls back with its key — the
 * caller maps it onto its existing status filter, so no new filtering logic.
 */
export function PriorityLensBar<K extends string>({
  lenses,
  activeKey,
  onSelect,
  className,
}: {
  lenses: PriorityLens<K>[];
  activeKey?: K | null;
  onSelect: (key: K) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-400">Priority</span>
      {lenses.map((lens) => {
        const isActive = activeKey === lens.key;
        const hot = lens.critical && lens.count > 0;
        return (
          <button
            key={lens.key}
            onClick={() => onSelect(lens.key)}
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium rounded-full border px-3 py-1 transition-colors',
              isActive
                ? hot
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-brand-600 text-white border-brand-600'
                : hot
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
            )}
          >
            {lens.label}
            <span className="tabular-nums text-[10px] font-semibold">{lens.count}</span>
          </button>
        );
      })}
    </div>
  );
}
