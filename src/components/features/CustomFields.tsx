import { useState, useEffect } from 'react';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  fetchDefinitions, fetchValues, saveValue,
  type CustomFieldDefinition,
} from '../../lib/customFieldsQueries';

// Renders the admin-defined custom fields for one entity and lets users fill them.
// Shows nothing when no fields are defined, so it's safe to mount unconditionally.
export function CustomFields({ entityType, entityId, canEdit = true }: {
  entityType: string;
  entityId: string;
  canEdit?: boolean;
}) {
  const { profile } = useAuth();
  const [defs, setDefs] = useState<CustomFieldDefinition[]>([]);
  const [values, setValues] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [d, v] = await Promise.all([fetchDefinitions(entityType), fetchValues(entityId)]);
      if (cancelled) return;
      setDefs(d);
      setValues(v);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  async function commit(def: CustomFieldDefinition, raw: string | null) {
    setValues((prev) => ({ ...prev, [def.id]: raw }));
    if (!isSupabaseConfigured) return;
    setSavingKey(def.id);
    const res = await saveValue(def.id, entityId, raw, profile?.id ?? null);
    setSavingKey(null);
    if (!res.ok && !res.unavailable) setError(res.error);
  }

  if (!isSupabaseConfigured) return null;
  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-gray-500 py-2"><Loader2 size={14} className="animate-spin" /> Loading fields…</div>;
  }
  if (defs.length === 0) return null;

  return (
    <Card className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
        <SlidersHorizontal size={14} className="text-brand-500" /> Additional Fields
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {defs.map((def) => {
          const val = values[def.id] ?? '';
          const common = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400';
          return (
            <div key={def.id}>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                {def.label}
                {savingKey === def.id && <Loader2 size={11} className="inline ml-1.5 animate-spin text-gray-400" />}
              </label>
              {def.field_type === 'boolean' ? (
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" disabled={!canEdit} checked={val === 'true'}
                    onChange={(e) => void commit(def, e.target.checked ? 'true' : 'false')} className="rounded border-gray-300" />
                  Yes
                </label>
              ) : def.field_type === 'select' ? (
                <select disabled={!canEdit} value={val} onChange={(e) => void commit(def, e.target.value || null)} className={common}>
                  <option value="">—</option>
                  {(def.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={def.field_type === 'number' ? 'number' : def.field_type === 'date' ? 'date' : 'text'}
                  disabled={!canEdit}
                  defaultValue={val}
                  onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== (values[def.id] ?? null)) void commit(def, v); }}
                  className={common}
                />
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">{error}</p>}
      {!canEdit && <p className="text-[11px] text-gray-400">Read-only.</p>}
    </Card>
  );
}
