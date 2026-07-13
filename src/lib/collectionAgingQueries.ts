// ── Collection & Aging (C3) queries ───────────────────────────────────────────
// Monthly aging snapshots + the salesman clarification loop, and periodic
// collection uploads. All reads are RLS-scoped (a salesman sees their own items).
// Deferred-migration safe: before migration 107, reads return unavailable:true.

import { supabase, isSupabaseConfigured } from './supabase';
import { isMissingRelationError } from './deferredMigrationSafety';

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
}

export interface AgingClarification {
  id: string;
  aging_item_id: string;
  author_id: string | null;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface LatestAgingResult {
  snapshotMonth: string | null;
  items: AgingItem[];
  clarificationsByItem: Record<string, AgingClarification[]>;
  unavailable: boolean;
  error: string | null;
}

const EMPTY: LatestAgingResult = {
  snapshotMonth: null, items: [], clarificationsByItem: {}, unavailable: false, error: null,
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

  return { snapshotMonth: snap.snapshot_month, items, clarificationsByItem, unavailable: false, error: null };
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
