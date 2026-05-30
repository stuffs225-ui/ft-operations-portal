import type { QuotationRequest } from '../types';

export const COORDINATOR_PICKUP_SLA_HOURS = 48;
export const ESTIMATION_RESPONSE_SLA_HOURS = 120;
export const CLARIFICATION_RESPONSE_SLA_HOURS = 48;

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function getQuotationSlaDue(quotation: QuotationRequest): Date | null {
  switch (quotation.quotation_status) {
    case 'submitted_by_sales':
      return quotation.submitted_at
        ? addHours(new Date(quotation.submitted_at), COORDINATOR_PICKUP_SLA_HOURS)
        : null;
    case 'received_by_coordinator':
    case 'sent_to_estimation':
    case 'waiting_for_estimation':
      return quotation.sent_to_estimation_at
        ? addHours(new Date(quotation.sent_to_estimation_at), ESTIMATION_RESPONSE_SLA_HOURS)
        : quotation.submitted_at
        ? addHours(new Date(quotation.submitted_at), COORDINATOR_PICKUP_SLA_HOURS + ESTIMATION_RESPONSE_SLA_HOURS)
        : null;
    case 'need_clarification':
      return quotation.updated_at
        ? addHours(new Date(quotation.updated_at), CLARIFICATION_RESPONSE_SLA_HOURS)
        : null;
    default:
      return null;
  }
}

export function isQuotationOverdue(quotation: QuotationRequest): boolean {
  const due = getQuotationSlaDue(quotation);
  if (!due) return false;
  return new Date() > due;
}

export function getOverdueDays(quotation: QuotationRequest): number {
  const due = getQuotationSlaDue(quotation);
  if (!due || new Date() <= due) return 0;
  return Math.floor((new Date().getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export function getQuotationSlaStatus(
  quotation: QuotationRequest,
): 'ok' | 'warning' | 'overdue' {
  const due = getQuotationSlaDue(quotation);
  if (!due) return 'ok';
  const now = new Date();
  if (now > due) return 'overdue';
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDue < 24) return 'warning';
  return 'ok';
}
