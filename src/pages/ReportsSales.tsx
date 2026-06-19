import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_QUOTATIONS as MOCK_QUOTATIONS_RAW } from '../data/mockQuotations';
import { MOCK_PROJECTS as MOCK_PROJECTS_RAW } from '../data/mockProjects';
import { mockOrEmpty } from '../lib/dataMode';
import { ReportExportBar } from '../components/features/ReportExportBar';
import { exportRowsToCsv } from '../lib/reportExport';
import type { ReportColumn } from '../lib/reportExport';
import type { QuotationRequest, Project, QuotationStatus } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActiveTab = 'Quotations' | 'Active Projects' | 'Aging';
const TABS: ActiveTab[] = ['Quotations', 'Active Projects', 'Aging'];

// ── Constants ─────────────────────────────────────────────────────────────────

const QUOTATION_STATUS_BADGE: Record<QuotationStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  draft:                    { label: 'Draft',              variant: 'neutral' },
  submitted_by_sales:       { label: 'Submitted',          variant: 'warning' },
  received_by_coordinator:  { label: 'Received',           variant: 'info' },
  sent_to_estimation:       { label: 'Sent to Estimation', variant: 'warning' },
  waiting_for_estimation:   { label: 'Waiting Estimation', variant: 'warning' },
  need_clarification:       { label: 'Need Clarification', variant: 'critical' },
  quotation_received:       { label: 'Quotation Ready',    variant: 'success' },
  returned_to_sales:        { label: 'Returned to Sales',  variant: 'info' },
  converted_to_hot_project: { label: 'Hot Project',        variant: 'info' },
  converted_to_so:          { label: 'Converted to SO',    variant: 'success' },
  cancelled:                { label: 'Cancelled',          variant: 'neutral' },
  closed_lost:              { label: 'Closed Lost',        variant: 'neutral' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function quotationStatusBadge(status: QuotationStatus) {
  const { label, variant } = QUOTATION_STATUS_BADGE[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function projectStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    approved: { label: 'Approved', variant: 'info' },
    active:   { label: 'Active',   variant: 'success' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function locationBadge(loc: string) {
  if (loc === 'not_set') return <Badge variant="neutral">Not Set</Badge>;
  if (loc === 'saudi') return <Badge variant="default">Saudi</Badge>;
  return <Badge variant="info">Dubai</Badge>;
}

// ── Tab Components ────────────────────────────────────────────────────────────

function QuotationsTab({ quotations }: { quotations: QuotationRequest[] }) {
  const total = quotations.length;
  const pendingCoordinator = quotations.filter(q => q.quotation_status === 'submitted_by_sales').length;
  const returnedToSales = quotations.filter(q => q.quotation_status === 'returned_to_sales').length;
  const converted = quotations.filter(q => q.quotation_status === 'converted_to_so').length;

  const summaryCards = [
    { label: 'Total Quotations', value: total, accent: 'border-brand-400' },
    { label: 'Pending Coordinator', value: pendingCoordinator, accent: pendingCoordinator > 0 ? 'border-amber-400' : 'border-gray-200' },
    { label: 'Returned to Sales', value: returnedToSales, accent: returnedToSales > 0 ? 'border-sky-400' : 'border-gray-200' },
    { label: 'Converted to SO', value: converted, accent: 'border-green-400' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <Card key={card.label} className={`border-l-4 ${card.accent}`} padding="sm">
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </Card>
        ))}
      </div>
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quotation #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quotations.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No quotation requests found.</td></tr>
              ) : quotations.map(q => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-900">{q.quotation_code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{q.customer_name}</td>
                  <td className="px-4 py-3">{quotationStatusBadge(q.quotation_status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {q.submitted_at ? formatDate(q.submitted_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/quotations/${q.id}`}>
                      <Button variant="ghost" size="sm" icon={<ArrowRight size={13} />}>View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ActiveProjectsTab({ projects }: { projects: Project[] }) {
  const activeProjects = projects.filter(
    p => p.project_status === 'approved' || p.project_status === 'active',
  );

  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivery Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {activeProjects.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No active or approved projects.</td></tr>
            ) : activeProjects.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-900">{p.project_code}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{p.customer_name}</td>
                <td className="px-4 py-3">{locationBadge(p.manufacturing_location)}</td>
                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                  {p.customer_delivery_date ? formatDate(p.customer_delivery_date) : '—'}
                </td>
                <td className="px-4 py-3">{projectStatusBadge(p.project_status)}</td>
                <td className="px-4 py-3">
                  <Link to={`/projects/${p.id}`}>
                    <Button variant="ghost" size="sm" icon={<ArrowRight size={13} />}>View</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsSales() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('Quotations');
  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setQuotations(mockOrEmpty(MOCK_QUOTATIONS_RAW) as unknown as QuotationRequest[]);
        setProjects(mockOrEmpty(MOCK_PROJECTS_RAW) as unknown as Project[]);
        setLoading(false);
        return;
      }
      const [qRes, pRes] = await Promise.all([
        supabase.from('quotation_requests')
          .select('id, quotation_code, customer_name, quotation_status, submitted_at, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('projects')
          .select('id, project_code, customer_name, project_status, manufacturing_location, customer_delivery_date, so_number, total_sales_value')
          .in('project_status', ['approved', 'active'])
          .order('created_at', { ascending: false }),
      ]);
      if (!qRes.error) setQuotations((qRes.data ?? []) as unknown as QuotationRequest[]);
      if (!pRes.error) setProjects((pRes.data ?? []) as unknown as Project[]);
      setLoading(false);
    })();
  }, []);

  function handleExportCsv() {
    if (activeTab === 'Quotations') {
      const columns: ReportColumn<QuotationRequest>[] = [
        { key: 'quotation_code', header: 'Quotation #', value: q => q.quotation_code },
        { key: 'customer_name', header: 'Customer', value: q => q.customer_name },
        { key: 'quotation_status', header: 'Status', value: q => q.quotation_status },
        { key: 'submitted_at', header: 'Submitted', value: q => q.submitted_at ?? '' },
      ];
      exportRowsToCsv(`sales-quotations-${new Date().toISOString().split('T')[0]}.csv`, quotations, columns);
    } else {
      const activeProjects = projects.filter(p => ['approved', 'active'].includes(p.project_status));
      const columns: ReportColumn<Project>[] = [
        { key: 'project_code', header: 'Project Code', value: p => p.project_code },
        { key: 'customer_name', header: 'Customer', value: p => p.customer_name },
        { key: 'project_status', header: 'Status', value: p => p.project_status },
        { key: 'manufacturing_location', header: 'Location', value: p => p.manufacturing_location },
        { key: 'customer_delivery_date', header: 'Delivery Date', value: p => p.customer_delivery_date },
      ];
      exportRowsToCsv(`active-projects-${new Date().toISOString().split('T')[0]}.csv`, activeProjects, columns);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Reports"
        subtitle="Quotation pipeline, conversion, and active project overview"
        breadcrumb={[{ label: 'Reports', href: '/reports' }, { label: 'Sales' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      <ReportExportBar
        reportKey="sales_report"
        reportTitle="Sales Report"
        department="Sales"
        onExportCsv={handleExportCsv}
        summary={`${quotations.length} quotation${quotations.length !== 1 ? 's' : ''} · ${projects.length} active project${projects.length !== 1 ? 's' : ''}`}
      />

      <div className="report-print-root space-y-6">
        <div className="flex gap-1 border-b border-gray-200 no-print">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === 'Quotations' && <QuotationsTab quotations={quotations} />}
        {activeTab === 'Active Projects' && <ActiveProjectsTab projects={projects} />}
        {activeTab === 'Aging' && (
          <EmptyState
            icon={<Clock size={28} className="text-gray-400" />}
            title="Aging / Receivables report not yet available"
            description="Use the Receivables module for current aging data."
          />
        )}
      </div>
    </div>
  );
}
