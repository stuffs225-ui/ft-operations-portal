// ── Monthly Aging Review (C3) ─────────────────────────────────────────────────
// The salesman-facing half of Collection & Aging: the latest monthly finance
// snapshot, with NEW vs RECURRING badges. Opening an item shows its full detail —
// remarks (the clarification thread), an expected collection date estimate, and
// an append-only log of amounts collected (full or partial) against it.
// Additive to the live Receivables view; hidden behind a notice until migration
// 107 is applied and a snapshot exists.

import { useEffect, useState } from 'react';
import { CalendarClock, Info, Send, ChevronRight, X, CalendarDays, Wallet, Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  getLatestAging, addAgingClarification, setExpectedCollectionDate, recordAgingCollection,
  type AgingItem, type AgingClarification, type AgingCollection,
} from '../../lib/collectionAgingQueries';

function sar(v: number): string {
  return 'SAR ' + v.toLocaleString('en-SA', { maximumFractionDigits: 0 });
}
function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Per-item detail modal ───────────────────────────────────────────────────

function AgingItemModal({
  item, clarifications, collections, userId, userName, onClose, onChanged,
}: {
  item: AgingItem;
  clarifications: AgingClarification[];
  collections: AgingCollection[];
  userId: string | null;
  userName: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [remark, setRemark] = useState('');
  const [savingRemark, setSavingRemark] = useState(false);

  const [expectedDate, setExpectedDate] = useState(item.expected_collection_date ?? '');
  const [savingDate, setSavingDate] = useState(false);
  const [dateUnavailable, setDateUnavailable] = useState(false);
  const [dateMsg, setDateMsg] = useState<string | null>(null);

  const [collAmount, setCollAmount] = useState('');
  const [collDate, setCollDate] = useState(todayISO());
  const [collNote, setCollNote] = useState('');
  const [savingColl, setSavingColl] = useState(false);
  const [collUnavailable, setCollUnavailable] = useState(false);
  const [collMsg, setCollMsg] = useState<string | null>(null);

  const totalCollected = collections.reduce((s, c) => s + c.amount, 0);
  const outstanding = Math.max(0, item.amount - totalCollected);

  async function submitRemark() {
    if (!remark.trim()) return;
    setSavingRemark(true);
    const res = await addAgingClarification(item.id, remark, userId, userName);
    setSavingRemark(false);
    if (res.ok) { setRemark(''); onChanged(); }
  }

  async function saveExpectedDate() {
    setSavingDate(true);
    setDateMsg(null);
    const res = await setExpectedCollectionDate(item.id, expectedDate || null);
    setSavingDate(false);
    if (res.unavailable) { setDateUnavailable(true); return; }
    if (!res.ok) { setDateMsg(res.error ?? 'Could not save.'); return; }
    onChanged();
  }

  async function submitCollection() {
    const amount = parseFloat(collAmount);
    if (!amount || amount <= 0) { setCollMsg('Enter a valid amount.'); return; }
    setSavingColl(true);
    setCollMsg(null);
    const res = await recordAgingCollection(item.id, amount, collDate, collNote, userId, userName);
    setSavingColl(false);
    if (res.unavailable) { setCollUnavailable(true); return; }
    if (!res.ok) { setCollMsg(res.error ?? 'Could not record.'); return; }
    setCollAmount(''); setCollNote('');
    onChanged();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">{item.customer_name ?? item.invoice_ref}</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {item.invoice_ref}{item.project_code ? ` · ${item.project_code}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 shrink-0"><X size={16} /></button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Snapshot figures */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg px-2 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Outstanding</p>
              <p className="text-sm font-semibold tabular-nums text-gray-900 mt-0.5">{sar(item.amount)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg px-2 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-emerald-600">Collected</p>
              <p className="text-sm font-semibold tabular-nums text-emerald-700 mt-0.5">{sar(totalCollected)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg px-2 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-amber-600">Remaining</p>
              <p className="text-sm font-semibold tabular-nums text-amber-700 mt-0.5">{sar(outstanding)}</p>
            </div>
          </div>
          {item.days_overdue != null && (
            <p className="text-xs text-gray-500 -mt-3">{item.days_overdue} days overdue</p>
          )}

          {/* Remarks */}
          <div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-[0.06em] mb-2">Remarks</h3>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {clarifications.length === 0 ? (
                <p className="text-xs text-gray-400">No remarks yet.</p>
              ) : clarifications.map((c) => (
                <div key={c.id} className="text-xs text-gray-600 bg-gray-50 rounded px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-medium text-gray-800">{c.author_name ?? 'Sales'}</span>
                    <span className="text-[10px] text-gray-400">{dateLabel(c.created_at)}</span>
                  </div>
                  {c.body}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Why is this not collected yet?"
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Button size="sm" variant="secondary" loading={savingRemark} icon={<Send size={13} />} onClick={() => void submitRemark()}>
                Add
              </Button>
            </div>
          </div>

          {/* Expected collection date */}
          <div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-[0.06em] mb-2 flex items-center gap-1.5">
              <CalendarDays size={12} className="text-gray-400" /> Expected Collection Date
            </h3>
            {dateUnavailable ? (
              <p className="text-xs text-amber-700 flex items-center gap-1"><Info size={12} /> Pending migration 108.</p>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Button size="sm" variant="secondary" loading={savingDate} onClick={() => void saveExpectedDate()}>
                  Save
                </Button>
              </div>
            )}
            {dateMsg && <p className="text-xs text-red-600 mt-1">{dateMsg}</p>}
          </div>

          {/* Collection records */}
          <div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-[0.06em] mb-2 flex items-center gap-1.5">
              <Wallet size={12} className="text-gray-400" /> Collection Records
            </h3>
            {collUnavailable ? (
              <p className="text-xs text-amber-700 flex items-center gap-1"><Info size={12} /> Pending migration 108.</p>
            ) : (
              <>
                <div className="space-y-1.5 max-h-32 overflow-y-auto mb-2">
                  {collections.length === 0 ? (
                    <p className="text-xs text-gray-400">Nothing recorded yet.</p>
                  ) : collections.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs bg-emerald-50/60 border border-emerald-100 rounded px-2.5 py-1.5">
                      <div>
                        <span className="font-semibold tabular-nums text-emerald-700">{sar(c.amount)}</span>
                        <span className="text-gray-400 ml-2">{dateLabel(c.collected_at)}</span>
                        {c.note && <span className="text-gray-500 ml-2">— {c.note}</span>}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">{c.recorded_by_name ?? ''}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                  <input
                    type="number" min={0} step="0.01"
                    value={collAmount}
                    onChange={(e) => setCollAmount(e.target.value)}
                    placeholder="Amount collected"
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
                  />
                  <input
                    type="date"
                    value={collDate}
                    onChange={(e) => setCollDate(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <Button size="sm" loading={savingColl} icon={<Plus size={13} />} onClick={() => void submitCollection()}>
                    Record
                  </Button>
                </div>
                <input
                  value={collNote}
                  onChange={(e) => setCollNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full mt-2 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </>
            )}
            {collMsg && <p className="text-xs text-red-600 mt-1">{collMsg}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── List ──────────────────────────────────────────────────────────────────────

export function MonthlyAgingReview({ userId, userName }: { userId: string | null; userName: string | null }) {
  const [items, setItems] = useState<AgingItem[]>([]);
  const [month, setMonth] = useState<string | null>(null);
  const [clarByItem, setClarByItem] = useState<Record<string, AgingClarification[]>>({});
  const [collByItem, setCollByItem] = useState<Record<string, AgingCollection[]>>({});
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  function apply(res: Awaited<ReturnType<typeof getLatestAging>>) {
    setItems(res.items);
    setMonth(res.snapshotMonth);
    setClarByItem(res.clarificationsByItem);
    setCollByItem(res.collectionsByItem);
    setUnavailable(res.unavailable);
    setLoading(false);
  }
  async function reload() { apply(await getLatestAging()); }
  useEffect(() => {
    let alive = true;
    getLatestAging().then((res) => { if (alive) apply(res); });
    return () => { alive = false; };
  }, []);

  // Applied but no snapshot yet, or not configured → render nothing (keep the page clean).
  if (loading || (!unavailable && items.length === 0 && !month)) return null;

  const activeItem = activeItemId ? items.find((i) => i.id === activeItemId) ?? null : null;

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
            const coll = collByItem[it.id] ?? [];
            const totalCollected = coll.reduce((s, c) => s + c.amount, 0);
            const needsClar = it.is_recurring && clar.length === 0;
            return (
              <button
                key={it.id}
                onClick={() => setActiveItemId(it.id)}
                className="w-full px-5 py-3 flex items-start justify-between gap-3 text-left hover:bg-gray-50/70 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{it.customer_name ?? it.invoice_ref}</span>
                    {it.is_recurring
                      ? <Badge variant="warning" size="sm">Recurring</Badge>
                      : <Badge variant="info" size="sm">New</Badge>}
                    {needsClar && <Badge variant="critical" size="sm">Clarification needed</Badge>}
                    {totalCollected > 0 && <Badge variant="success" size="sm">Partially collected</Badge>}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                    {it.invoice_ref}{it.project_code ? ` · ${it.project_code}` : ''}
                    {it.days_overdue != null ? ` · ${it.days_overdue}d overdue` : ''}
                    {it.expected_collection_date ? ` · Expected ${dateLabel(it.expected_collection_date)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-sm font-semibold tabular-nums text-gray-900">{sar(it.amount)}</div>
                  <ChevronRight size={15} className="text-gray-300" />
                </div>
              </button>
            );
          })}
          {items.length === 0 && (
            <div className="px-5 py-6 text-sm text-gray-400">No outstanding items in this month's snapshot.</div>
          )}
        </div>
      )}

      {activeItem && (
        <AgingItemModal
          item={activeItem}
          clarifications={clarByItem[activeItem.id] ?? []}
          collections={collByItem[activeItem.id] ?? []}
          userId={userId}
          userName={userName}
          onClose={() => setActiveItemId(null)}
          onChanged={() => void reload()}
        />
      )}
    </Card>
  );
}
