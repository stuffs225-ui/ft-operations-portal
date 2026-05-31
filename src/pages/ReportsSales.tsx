import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { isSupabaseConfigured } from '../lib/supabase';
import { MOCK_QUOTATIONS } from '../data/mockQuotations';
import { MOCK_PROJECTS } from '../data/mockProjects';
import type { QuotationStatus } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActiveTab = 'Quotations' | 'Active Projects' | 'Aging';

const TABS: ActiveTab[] = ['Quotations', 'Active Projects', 'Aging'];

// ── Constants ─────────────────────────────────────────────────────────────────

const QUOTATION_STATUS_BADGE: Record<QuotationStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  draft:                  { label: 'Draft',              variant: 'neutral' },
  submitted_by_sales:     { label: 'Submitted',          variant: 'warning' },
  received_by_coordinator:{ label: 'Received',           variant: 'info' },
  sent_to_estimation:     { label: 'Sent to Estimation', variant: 'warning' },
  waiting_for_estimation: { label: 'Waiting Estimation', variant: 'warning' },
  need_clarification:     { label: 'Need Clarification', variant: 'critical' },
  quotation_received:     { label: 'Quotation Ready',    variant: 'success' },
  returned_to_sales:      { label: 'Returned to Sales',  variant: 'info' },
  converted_to_hot_project:{ label: 'Hot Project',       variant: 'info' },
  converted_to_so:        { label: 'Converted to SO',    variant: 'success' },
  cancelled:              { label: 'Cancelled',          variant: 'neutral' },
  closed_lost:            { label: 'Closed Lost',        variant: 'neutral' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function quotationStatusBadge(status: QuotationStatus) {
  const { label, variant } = QUOTATION_STATUS_BADGE[status] ?? { label: status, variant: 'neutral' };
  return <Badge variant={variant}>{label}</Badge>;
}

function projectStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
    approved:  { label: 'Approved', variant: 'info' },
    active:    { label: 'Active',   variant: 'success' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' };
  return <Badge variant={variant}>{label}</Badge>;
}

function locationBadge(loc: string) {
  if (loc === 'not_set') return <Badge variant="neutral">Not Set</Badge>;
  if (loc === 'saudi') return <Badge variant="default">Saudi</Badge>;
  return <Badge variant="info">Dubai</Badge>;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuotationsTab() {
  const total = MOCK_QUOTATIONS.length;
  const pendingCoordinator = MOCK_QUOTATIONS.filter(
    q => q.quotation_status === 'submitted_by_sales',
  ).length;
  const returnedToSales = MOCK_QUOTATIONS.filter(
    q => q.quotation_status === 'returned_to_sales',
  ).length;
  const converted = MOCK_QUOTATIONS.filter(
    q => q.quotation_status === 'converted_to_so',
  ).length;

  const summaryCards = [
    { label: 'Total Quotations', value: total, accent: 'border-brand-400' },
    { label: 'Pending Coordinator', value: pendingCoordinator, accent: pendingCoordinator > 0 ? 'border-amber-400' : 'border-gray-200' },
    { label: 'Returned to Sales', value: returnedToSales, accent: returnedToSales > 0 ? 'border-sky-400' : 'border-gray-200' },
    { label: 'Converted to SO', value: converted, accent: 'border-green-400' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <Card key={card.label} className={`border-l-4 ${card.accent}`} padding="sm">
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quotation #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sales Owner</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_QUOTATIONS.map(q => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-900">{q.quotation_code}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{q.customer_name}</td>
                  <td className="px-4 py-3">{quotationStatusBadge(q.quotation_status)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {q.submitted_at ? formatDate(q.submitted_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">Sales User</td>
                  <td className="px-4 py-3">
                    <Link to={`/quotations/${q.id}`}>
                      <Button variant="ghost" size="sm" icon={<ArrowRight size={13} />}>
                        View
                      </Button>
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

function ActiveProjectsTab() {
  const activeProjects = MOCK_PROJECTS.filter(
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
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  No active or approved projects.
                </td>
              </tr>
            ) : (
              activeProjects.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-900">{p.project_code}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{p.customer_name}</td>
                  <td className="px-4 py-3">{locationBadge(p.manufacturing_location)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {p.customer_delivery_date ? formatDate(p.customer_delivery_date) : '—'}
                  </td>
                  <td className="px-4 py-3">{projectStatusBadge(p.project_status)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/projects/${p.id}`}>
                      <Button variant="ghost" size="sm" icon={<ArrowRight size={13} />}>
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AgingTab() {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 px-6 py-10 text-center text-sm text-gray-500">
      Aging / Receivables report coming in a future phase.
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReportsSales() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('Quotations');

  return (
    <div className="space-y-6">
      {!isSupabaseConfigured && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2">
          Dev mode — displaying mock data
        </div>
      )}

      <PageHeader
        title="Sales Reports"
        subtitle="Quotation pipeline, conversion, and active project overview"
        breadcrumb={[{ label: 'Reports', path: '/reports' }, { label: 'Sales' }]}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
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

      {/* Tab content */}
      {activeTab === 'Quotations' && <QuotationsTab />}
      {activeTab === 'Active Projects' && <ActiveProjectsTab />}
      {activeTab === 'Aging' && <AgingTab />}
    </div>
  );
}
