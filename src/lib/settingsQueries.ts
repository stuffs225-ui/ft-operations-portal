// ── Settings master-data CRUD ─────────────────────────────────────────────────
// Generic insert / update / (de)activate for the reference tables edited on the
// Settings page. Every target table has admin/operations_manager write RLS
// (migration 006) and an `is_active` column, so:
//   • create  = insert with is_active = true
//   • update  = update by id
//   • delete  = soft delete (is_active = false) — reference data is never hard-deleted
// Deferred-migration safe: a missing table surfaces `unavailable` rather than throwing.

import { supabase, isSupabaseConfigured } from './supabase';
import { isMissingRelationError } from './deferredMigrationSafety';

export type SettingsTable =
  | 'vehicle_types'
  | 'material_categories'
  | 'supplier_categories'
  | 'document_types'
  | 'sla_rule_templates'
  | 'root_cause_categories'
  | 'store_locations'
  | 'wo_statuses'
  | 'pn_statuses'
  | 'factory_requirement_types'
  | 'factory_process_steps'
  | 'qc_checklist_items'
  | 'afs_predelivery_checklist_items';

export interface SettingsMutationResult {
  ok: boolean;
  unavailable: boolean;
  error: string | null;
}

/** Insert a new row (create) or update an existing one (when id is provided). */
export async function saveSettingsRow(
  table: SettingsTable,
  id: string | null,
  values: Record<string, unknown>,
): Promise<SettingsMutationResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, unavailable: false, error: 'Supabase is not configured.' };
  }
  // Dynamic table name — the typed client can't narrow this, so cast at the boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { error } = id
    ? await db.from(table).update(values).eq('id', id)
    : await db.from(table).insert({ ...values, is_active: true });

  if (error) {
    if (isMissingRelationError(error)) return { ok: false, unavailable: true, error: null };
    return { ok: false, unavailable: false, error: error.message };
  }
  return { ok: true, unavailable: false, error: null };
}

/** Soft delete / restore by flipping is_active. */
export async function setSettingsRowActive(
  table: SettingsTable,
  id: string,
  active: boolean,
): Promise<SettingsMutationResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, unavailable: false, error: 'Supabase is not configured.' };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { error } = await db.from(table).update({ is_active: active }).eq('id', id);
  if (error) {
    if (isMissingRelationError(error)) return { ok: false, unavailable: true, error: null };
    return { ok: false, unavailable: false, error: error.message };
  }
  return { ok: true, unavailable: false, error: null };
}
