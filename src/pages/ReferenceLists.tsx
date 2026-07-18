import { useState, useEffect, useCallback } from 'react';
import { Info, ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { EditableTable } from './Settings';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { listsForRole, canEditList, type ReferenceListDef } from '../lib/referenceLists';
import type { UserRole } from '../types';

// "Manage Lists" — the per-role home for the reference lists a domain role owns.
// Reuses the Settings page's EditableTable (add / edit / deactivate) but scopes
// the visible lists to what the current role may manage (migration 116 RLS).
export function ReferenceLists() {
  const { role } = useAuth();
  const lists = listsForRole(role as UserRole | null);

  const [activeKey, setActiveKey] = useState<string>(() => lists[0]?.key ?? '');
  const [rowsByKey, setRowsByKey] = useState<Record<string, Record<string, unknown>[]>>({});
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const sb = supabase;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const entries = await Promise.all(
        lists.map(async (l) => {
          // Dynamic table name — the typed client can't narrow it here.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await (sb as any).from(l.table).select(l.select).eq('is_active', true).order(l.orderBy);
          return [l.key, (data ?? []) as Record<string, unknown>[]] as const;
        }),
      );
      if (cancelled) return;
      setRowsByKey(Object.fromEntries(entries));
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // lists is derived from role; re-run when the role's list set changes or on reload.
  }, [reloadKey, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const active: ReferenceListDef | undefined = lists.find((l) => l.key === activeKey) ?? lists[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manage Lists"
        subtitle="Add, edit, or deactivate the reference lists your department owns. Changes take effect immediately across the system."
        breadcrumb={[{ label: 'Manage Lists' }]}
      />

      {lists.length === 0 ? (
        <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <Info size={15} className="text-gray-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600">No reference lists are assigned to your role.</p>
        </div>
      ) : (
        <>
          {!isSupabaseConfigured && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Dev mode — read-only. Connect Supabase to add, edit, and deactivate entries.</p>
            </div>
          )}

          {lists.length > 1 && (
            <div className="flex gap-0.5 flex-wrap bg-gray-100 rounded-lg p-1">
              {lists.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setActiveKey(l.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    (active?.key === l.key)
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {l.title}
                </button>
              ))}
            </div>
          )}

          {active && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <ListChecks size={14} className="text-brand-500 shrink-0 mt-0.5" />
                <span>{active.blurb}</span>
              </div>
              <EditableTable
                title={active.title}
                table={active.table}
                fields={active.fields}
                rows={rowsByKey[active.key] ?? []}
                loading={loading}
                canEdit={isSupabaseConfigured && canEditList(active, role as UserRole | null)}
                onChanged={reload}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
