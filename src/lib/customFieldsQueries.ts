// ── Custom fields (Phase 3) ───────────────────────────────────────────────────
// Typed, admin-defined extra fields attached to core entities as DATA (never DDL).
// Deferred-migration safe: a missing table degrades to empty / no-op.

import { supabase, isSupabaseConfigured } from './supabase';
import { isMissingRelationError } from './deferredMigrationSafety';

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface CustomFieldDefinition {
  id: string;
  entity_type: string;
  field_key: string;
  label: string;
  field_type: CustomFieldType;
  options: string[] | null;
  sort_order: number;
  is_active: boolean;
}

export interface CustomFieldValue {
  definition_id: string;
  entity_id: string;
  value_text: string | null;
}

// Entities that can carry custom fields. Extend as needed — each value is keyed by
// the entity's uuid, so any table with a uuid primary key works.
export const CUSTOM_FIELD_ENTITIES: { value: string; label: string }[] = [
  { value: 'project', label: 'Project' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'store_receipt', label: 'Store Receipt' },
  { value: 'quotation_request', label: 'Quotation' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any { return supabase; }

export async function fetchDefinitions(entityType: string): Promise<CustomFieldDefinition[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await db()
    .from('custom_field_definitions')
    .select('*')
    .eq('entity_type', entityType)
    .eq('is_active', true)
    .order('sort_order');
  if (error) return [];
  return (data as CustomFieldDefinition[]) ?? [];
}

export async function fetchAllDefinitions(): Promise<CustomFieldDefinition[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await db()
    .from('custom_field_definitions')
    .select('*')
    .eq('is_active', true)
    .order('entity_type')
    .order('sort_order');
  if (error) return [];
  return (data as CustomFieldDefinition[]) ?? [];
}

export async function fetchValues(entityId: string): Promise<Record<string, string | null>> {
  if (!isSupabaseConfigured || !supabase) return {};
  const { data, error } = await db()
    .from('custom_field_values')
    .select('definition_id, value_text')
    .eq('entity_id', entityId);
  if (error) return {};
  const map: Record<string, string | null> = {};
  for (const r of (data as CustomFieldValue[]) ?? []) map[r.definition_id] = r.value_text;
  return map;
}

export interface MutationResult { ok: boolean; unavailable: boolean; error: string | null }

export async function saveValue(definitionId: string, entityId: string, valueText: string | null, userId: string | null): Promise<MutationResult> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, unavailable: false, error: 'Supabase not configured.' };
  const { error } = await db()
    .from('custom_field_values')
    .upsert({ definition_id: definitionId, entity_id: entityId, value_text: valueText, updated_by: userId }, { onConflict: 'definition_id,entity_id' });
  if (error) {
    if (isMissingRelationError(error)) return { ok: false, unavailable: true, error: null };
    return { ok: false, unavailable: false, error: error.message };
  }
  return { ok: true, unavailable: false, error: null };
}

export async function saveDefinition(
  id: string | null,
  values: { entity_type: string; field_key: string; label: string; field_type: CustomFieldType; options: string[] | null; sort_order: number },
  userId: string | null,
): Promise<MutationResult> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, unavailable: false, error: 'Supabase not configured.' };
  const payload = { ...values, options: values.field_type === 'select' ? values.options : null };
  const { error } = id
    ? await db().from('custom_field_definitions').update(payload).eq('id', id)
    : await db().from('custom_field_definitions').insert({ ...payload, created_by: userId, is_active: true });
  if (error) {
    if (isMissingRelationError(error)) return { ok: false, unavailable: true, error: null };
    return { ok: false, unavailable: false, error: error.message };
  }
  return { ok: true, unavailable: false, error: null };
}

export async function deactivateDefinition(id: string): Promise<MutationResult> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, unavailable: false, error: 'Supabase not configured.' };
  const { error } = await db().from('custom_field_definitions').update({ is_active: false }).eq('id', id);
  if (error) return { ok: false, unavailable: false, error: error.message };
  return { ok: true, unavailable: false, error: null };
}

/** Slugify a label into a stable field_key. */
export function slugify(label: string): string {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'field';
}
