// ── Document-number generation (client side) ──────────────────────────────────
// Replaces two broken client-side patterns found in the system critique:
//   • count+1 against a UNIQUE column (afs_maintenance_requests) — two users
//     submitting together collide, and the sequence counted ALL years while the
//     label used the current year (wrong after a year rollover).
//   • Math.random() 3-digit numbers (PO / PR) — only 900 possible values per
//     month (~50% collision odds by ~35 documents), and po_number has no unique
//     constraint, so collisions silently created DUPLICATE PO numbers.
//
// nextDocNumber derives the next number from the real MAX for the given prefix
// (per-year or per-month scoped by the prefix itself). QC entities already do
// this server-side via BEFORE INSERT triggers (migrations 035–038); migration
// 114 adds the same triggers for MNT/PO/PR as the definitive guarantee — this
// helper is the correct client prefill and the pre-migration fallback.
//
// The tiny remaining race (two clients computing the same MAX simultaneously)
// is closed by retryOnCollision: on a 23505 unique violation, recompute + retry.

import { supabase, isSupabaseConfigured } from './supabase';

/** Tables with a client-prefilled document number (extend as needed). */
type DocNumberTable =
  | 'afs_maintenance_requests'
  | 'purchase_orders_to_supplier'
  | 'procurement_requests'
  | 'afs_arrival_reports'
  | 'afs_predelivery_reports'
  | 'afs_condition_reports';

interface NextDocNumberOpts {
  /** Table to scan, e.g. 'afs_maintenance_requests' */
  table: DocNumberTable;
  /** Number column, e.g. 'maintenance_request_number' */
  column: string;
  /** Full prefix including trailing dash, e.g. 'MNT-2026-' or 'PO-2607-' */
  prefix: string;
  /** Zero-pad width of the sequence part (default 4) */
  pad?: number;
}

/**
 * Next sequential document number for a prefix: MAX(existing) + 1, zero-padded.
 * Falls back to a time-derived suffix if the lookup fails (never blocks the form).
 */
export async function nextDocNumber({ table, column, prefix, pad = 4 }: NextDocNumberOpts): Promise<string> {
  const fallback = () => {
    // HHMMSS + 2 random digits — practically collision-free, still readable.
    const t = new Date();
    const hhmmss = [t.getHours(), t.getMinutes(), t.getSeconds()]
      .map((n) => String(n).padStart(2, '0')).join('');
    return `${prefix}${hhmmss}${Math.floor(Math.random() * 90) + 10}`;
  };

  if (!isSupabaseConfigured || !supabase) return fallback();

  const { data, error } = await supabase
    .from(table)
    .select(column)
    .like(column, `${prefix}%`)
    .order(column, { ascending: false })
    .limit(1);

  if (error) return fallback();

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const last = rows[0]?.[column];
  const tail = typeof last === 'string' ? last.slice(prefix.length) : '';
  const lastSeq = /^\d+$/.test(tail) ? parseInt(tail, 10) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(pad, '0')}`;
}

/** Postgres unique-violation code. */
const UNIQUE_VIOLATION = '23505';

/**
 * Run an insert that embeds a generated document number; if it fails with a
 * unique violation (another user grabbed the same number in the race window),
 * regenerate the number and retry once.
 */
export async function insertWithDocNumberRetry<T>(
  generate: () => Promise<string>,
  insert: (docNumber: string) => PromiseLike<{ data: T | null; error: { code?: string; message: string } | null }>,
): Promise<{ data: T | null; error: { code?: string; message: string } | null }> {
  const first = await insert(await generate());
  if (first.error && first.error.code === UNIQUE_VIOLATION) {
    return insert(await generate());
  }
  return first;
}
