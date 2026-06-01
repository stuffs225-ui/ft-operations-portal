import type {
  AppNotification,
  NotificationEvent,
  NotificationEscalationRule,
} from '../types';

function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3600000).toISOString();
}

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'ntf-001',
    user_id: 'dev-usr-001',
    title: 'PO Above 10,000 Pending Approval',
    message: 'PO-2025-014 (SAR 48,500) for Al-Faris Industrial requires Admin/Ops approval.',
    module_name: 'procurement',
    event_key: 'po_pending_approval',
    related_entity_type: 'purchase_order',
    related_entity_id: null,
    severity: 'critical',
    channel: 'in_app',
    delivery_status: 'pending',
    read_at: null,
    sent_at: hoursAgo(1),
    created_at: hoursAgo(1),
  },
  {
    id: 'ntf-002',
    user_id: 'dev-usr-001',
    title: 'SLA Breached',
    message: 'FT-2025-0002 has been pending approval beyond the 24h SLA.',
    module_name: 'sla',
    event_key: 'sla_breached',
    related_entity_type: 'project',
    related_entity_id: null,
    severity: 'critical',
    channel: 'in_app',
    delivery_status: 'pending',
    read_at: null,
    sent_at: hoursAgo(3),
    created_at: hoursAgo(3),
  },
  {
    id: 'ntf-003',
    user_id: 'dev-usr-001',
    title: 'NCR Created',
    message: 'NCR-2025-0007 raised on material inspection for FT-2025-0005.',
    module_name: 'qc',
    event_key: 'ncr_created',
    related_entity_type: 'ncr',
    related_entity_id: null,
    severity: 'important',
    channel: 'in_app',
    delivery_status: 'read',
    read_at: hoursAgo(20),
    sent_at: hoursAgo(26),
    created_at: hoursAgo(26),
  },
  {
    id: 'ntf-004',
    user_id: 'dev-usr-001',
    title: 'SO Submitted for Approval',
    message: 'FT-2025-0009 submitted by Sales and awaiting your approval.',
    module_name: 'projects',
    event_key: 'so_submitted',
    related_entity_type: 'project',
    related_entity_id: null,
    severity: 'important',
    channel: 'in_app',
    delivery_status: 'read',
    read_at: hoursAgo(40),
    sent_at: hoursAgo(48),
    created_at: hoursAgo(48),
  },
  {
    id: 'ntf-005',
    user_id: 'dev-usr-001',
    title: 'Material Received',
    message: 'Store receipt SR-2025-0031 recorded for FT-2025-0001.',
    module_name: 'store',
    event_key: 'material_received',
    related_entity_type: 'store_receipt',
    related_entity_id: null,
    severity: 'routine',
    channel: 'in_app',
    delivery_status: 'pending',
    read_at: null,
    sent_at: hoursAgo(6),
    created_at: hoursAgo(6),
  },
];

export const MOCK_NOTIFICATION_EVENTS: NotificationEvent[] = [
  evt('so_submitted', 'SO Submitted for Approval', 'projects', 'important', ['in_app', 'email']),
  evt('po_pending_approval', 'PO Above 10,000 Pending Approval', 'procurement', 'critical', ['in_app', 'email', 'sms']),
  evt('eta_delayed', 'ETA Delayed', 'procurement', 'important', ['in_app', 'email']),
  evt('ncr_created', 'NCR Created', 'qc', 'important', ['in_app', 'email']),
  evt('release_note_issued', 'Release Note Issued', 'qc', 'important', ['in_app', 'email']),
  evt('sla_breached', 'SLA Breached', 'sla', 'critical', ['in_app', 'email', 'sms']),
  evt('maintenance_critical', 'Maintenance Critical Request', 'afs', 'critical', ['in_app', 'email', 'sms']),
  evt('material_received', 'Material Received', 'store', 'routine', ['in_app']),
];

export const MOCK_ESCALATION_RULES: NotificationEscalationRule[] = [
  {
    id: 'esc-001',
    rule_key: 'po_approval_overdue',
    module_name: 'procurement',
    trigger_condition: 'PO pending approval > 24h',
    first_level_roles: ['operations_manager'],
    second_level_roles: ['admin'],
    escalation_after_hours: 24,
    channels: ['in_app', 'email'],
    is_active: true,
    created_at: hoursAgo(200),
    updated_at: hoursAgo(200),
  },
  {
    id: 'esc-002',
    rule_key: 'sla_breach_critical',
    module_name: 'sla',
    trigger_condition: 'Critical SLA breach unacknowledged > 4h',
    first_level_roles: ['operations_manager'],
    second_level_roles: ['admin'],
    escalation_after_hours: 4,
    channels: ['in_app', 'email', 'sms'],
    is_active: true,
    created_at: hoursAgo(200),
    updated_at: hoursAgo(200),
  },
];

function evt(
  key: string,
  name: string,
  module: string,
  severity: NotificationEvent['severity'],
  channels: string[],
): NotificationEvent {
  return {
    id: `nevt-${key}`,
    event_key: key,
    event_name: name,
    module_name: module,
    severity,
    default_channels: channels,
    is_active: true,
    created_at: hoursAgo(500),
    updated_at: hoursAgo(500),
  };
}

export function unreadCount(list: AppNotification[]): number {
  return list.filter((n) => n.channel === 'in_app' && n.read_at === null).length;
}
