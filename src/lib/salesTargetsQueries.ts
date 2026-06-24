import { supabase } from './supabase';

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
