// ── Deferred Migration Safety ─────────────────────────────────────────────────
// Small, focused helpers for features whose database objects (tables, views, or
// RPC functions) are committed to GitHub as migrations but NOT YET applied to the
// live Supabase database.
//
// The project keeps new migrations in GitHub as source-of-truth reference and
// defers applying them until a later full migration audit. Runtime code that
// references those objects must therefore degrade gracefully — showing a
// "migration pending" state instead of crashing — while still surfacing real,
// unrelated errors normally.
//
// Keep this intentionally minimal. It does not wrap Supabase, retry, or cache.
// It only classifies errors and formats a user-facing message.
// ──────────────────────────────────────────────────────────────────────────────

/** Shape of the error objects Supabase / PostgREST return. All fields optional. */
export interface SupabaseLikeError {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}

function errorText(error: unknown): { message: string; code: string } {
  if (error == null) return { message: '', code: '' };
  if (typeof error === 'string') return { message: error.toLowerCase(), code: '' };
  const e = error as SupabaseLikeError;
  const message = (e.message ?? '').toLowerCase();
  const details = (e.details ?? '').toLowerCase();
  const code = (e.code ?? '').toString();
  return { message: `${message} ${details}`.trim(), code };
}

/**
 * True when the error indicates a missing TABLE or VIEW (relation).
 *
 * Covers:
 *   • Postgres 42P01 — "relation \"x\" does not exist"
 *   • PostgREST PGRST205 — "Could not find the table 'x' in the schema cache"
 *   • Generic "does not exist" / "schema cache" phrasing
 */
export function isMissingRelationError(error: unknown): boolean {
  const { message, code } = errorText(error);
  if (!message && !code) return false;

  if (code === '42P01') return true;       // undefined_table
  if (code === 'PGRST205') return true;     // table not found in schema cache

  return (
    (message.includes('relation') && message.includes('does not exist')) ||
    (message.includes('table') && message.includes('does not exist')) ||
    (message.includes('could not find the table')) ||
    (message.includes('schema cache') && message.includes('table'))
  );
}

/**
 * True when the error indicates a missing RPC FUNCTION.
 *
 * Covers:
 *   • Postgres 42883 — "function x(...) does not exist"
 *   • PostgREST PGRST202 — "Could not find the function 'x' in the schema cache"
 *   • Generic "could not find the function" / "function ... does not exist"
 */
export function isMissingFunctionError(error: unknown): boolean {
  const { message, code } = errorText(error);
  if (!message && !code) return false;

  if (code === '42883') return true;        // undefined_function
  if (code === 'PGRST202') return true;     // function not found in schema cache

  return (
    (message.includes('function') && message.includes('does not exist')) ||
    (message.includes('could not find the function')) ||
    (message.includes('schema cache') && message.includes('function'))
  );
}

/** True when the error is either a missing relation OR a missing function. */
export function isDeferredMigrationError(error: unknown): boolean {
  return isMissingRelationError(error) || isMissingFunctionError(error);
}

/**
 * Standard user-facing copy for a feature whose migration is committed but not
 * yet applied. Keep the tone calm and informational — this is an expected,
 * controlled state, not a fatal error.
 */
export function formatDeferredMigrationMessage(
  tableOrFeatureName: string,
  migrationNumber: number | string
): string {
  return (
    `Database migration ${migrationNumber} is pending. ` +
    `“${tableOrFeatureName}” is ready in code, but the required database objects ` +
    `have not been applied to this Supabase database yet.`
  );
}

/** Availability descriptor returned by deferred-migration-aware query helpers. */
export interface DeferredAvailability {
  available: boolean;
  migrationNumber: number;
  /** Present only when available === false. */
  unavailableReason?: string;
}

/**
 * Build a consistent "available" descriptor.
 * Pass an error to mark unavailable when it is a deferred-migration error;
 * any other error is re-thrown to the caller via the returned `realError`.
 */
export function classifyAvailability(
  error: unknown,
  featureName: string,
  migrationNumber: number
): { availability: DeferredAvailability; realError: string | null } {
  if (!error) {
    return { availability: { available: true, migrationNumber }, realError: null };
  }
  if (isDeferredMigrationError(error)) {
    return {
      availability: {
        available: false,
        migrationNumber,
        unavailableReason: formatDeferredMigrationMessage(featureName, migrationNumber),
      },
      realError: null,
    };
  }
  // A genuine, unrelated error — do not mask it.
  const e = error as SupabaseLikeError;
  return {
    availability: { available: true, migrationNumber },
    realError: e.message ?? 'Unknown error',
  };
}
