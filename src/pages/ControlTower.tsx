import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, XCircle, ArrowRight, Radio,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  MOCK_PROJECT_HEALTH_SCORES,
  MOCK_DEPARTMENT_HEALTH_SCORES,
  MOCK_OPERATIONAL_ISSUES,
  MOCK_DATA_QUALITY_CHECKS,
  getOpenSlaBreaches,
} from '../data/mockReports';
import { MOCK_PROJECTS } from '../data/mockProjects';
import { MOCK_EXECUTION_REFERENCES } from '../data/mockExecutionReferences';
import { isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty, isLiveMode } from '../lib/dataMode';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function severityVariant(severity: string): 'critical' | 'warning' | 'neutral' {
  if (severity === 'critical') return 'critical';
  if (severity === 'high' || severity === 'medium') return 'warning';
  return 'neutral';
}

function healthBandColor(band: string): string {
  if (band === 'healthy') return 'bg-green-500';
  if (band === 'watch') return 'bg-amber-400';
  if (band === 'at_risk') return 'bg-orange-500';
  return 'bg-red-600';
}

function healthBandVariant(band: string): 'success' | 'warning' | 'critical' | 'neutral' {
  if (band === 'healthy') return 'success';
  if (band === 'watch') return 'warning';
  if (band === 'at_risk') return 'critical';
  return 'critical';
}

function entityPath(entityType: string, entityId: string): string {
  const map: Record<string, string> = {
    project: `/projects/${entityId}`,
    quotation: `/quotations/${entityId}`,
    pr_item: '/procurement/requests',
    purchase_order: '/procurement/purchase-orders',
    release_note: '/project-qc/release-notes',
    maintenance_request: '/after-sales/maintenance',
    store_receipt: '/store/receipts',
    qc_finding: '/project-qc/findings',
  };
  return map[entityType] ?? '/';
}

