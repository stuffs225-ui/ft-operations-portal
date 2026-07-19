// ── Procurement pipeline board ────────────────────────────────────────────────
// One cross-project view of open procurement demand: purchase requests still to be
// ordered, and purchase orders in flight (with ETA + overdue flags). Read-only;
// deferred-migration safe.

import { supabase, isSupabaseConfigured } from './supabase';

// PRs that still need ordering action (not draft / fully ordered / closed / cancelled).
const OPEN_PR_STATUS = ['pr_received', 'in_progress', 'partially_ordered'];
// POs that are placed but not yet fully received (in flight).
const INFLIGHT_PO_STATUS = ['sent_to_supplier', 'eta_confirmed', 'in_transit', 'partially_received', 'delayed'];

export interface PipelinePR {
  id: string;
  prNumber: string;
  status: string;
  projectCode: string;
  client: string;
  createdAt: string;
}

export interface PipelinePO {
  id: string;
  poNumber: string;
  supplier: string;
  status: string;
  projectCode: string;
  etaDate: string | null;
  value: number;
  overdue: boolean;
  daysToEta: number | null;
}

export interface ProcurementPipeline {
  prs: PipelinePR[];
  awaitingApproval: PipelinePO[];
  inFlight: PipelinePO[];
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export async function fetchProcurementPipeline(): Promise<ProcurementPipeline> {
  const empty: ProcurementPipeline = { prs: [], awaitingApproval: [], inFlight: [] };
  if (!isSupabaseConfigured || !supabase) return empty;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [prRes, poRes] = await Promise.all([
    sb.from('procurement_requests')
      .select('id, pr_number, status, created_at, project:projects(project_code, customer_name)')
      .in('status', OPEN_PR_STATUS).order('created_at'),
    sb.from('purchase_orders_to_supplier')
      .select('id, po_number, supplier_name, po_status, eta_date, purchase_value, project:projects(project_code)')
      .in('po_status', [...INFLIGHT_PO_STATUS, 'pending_approval']),
  ]);

  const prs: PipelinePR[] = ((prRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    prNumber: (r.pr_number as string) ?? '—',
    status: (r.status as string) ?? '',
    projectCode: (r.project as { project_code?: string } | null)?.project_code ?? '—',
    client: (r.project as { customer_name?: string } | null)?.customer_name ?? '—',
    createdAt: r.created_at as string,
  }));

  const allPos = ((poRes.data ?? []) as Record<string, unknown>[]).map((r) => {
    const eta = (r.eta_date as string) ?? null;
    const d = daysUntil(eta);
    const status = (r.po_status as string) ?? '';
    return {
      id: r.id as string,
      poNumber: (r.po_number as string) ?? '—',
      supplier: (r.supplier_name as string) ?? '—',
      status,
      projectCode: (r.project as { project_code?: string } | null)?.project_code ?? '—',
      etaDate: eta,
      value: Number(r.purchase_value ?? 0),
      overdue: d !== null && d < 0 && status !== 'partially_received' ? true : (d !== null && d < 0),
      daysToEta: d,
    } as PipelinePO;
  });

  return {
    prs,
    awaitingApproval: allPos.filter((p) => p.status === 'pending_approval'),
    inFlight: allPos.filter((p) => INFLIGHT_PO_STATUS.includes(p.status)),
  };
}
