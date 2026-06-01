import { isSupabaseConfigured } from './supabase';

/**
 * Data mode strategy — single source of truth for how a page sources its data.
 *
 * - `live`    : Supabase is configured. Pages MUST query Supabase and show a
 *               clean empty state when a table is empty. Mock data must NEVER
 *               be rendered in this mode.
 * - `dev-mock`: Supabase is not configured (local development). Pages render
 *               static mock data and surface the Dev Mode banner/badge.
 *
 * A third presentation, `preview`, is not a global mode but a per-module flag:
 * a module whose real aggregation/back-end is not wired yet shows sample data
 * ONLY in dev-mock mode and a clean "not yet connected" state in live mode.
 */
export type DataMode = 'live' | 'dev-mock';

export function getDataMode(): DataMode {
  return isSupabaseConfigured ? 'live' : 'dev-mock';
}

export const isLiveMode = (): boolean => getDataMode() === 'live';
export const isDevMockMode = (): boolean => getDataMode() === 'dev-mock';

/**
 * Returns the mock dataset in dev-mock mode, or an empty array in live mode.
 * Use this to guarantee mock records never leak into a real Supabase session
 * for list-style pages whose live query is not yet wired.
 *
 *   const records = mockOrEmpty(MOCK_RECORDS);
 */
export function mockOrEmpty<T>(mock: T[]): T[] {
  return isLiveMode() ? [] : mock;
}

/**
 * Returns the mock value in dev-mock mode, or the supplied live fallback
 * (default `null`) in live mode. For single-object / scalar mock sources.
 */
export function mockOrValue<T>(mock: T, liveFallback: T): T {
  return isLiveMode() ? liveFallback : mock;
}
