// ── Safe overdue / schedule-date display helpers ──────────────────────────────
// Hardening for the Admin Invoicing Schedule "Days Overdue" defect.
//
// ROOT CAUSE (Issue 1): the alerts view computes `days_overdue` as
// `(current_date - current_invoice_date)::int`. When a schedule line carries an
// implausible `current_invoice_date` (a placeholder/epoch/year-0001 value, or a
// malformed date that slipped past validation), that subtraction yields an
// impossible figure such as "730317 days overdue" (~2000 years). The DB view is
// correct arithmetic over bad input — so rather than change the view (which is
// out of scope and would mask, not fix), we parse the underlying invoice date
// defensively in the UI and render a controlled state instead of a raw number we
// cannot trust.
//
// These helpers are pure and timezone-safe (date-only, UTC midnight) so the same
// input always yields the same result regardless of the viewer's locale/offset.
// ──────────────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

// Reject dates implausibly far from "now" in either direction. Guards against
// epoch (1970), year-0001 placeholders, an id/number coerced into a date, etc.
// 50 years comfortably covers any legitimate invoicing schedule horizon.
const MAX_PLAUSIBLE_DAYS = 366 * 50;

export type OverdueKind =
  | 'no-date'    // null / empty source
  | 'invalid'    // unparseable or implausibly far from today
  | 'not-due'    // due today
  | 'upcoming'   // due in the future
  | 'overdue';   // past due by a plausible number of days

export interface OverdueDisplay {
  kind: OverdueKind;
  /** Whole days overdue (positive) when kind === 'overdue'; otherwise null. */
  days: number | null;
  /** Human label for the cell. */
  label: string;
}

/**
 * Parse an ISO date (or date-time) string to a UTC-midnight Date, or null.
 * Rejects empty values, malformed strings, and calendar-overflow dates
 * (e.g. 2026-02-31). Only the date portion is considered.
 */
export function parseScheduleDate(value: string | null | undefined): Date | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, month - 1, day));
    // Reject silent overflow (Feb 31 → Mar 03) and impossible years.
    if (
      d.getUTCFullYear() !== year ||
      d.getUTCMonth() !== month - 1 ||
      d.getUTCDate() !== day
    ) {
      return null;
    }
    return d;
  }

  // Fallback for non-ISO but otherwise-parseable strings.
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function isPlausible(date: Date, reference: Date): boolean {
  const diffDays = Math.abs(Math.round((reference.getTime() - date.getTime()) / MS_PER_DAY));
  return diffDays <= MAX_PLAUSIBLE_DAYS;
}

/**
 * Describe how overdue (or upcoming) an invoice date is, with controlled states.
 * Never returns an impossible figure: implausible / unparseable inputs collapse
 * to 'invalid', and null/empty inputs to 'no-date'.
 */
export function describeOverdue(
  invoiceDate: string | null | undefined,
  reference: Date = todayUTC(),
): OverdueDisplay {
  if (invoiceDate == null || String(invoiceDate).trim() === '') {
    return { kind: 'no-date', days: null, label: 'No due date' };
  }

  const parsed = parseScheduleDate(invoiceDate);
  if (!parsed || !isPlausible(parsed, reference)) {
    return { kind: 'invalid', days: null, label: 'Invalid date' };
  }

  const diffDays = Math.round((reference.getTime() - parsed.getTime()) / MS_PER_DAY);

  if (diffDays === 0) return { kind: 'not-due', days: 0, label: 'Due today' };
  if (diffDays < 0) {
    const inDays = -diffDays;
    return { kind: 'upcoming', days: null, label: `Due in ${inDays} day${inDays === 1 ? '' : 's'}` };
  }
  return { kind: 'overdue', days: diffDays, label: `${diffDays} day${diffDays === 1 ? '' : 's'} overdue` };
}

/**
 * Format an invoice/schedule date for display, collapsing null/empty to "—" and
 * unparseable/implausible values to "Invalid date" instead of a nonsensical year.
 */
export function formatScheduleDate(value: string | null | undefined): string {
  if (value == null || String(value).trim() === '') return '—';
  const parsed = parseScheduleDate(value);
  if (!parsed || !isPlausible(parsed, todayUTC())) return 'Invalid date';
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
