// Live Action Inbox sources (audit finding C3: the inbox was mock-only and
// permanently empty in production).
//
// Each role gets real, actionable queues built from verified status enums and
// real routes. Sources are independent: one failing query never empties the
// whole inbox (per-source try/catch). Roles without a wired queue yet
// (factory_user, afs_user, viewer) intentionally return [] and see the honest
// empty state — never mock data.

import { supabase, isSupabaseConfigured } from './supabase';
import type { InboxTask, TaskPriority, UserRole } from '../types';

const DAY_MS = 86_400_000;

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : Math.floor((Date.now() - t) / DAY_MS);
}

async function safe<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[inbox] source "${label}" failed:`, err);
    return [];
  }
}

type Row = Record<string, unknown>;
const str = (r: Row, k: string) => (r[k] == null ? '' : String(r[k]));

export async function fetchInboxTasks(
  role: UserRole,
  profileId: string | null,
): Promise<InboxTask[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const db = supabase;
  const tasks: InboxTask[] = [];
  const isApprover = role === 'admin' || role === 'operations_manager';

  // ── Admin / Operations: SOs waiting for approval ─────────────────────────────
  if (isApprover) {
    tasks.push(...await safe('so-approvals', async () => {
      const { data, error } = await db.from('projects')
        .select('id, project_code, customer_name, submitted_at')
        .eq('project_status', 'submitted_for_approval')
        .order('submitted_at', { ascending: true, nullsFirst: false })
        .limit(25);
      if (error) throw error;
      return (data as Row[]).map((p): InboxTask => {
        const waiting = daysSince(str(p, 'submitted_at'));
        return {
          id: `so-approve-${str(p, 'id')}`,
          title: `Approve SO ${str(p, 'project_code')}`,
          description: `${str(p, 'customer_name')} — submitted ${waiting} day${waiting === 1 ? '' : 's'} ago and waiting for a decision.`,
          category: 'approval',
          priority: (waiting > 3 ? 'critical' : 'high') as TaskPriority,
          project: str(p, 'project_code'),
          assignedRole: role,
          ...(waiting > 3 ? { overdueBy: waiting - 3 } : {}),
          action: 'Review',
          path: `/projects/${str(p, 'id')}`,
        };
      });
    }));

    // High-value POs pending approval (guarded by migration 061 at DB level).
    tasks.push(...await safe('po-approvals', async () => {
      const { data, error } = await db.from('purchase_orders_to_supplier')
        .select('id, po_number, supplier_name, submitted_for_approval_at')
        .eq('approval_required', true)
        .eq('approval_status', 'pending')
        .limit(25);
      if (error) throw error;
      return (data as Row[]).map((po): InboxTask => ({
        id: `po-approve-${str(po, 'id')}`,
        title: `Approve PO ${str(po, 'po_number')}`,
        description: `High-value purchase order to ${str(po, 'supplier_name')} awaiting approval.`,
        category: 'procurement',
        priority: 'high',
        assignedRole: role,
        action: 'Review',
        path: `/procurement/purchase-orders/${str(po, 'id')}`,
      }));
    }));
  }

  // ── Admin only: overdue invoicing schedule lines ─────────────────────────────
  // (/admin/invoicing-schedule is RequireRole ['admin']; ops is read-only on the
  // data but has no route target, so this queue is admin's.)
  if (role === 'admin') {
    tasks.push(...await safe('invoicing-overdue', async () => {
      const { data, error } = await db.from('project_invoicing_schedule_alerts_view')
        .select('schedule_id, project_code, customer_name, days_overdue, invoice_amount')
        .order('days_overdue', { ascending: false })
        .limit(15);
      if (error) throw error;
      return (data as Row[]).map((l): InboxTask => ({
        id: `pis-overdue-${str(l, 'schedule_id')}`,
        title: `Overdue invoice — ${str(l, 'project_code')}`,
        description: `${str(l, 'customer_name')} — SAR ${Number(l.invoice_amount ?? 0).toLocaleString('en-US')} is ${str(l, 'days_overdue')} day(s) past its planned invoice date.`,
        category: 'governance',
        priority: (Number(l.days_overdue) > 30 ? 'critical' : 'high') as TaskPriority,
        project: str(l, 'project_code'),
        assignedRole: role,
        overdueBy: Number(l.days_overdue) || undefined,
        action: 'Reschedule',
        path: '/admin/invoicing-schedule',
      }));
    }));
  }

  // ── Sales: items sent back to me ─────────────────────────────────────────────
  if (role === 'sales_user' && profileId) {
    tasks.push(...await safe('sales-sent-back-projects', async () => {
      const { data, error } = await db.from('projects')
        .select('id, project_code, customer_name, revision_reason')
        .eq('project_status', 'sent_back_for_revision')
        .eq('created_by', profileId)
        .limit(25);
      if (error) throw error;
      return (data as Row[]).map((p): InboxTask => ({
        id: `so-revise-${str(p, 'id')}`,
        title: `Revise SO ${str(p, 'project_code')}`,
        description: str(p, 'revision_reason') || `${str(p, 'customer_name')} — sent back for revision.`,
        category: 'approval',
        priority: 'high',
        project: str(p, 'project_code'),
        assignedRole: role,
        action: 'Revise',
        path: `/projects/${str(p, 'id')}`,
      }));
    }));

    tasks.push(...await safe('sales-quotations', async () => {
      const { data, error } = await db.from('quotation_requests')
        .select('id, quotation_code, customer_name, quotation_status')
        .in('quotation_status', ['need_clarification', 'returned_to_sales'])
        .eq('requested_by', profileId)
        .limit(25);
      if (error) throw error;
      return (data as Row[]).map((q): InboxTask => ({
        id: `q-followup-${str(q, 'id')}`,
        title: `${str(q, 'quotation_status') === 'need_clarification' ? 'Clarify' : 'Follow up'} quotation ${str(q, 'quotation_code')}`,
        description: `${str(q, 'customer_name')} — ${str(q, 'quotation_status').replace(/_/g, ' ')}.`,
        category: 'quotation',
        priority: 'high',
        assignedRole: role,
        action: 'Open',
        path: `/quotations/${str(q, 'id')}`,
      }));
    }));
  }

  // ── Coordinator: quotations to process ───────────────────────────────────────
  if (role === 'sales_coordinator') {
    tasks.push(...await safe('coordinator-queue', async () => {
      const { data, error } = await db.from('quotation_requests')
        .select('id, quotation_code, customer_name, quotation_status, created_at')
        .in('quotation_status', ['submitted_by_sales', 'quotation_received'])
        .order('created_at', { ascending: true })
        .limit(25);
      if (error) throw error;
      return (data as Row[]).map((q): InboxTask => ({
        id: `q-coord-${str(q, 'id')}`,
        title: `${str(q, 'quotation_status') === 'submitted_by_sales' ? 'Receive' : 'Return to sales'}: ${str(q, 'quotation_code')}`,
        description: `${str(q, 'customer_name')} — ${str(q, 'quotation_status').replace(/_/g, ' ')}.`,
        category: 'quotation',
        priority: daysSince(str(q, 'created_at')) > 2 ? 'high' : 'medium',
        assignedRole: role,
        action: 'Process',
        path: `/quotations/${str(q, 'id')}`,
      }));
    }));
  }

  // ── Procurement: open PRs + rejected POs ─────────────────────────────────────
  if (role === 'procurement_user') {
    tasks.push(...await safe('procurement-open-prs', async () => {
      const { data, error } = await db.from('procurement_requests')
        .select('id, pr_number, status')
        .in('status', ['pr_received', 'in_progress', 'partially_ordered'])
        .limit(25);
      if (error) throw error;
      return (data as Row[]).map((pr): InboxTask => ({
        id: `pr-open-${str(pr, 'id')}`,
        title: `PR ${str(pr, 'pr_number')} — ${str(pr, 'status').replace(/_/g, ' ')}`,
        description: 'Open procurement request with items still to order.',
        category: 'procurement',
        priority: 'medium',
        assignedRole: role,
        action: 'Continue',
        path: `/procurement/requests/${str(pr, 'id')}`,
      }));
    }));

    tasks.push(...await safe('procurement-rejected-pos', async () => {
      const { data, error } = await db.from('purchase_orders_to_supplier')
        .select('id, po_number, supplier_name, rejection_reason')
        .eq('approval_status', 'rejected')
        .not('po_status', 'in', '(cancelled,closed)')
        .limit(25);
      if (error) throw error;
      return (data as Row[]).map((po): InboxTask => ({
        id: `po-rejected-${str(po, 'id')}`,
        title: `PO ${str(po, 'po_number')} was rejected`,
        description: str(po, 'rejection_reason') || `Rejected approval — revise and resubmit (${str(po, 'supplier_name')}).`,
        category: 'procurement',
        priority: 'high',
        assignedRole: role,
        action: 'Fix & resubmit',
        path: `/procurement/purchase-orders/${str(po, 'id')}`,
      }));
    }));
  }

  // ── QC: pending / in-progress material inspections ───────────────────────────
  if (role === 'qc_user') {
    tasks.push(...await safe('qc-pending-inspections', async () => {
      const { data, error } = await db.from('material_qc_inspections')
        .select('id, inspection_number, inspection_status')
        .in('inspection_status', ['pending', 'in_progress'])
        .limit(25);
      if (error) throw error;
      return (data as Row[]).map((qc): InboxTask => ({
        id: `qc-insp-${str(qc, 'id')}`,
        title: `Inspection ${str(qc, 'inspection_number')} — ${str(qc, 'inspection_status').replace(/_/g, ' ')}`,
        description: 'Material inspection awaiting a QC decision.',
        category: 'qc',
        priority: 'medium',
        assignedRole: role,
        action: 'Open queue',
        path: '/qc/work-queue',
      }));
    }));
  }

  // ── Store: receipts still open ───────────────────────────────────────────────
  if (role === 'store_user') {
    tasks.push(...await safe('store-open-receipts', async () => {
      const { data, error } = await db.from('store_receipts')
        .select('id, receipt_number, status')
        .in('status', ['draft', 'partially_received', 'pending_material_qc'])
        .limit(25);
      if (error) throw error;
      return (data as Row[]).map((r): InboxTask => ({
        id: `grn-open-${str(r, 'id')}`,
        title: `Receipt ${str(r, 'receipt_number')} — ${str(r, 'status').replace(/_/g, ' ')}`,
        description: 'Goods receipt not yet closed out.',
        category: 'store',
        priority: 'medium',
        assignedRole: role,
        action: 'Open',
        path: `/store/receipts/${str(r, 'id')}`,
      }));
    }));
  }

  // factory_user / afs_user / viewer: no live queue wired yet — honest empty
  // state (documented follow-up), never mock.
  return tasks;
}
