// Shared department-report export foundation.
// Provides CSV export, browser print, and snapshot persistence.
// PDF export is intentionally NOT bundled (no heavy dependency added) — the
// recommended approach is documented in docs/DEPARTMENT_REPORT_EXPORTS_DESIGN.md
// (browser "Print → Save as PDF", or a server-side Edge Function renderer).

import { supabase, isSupabaseConfigured } from './supabase';

export interface ReportColumn<T> {
  key: string;
  header: string;
  /** Accessor returning a primitive cell value. */
  value: (row: T) => string | number | null | undefined;
}

export interface ReportMetric {
  label: string;
  value: string | number;
}

export interface ReportSnapshotInput {
  reportKey: string;
  reportTitle: string;
  department?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  filters?: Record<string, unknown>;
  summary?: string;
  metrics?: ReportMetric[];
  rows?: Record<string, unknown>[];
  notes?: string | null;
  generatedBy?: string | null;
}

/** Escape a single CSV cell per RFC 4180. */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV string from typed rows + column defs. */
export function buildCsv<T>(rows: T[], columns: ReportColumn<T>[]): string {
  const header = columns.map((c) => csvCell(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => csvCell(c.value(row))).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

/** Trigger a client-side download of a text blob. No network involved. */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Export typed rows to a CSV file download. */
export function exportRowsToCsv<T>(
  filename: string,
  rows: T[],
  columns: ReportColumn<T>[],
): void {
  downloadTextFile(filename.endsWith('.csv') ? filename : `${filename}.csv`, buildCsv(rows, columns));
}

/**
 * Print the current report. Reports use a `.report-print-root` wrapper and a
 * print stylesheet (see index.css) so only the report area prints.
 */
export function printReport(): void {
  window.print();
}

/**
 * Persist a report snapshot. In dev mode (no Supabase) this resolves with a
 * synthetic id and never hits the network — keeping the mock experience intact.
 */
export async function saveReportSnapshot(
  input: ReportSnapshotInput,
): Promise<{ id: string; persisted: boolean; error?: string }> {
  const summaryJson = { summary: input.summary ?? '' };
  const metricsJson = { metrics: input.metrics ?? [] };

  if (!isSupabaseConfigured || !supabase) {
    return { id: `snap-dev-${Date.now()}`, persisted: false };
  }

  const { data, error } = await supabase
    .from('report_snapshots')
    .insert({
      report_key: input.reportKey,
      report_title: input.reportTitle,
      department: input.department ?? null,
      date_range_from: input.dateFrom ?? null,
      date_range_to: input.dateTo ?? null,
      filters_json: input.filters ?? {},
      summary_json: summaryJson,
      metrics_json: metricsJson,
      rows_json: input.rows ?? [],
      notes: input.notes ?? null,
      generated_by: input.generatedBy ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { id: '', persisted: false, error: error?.message ?? 'Unknown error' };
  }
  return { id: (data as { id: string }).id, persisted: true };
}
