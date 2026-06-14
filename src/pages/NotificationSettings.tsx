import { useState } from 'react';
import { BellRing, Info, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_NOTIFICATION_EVENTS } from '../data/mockNotifications';
import { mockOrEmpty } from '../lib/dataMode';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { EMAIL_PROVIDER_CONFIGURED, SMS_PROVIDER_CONFIGURED } from '../lib/notifications';

// Event catalog is seeded server-side; show it only in dev mode until the live
// catalog query is wired, so mock rows never appear in a real session.
const NOTIFICATION_EVENTS = mockOrEmpty(MOCK_NOTIFICATION_EVENTS);
import type { NotificationSeverity } from '../types';

interface PrefRow {
  event_key: string;
  in_app: boolean;
  email: boolean;
  sms: boolean;
}

function severityBadge(severity: NotificationSeverity) {
  const variant = severity === 'critical' ? 'critical' : severity === 'important' ? 'warning' : 'neutral';
  return <Badge variant={variant} size="sm">{severity}</Badge>;
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
    />
  );
}

export function NotificationSettings() {
  const { profile } = useAuth();

  const [prefs, setPrefs] = useState<PrefRow[]>(() =>
    NOTIFICATION_EVENTS.map((evt) => ({
      event_key: evt.event_key,
      in_app: evt.default_channels.includes('in_app'),
      email: evt.default_channels.includes('email'),
      sms: evt.default_channels.includes('sms'),
    })),
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providerPending = !EMAIL_PROVIDER_CONFIGURED || !SMS_PROVIDER_CONFIGURED;

  function update(eventKey: string, patch: Partial<PrefRow>) {
    setPrefs((prev) => prev.map((p) => (p.event_key === eventKey ? { ...p, ...patch } : p)));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 400));
      setSaving(false);
      setMessage('Dev mode — preferences not persisted');
      return;
    }

    if (!profile?.id) {
      setSaving(false);
      setError('No signed-in user — cannot save preferences.');
      return;
    }

    const rows = prefs.map((p) => ({
      user_id: profile.id,
      event_key: p.event_key,
      in_app_enabled: p.in_app,
      email_enabled: p.email,
      sms_enabled: p.sms,
    }));

    const { error: upsertErr } = await supabase
      .from('notification_preferences')
      .upsert(rows, { onConflict: 'user_id,event_key' });
    setSaving(false);
    if (upsertErr) {
      setError(upsertErr.message);
      return;
    }
    setMessage('Preferences saved.');
  }

  return (
    <div>
      <PageHeader
        title="Notification Preferences"
        subtitle="Choose how you are notified for each event"
        breadcrumb={[
          { label: 'Notifications', href: '/notifications' },
          { label: 'Preferences' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge variant="preview" />
            <Button variant="primary" size="sm" loading={saving} disabled={saving} onClick={handleSave}>
              Save Preferences
            </Button>
          </div>
        }
      />

      {providerPending && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Email and SMS toggles are saved as preferences, but delivery is pending provider setup —
            see <span className="font-mono">EMAIL_SMS_INTEGRATION_PLAN.md</span>. In-app notifications are
            always delivered.
          </p>
        </div>
      )}

      {message && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-5">
          <CheckCircle2 size={15} className="text-green-600 shrink-0 mt-0.5" />
          <p className="text-xs text-green-800">{message}</p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
          <Info size={15} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left">Event</th>
              <th className="px-4 py-2.5 text-left hidden md:table-cell">Module</th>
              <th className="px-4 py-2.5 text-left hidden md:table-cell">Severity</th>
              <th className="px-4 py-2.5 text-center">In-App</th>
              <th className="px-4 py-2.5 text-center">Email</th>
              <th className="px-4 py-2.5 text-center">SMS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {NOTIFICATION_EVENTS.map((evt) => {
              const pref = prefs.find((p) => p.event_key === evt.event_key);
              if (!pref) return null;
              return (
                <tr key={evt.event_key} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-xs">{evt.event_name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{evt.event_key}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="info" size="sm">{evt.module_name}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">{severityBadge(evt.severity)}</td>
                  <td className="px-4 py-3 text-center">
                    <Toggle checked={pref.in_app} onChange={(v) => update(evt.event_key, { in_app: v })} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex flex-col items-center gap-0.5">
                      <Toggle checked={pref.email} onChange={(v) => update(evt.event_key, { email: v })} />
                      {!EMAIL_PROVIDER_CONFIGURED && (
                        <span className="text-[9px] text-amber-600">provider not configured</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex flex-col items-center gap-0.5">
                      <Toggle checked={pref.sms} onChange={(v) => update(evt.event_key, { sms: v })} />
                      {!SMS_PROVIDER_CONFIGURED && (
                        <span className="text-[9px] text-amber-600">provider not configured</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="primary" loading={saving} disabled={saving} onClick={handleSave}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
