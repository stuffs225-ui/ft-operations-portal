import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, PlayCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { getReportDef } from '../data/departmentReports';
import { getMockSubscription, MOCK_DELIVERY_LOGS } from '../data/mockReportSubscriptions';
import { isDevMockMode, mockOrEmpty } from '../lib/dataMode';
import { EMAIL_PROVIDER_CONFIGURED, SMS_PROVIDER_CONFIGURED } from '../lib/notifications';
import type {
  NotificationDeliveryStatus,
  ReportDeliveryLog,
  ScheduledReportSubscription,
} from '../types';
import { formatDate } from '../lib/utils';

function statusVariant(status: NotificationDeliveryStatus): 'success' | 'neutral' | 'critical' | 'warning' | 'info' {
  if (status === 'sent') return 'success';
  if (status === 'skipped') return 'neutral';
  if (status === 'failed') return 'critical';
  if (status === 'pending') return 'warning';
  return 'info';
}

function channelStatus(channel: string): NotificationDeliveryStatus {
  if (channel === 'in_app') return 'sent';
  if (channel === 'email') return EMAIL_PROVIDER_CONFIGURED ? 'pending' : 'skipped';
  if (channel === 'sms') return SMS_PROVIDER_CONFIGURED ? 'pending' : 'skipped';
  return 'sent';
}

export function AdminReportSubscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  // Live mode has no wired query for this detail page yet — never seed mock.
  const base = id && isDevMockMode() ? getMockSubscription(id) : undefined;

  const [subscription, setSubscription] = useState<ScheduledReportSubscription | undefined>(base);
  const [simulatedLogs, setSimulatedLogs] = useState<ReportDeliveryLog[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  if (!subscription) {
    return (
      <div className="text-center py-16 text-gray-500">
        Subscription not found.{' '}
        <Link to="/admin/report-subscriptions" className="text-brand-600 hover:underline">
          Back to subscriptions
        </Link>
      </div>
    );
  }

  const def = getReportDef(subscription.report_key);
  const reportTitle = def?.title ?? subscription.report_key;

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }

  function handleToggleActive() {
    setSubscription((prev) => (prev ? { ...prev, is_active: !prev.is_active } : prev));
    flash(subscription?.is_active ? 'Subscription paused (dev — not persisted).' : 'Subscription activated (dev — not persisted).');
  }

  function handleGenerateNow() {
    if (!subscription) return;
    const now = new Date().toISOString();
    const recipients = subscription.recipients_json.map((r) => ({ name: r.name, email: r.email }));
    const rows: ReportDeliveryLog[] = subscription.channels.map((channel, idx) => ({
      id: `log-sim-${Date.now()}-${idx}`,
      subscription_id: subscription.id,
      report_key: subscription.report_key,
      generated_at: now,
      delivery_channel: channel,
      delivery_status: channelStatus(channel),
      recipients_json: recipients,
      error_message:
        channelStatus(channel) === 'skipped'
          ? `No ${channel === 'sms' ? 'SMS' : 'email'} provider configured — recorded as skipped.`
          : null,
      created_at: now,
    }));
    setSimulatedLogs((prev) => [...rows, ...prev]);
    flash('Manual run simulated — in-app delivered; email/SMS skipped pending provider.');
  }

  const persistedLogs = mockOrEmpty(MOCK_DELIVERY_LOGS).filter((l) => l.subscription_id === subscription.id);
  const allLogs = [...simulatedLogs, ...persistedLogs];

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/admin/report-subscriptions"
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft size={14} /> Back to subscriptions
        </Link>
        <PageHeader
          title={reportTitle}
          subtitle="Scheduled report subscription configuration and delivery history"
          actions={
            <div className="flex items-center gap-2">
              <DataSourceBadge variant="preview" />
              <Button
                size="sm"
                variant={subscription.is_active ? 'secondary' : 'primary'}
                icon={subscription.is_active ? <Pause size={14} /> : <Play size={14} />}
                onClick={handleToggleActive}
              >
                {subscription.is_active ? 'Pause' : 'Activate'}
              </Button>
              <Button size="sm" icon={<PlayCircle size={14} />} onClick={handleGenerateNow}>
                Generate Now
              </Button>
            </div>
          }
        />
      </div>

      {message && (
        <div className="rounded-lg bg-sky-50 border border-sky-200 px-4 py-2 text-xs text-sky-800">
          {message}
        </div>
      )}

      {/* Configuration */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Report</p>
            <p className="font-medium text-gray-900">{reportTitle}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Department</p>
            <p className="font-medium text-gray-900">{subscription.department ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Frequency</p>
            <Badge variant="info">{subscription.frequency}</Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Channels</p>
            <div className="flex flex-wrap gap-1">
              {subscription.channels.map((c) => (
                <Badge key={c} variant="neutral">{c.replace('_', '-')}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">State</p>
            <Badge variant={subscription.is_active ? 'success' : 'neutral'}>
              {subscription.is_active ? 'Active' : 'Paused'}
            </Badge>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1.5">Recipients ({subscription.recipients_json.length})</p>
          {subscription.recipients_json.length === 0 ? (
            <p className="text-sm text-gray-400">No recipients configured.</p>
          ) : (
            <ul className="space-y-1">
              {subscription.recipients_json.map((r, i) => (
                <li key={i} className="text-sm text-gray-700">
                  {r.name ? <span className="font-medium">{r.name}</span> : null}
                  {r.name && r.email ? ' — ' : null}
                  {r.email ? <span className="text-gray-500">{r.email}</span> : null}
                  {r.role ? <span className="text-gray-400"> ({r.role})</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Delivery History */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-100">
          <span className="font-semibold text-sm text-gray-700">
            Delivery History ({allLogs.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Generated</th>
                <th className="px-4 py-3 text-left">Channel</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Recipients</th>
                <th className="px-4 py-3 text-left">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDate(log.generated_at)}</td>
                  <td className="px-4 py-3 text-gray-700">{log.delivery_channel.replace('_', '-')}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(log.delivery_status)}>{log.delivery_status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{log.recipients_json.length}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{log.error_message ?? '—'}</td>
                </tr>
              ))}
              {allLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No delivery history yet. Use “Generate Now” to simulate a manual run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
