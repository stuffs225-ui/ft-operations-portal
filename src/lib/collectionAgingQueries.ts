// ── Collection & Aging (C3) queries ───────────────────────────────────────────
// Monthly aging snapshots + the salesman clarification loop, and periodic
// collection uploads. All reads are RLS-scoped (a salesman sees their own items).
// Deferred-migration safe: before migration 107, reads return unavailable:true.

import { supabase, isSupabaseConfigured } from './supabase';
import { isMissingRelationError, isMissingFunctionError } from './deferredMigrationSafety';

export interface AgingItem {
  id: string;
  snapshot_id: string;
  invoice_ref: string;
  customer_name: string | null;
  project_code: string | null;
  amount: number;
  days_overdue: number | null;
  sales_owner_id: string | null;
  is_recurring: boolean;
  first_seen_month: string | null;
  /** Absent until migration 108 — undefined (not just null) before that. */
  expected_collection_date?: string | null;
}

export interface AgingClarification {
  id: string;
  aging_item_id: string;
  author_id: string | null;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface AgingCollection {
  id: string;
  aging_item_id: string;
  amount: number;
  collected_at: string;
  note: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  created_at: string;
}

export interface LatestAgingResult {
  snapshotMonth: string | null;
  items: AgingItem[];
  clarificationsByItem: Record<string, AgingClarification[]>;
  collectionsByItem: Record<string, AgingCollection[]>;
  unavailable: boolean;
  error: string | null;
}

const EMPTY: LatestAgingResult = {
  snapshotMonth: null, items: [], clarificationsByItem: {}, collectionsByItem: {}, unavailable: false, error: null,
};

export async function getLatestAging(): Promise<LatestAgingResult> {
  if (!isSupabaseConfigured || !supabase) return EMPTY;
  const db = supabase;

  const snapRes = await db
    .from('aging_snapshots')
    .select('id, snapshot_month')
    .order('snapshot_month', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapRes.error) {
    if (isMissingRelationError(snapRes.error)) return { ...EMPTY, unavailable: true };
    return { ...EMPTY, error: snapRes.error.message };
  }
  const snap = snapRes.data as { id: string; snapshot_month: string } | null;
  if (!snap) return EMPTY; // module applied but no snapshot uploaded yet

  const itemsRes = await db
    .from('aging_items')
    .select('*')
    .eq('snapshot_id', snap.id)
    .order('days_overdue', { ascending: false });
  if (itemsRes.error) return { ...EMPTY, error: itemsRes.error.message };
  const items = (itemsRes.data ?? []) as AgingItem[];

  const clarificationsByItem: Record<string, AgingClarification[]> = {};
  if (items.length > 0) {
    const clarRes = await db
      .from('aging_clarifications')
      .select('*')
      .in('aging_item_id', items.map((i) => i.id))
      .order('created_at', { ascending: true });
    for (const c of (clarRes.data ?? []) as AgingClarification[]) {
      (clarificationsByItem[c.aging_item_id] ??= []).push(c);
    }
  }

  // Collection records (migration 108) — best-effort: an aging_items-only
  // deployment (107 applied, 108 not yet) simply shows no collection history.
  const collectionsByItem: Record<string, AgingCollection[]> = {};
  if (items.length > 0) {
    const collRes = await db
      .from('aging_item_collections')
      .select('*')
      .in('aging_item_id', items.map((i) => i.id))
      .order('collected_at', { ascending: false });
    if (!collRes.error) {
      for (const c of (collRes.data ?? []) as AgingCollection[]) {
        (collectionsByItem[c.aging_item_id] ??= []).push(c);
      }
    }
  }

  return { snapshotMonth: snap.snapshot_month, items, clarificationsByItem, collectionsByItem, unavailable: false, error: null };
}

export async function addAgingClarification(
  itemId: string, body: string, authorId: string | null, authorName: string | null,
): Promise<{ ok: boolean; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, error: 'Supabase is not configured.' };
  const { error } = await supabase.from('aging_clarifications').insert({
    aging_item_id: itemId, author_id: authorId, author_name: authorName, body: body.trim(),
  });
  return { ok: !error, error: error?.message ?? null };
}

/** Set the salesman's current estimate of when an item will be collected. */
export async function setExpectedCollectionDate(
  itemId: string, date: string | null,
): Promise<{ ok: boolean; unavailable: boolean; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, unavailable: false, error: 'Supabase is not configured.' };
  const { error } = await supabase.rpc('set_aging_item_expected_date', { p_item_id: itemId, p_date: date });
  if (error) {
    if (isMissingFunctionError(error)) return { ok: false, unavailable: true, error: null };
    return { ok: false, unavailable: false, error: error.message };
  }
  return { ok: true, unavailable: false, error: null };
}

/** Log an amount collected (full or partial) against an item — append-only. */
export async function recordAgingCollection(
  itemId: string, amount: number, collectedAt: string, note: string | null,
  recordedBy: string | null, recordedByName: string | null,
): Promise<{ ok: boolean; unavailable: boolean; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, unavailable: false, error: 'Supabase is not configured.' };
  const { error } = await supabase.from('aging_item_collections').insert({
    aging_item_id: itemId,
    amount,
    collected_at: collectedAt,
    note: note?.trim() || null,
    recorded_by: recordedBy,
    recorded_by_name: recordedByName,
  });
  if (error) {
    if (isMissingRelationError(error)) return { ok: false, unavailable: true, error: null };
    return { ok: false, unavailable: false, error: error.message };
  }
  return { ok: true, unavailable: false, error: null };
}
