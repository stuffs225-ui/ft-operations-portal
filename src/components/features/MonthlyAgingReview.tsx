// ── Monthly Aging Review (C3) ─────────────────────────────────────────────────
// The salesman-facing half of Collection & Aging: the latest monthly finance
// snapshot, with NEW vs RECURRING badges. Recurring (still-uncollected) items
// require a clarification — the salesman explains why it isn't collected yet.
// Additive to the live Receivables view; hidden behind a notice until migration
// 107 is applied and a snapshot exists.

import { useEffect, useState } from 'react';
import { CalendarClock, Info, Send } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  getLatestAging, addAgingClarification,
  type AgingItem, type AgingClarification,
} from '../../lib/collectionAgingQueries';

function sar(v: number): string {
  return 'SAR ' + v.toLocaleString('en-SA', { maximumFractionDigits: 0 });
}
function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function MonthlyAgingReview({ userId, userName }: { userId: string | null; userName: string | null }) {
  const [items, setItems] = useState<AgingItem[]>([]);
  const [month, setMonth] = useState<string | null>(null);
  const [clarByItem, setClarByItem] = useState<Record<string, AgingClarification[]>>({});
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  function apply(res: Awaited<ReturnType<typeof getLatestAging>>) {
    setItems(res.items);
    setMonth(res.snapshotMonth);
    setClarByItem(res.clarificationsByItem);
    setUnavailable(res.unavailable);
    setLoading(false);
  }
  async function reload() { apply(await getLatestAging()); }
  useEffect(() => {
    let alive = true;
    getLatestAging().then((res) => { if (alive) apply(res); });
    return () => { alive = false; };
  }, []);

  async function submit(itemId: string) {
    const body = (draft[itemId] ?? '').trim();
    if (!body) return;
    setSavingId(itemId);
    const res = await addAgingClarification(itemId, body, userId, userName);
    setSavingId(null);
    if (res.ok) { setDraft((d) => ({ ...d, [itemId]: '' })); void reload(); }
  }

  // Applied but no snapshot yet, or not configured → render nothing (keep the page clean).
  if (loading || (!unavailable && items.length === 0 && !month)) return null;

  return (
    <Card padding="none">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <CalendarClock size={15} className="text-brand-600" />
        <h3 className="text-sm font-semibold text-gray-800">Monthly Aging Review</h3>
        {month && <Badge variant="neutral" size="sm">{monthLabel(month)}</Badge>}
      </div>

      {unavailable ? (
        <div className="px-5 py-6 flex items-start gap-2 text-sm text-amber-700">
          <Info size={15} className="shrink-0 mt-0.5" />
          Collection &amp; Aging module is pending — apply migration 107 to enable the monthly review.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map((it) => {
            const clar = clarByItem[it.id] ?? [];
            const needsClar = it.is_recurring && clar.length === 0;
            return (
              <div key={it.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{it.customer_name ?? it.invoice_ref}</span>
                      {it.is_recurring
                        ? <Badge variant="warning" size="sm">Recurring</Badge>
                        : <Badge variant="info" size="sm">New</Badge>}
                      {needsClar && <Badge variant="critical" size="sm">Clarification needed</Badge>}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                      {it.invoice_ref}{it.project_code ? ` · ${it.project_code}` : ''}
                      {it.days_overdue != null ? ` · ${it.days_overdue}d overdue` : ''}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-gray-900 shrink-0">{sar(it.amount)}</div>
                </div>

                {clar.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {clar.map((c) => (
                      <div key={c.id} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                        <span className="font-medium">{c.author_name ?? 'Sales'}:</span> {c.body}
                      </div>
                    ))}
                  </div>
                )}

                {it.is_recurring && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={draft[it.id] ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, [it.id]: e.target.value }))}
                      placeholder="Why is this not collected yet?"
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <Button size="sm" variant="secondary" loading={savingId === it.id}
                      icon={<Send size={13} />} onClick={() => void submit(it.id)}>
                      Add
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="px-5 py-6 text-sm text-gray-400">No outstanding items in this month's snapshot.</div>
          )}
        </div>
      )}
    </Card>
  );
}
