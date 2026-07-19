import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Power, X, Info, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  fetchAllDefinitions, saveDefinition, deactivateDefinition, slugify,
  CUSTOM_FIELD_ENTITIES, entitiesForRole, canManageEntity,
  type CustomFieldDefinition, type CustomFieldType,
} from '../lib/customFieldsQueries';
import type { UserRole } from '../types';

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'boolean', label: 'Yes / No' },
];

function entityLabel(v: string) {
  return CUSTOM_FIELD_ENTITIES.find((e) => e.value === v)?.label ?? v;
}

function DefinitionModal({ row, allowedEntities, onClose, onDone }: {
  row: CustomFieldDefinition | null;
  allowedEntities: { value: string; label: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { profile } = useAuth();
  const [entityType, setEntityType] = useState(row?.entity_type ?? allowedEntities[0]?.value ?? CUSTOM_FIELD_ENTITIES[0].value);
  const [label, setLabel] = useState(row?.label ?? '');
  const [fieldType, setFieldType] = useState<CustomFieldType>(row?.field_type ?? 'text');
  const [optionsText, setOptionsText] = useState((row?.options ?? []).join(', '));
  const [sortOrder, setSortOrder] = useState(String(row?.sort_order ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!label.trim()) { setError('Label is required.'); return; }
    const options = fieldType === 'select'
      ? optionsText.split(',').map((o) => o.trim()).filter(Boolean)
      : null;
    if (fieldType === 'select' && (!options || options.length === 0)) { setError('Add at least one dropdown option.'); return; }
    setSaving(true); setError(null);
    const res = await saveDefinition(
      row?.id ?? null,
      { entity_type: entityType, field_key: row?.field_key ?? slugify(label), label: label.trim(), field_type: fieldType, options, sort_order: Number(sortOrder) || 0 },
      profile?.id ?? null,
    );
    setSaving(false);
    if (res.ok) { onDone(); return; }
    if (res.unavailable) { setError('The custom-fields migration is pending.'); return; }
    setError(res.error ?? 'Could not save.');
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">{row ? 'Edit' : 'Add'} custom field</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Attach to <span className="text-red-500">*</span></label>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)} disabled={!!row || allowedEntities.length <= 1}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white disabled:bg-gray-50">
              {allowedEntities.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Label <span className="text-red-500">*</span></label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Warranty months"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Type</label>
            <select value={fieldType} onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white">
              {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {fieldType === 'select' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Options (comma-separated)</label>
              <input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Low, Medium, High"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Order</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={() => void handleSave()} loading={saving} disabled={saving}>{row ? 'Save' : 'Add'}</Button>
        </div>
      </div>
    </div>
  );
}

export function CustomFieldsAdmin() {
  const { role } = useAuth();
  const allowedEntities = entitiesForRole(role as UserRole | null);
  const [defs, setDefs] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [modal, setModal] = useState<{ row: CustomFieldDefinition | null } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const d = await fetchAllDefinitions();
      if (cancelled) return;
      setDefs(d);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  async function deactivate(row: CustomFieldDefinition) {
    if (!window.confirm(`Deactivate "${row.label}"? It will be hidden from the ${entityLabel(row.entity_type)} form (existing values are kept).`)) return;
    setBusyId(row.id);
    const res = await deactivateDefinition(row.id);
    setBusyId(null);
    if (res.ok) reload();
  }

  const byEntity = allowedEntities
    .map((e) => ({ entity: e, rows: defs.filter((d) => d.entity_type === e.value) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Custom Fields"
        subtitle="Add your own typed fields to records — the safe, reportable version of extra spreadsheet columns."
        breadcrumb={[{ label: 'Custom Fields' }]}
        actions={<Button size="sm" icon={<Plus size={14} />} onClick={() => setModal({ row: null })} disabled={!isSupabaseConfigured || allowedEntities.length === 0}>Add field</Button>}
      />

      {!isSupabaseConfigured && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">Dev mode — connect Supabase to define custom fields.</p>
        </div>
      )}

      {loading ? (
        <Card className="p-8 text-center text-sm text-gray-400">Loading…</Card>
      ) : byEntity.length === 0 ? (
        <Card className="p-8 text-center">
          <SlidersHorizontal size={22} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No custom fields yet. Add one to attach it to a record type.</p>
        </Card>
      ) : (
        byEntity.map(({ entity, rows }) => (
          <Card key={entity.value} className="overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-700">{entity.label}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {rows.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-800">{d.label}</span>
                    <Badge variant="neutral" size="sm" className="ml-2">{FIELD_TYPES.find((t) => t.value === d.field_type)?.label}</Badge>
                    {d.field_type === 'select' && d.options && (
                      <span className="text-[11px] text-gray-400 ml-2">{d.options.join(' · ')}</span>
                    )}
                  </div>
                  {canManageEntity(role as UserRole | null, d.entity_type) && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setModal({ row: d })} className="p-1 rounded text-gray-400 hover:text-brand-600" title="Edit"><Pencil size={13} /></button>
                      <button onClick={() => void deactivate(d)} disabled={busyId === d.id} className="p-1 rounded text-gray-400 hover:text-red-600 disabled:opacity-40" title="Deactivate"><Power size={13} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      {modal && <DefinitionModal row={modal.row} allowedEntities={allowedEntities} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
    </div>
  );
}
