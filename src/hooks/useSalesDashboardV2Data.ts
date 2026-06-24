// ── Sales Dashboard v2 — React Data Hook ──────────────────────────────────────
// Wraps getSalesDashboardV2Data() in a standard React state/effect pattern.
// Refetches whenever salesUserId or selectedYear changes.
//
// Role scoping:
//   isBroadView = true  → admin / operations_manager (all records)
//   isBroadView = false → sales_user (own records only)
//
// Returns null data while loading or when Supabase is not configured.
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getSalesDashboardV2Data } from '../lib/salesDashboardV2Queries';
import type { SalesDashboardV2Data } from '../types/salesDashboardV2';

export interface UseSalesDashboardV2DataParams {
  salesUserId: string | null;
  selectedYear: number;
  isBroadView: boolean;
  /** Set false to pause fetching (e.g. while auth is loading). Defaults to true. */
  enabled?: boolean;
}

export interface UseSalesDashboardV2DataResult {
  data: SalesDashboardV2Data | null;
  loading: boolean;
  error: string | null;
  /** Manually re-fetch without changing params. */
  refetch: () => void;
}

export function useSalesDashboardV2Data(
  params: UseSalesDashboardV2DataParams
): UseSalesDashboardV2DataResult {
  const { salesUserId, selectedYear, isBroadView, enabled = true } = params;

  const [data, setData]     = useState<SalesDashboardV2Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const fetchCountRef = useRef(0);

  const fetch = useCallback(async () => {
    if (!enabled || !salesUserId || !isSupabaseConfigured || !supabase) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Stale-closure guard: discard results from superseded fetches
    const thisCount = ++fetchCountRef.current;

    setLoading(true);
    setError(null);

    const result = await getSalesDashboardV2Data({
      supabase,
      salesUserId,
      selectedYear,
      isBroadView,
    });

    if (thisCount !== fetchCountRef.current) return; // superseded

    setData(result.data);
    setError(result.error);
    setLoading(false);
  }, [enabled, salesUserId, selectedYear, isBroadView]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
