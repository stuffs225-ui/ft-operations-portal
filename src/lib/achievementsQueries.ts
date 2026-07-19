// ── "My Achievements" metrics ─────────────────────────────────────────────────
// Per-role productivity metrics for the current user (or org-wide for admin/ops),
// over a calendar month or the calendar year. Each metric is a count or a sum over
// an existing operational table, filtered by the actor column + a date column.
// Deferred-migration safe: a missing table/column yields null (shown as "—"),
// never an error.

import { supabase, isSupabaseConfigured } from './supabase';
import { isMissingRelationError, isMissingColumnError } from './deferredMigrationSafety';
import type { UserRole } from '../types';

export type MetricFormat = 'count' | 'currency';
export type AchievementRange = 'month' | 'year';

interface MetricSpec {
  key: string;
  label: string;
  table: string;
  /** Column identifying who did it. null → org-wide (no actor filter; admin/ops). */
  actorCol: string | null;
  /** Timestamp/date column used for the range filter. */
  dateCol: string;
  kind: 'count' | 'sum';
  /** Numeric column to sum (kind === 'sum'). */
  sumCol?: string;
  /** Optional status filter, e.g. only completed rows. */
  statusIn?: { col: string; values: string[] };
  format: MetricFormat;
}

export interface AchievementMetric {
  key: string;
  label: string;
  value: number | null;
  format: MetricFormat;
}

// Actor column note: we use the most meaningful "who did this" column per table
// (created_by for authored records, inspected_by / issued_by / received_by /
// reported_by where the doer differs from the creator).
const PROCUREMENT: MetricSpec[] = [
  { key: 'po_count', label: 'Purchase orders issued', table: 'purchase_orders_to_supplier', actorCol: 'created_by', dateCol: 'created_at', kind: 'count', format: 'count' },
  { key: 'po_value', label: 'PO value issued', table: 'purchase_orders_to_supplier', actorCol: 'created_by', dateCol: 'created_at', kind: 'sum', sumCol: 'purchase_value', format: 'currency' },
  { key: 'pr_count', label: 'Purchase requests raised', table: 'procurement_requests', actorCol: 'created_by', dateCol: 'created_at', kind: 'count', format: 'count' },
];

const FACTORY: MetricSpec[] = [
  { key: 'vehicles_completed', label: 'Vehicles completed', table: 'factory_records', actorCol: 'last_updated_by', dateCol: 'updated_at', kind: 'count', statusIn: { col: 'production_status', values: ['production_completed', 'sent_to_qc'] }, format: 'count' },
  { key: 'production_updates', label: 'Production records updated', table: 'factory_records', actorCol: 'last_updated_by', dateCol: 'updated_at', kind: 'count', format: 'count' },
];

const QC: MetricSpec[] = [
  { key: 'material_inspections', label: 'Material inspections', table: 'material_qc_inspections', actorCol: 'inspected_by', dateCol: 'inspected_at', kind: 'count', format: 'count' },
  { key: 'project_inspections', label: 'Project inspections', table: 'project_qc_inspections', actorCol: 'inspected_by', dateCol: 'inspected_at', kind: 'count', format: 'count' },
  { key: 'release_notes', label: 'Release notes issued', table: 'release_notes', actorCol: 'issued_by', dateCol: 'issued_at', kind: 'count', format: 'count' },
  { key: 'ncrs_raised', label: 'NCRs raised', table: 'material_ncrs', actorCol: 'created_by', dateCol: 'created_at', kind: 'count', format: 'count' },
];

const STORE: MetricSpec[] = [
  { key: 'receipts', label: 'Receipts processed', table: 'store_receipts', actorCol: 'received_by', dateCol: 'received_date', kind: 'count', format: 'count' },
  { key: 'serials', label: 'Serials registered', table: 'medical_serial_numbers', actorCol: 'created_by', dateCol: 'created_at', kind: 'count', format: 'count' },
];

const SALES: MetricSpec[] = [
  { key: 'quotations', label: 'Quotations raised', table: 'quotation_requests', actorCol: 'created_by', dateCol: 'created_at', kind: 'count', format: 'count' },
  { key: 'quotation_value', label: 'Quotation value', table: 'quotation_requests', actorCol: 'created_by', dateCol: 'created_at', kind: 'sum', sumCol: 'quotation_total_value', format: 'currency' },
  { key: 'hot_projects', label: 'Hot projects created', table: 'hot_projects', actorCol: 'created_by', dateCol: 'created_at', kind: 'count', format: 'count' },
];

