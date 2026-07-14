// ── Currency formatting — single source of truth ──────────────────────────────
// Consolidates the many local `formatSAR` / `sar` / `sarK` helpers that were
// copy-pasted across pages. Two canonical forms:
//   • formatSAR   → full grouped amount, e.g. "SAR 1,234,567" (null-safe → "—")
//   • sarCompact  → compact K/M form for dense tables, e.g. "1.2M" / "340K"
// For the Intl currency-style variant see formatCurrency() in ./utils.

/** Full grouped SAR amount. Null/undefined → "—". */
export function formatSAR(value: number | null | undefined): string {
  if (value == null) return '—';
  return 'SAR ' + value.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Compact SAR amount (K/M) for dense tables. 0/null → "—". */
export function sarCompact(value: number | null | undefined): string {
  if (value == null || value === 0) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (value / 1_000).toFixed(0) + 'K';
  return String(Math.round(value));
}

/** Full amount without the "SAR " prefix (for tooltips / title attrs). */
export function sarTitle(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' SAR';
}
