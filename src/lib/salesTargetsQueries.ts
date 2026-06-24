// ── Sales User Targets — Query Helpers ────────────────────────────────────────
// Read + upsert helpers for annual Sales User commercial targets.
//
// MIGRATION-DEFERRED SAFETY:
//   sales_user_targets is defined in migration 099 — which may NOT be applied to
//   the live Supabase database yet. The admin-facing helpers below return an
//   availability descriptor and never throw on a missing relation; genuine,
//   unrelated errors are still surfaced via `error`.
//
//   NULL target = "not set" (do NOT substitute one target for another).
//   0 target    = explicit zero.
// ──────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';
import {
  classifyAvailability,
  formatDeferredMigrationMessage,
  isMissingRelationError,
  type DeferredAvailability,
} from './deferredMigrationSafety';

const MIGRATION_NUMBER = 99;
const FEATURE_NAME = 'sales_user_targets';

export interface SalesUserTarget {
  id: string;
  sales_user_id: string;
  target_year: number;
  sales_order_target: number | null;
  invoicing_target: number | null;
  collection_target: number | null;
  currency: string;
  notes: string | null;
  assigned_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch a single target record for a specific sales user and year.
 * Returns null if no target has been set yet.
 * RLS enforces that a sales_user can only read their own record.
 */
export async function getSalesTargetForUser(
  year: number,
  salesUserId: string
): Promise<{ data: SalesUserTarget | null; error: string | null }> {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('sales_user_targets')
    .select('*')
    .eq('sales_user_id', salesUserId)
    .eq('target_year', year)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data ?? null, error: null };
}

/**
 * Fetch all target records for a given year.
 * Admin and operations_manager only — RLS blocks other roles.
 */
