// ── Commercial field constants & helpers (migration 101) ─────────────────────
// Single source of truth for the Sector options and the VAT rate/math used by
// project vehicle lines. Pure — no data access.

export type Sector = 'private' | 'gov' | 'semi_gov';

export const SECTOR_OPTIONS: { value: Sector; label: string }[] = [
  { value: 'private',  label: 'Private' },
  { value: 'gov',      label: 'Gov.' },
  { value: 'semi_gov', label: 'Semi-Gov.' },
];

export function sectorLabel(sector: string | null | undefined): string | null {
  if (!sector) return null;
  return SECTOR_OPTIONS.find((o) => o.value === sector)?.label ?? sector;
}

/**
 * VAT rate applied to vehicle lines flagged vat_applicable (15%).
 * The DB stores the flag only; line_total_value stays NET (its trigger is
 * untouched) — all VAT amounts are derived with these helpers, and the
 * project's total_sales_value saved from the wizard is VAT-inclusive.
 */
export const VAT_RATE = 0.15;

/** VAT amount for a line (0 when VAT does not apply). */
export function lineVatAmount(netValue: number, vatApplicable: boolean): number {
  return vatApplicable ? netValue * VAT_RATE : 0;
}

/** Line total including VAT when applicable. */
export function lineTotalWithVat(netValue: number, vatApplicable: boolean): number {
  return netValue + lineVatAmount(netValue, vatApplicable);
}