function issuePath(moduleName: string): string {
  const map: Record<string, string> = {
    project_qc: '/project-qc/release-notes',
    dubai_afs: '/wo-pn-gate',
    after_sales: '/after-sales/maintenance',
    procurement: '/procurement/purchase-orders',
    store: '/store/vehicle-receiving',
    projects: '/projects',
    factory: '/factory/monthly-updates',
  };
  return map[moduleName] ?? '/';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ControlTower() {
  // Live mode has no wired aggregation yet — never compute from mock records.
  const projects = mockOrEmpty(MOCK_PROJECTS);
  const execRefs = mockOrEmpty(MOCK_EXECUTION_REFERENCES);
  const operationalIssues = mockOrEmpty(MOCK_OPERATIONAL_ISSUES);
  const dqChecks = mockOrEmpty(MOCK_DATA_QUALITY_CHECKS);
  const projectHealthScores = mockOrEmpty(MOCK_PROJECT_HEALTH_SCORES);
  const departmentHealthScores = mockOrEmpty(MOCK_DEPARTMENT_HEALTH_SCORES);

  // ── Top bar stats ──────────────────────────────────────────────────────────
  const openSlaBreaches = isLiveMode() ? [] : getOpenSlaBreaches();
  const openSlaCount = openSlaBreaches.length;

  const criticalIssues = operationalIssues.filter(
    i => i.severity === 'critical' && !['closed', 'cancelled', 'resolved'].includes(i.status),
  );
  const criticalIssueCount = criticalIssues.length;

  const criticalDqCount = dqChecks.filter(
    c => c.severity === 'critical',
  ).length;

  // ── Section 1: Project Lifecycle Counts ────────────────────────────────────
  const activeStatuses = ['active', 'approved', 'submitted_for_approval'];
  const totalActive = projects.filter(p => activeStatuses.includes(p.project_status)).length;
  const pendingApproval = projects.filter(p => p.project_status === 'submitted_for_approval').length;
  const approvedCount = projects.filter(p => p.project_status === 'approved').length;

  const saudiApproved = projects.filter(
    p => p.manufacturing_location === 'saudi' && p.project_status === 'approved',
  );
  const missingWo = saudiApproved.filter(p => {
    const hasWo = execRefs.some(
      r => r.project_id === p.id && r.reference_type === 'wo'
        && r.status !== 'cancelled' && r.status !== 'superseded',
    );
    return !hasWo;
  }).length;

  const dubaiApproved = projects.filter(
    p => p.manufacturing_location === 'dubai' && p.project_status === 'approved',
  );
  const missingPn = dubaiApproved.filter(p => {
    const hasPn = execRefs.some(
      r => r.project_id === p.id && r.reference_type === 'pn'
        && r.status !== 'cancelled' && r.status !== 'superseded',
    );
    return !hasPn;
  }).length;

  const readyForDelivery = 2;

  const lifecycleCards = [
    { label: 'Total Active Projects', value: totalActive, accent: 'border-brand-400' },
    { label: 'Pending Approval', value: pendingApproval, accent: pendingApproval > 0 ? 'border-amber-400' : 'border-gray-200' },
    { label: 'Approved Projects', value: approvedCount, accent: 'border-green-400' },
    { label: 'Missing WO (Saudi)', value: missingWo, accent: missingWo > 0 ? 'border-red-400' : 'border-gray-200' },
    { label: 'Missing PN (Dubai)', value: missingPn, accent: missingPn > 0 ? 'border-red-400' : 'border-gray-200' },
    { label: 'Ready for Delivery', value: readyForDelivery, accent: 'border-sky-400' },
  ];

  // ── Section 2: Critical Exceptions ─────────────────────────────────────────
  type ExceptionItem = {
    id: string;
    severity: string;
    description: string;
    entity: string;
    path: string;
  };

  const slaExceptions: ExceptionItem[] = openSlaBreaches.map(e => ({
    id: e.id,
    severity: e.severity,
    description: e.remarks ?? `SLA breach on ${e.entity_type} ${e.entity_id}`,
    entity: `${e.entity_type} · overdue ${formatDate(e.due_at)}`,
    path: entityPath(e.entity_type, e.entity_id),
  }));

  const openIssues = operationalIssues.filter(
    i => !['closed', 'cancelled', 'resolved'].includes(i.status),
  );
  const issueExceptions: ExceptionItem[] = openIssues.map(i => ({
    id: i.id,
    severity: i.severity,
    description: i.title,
    entity: i.project ? `${i.project.project_code} · ${i.project.customer_name}` : i.issue_number,
    path: issuePath(i.module_name),
  }));

  const allExceptions = [...slaExceptions, ...issueExceptions].slice(0, 8);

  // ── Section 4: Project health distribution ─────────────────────────────────
  const bands = ['healthy', 'watch', 'at_risk', 'critical'] as const;
  const bandCounts = bands.map(band => ({
    band,
    count: projectHealthScores.filter(s => s.score_band === band).length,
  }));

  const bandLabels: Record<string, string> = {
    healthy: 'Healthy', watch: 'Watch', at_risk: 'At Risk', critical: 'Critical',
  };

  const deptLabels: Record<string, string> = {
    sales: 'Sales',
    sales_coordinator: 'Sales Coord.',
    procurement: 'Procurement',
    factory: 'Factory',
    store: 'Store',
    qc: 'QC',
    afs: 'AFS',
    operations: 'Operations',
  };

  return (
    <div className="space-y-6">
      {!isSupabaseConfigured && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2">
          Dev mode — displaying mock data
        </div>
      )}

      <PageHeader
        title="Control Tower"
        subtitle="Live operational monitoring — exceptions, blockers, and delivery status"
        breadcrumb={[{ label: 'Control Tower' }]}
        actions={<DataSourceBadge variant="preview" />}
      />

      {isLiveMode() && (
        <div className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg px-4 py-2">
          Control Tower aggregation is not yet connected to live data — figures populate once the
          aggregation layer is wired. Use module pages and Reports for current status.
        </div>
      )}

      {/* Top bar: summary stats */}
      <div className="flex flex-wrap gap-3">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          openSlaCount > 0
            ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
            : 'bg-gray-100 text-gray-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${openSlaCount > 0 ? 'bg-red-500' : 'bg-gray-400'}`} />
          {openSlaCount} Open SLA Breach{openSlaCount !== 1 ? 'es' : ''}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          criticalIssueCount > 0
            ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
            : 'bg-gray-100 text-gray-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${criticalIssueCount > 0 ? 'bg-red-500' : 'bg-gray-400'}`} />
          {criticalIssueCount} Critical Issue{criticalIssueCount !== 1 ? 's' : ''}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          criticalDqCount > 0
            ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
            : 'bg-gray-100 text-gray-600'
        }`}>
          <span className={`w-2 h-2 rounded-full ${criticalDqCount > 0 ? 'bg-amber-500' : 'bg-gray-400'}`} />
          {criticalDqCount} Data Quality Gap{criticalDqCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Section 1: Project Lifecycle Overview */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Project Lifecycle Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {lifecycleCards.map(card => (
            <Card key={card.label} className={`border-l-4 ${card.accent}`} padding="sm">
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 mt-1">{card.label}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Section 2: Critical Exceptions */}
      <section>
        <Card padding="none">
          <div className="p-5">
            <CardHeader
              title="Critical Exceptions"
              subtitle="Actionable items requiring attention"
            />
          </div>
          {allExceptions.length === 0 ? (
            <div className="px-5 pb-5 text-sm text-gray-500 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              No open exceptions — all clear
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {allExceptions.map(item => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 px-5 py-3 border-l-4 ${
                    item.severity === 'critical' ? 'border-red-400 bg-red-50/30' :
                    item.severity === 'high' || item.severity === 'medium' ? 'border-amber-400 bg-amber-50/20' :
                    'border-gray-200'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.severity === 'critical' ? (
                      <XCircle size={15} className="text-red-500" />
                    ) : (
                      <AlertTriangle size={15} className="text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={severityVariant(item.severity)}>
                        {item.severity}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {item.description}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.entity}</p>
                  </div>
                  <Link to={item.path} className="shrink-0">
                    <Button variant="ghost" size="sm" icon={<ArrowRight size={13} />}>
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* Section 3: Delivery Readiness */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Delivery Readiness
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Release Notes Issued', value: 1, accent: 'border-green-400' },
            { label: 'Ready for Delivery', value: 0, accent: 'border-gray-200' },
            { label: 'Blocked by QC', value: 1, accent: 'border-red-400' },
            { label: 'Pre-delivery Blocked', value: 1, accent: 'border-amber-400' },
          ].map(card => (
            <Card key={card.label} className={`border-l-4 ${card.accent}`} padding="sm">
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 mt-1">{card.label}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Section 4: Operational Health */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
          Operational Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Project Health Distribution */}
          <Card>
            <CardHeader title="Project Health Distribution" />
            <div className="space-y-3">
              {bandCounts.map(({ band, count }) => (
                <div key={band} className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${healthBandColor(band)}`} />
                  <span className="text-sm text-gray-700 flex-1">{bandLabels[band]}</span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Department Health */}
          <Card>
            <CardHeader title="Department Health" />
            <div className="space-y-2">
              {departmentHealthScores.map(dept => (
                <div key={dept.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    {deptLabels[dept.department_key] ?? dept.department_key}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">{dept.score}</span>
                    <Badge variant={healthBandVariant(dept.score_band)}>
                      {dept.score_band}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

    </div>
  );
}