export async function getSalesTargetsByYear(
  year: number
): Promise<{ data: SalesUserTarget[]; error: string | null }> {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('sales_user_targets')
    .select('*')
    .eq('target_year', year)
    .order('created_at', { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null };
}

// ── Admin: sales user directory ───────────────────────────────────────────────

export interface SalesUserOption {
  id: string;
  fullName: string | null;
  email: string;
}

/**
 * List all users whose role (in the user_roles source of truth) is sales_user,
 * joined to their profile for a display name. Used by the Admin Sales Targets
 * page to pick a user and to compute the "missing target" list.
 *
 * Safe if user_roles/profiles are unavailable — returns an empty list + error.
 */
export async function getSalesUsers(): Promise<{ data: SalesUserOption[]; error: string | null }> {
  if (!supabase) return { data: [], error: null };

  const { data: roleRows, error: roleErr } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('role', 'sales_user');

  if (roleErr) return { data: [], error: roleErr.message };

  const ids = (roleRows ?? []).map((r) => r.user_id);
  if (ids.length === 0) return { data: [], error: null };

  const { data: profileRows, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', ids);

  if (profErr) return { data: [], error: profErr.message };

  const options: SalesUserOption[] = (profileRows ?? [])
    .map((p) => ({ id: p.id, fullName: p.full_name ?? null, email: p.email }))
    .sort((a, b) => (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email));

  return { data: options, error: null };
}

// ── Admin: targets list (migration-safe) ──────────────────────────────────────

export interface SalesTargetAdminRow extends SalesUserTarget {
  salesUserName: string | null;
  salesUserEmail: string | null;
}

export interface SalesTargetsAdminResult {
  data: SalesTargetAdminRow[];
  availability: DeferredAvailability;
  error: string | null;
}

const NOT_CONFIGURED_AVAILABILITY: DeferredAvailability = {
  available: false,
  migrationNumber: MIGRATION_NUMBER,
  unavailableReason: 'Supabase is not configured in this environment.',
};

/**
 * List all target records for a year, enriched with sales user display names.
 * Migration-safe: if sales_user_targets does not exist, returns availability
 * false instead of throwing.
 */
export async function getSalesTargetsAdminList(
  year: number,
  salesUsers: SalesUserOption[]
): Promise<SalesTargetsAdminResult> {
  if (!supabase) {
    return { data: [], availability: NOT_CONFIGURED_AVAILABILITY, error: null };
  }

  const { data, error } = await supabase
    .from('sales_user_targets')
    .select('*')
    .eq('target_year', year)
    .order('created_at', { ascending: true });

  const { availability, realError } = classifyAvailability(error, FEATURE_NAME, MIGRATION_NUMBER);
  if (!availability.available || realError) {
    return { data: [], availability, error: realError };
  }

  const nameById = new Map(salesUsers.map((u) => [u.id, u]));

  const rows: SalesTargetAdminRow[] = (data ?? []).map((t) => {
    const u = nameById.get(t.sales_user_id);
    return {
      ...(t as SalesUserTarget),
      salesUserName: u?.fullName ?? null,
      salesUserEmail: u?.email ?? null,
    };
  });

  return { data: rows, availability, error: null };
}

// ── Admin: upsert a target ────────────────────────────────────────────────────

export interface UpsertSalesTargetParams {
  salesUserId: string;
  targetYear: number;
  salesOrderTarget: number | null;
  invoicingTarget: number | null;
  collectionTarget: number | null;
  currency?: string;
  notes?: string | null;
  /** Current admin user id — recorded in assigned_by / updated_by. */
  actorId?: string | null;
}

export interface UpsertSalesTargetResult {
  success: boolean;
  unavailable: boolean;
  unavailableReason?: string;
  error: string | null;
}

export interface TargetValidationResult {
  valid: boolean;
  error: string | null;
}

/**
 * Pure validation of target input. NULL is allowed (means "not set"); when a
 * value is provided it must be a finite number >= 0. Exported for testing.
 */
export function validateTargetInput(params: {
  salesUserId: string;
  targetYear: number;
  salesOrderTarget: number | null;
  invoicingTarget: number | null;
  collectionTarget: number | null;
}): TargetValidationResult {
  if (!params.salesUserId) return { valid: false, error: 'A sales user is required.' };
  if (!params.targetYear || params.targetYear < 2020 || params.targetYear > 2100) {
    return { valid: false, error: 'Target year must be between 2020 and 2100.' };
  }
  const checks: [string, number | null][] = [
    ['Sales Order Target', params.salesOrderTarget],
    ['Invoicing Target', params.invoicingTarget],
    ['Collection Target', params.collectionTarget],
  ];
  for (const [label, value] of checks) {
    if (value == null) continue; // null = not set, allowed
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      return { valid: false, error: `${label} must be a valid number.` };
    }
    if (value < 0) return { valid: false, error: `${label} cannot be negative.` };
  }
  return { valid: true, error: null };
}

/**
 * Insert or update the target for a (sales_user_id, target_year) pair.
 * Relies on the unique constraint sales_user_targets_user_year_unique.
 * Migration-safe: returns unavailable=true if the table does not exist.
 */
export async function upsertSalesTarget(
  params: UpsertSalesTargetParams
): Promise<UpsertSalesTargetResult> {
  const validation = validateTargetInput(params);
  if (!validation.valid) {
    return { success: false, unavailable: false, error: validation.error };
  }

  if (!supabase) {
    return {
      success: false,
      unavailable: true,
      unavailableReason: 'Supabase is not configured in this environment.',
      error: null,
    };
  }

  const { error } = await supabase
    .from('sales_user_targets')
    .upsert(
      {
        sales_user_id: params.salesUserId,
        target_year: params.targetYear,
        sales_order_target: params.salesOrderTarget,
        invoicing_target: params.invoicingTarget,
        collection_target: params.collectionTarget,
        currency: params.currency ?? 'SAR',
        notes: params.notes ?? null,
        assigned_by: params.actorId ?? null,
        updated_by: params.actorId ?? null,
      },
      { onConflict: 'sales_user_id,target_year' }
    );

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        success: false,
        unavailable: true,
        unavailableReason: formatDeferredMigrationMessage(FEATURE_NAME, MIGRATION_NUMBER),
        error: null,
      };
    }
    return { success: false, unavailable: false, error: error.message };
  }

  return { success: true, unavailable: false, error: null };
}

// ── Admin: missing-target users ───────────────────────────────────────────────

/** Sales users who do NOT have a target record for the given year. */
export function computeMissingTargetUsers(
  salesUsers: SalesUserOption[],
  targets: SalesTargetAdminRow[]
): SalesUserOption[] {
  const withTarget = new Set(targets.map((t) => t.sales_user_id));
  return salesUsers.filter((u) => !withTarget.has(u.id));
}
