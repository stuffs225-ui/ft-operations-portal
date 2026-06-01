import type { ScheduledReportSubscription, ReportDeliveryLog } from '../types';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

export const MOCK_REPORT_SUBSCRIPTIONS: ScheduledReportSubscription[] = [
  {
    id: 'sub-001',
    report_key: 'eta_delay',
    department: 'Procurement',
    recipients_json: [{ name: 'Operations Manager', email: 'mohammed.binsaud@ft-ops.local', role: 'operations_manager' }],
    frequency: 'daily',
    channels: ['in_app', 'email'],
    is_active: true,
    created_by: 'dev-usr-001',
    created_at: daysAgo(30),
    updated_at: daysAgo(30),
  },
  {
    id: 'sub-002',
    report_key: 'factory_progress',
    department: 'Factory',
    recipients_json: [{ name: 'Operations Manager', email: 'mohammed.binsaud@ft-ops.local', role: 'operations_manager' }],
    frequency: 'weekly',
    channels: ['in_app', 'email'],
    is_active: true,
    created_by: 'dev-usr-001',
    created_at: daysAgo(30),
    updated_at: daysAgo(30),
  },
  {
    id: 'sub-003',
    report_key: 'sla_breach',
    department: 'Admin / Ops',
    recipients_json: [
      { name: 'Admin', email: 'ahmed.alrashidi@ft-ops.local', role: 'admin' },
      { name: 'Operations Manager', email: 'mohammed.binsaud@ft-ops.local', role: 'operations_manager' },
    ],
    frequency: 'daily',
    channels: ['in_app', 'email', 'sms'],
    is_active: true,
    created_by: 'dev-usr-001',
    created_at: daysAgo(30),
    updated_at: daysAgo(30),
  },
  {
    id: 'sub-004',
    report_key: 'after_sales_maintenance',
    department: 'AFS',
    recipients_json: [{ name: 'AFS Lead', email: 'sara.alghamdi@ft-ops.local', role: 'afs_user' }],
    frequency: 'weekly',
    channels: ['in_app'],
    is_active: false,
    created_by: 'dev-usr-001',
    created_at: daysAgo(60),
    updated_at: daysAgo(15),
  },
];

export const MOCK_DELIVERY_LOGS: ReportDeliveryLog[] = [
  {
    id: 'log-001',
    subscription_id: 'sub-001',
    report_key: 'eta_delay',
    generated_at: daysAgo(1),
    delivery_channel: 'email',
    delivery_status: 'skipped',
    recipients_json: [{ name: 'Operations Manager', email: 'mohammed.binsaud@ft-ops.local' }],
    error_message: 'No email provider configured — recorded as skipped.',
    created_at: daysAgo(1),
  },
  {
    id: 'log-002',
    subscription_id: 'sub-001',
    report_key: 'eta_delay',
    generated_at: daysAgo(1),
    delivery_channel: 'in_app',
    delivery_status: 'sent',
    recipients_json: [{ name: 'Operations Manager', email: 'mohammed.binsaud@ft-ops.local' }],
    error_message: null,
    created_at: daysAgo(1),
  },
];

export function getMockSubscription(id: string): ScheduledReportSubscription | undefined {
  return MOCK_REPORT_SUBSCRIPTIONS.find((s) => s.id === id);
}
