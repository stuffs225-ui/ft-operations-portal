import { useEffect, useState } from 'react';
import { Plus, Info, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ROLE_CONFIGS } from '../lib/roles';
import { MOCK_NOTIFICATION_EVENTS, MOCK_ESCALATION_RULES } from '../data/mockNotifications';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isMissingRelationError } from '../lib/deferredMigrationSafety';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import type { NotificationEvent, NotificationEscalationRule, NotificationSeverity, UserRole } from '../types';

function severityBadge(severity: NotificationSeverity) {
  const variant = severity === 'critical' ? 'critical' : severity === 'important' ? 'warning' : 'neutral';
  return <Badge variant={variant} size="sm">{severity}</Badge>;
}

function roleLabel(key: string): string {
  return ROLE_CONFIGS[key as UserRole]?.label ?? key;
}

export function AdminNotificationRules() {
  // Dev-mock mode seeds from mock at init (no synchronous setState in the effect).
  const [events, setEvents] = useState<NotificationEvent[]>(() => (isSupabaseConfigured ? [] : MOCK_NOTIFICATION_EVENTS));
  const [escalationRules, setEscalationRules] = useState<NotificationEscalationRule[]>(() => (isSupabaseConfigured ? [] : MOCK_ESCALATION_RULES));
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return; // dev mode already seeded above
    let alive = true;
    const db = supabase;
    void (async () => {
      const [evtRes, ruleRes] = await Promise.all([
        db.from('notification_events').select('*').order('module_name'),
        db.from('notification_escalation_rules').select('*').order('module_name'),
      ]);
      if (!alive) return;
      // Migration 065 pending → show a clear notice instead of an empty table.
      if (isMissingRelationError(evtRes.error) || isMissingRelationError(ruleRes.error)) {
        setUnavailable(true);
        setLoading(false);
        return;
      }
      setEvents((evtRes.data ?? []) as unknown as NotificationEvent[]);
      setEscalationRules((ruleRes.data ?? []) as unknown as NotificationEscalationRule[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div>
      <PageHeader
        title="Notification Rules"
        subtitle="Notification events and escalation governance"
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge variant="auto" />
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={14} />}
              disabled
              title="Rules are seeded and maintained server-side (read-only here)."
            >
              Add Rule
            </Button>
          </div>
        }
      />

      <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg p-3 mb-6">
        <Info size={15} className="text-sky-600 shrink-0 mt-0.5" />
        <p className="text-xs text-sky-800">
          Read-only view of the events catalog and escalation ladders. Rules are seeded server-side;
          actual escalation dispatch runs in a Supabase Edge Function once an email/SMS provider is
          configured — the browser never sends notifications directly.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
          <Loader2 size={15} className="animate-spin" /> Loading notification configuration…
        </div>
      )}

      {unavailable && !loading && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Notifications module is pending — apply migration 065 to enable the events catalog and
            escalation rules.
          </p>
        </div>
      )}

      {/* A. Notification Events */}
      {!loading && !unavailable && (
      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Notification Events</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left">Event Key</th>
                <th className="px-4 py-2.5 text-left">Name</th>
                <th className="px-4 py-2.5 text-left hidden md:table-cell">Module</th>
                <th className="px-4 py-2.5 text-left">Severity</th>
                <th className="px-4 py-2.5 text-left hidden lg:table-cell">Default Channels</th>
                <th className="px-4 py-2.5 text-left">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">No notification events configured yet.</td></tr>
              )}
              {events.map((evt) => (
                <tr key={evt.event_key} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{evt.event_key}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">{evt.event_name}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="info" size="sm">{evt.module_name}</Badge>
                  </td>
                  <td className="px-4 py-3">{severityBadge(evt.severity)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {evt.default_channels.map((c) => (
                        <Badge key={c} variant="neutral" size="sm">{c}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={evt.is_active ? 'success' : 'neutral'} size="sm">
                      {evt.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* B. Escalation Rules */}
      {!loading && !unavailable && (
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Escalation Rules</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left">Rule Key</th>
                <th className="px-4 py-2.5 text-left hidden md:table-cell">Module</th>
                <th className="px-4 py-2.5 text-left">Trigger Condition</th>
                <th className="px-4 py-2.5 text-left hidden lg:table-cell">First Level</th>
                <th className="px-4 py-2.5 text-left hidden lg:table-cell">Second Level</th>
                <th className="px-4 py-2.5 text-left hidden md:table-cell">After (h)</th>
                <th className="px-4 py-2.5 text-left hidden xl:table-cell">Channels</th>
                <th className="px-4 py-2.5 text-left">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {escalationRules.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-gray-400">No escalation rules configured yet.</td></tr>
              )}
              {escalationRules.map((rule) => (
                <tr key={rule.rule_key} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{rule.rule_key}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="info" size="sm">{rule.module_name}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">{rule.trigger_condition}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">
                    {rule.first_level_roles.map(roleLabel).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">
                    {rule.second_level_roles.map(roleLabel).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">
                    {rule.escalation_after_hours}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {rule.channels.map((c) => (
                        <Badge key={c} variant="neutral" size="sm">{c}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={rule.is_active ? 'success' : 'neutral'} size="sm">
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  );
}
