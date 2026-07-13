// ── Procurement Admin Console ──────────────────────────────────────────────────
// Admin oversight of four procurement risk signals:
//   1. POs awaiting approval (the over-threshold ones sitting in approval_status='pending')
//   2. PR items with no PO yet (waiting to be sourced)
//   3. At-risk suppliers (low quality rating / QC rejected / suspended-blacklisted)
//   4. ETA slips (eta_change_history rows where the new ETA is later than the old)
// Read-only; rides admin RLS. Each signal degrades independently (missing table
// or blocked read → that section is empty, never a hard error).

import { supabase, isSupabaseConfigured } from './supabase';

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}
function daysBetween(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export interface PendingPoRow {
  id: string; poNumber: string; supplierName: string; projectCode: string | null;
  value: number; currency: string; daysWaiting: number;
}
export interface PrWithoutPoRow {
  id: string; itemName: string; prNumber: string | null; projectCode: string | null; daysWaiting: number;
}
export interface WeakSupplierRow {
  id: string; name: string; category: string | null; qualityRating: number | null;
  procurementStatus: string; qcStatus: string; reason: string;
}
export interface EtaSlipRow {
  id: string; entityType: string; projectCode: string | null;
  oldEta: string | null; newEta: string | null; daysSlipped: number; reason: string; changedAt: string;
}

export interface ProcurementConsoleResult {
  pendingPos: PendingPoRow[];
  prWithoutPo: PrWithoutPoRow[];
  weakSuppliers: WeakSupplierRow[];
  etaSlips: EtaSlipRow[];
  delayedPoCount: number;
  error: string | null;
}

const WEAK_PROC_STATUSES = ['suspended', 'blacklisted'];
const UNLINKED_ITEM_STATUSES = ['pending', 'waiting_for_po_to_supplier'];

export async function getProcurementAdminConsole(): Promise<ProcurementConsoleResult> {
  const empty: ProcurementConsoleResult = {
    pendingPos: [], prWithoutPo: [], weakSuppliers: [], etaSlips: [], delayedPoCount: 0, error: null,
  };
  if (!isSupabaseConfigured || !supabase) return empty;
  const db = supabase;

  const [poRes, delayedRes, prItemRes, supRes, etaRes] = await Promise.all([
    db.from('purchase_orders_to_supplier')
      .select('id, po_number, supplier_name, purchase_value, currency, submitted_for_approval_at, project:projects(project_code)')
      .eq('approval_status', 'pending'),
    db.from('purchase_orders_to_supplier').select('id', { count: 'exact', head: true }).eq('po_status', 'delayed'),
    db.from('procurement_request_items')
      .select('id, item_name, created_at, status, procurement_request:procurement_requests(pr_number, project:projects(project_code))')
      .in('status', UNLINKED_ITEM_STATUSES),
    db.from('approved_suppliers').select('id, supplier_name, supplier_category, quality_rating, procurement_status, qc_status'),
    db.from('eta_change_history').select('id, entity_type, old_eta, new_eta, reason, changed_at, project:projects(project_code)')
      .order('changed_at', { ascending: false }).limit(60),
  ]);

  // 1. Pending-approval POs
  const pendingPos: PendingPoRow[] = poRes.error ? [] : (poRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; po_number: string; supplier_name: string; purchase_value: number; currency: string; submitted_for_approval_at: string | null; project: { project_code: string } | null };
    return {
      id: row.id, poNumber: row.po_number, supplierName: row.supplier_name,
      projectCode: row.project?.project_code ?? null, value: Number(row.purchase_value ?? 0),
      currency: row.currency ?? 'SAR', daysWaiting: daysSince(row.submitted_for_approval_at),
    };
  }).sort((a, b) => b.daysWaiting - a.daysWaiting);

  const delayedPoCount = delayedRes.error ? 0 : (delayedRes.count ?? 0);

  // 2. PR items without PO
  const prWithoutPo: PrWithoutPoRow[] = prItemRes.error ? [] : (prItemRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; item_name: string; created_at: string; procurement_request: { pr_number: string; project: { project_code: string } | null } | null };
    return {
      id: row.id, itemName: row.item_name,
      prNumber: row.procurement_request?.pr_number ?? null,
      projectCode: row.procurement_request?.project?.project_code ?? null,
      daysWaiting: daysSince(row.created_at),
    };
  }).sort((a, b) => b.daysWaiting - a.daysWaiting);

  // 3. At-risk suppliers
  const weakSuppliers: WeakSupplierRow[] = supRes.error ? [] : (supRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; supplier_name: string; supplier_category: string | null; quality_rating: number | null; procurement_status: string; qc_status: string };
    const reasons: string[] = [];
    if (row.quality_rating != null && row.quality_rating <= 2) reasons.push(`Low rating (${row.quality_rating}/5)`);
    if (row.qc_status === 'rejected') reasons.push('QC rejected');
    if (WEAK_PROC_STATUSES.includes(row.procurement_status)) reasons.push(row.procurement_status);
    return {
      id: row.id, name: row.supplier_name, category: row.supplier_category,
      qualityRating: row.quality_rating, procurementStatus: row.procurement_status,
      qcStatus: row.qc_status, reason: reasons.join(' · '),
    };
  }).filter((s) => s.reason !== '');

  // 4. ETA slips (new later than old)
  const etaSlips: EtaSlipRow[] = etaRes.error ? [] : (etaRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; entity_type: string; old_eta: string | null; new_eta: string | null; reason: string; changed_at: string; project: { project_code: string } | null };
    return {
      id: row.id, entityType: row.entity_type, projectCode: row.project?.project_code ?? null,
      oldEta: row.old_eta, newEta: row.new_eta, daysSlipped: daysBetween(row.old_eta, row.new_eta),
      reason: row.reason, changedAt: row.changed_at,
    };
  }).filter((e) => e.daysSlipped > 0);

  return { pendingPos, prWithoutPo, weakSuppliers, etaSlips, delayedPoCount, error: null };
}
