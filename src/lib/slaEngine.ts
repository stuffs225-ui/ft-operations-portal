import type { SlaEvent, SlaSeverity } from '../types';

export function calculateDueDate(triggeredAt: string, durationHours: number): string {
  const d = new Date(triggeredAt);
  d.setHours(d.getHours() + durationHours);
  return d.toISOString();
}

export type SlaStatus = 'overdue' | 'due_soon' | 'within_sla' | 'breached' | 'resolved';

export function getSlaStatus(event: SlaEvent): SlaStatus {
  if (event.status === 'resolved' || event.status === 'cancelled') return 'resolved';
  if (event.status === 'escalated') return 'breached';
  const now = new Date();
  const due = new Date(event.due_at);
  if (due < now) return 'overdue';
  const diffHours = (due.getTime() - now.getTime()) / 3600000;
  if (diffHours <= 4) return 'due_soon';
  return 'within_sla';
}

export function isOverdue(event: SlaEvent): boolean {
  const s = getSlaStatus(event);
  return s === 'overdue' || s === 'breached';
}

export function getEscalationLevel(event: SlaEvent): number {
  return event.escalation_level;
}

export function getSlaSeverityBadge(severity: SlaSeverity): 'critical' | 'warning' | 'info' | 'default' {
  switch (severity) {
    case 'critical': return 'critical';
    case 'high':     return 'warning';
    case 'medium':   return 'info';
    case 'low':      return 'default';
  }
}

export function formatDuration(hours: number): string {
  if (hours === 0) return 'Immediate';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

export function getSlaDueLabel(event: SlaEvent): string {
  if (event.status === 'resolved') return 'Resolved';
  if (event.status === 'cancelled') return 'Cancelled';
  const now = new Date();
  const due = new Date(event.due_at);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(Math.abs(diffMs) / 3600000);
  if (diffMs < 0) {
    return diffHours < 24 ? `${diffHours}h overdue` : `${Math.floor(diffHours / 24)}d overdue`;
  }
  if (diffHours < 1) return 'Due now';
  if (diffHours < 24) return `Due in ${diffHours}h`;
  return `Due in ${Math.floor(diffHours / 24)}d`;
}
