import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Plus, X, ChevronDown, Info, ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { EMAIL_PROVIDER_CONFIGURED } from '../lib/notifications';
import { DEPARTMENT_REPORTS, getReportDef } from '../data/departmentReports';
import { MOCK_REPORT_SUBSCRIPTIONS } from '../data/mockReportSubscriptions';
import type { ReportFrequency, ScheduledReportSubscription } from '../types';
import { cn } from '../lib/utils';

const FREQUENCIES: ReportFrequency[] = ['daily', 'weekly', 'monthly', 'manual'];
const CHANNELS: { key: string; label: string }[] = [
  { key: 'in_app', label: 'In-app' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
];

function frequencyVariant(freq: string): 'success' | 'info' | 'warning' | 'neutral' {
  if (freq === 'daily') return 'success';
  if (freq === 'weekly') return 'info';
  if (freq === 'monthly') return 'warning';
  return 'neutral';
}

interface CreateModalProps {
  onClose: () => void;
  onCreate: (sub: ScheduledReportSubscription) => void;
}

function CreateSubscriptionModal({ onClose, onCreate }: CreateModalProps) {
  const { profile } = useAuth();
  const [reportKey, setReportKey] = useState<string>(DEPARTMENT_REPORTS[0]?.report_key ?? '');
  const [frequency, setFrequency] = useState<ReportFrequency>('weekly');
  const [channels, setChannels] = useState<string[]>(['in_app']);
  const [recipientsText, setRecipientsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggleChannel(key: string) {
    setChannels((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  }

  function parseRecipients(): { email: string }[] {
    return recipientsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((email) => ({ email }));
  }

  async function handleCreate() {
    setSaving(true);
    setMsg(null);
    const def = getReportDef(reportKey);
    const recipients = parseRecipients();

    if (!isSupabaseConfigured || !supabase) {
      setTimeout(() => {
        const now = new Date().toISOString();
        onCreate({
          id: `sub-dev-${Date.now()}`,
          report_key: reportKey,
          department: def?.department ?? null,
          recipients_json: recipients,
          frequency,
          channels,
          is_active: true,
          created_by: profile?.id ?? null,
          created_at: now,
          updated_at: now,
        });
        setSaving(false);
        setMsg('Dev mode — not persisted');
        onClose();
      }, 400);
      return;
    }

    const { data, error } = await supabase
      .from('scheduled_report_subscriptions')
      .insert({
        report_key: reportKey,
        department: def?.department ?? null,
        recipients_json: recipients,
        frequency,
        channels,
        is_active: true,
        created_by: profile?.id ?? null,
      })
      .select('*')
      .single();
    setSaving(false);
    if (error || !data) {
      setMsg(error?.message ?? 'Failed to create subscription');
      return;
    }
    onCreate(data as unknown as ScheduledReportSubscription);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">New Subscription</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Report</label>
            <div className="relative">
              <select
                value={reportKey}
                onChange={(e) => setReportKey(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {DEPARTMENT_REPORTS.map((r) => (
                  <option key={r.report_key} value={r.report_key}>
                    {r.title} — {r.department}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Frequency</label>
            <div className="relative">
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ReportFrequency)}
                className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Channels</label>
            <div className="flex flex-wrap gap-3">
              {CHANNELS.map((c) => (
                <label key={c.key} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={channels.includes(c.key)}
                    onChange={() => toggleChannel(c.key)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Recipients</label>
            <textarea
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              rows={3}
              placeholder="Comma-separated emails (e.g. ops@ft-ops.local, admin@ft-ops.local)"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            />
          </div>

          {msg && <p className="text-xs text-gray-500">{msg}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            loading={saving}
            disabled={!reportKey || channels.length === 0}
            onClick={handleCreate}
          >
            Create Subscription
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminReportSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<ScheduledReportSubscription[]>(MOCK_REPORT_SUBSCRIPTIONS);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseConfigured || !supabase) return;
      const { data } = await supabase.from('scheduled_report_subscriptions').select('*');
      if (!cancelled && data) {
        setSubscriptions(data as unknown as ScheduledReportSubscription[]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Scheduled Report Subscriptions"
        subtitle="Configure who receives department reports and how often"
        icon={<CalendarClock size={20} />}
        action={
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
            New Subscription
          </Button>
        }
      />

      <div className="rounded-lg bg-sky-50 border border-sky-200 px-4 py-3 text-xs text-sky-800 flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          Scheduled delivery runs via a server-side Edge Function once configured.
          {!EMAIL_PROVIDER_CONFIGURED && ' Email delivery pending provider setup.'}
          {!isSupabaseConfigured && ' Dev mode — showing mock data.'}
        </span>
      </div>

      <Card padding="none">
        {subscriptions.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={22} />}
            title="No subscriptions yet"
            description="Create a subscription to schedule a department report."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left">Report</th>
                  <th className="px-4 py-2.5 text-left hidden md:table-cell">Department</th>
                  <th className="px-4 py-2.5 text-left">Frequency</th>
                  <th className="px-4 py-2.5 text-left">Channels</th>
                  <th className="px-4 py-2.5 text-right">Recipients</th>
                  <th className="px-4 py-2.5 text-left">State</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {getReportDef(sub.report_key)?.title ?? sub.report_key}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{sub.department ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={frequencyVariant(sub.frequency)}>{sub.frequency}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {sub.channels.map((c) => (
                          <Badge key={c} variant="neutral">{c.replace('_', '-')}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{sub.recipients_json.length}</td>
                    <td className="px-4 py-3">
                      <Badge variant={sub.is_active ? 'success' : 'neutral'}>
                        {sub.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/report-subscriptions/${sub.id}`}
                        className={cn('inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium')}
                      >
                        Open <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreate && (
        <CreateSubscriptionModal
          onClose={() => setShowCreate(false)}
          onCreate={(sub) => setSubscriptions((prev) => [sub, ...prev])}
        />
      )}
    </div>
  );
}