const AFS: MetricSpec[] = [
  { key: 'arrivals', label: 'Arrivals registered', table: 'afs_arrival_reports', actorCol: 'created_by', dateCol: 'created_at', kind: 'count', format: 'count' },
  { key: 'predelivery', label: 'Pre-delivery reports', table: 'afs_predelivery_reports', actorCol: 'created_by', dateCol: 'created_at', kind: 'count', format: 'count' },
  { key: 'condition', label: 'Condition reports', table: 'afs_condition_reports', actorCol: 'reported_by', dateCol: 'report_date', kind: 'count', format: 'count' },
];

// admin / operations_manager: an org-wide roll-up (actorCol null → no actor filter).
const ORG: MetricSpec[] = [
  { key: 'org_po_value', label: 'PO value (org)', table: 'purchase_orders_to_supplier', actorCol: null, dateCol: 'created_at', kind: 'sum', sumCol: 'purchase_value', format: 'currency' },
  { key: 'org_quotation_value', label: 'Quotation value (org)', table: 'quotation_requests', actorCol: null, dateCol: 'created_at', kind: 'sum', sumCol: 'quotation_total_value', format: 'currency' },
  { key: 'org_vehicles', label: 'Vehicles completed (org)', table: 'factory_records', actorCol: null, dateCol: 'updated_at', kind: 'count', statusIn: { col: 'production_status', values: ['production_completed', 'sent_to_qc'] }, format: 'count' },
  { key: 'org_inspections', label: 'Project inspections (org)', table: 'project_qc_inspections', actorCol: null, dateCol: 'inspected_at', kind: 'count', format: 'count' },
];

const ROLE_METRICS: Partial<Record<UserRole, MetricSpec[]>> = {
  procurement_user: PROCUREMENT,
  factory_user: FACTORY,
  qc_user: QC,
  store_user: STORE,
  sales_user: SALES,
  sales_coordinator: SALES,
  afs_user: AFS,
  admin: ORG,
  operations_manager: ORG,
};

/** Does the current role have an achievements panel? */
export function roleHasAchievements(role: UserRole | null | undefined): boolean {
  return !!role && !!ROLE_METRICS[role];
}

function rangeStartISO(range: AchievementRange): string {
  const now = new Date();
  const d = range === 'month'
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : new Date(now.getFullYear(), 0, 1);
  return d.toISOString();
}

async function runMetric(spec: MetricSpec, userId: string | null, startISO: string): Promise<number | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  // Dynamic table/column names — cast at the boundary (matches settingsQueries).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  try {
    if (spec.kind === 'count') {
      let q = db.from(spec.table).select('id', { count: 'exact', head: true }).gte(spec.dateCol, startISO);
      if (spec.actorCol && userId) q = q.eq(spec.actorCol, userId);
      if (spec.statusIn) q = q.in(spec.statusIn.col, spec.statusIn.values);
      const { count, error } = await q;
      if (error) return isMissingRelationError(error) || isMissingColumnError(error) ? null : 0;
      return count ?? 0;
    }
    // sum
    let q = db.from(spec.table).select(spec.sumCol as string).gte(spec.dateCol, startISO);
    if (spec.actorCol && userId) q = q.eq(spec.actorCol, userId);
    if (spec.statusIn) q = q.in(spec.statusIn.col, spec.statusIn.values);
    const { data, error } = await q;
    if (error) return isMissingRelationError(error) || isMissingColumnError(error) ? null : 0;
    const rows = (data ?? []) as Record<string, unknown>[];
    return rows.reduce((s, r) => s + (Number(r[spec.sumCol as string]) || 0), 0);
  } catch {
    return null;
  }
}

/** Fetch the current role's metrics for the given range. */
export async function fetchAchievements(
  role: UserRole | null | undefined,
  userId: string | null,
  range: AchievementRange,
): Promise<AchievementMetric[]> {
  const specs = (role && ROLE_METRICS[role]) || [];
  if (specs.length === 0) return [];
  const startISO = rangeStartISO(range);
  const values = await Promise.all(specs.map((s) => runMetric(s, userId, startISO)));
  return specs.map((s, i) => ({ key: s.key, label: s.label, value: values[i], format: s.format }));
}
