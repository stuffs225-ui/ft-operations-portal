// ── Store Admin Console ────────────────────────────────────────────────────────
// Admin oversight of four store risk signals:
//   1. Unallocated materials — received store items with no project assigned yet
//      (store_receipt_items.project_id IS NULL), aged by days since receipt.
//   2. Items stuck at QC — store_receipt_items sitting in 'pending_qc'.
//   3. Custody awaiting action — material_custody_records in an approval- or
//      acceptance-pending state (blocking issue/installation).
//   4. Serials awaiting QC — medical_serial_numbers not yet checked / pending QC.
// Read-only; rides admin RLS. Each signal degrades independently (missing table
// or blocked read → that section is empty, never a hard error).

import { supabase, isSupabaseConfigured } from './supabase';

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

export interface UnallocatedItemRow {
  id: string; itemName: string; itemCode: string | null; category: string;
  quantity: number; unit: string; receiptNumber: string | null; daysWaiting: number;
}
export interface PendingQcItemRow {
  id: string; itemName: string; itemCode: string | null; category: string;
  quantity: number; unit: string; projectCode: string | null; daysWaiting: number;
}
export interface CustodyActionRow {
  id: string; custodyNumber: string; projectCode: string | null;
  issueType: string; issuedToRole: string | null; state: string;
  reason: string; daysWaiting: number;
}
export interface SerialQcRow {
  id: string; serialNumber: string; qcStatus: string; currentStatus: string;
  projectCode: string | null; daysWaiting: number;
}

export interface StoreConsoleResult {
  unallocated: UnallocatedItemRow[];
  pendingQc: PendingQcItemRow[];
  custodyActions: CustodyActionRow[];
  serialQc: SerialQcRow[];
  inStoreCount: number;
  error: string | null;
}

// Custody states that block downstream movement and want an admin's eye.
const CUSTODY_PENDING_STATES = ['pending_approval', 'pending_acceptance'] as const;
const SERIAL_PENDING_QC = ['not_checked', 'pending_qc'] as const;

export async function getStoreAdminConsole(): Promise<StoreConsoleResult> {
  const empty: StoreConsoleResult = {
    unallocated: [], pendingQc: [], custodyActions: [], serialQc: [], inStoreCount: 0, error: null,
  };
  if (!isSupabaseConfigured || !supabase) return empty;
  const db = supabase;

  const [unallocRes, pendingQcRes, inStoreRes, custodyRes, serialRes] = await Promise.all([
    db.from('store_receipt_items')
      .select('id, item_name, item_code, material_category, quantity_received, unit, created_at, store_receipt:store_receipts(receipt_number)')
      .is('project_id', null)
      .not('status', 'in', '("consumed","returned","lost_or_damaged")')
      .order('created_at', { ascending: true })
      .limit(100),
    db.from('store_receipt_items')
      .select('id, item_name, item_code, material_category, quantity_received, unit, created_at, project:projects(project_code)')
      .eq('status', 'pending_qc')
      .order('created_at', { ascending: true })
      .limit(100),
    db.from('store_receipt_items').select('id', { count: 'exact', head: true }).eq('status', 'in_store'),
    db.from('material_custody_records')
      .select('id, custody_number, issue_type, issued_to_role, status, approval_status, receiver_decision, created_at, project:projects(project_code)')
      .in('status', CUSTODY_PENDING_STATES)
      .order('created_at', { ascending: true })
      .limit(100),
    db.from('medical_serial_numbers')
      .select('id, serial_number, qc_status, current_status, created_at, project:projects(project_code)')
      .in('qc_status', SERIAL_PENDING_QC)
      .order('created_at', { ascending: true })
      .limit(100),
  ]);

  // 1. Unallocated materials
  const unallocated: UnallocatedItemRow[] = unallocRes.error ? [] : (unallocRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; item_name: string; item_code: string | null; material_category: string; quantity_received: number; unit: string; created_at: string; store_receipt: { receipt_number: string } | null };
    return {
      id: row.id, itemName: row.item_name, itemCode: row.item_code,
      category: row.material_category ?? 'general', quantity: Number(row.quantity_received ?? 0),
      unit: row.unit ?? 'unit', receiptNumber: row.store_receipt?.receipt_number ?? null,
      daysWaiting: daysSince(row.created_at),
    };
  }).sort((a, b) => b.daysWaiting - a.daysWaiting);

  // 2. Items pending QC
  const pendingQc: PendingQcItemRow[] = pendingQcRes.error ? [] : (pendingQcRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; item_name: string; item_code: string | null; material_category: string; quantity_received: number; unit: string; created_at: string; project: { project_code: string } | null };
    return {
      id: row.id, itemName: row.item_name, itemCode: row.item_code,
      category: row.material_category ?? 'general', quantity: Number(row.quantity_received ?? 0),
      unit: row.unit ?? 'unit', projectCode: row.project?.project_code ?? null,
      daysWaiting: daysSince(row.created_at),
    };
  }).sort((a, b) => b.daysWaiting - a.daysWaiting);

  const inStoreCount = inStoreRes.error ? 0 : (inStoreRes.count ?? 0);

  // 3. Custody awaiting action
  const custodyActions: CustodyActionRow[] = custodyRes.error ? [] : (custodyRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; custody_number: string; issue_type: string; issued_to_role: string | null; status: string; approval_status: string; receiver_decision: string; created_at: string; project: { project_code: string } | null };
    const reason = row.status === 'pending_approval' ? 'Awaiting approval'
      : row.status === 'pending_acceptance' ? 'Awaiting receiver acceptance'
      : row.status.replace(/_/g, ' ');
    return {
      id: row.id, custodyNumber: row.custody_number,
      projectCode: row.project?.project_code ?? null,
      issueType: (row.issue_type ?? '').replace(/_/g, ' '),
      issuedToRole: row.issued_to_role, state: row.status, reason,
      daysWaiting: daysSince(row.created_at),
    };
  }).sort((a, b) => b.daysWaiting - a.daysWaiting);

  // 4. Serials awaiting QC
  const serialQc: SerialQcRow[] = serialRes.error ? [] : (serialRes.data ?? []).map((r) => {
    const row = r as unknown as { id: string; serial_number: string; qc_status: string; current_status: string; created_at: string; project: { project_code: string } | null };
    return {
      id: row.id, serialNumber: row.serial_number, qcStatus: row.qc_status,
      currentStatus: row.current_status, projectCode: row.project?.project_code ?? null,
      daysWaiting: daysSince(row.created_at),
    };
  }).sort((a, b) => b.daysWaiting - a.daysWaiting);

  return { unallocated, pendingQc, custodyActions, serialQc, inStoreCount, error: null };
}
