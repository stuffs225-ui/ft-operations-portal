// Project Invoicing — reads THE invoicing source of truth:
// project_invoicing_schedule (migration 100). Legacy milestones (069) are
// displayed read-only when rows exist; the page no longer creates plans,
// milestones, or status changes (docs/implementation/financial-truth.md).
// Net / VAT / gross come from the project_financials view (migration 103) and
// are visible only to admin / ops / the owning sales_user — the view itself
// enforces that; other roles simply see the schedule without money breakdown.

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ReceiptText, ArrowLeft, CalendarClock, Info } from 'lucide-react';
import { PageLoader } from '../components/ui/PageLoader';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  getProjectFinancials, getProjectScheduleLines,
  type ProjectFinancialsRow, type ProjectScheduleLine,
} from '../lib/projectFinancialsQueries';
import type { DeferredAvailability } from '../lib/deferredMigrationSafety';
import { formatSAR } from '../lib/currency';


interface ProjectMeta {
  id: string;
  project_code: string;
  customer_name: string;
  so_number: string;
  total_sales_value: number;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const SCHEDULE_STATUS_CONFIG: Record<ProjectScheduleLine['status'], { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  scheduled:   { label: 'Scheduled',   variant: 'info' },
  overdue:     { label: 'Overdue',     variant: 'critical' },
  rescheduled: { label: 'Rescheduled', variant: 'warning' },
  invoiced:    { label: 'Invoiced',    variant: 'success' },
  cancelled:   { label: 'Cancelled',   variant: 'neutral' },
};

const SOURCE_LABELS: Record<string, string> = {
  delivery_date:      'Auto (delivery date)',
  admin_split:        'Admin split',
  admin_manual:       'Admin manual',
  migration_backfill: '2026 plan import',
  sales_line_plan:    'Sales line plan',
};

export function ProjectInvoicing() {
  const { projectId } = useParams<{ projectId: string }>();
  const { role } = useAuth();

  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [schedule, setSchedule] = useState<ProjectScheduleLine[]>([]);
  const [scheduleAvailability, setScheduleAvailability] = useState<DeferredAvailability | null>(null);
  const [financials, setFinancials] = useState<ProjectFinancialsRow | null>(null);
  const [financialsAvailability, setFinancialsAvailability] = useState<DeferredAvailability | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    async function load() {
      const [projRes, schedRes, finRes] = await Promise.all([
        supabase!.from('projects').select('id,project_code,customer_name,so_number,total_sales_value').eq('id', projectId!).single(),
        getProjectScheduleLines(projectId!),
        getProjectFinancials(projectId!),
      ]);
      if (cancelled) return;
      if (projRes.error) setError(projRes.error.message);
      else setProject(projRes.data as ProjectMeta);
      setSchedule(schedRes.data);
      setScheduleAvailability(schedRes.availability);
      if (schedRes.error) setError(schedRes.error);
      setFinancials(finRes.data);
      setFinancialsAvailability(finRes.availability);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [projectId]);

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-4">
        <PageHeader title="Project Invoicing" actions={<Link to={`/projects/${projectId}`}><Button variant="secondary" icon={<ArrowLeft size={14} />} size="sm">Back to Project</Button></Link>} />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Supabase is not configured.</div>
      </div>
    );
  }

  if (loading) return <PageLoader />;

  const activeLines = schedule.filter((l) => l.status !== 'cancelled');
  const scheduledTotal = activeLines.reduce((s, l) => s + l.invoiceAmount, 0);
  const invoicedTotal = activeLines.filter((l) => l.status === 'invoiced').reduce((s, l) => s + l.invoiceAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoicing Schedule"
        subtitle={project ? `${project.project_code} · ${project.customer_name}` : 'Project Invoicing'}
        actions={
          <div className="flex items-center gap-2">
            {role === 'admin' && (
              <Link to="/admin/invoicing-schedule">
                <Button variant="secondary" icon={<CalendarClock size={14} />} size="sm">Manage Schedules</Button>
              </Link>
            )}
            <Link to={`/projects/${projectId}`}>
              <Button variant="secondary" icon={<ArrowLeft size={14} />} size="sm">Back to Project</Button>
            </Link>
          </div>
        }
      />

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Financial summary — Net / VAT / Gross (visible to admin/ops/owning sales via the view's own restriction) */}
      {financials && (
        <Card className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-500">Lines Net (excl. VAT)</div>
              <div className="text-base font-semibold text-gray-900">{formatSAR(financials.linesNet)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">VAT (15% on {financials.vatLineCount} line{financials.vatLineCount === 1 ? '' : 's'})</div>
              <div className="text-base font-semibold text-gray-700">{formatSAR(financials.linesVat)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Gross (incl. VAT)</div>
              <div className="text-base font-semibold text-gray-900">{formatSAR(financials.linesGross)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Scheduled (net plan)</div>
              <div className="text-base font-semibold text-brand-600">{formatSAR(scheduledTotal)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Invoiced</div>
              <div className="text-base font-semibold text-emerald-600">{formatSAR(invoicedTotal)}</div>
            </div>
          </div>
        </Card>
      )}
      {financialsAvailability && !financialsAvailability.available && financialsAvailability.unavailableReason && (
        <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>Net/VAT breakdown pending: {financialsAvailability.unavailableReason}</span>
        </div>
      )}

      {/* Schedule — THE invoicing plan */}
      {scheduleAvailability && !scheduleAvailability.available ? (
        <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
          <Info size={15} className="shrink-0 mt-0.5" />
          <span>{scheduleAvailability.unavailableReason}</span>
        </div>
      ) : schedule.length === 0 ? (
        <EmptyState
          icon={<ReceiptText size={32} className="text-gray-300" />}
          title="No invoicing schedule yet"
          description="Schedule lines are created automatically with the project and managed by Admin on the Invoicing Schedule page."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Schedule Lines ({schedule.length})</h3>
            <span className="text-xs text-gray-400">Amounts are NET (excl. VAT) — see financial convention</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Label</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">Qty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Amount (net)</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Invoice Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Source</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Invoice #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {schedule.map((l) => {
                  const cfg = SCHEDULE_STATUS_CONFIG[l.status];
                  return (
                    <tr key={l.id} className={`hover:bg-gray-50 ${l.status === 'cancelled' ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-gray-500">{l.sequenceNo}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {l.scheduleLabel ?? '—'}
                        {l.delayCount > 0 && <span className="ml-1.5 text-[10px] text-amber-600">({l.delayCount}× rescheduled)</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{l.plannedQuantity ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatSAR(l.invoiceAmount)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(l.currentInvoiceDate)}</td>
                      <td className="px-4 py-3"><Badge variant={cfg.variant} size="sm">{cfg.label}</Badge></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{SOURCE_LABELS[l.source] ?? l.source}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{l.invoiceReference ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
}
