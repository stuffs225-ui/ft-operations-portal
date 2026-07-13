import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, PlayCircle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { getReportDef } from '../data/departmentReports';
import { getMockSubscription, MOCK_DELIVERY_LOGS } from '../data/mockReportSubscriptions';
import { isDevMockMode } from '../lib/dataMode';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  const [subscription, setSubscription] = useState<ScheduledReportSubscription | undefined>(
    () => (id && isDevMockMode() ? getMockSubscription(id) : undefined),
  );
  const [liveLogs, setLiveLogs] = useState<ReportDeliveryLog[]>([]);
  const [simulatedLogs, setSimulatedLogs] = useState<ReportDeliveryLog[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured && !!id);
  const [toggling, setToggling] = useState(false);

  // Live mode: fetch the subscription + its delivery history by id.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !id) return; // initial `loading` already false
    const db = supabase;
    let alive = true;
    void (async () => {
      const [subRes, logRes] = await Promise.all([
        db.from('scheduled_report_subscriptions').select('*').eq('id', id).maybeSingle(),
        db.from('report_delivery_logs').select('*').eq('subscription_id', id).order('generated_at', { ascending: false }).limit(100),
      ]);
      if (!alive) return;
      if (subRes.data) setSubscription(subRes.data as unknown as ScheduledReportSubscription);
      setLiveLogs((logRes.data ?? []) as unknown as ReportDeliveryLog[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-16 justify-center">
        <Loader2 size={15} className="animate-spin" /> Loading subscription…
      </div>
    );
  }

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

  async function handleToggleActive() {
    if (!subscription) return;
    const next = !subscription.is_active;
    // Optimistic
    setSubscription((prev) => (prev ? { ...prev, is_active: next } : prev));

    if (!isSupabaseConfigured || !supabase) {
      flash(next ? 'Subscription activated (dev — not persisted).' : 'Subscription paused (dev — not persisted).');
      return;
    }
    setToggling(true);
    const { error } = await supabase
      .from('scheduled_report_subscriptions')
      .update({ is_active: next })
      .eq('id', subscription.id);
    setToggling(false);
    if (error) {
      setSubscription((prev) => (prev ? { ...prev, is_active: !next } : prev)); // revert
      flash(`Could not update: ${error.message}`);
      return;
    }
    flash(next ? 'Subscription activated.' : 'Subscription paused.');
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
    flash('Preview only — no report was generated or sent. Scheduled delivery runs server-side once a provider is configured.');
  }

  // Live: delivery logs from the DB. Dev: the mock logs for this subscription.
  const persistedLogs = isSupabaseConfigured
    ? liveLogs
    : MOCK_DELIVERY_LOGS.filter((l) => l.subscription_id === subscription.id);
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
              <DataSourceBadge variant="auto" />
              <Button
                size="sm"
                variant={subscription.is_active ? 'secondary' : 'primary'}
                icon={subscription.is_active ? <Pause size={14} /> : <Play size={14} />}
                onClick={() => void handleToggleActive()}
                loading={toggling}
              >
                {subscription.is_active ? 'Pause' : 'Activate'}
              </Button>
              <Button size="sm" variant="secondary" icon={<PlayCircle size={14} />} onClick={handleGenerateNow} title="Preview a delivery run (does not send)">
                Preview Run
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
