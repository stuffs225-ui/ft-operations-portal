import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { isSupabaseConfigured } from '../lib/supabase';
import { MOCK_SLA_RULES, MOCK_SLA_EVENTS, getOpenSlaBreaches } from '../data/mockReports';
import { getSlaStatus, isOverdue, getSlaSeverityBadge, formatDuration, getSlaDueLabel } from '../lib/slaEngine';
import type { SlaEvent } from '../types';

type Tab = 'Open Breaches' | 'All Events' | 'SLA Rules';

function slaStatusBadgeVariant(event: SlaEvent): 'critical' | 'warning' | 'success' | 'info' | 'default' {
  const status = getSlaStatus(event);
  if (status === 'overdue') return 'critical';
  if (status === 'due_soon') return 'warning';
  if (status === 'within_sla') return 'success';
  if (status === 'breached') return 'critical';
  return 'success'; // resolved
}

function eventStatusBadgeVariant(status: SlaEvent['status']): 'warning' | 'info' | 'critical' | 'success' | 'default' {
  if (status === 'open') return 'warning';
  if (status === 'acknowledged') return 'info';
  if (status === 'escalated') return 'critical';
  if (status === 'resolved') return 'success';
  return 'default'; // cancelled
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

export function ReportsSLA() {
  const [activeTab, setActiveTab] = useState<Tab>('Open Breaches');

  const openBreaches = getOpenSlaBreaches();
  const escalatedCount = MOCK_SLA_EVENTS.filter(e => e.status === 'escalated').length;
  const resolvedCount = MOCK_SLA_EVENTS.filter(e => e.status === 'resolved').length;

  const tabs: Tab[] = ['Open Breaches', 'All Events', 'SLA Rules'];

  const breachEvents = MOCK_SLA_EVENTS
    .filter(e => isOverdue(e) || e.status === 'escalated')
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="SLA & Escalations"
        subtitle="Service level rules, open breaches, and escalation tracking"
      />

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Dev mode — showing mock SLA event data.
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-xl p-4 border border-gray-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Open Breaches</p>
            <p className="text-2xl font-bold text-red-700">{openBreaches.length}</p>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-gray-200 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Escalated</p>
            <p className="text-2xl font-bold text-amber-700">{escalatedCount}</p>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-gray-200 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Resolved</p>
            <p className="text-2xl font-bold text-green-700">{resolvedCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1: Open Breaches */}
      {activeTab === 'Open Breaches' && (
        <Card padding="none">
          {breachEvents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">No open breaches.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Rule</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Due</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Escalation</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {breachEvents.map(e => {
                    const rule = MOCK_SLA_RULES.find(r => r.id === e.rule_id);
                    const isCritical = e.severity === 'critical';
                    return (
                      <tr key={e.id} className={`border-b border-gray-50 ${isCritical ? 'bg-red-50' : 'hover:bg-gray-50'} transition-colors`}>
                        <td className="px-4 py-3">
                          <Badge variant={getSlaSeverityBadge(e.severity)}>{e.severity}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-900">{rule?.rule_name ?? e.rule_id}</td>
                        <td className="px-4 py-3">
                          <Link
                            to={entityPath(e.entity_type, e.entity_id)}
                            className="text-brand-600 hover:underline"
                          >
                            {e.entity_type} / {e.entity_id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{getSlaDueLabel(e)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="neutral">Level {e.escalation_level}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{e.owner_role ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: All Events */}
      {activeTab === 'All Events' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rule</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">SLA Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Due</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_SLA_EVENTS.map(e => {
                  const rule = MOCK_SLA_RULES.find(r => r.id === e.rule_id);
                  return (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900">{rule?.rule_name ?? e.rule_id}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={entityPath(e.entity_type, e.entity_id)}
                          className="text-brand-600 hover:underline"
                        >
                          {e.entity_type} / {e.entity_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getSlaSeverityBadge(e.severity)}>{e.severity}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={eventStatusBadgeVariant(e.status)}>{e.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={slaStatusBadgeVariant(e)}>{getSlaStatus(e).replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{getSlaDueLabel(e)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: SLA Rules */}
      {activeTab === 'SLA Rules' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rule Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Module</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Applies To</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_SLA_RULES.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.rule_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.module_name}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDuration(r.duration_hours)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getSlaSeverityBadge(r.severity)}>{r.severity}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.applies_to_roles.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
