import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '../components/ui/Button';
import {
  Info, Plus, Pencil, Power, X,
  CheckCircle2, AlertTriangle, Database, ShieldCheck, Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { saveSettingsRow, setSettingsRowActive, type SettingsTable } from '../lib/settingsQueries';

// ── Row types (match database.ts + static fallback shape) ─────────────────────

interface VehicleTypeRow       { id: string; name: string; code: string; description: string | null; category?: string | null }
interface MaterialCategoryRow  { id: string; name: string; requires_serial: boolean; description: string | null }
interface SupplierCategoryRow  { id: string; name: string; description: string | null }
interface DocumentTypeRow      { id: string; name: string; required_at: string | null; description: string | null }
interface SlaRuleRow           { id: string; trigger_event: string; required_action: string; sla_hours: number; escalate_to: string | null }
interface RootCauseCategoryRow { id: string; name: string; description: string | null }
interface StoreLocationRow     { id: string; name: string; code: string; capacity: string | null; description: string | null }
interface StatusRow            { id: string; name: string; color: string; description: string | null; sort_order: number }

interface LiveData {
  vehicleTypes: VehicleTypeRow[];
  materialCategories: MaterialCategoryRow[];
  supplierCategories: SupplierCategoryRow[];
  documentTypes: DocumentTypeRow[];
  slaRules: SlaRuleRow[];
  rootCauseCategories: RootCauseCategoryRow[];
  storeLocations: StoreLocationRow[];
  woStatuses: StatusRow[];
  pnStatuses: StatusRow[];
}

// ── Static fallback data ──────────────────────────────────────────────────────

const STATIC_VEHICLE_TYPES: VehicleTypeRow[] = [
  { id: 'vt1', name: 'Fire Truck',      code: 'FT',  description: 'Standard fire suppression vehicle' },
  { id: 'vt2', name: 'Ambulance',       code: 'AMB', description: 'Emergency medical response vehicle' },
  { id: 'vt3', name: 'SUV (4x4)',       code: 'SUV', description: 'Light utility vehicle, off-road capable' },
  { id: 'vt4', name: 'Pick-up Truck',   code: 'PUT', description: 'General utility pickup' },
  { id: 'vt5', name: 'Command Vehicle', code: 'CMD', description: 'Incident command and coordination' },
  { id: 'vt6', name: 'Water Tanker',    code: 'WTK', description: 'High-capacity water supply vehicle' },
  { id: 'vt7', name: 'Rescue Vehicle',  code: 'RSC', description: 'Heavy rescue and extrication' },
];

const STATIC_MATERIAL_CATEGORIES: MaterialCategoryRow[] = [
  { id: 'mc1', name: 'Medical Equipment', requires_serial: true,  description: 'AED, stretchers, medical kits' },
  { id: 'mc2', name: 'Electrical',        requires_serial: false, description: 'Wiring, panels, lighting systems' },
  { id: 'mc3', name: 'Mechanical',        requires_serial: false, description: 'Pumps, valves, mechanical parts' },
  { id: 'mc4', name: 'Hydraulic',         requires_serial: false, description: 'Cylinders, hoses, hydraulic systems' },
  { id: 'mc5', name: 'Body Parts',        requires_serial: false, description: 'Panels, doors, structural components' },
  { id: 'mc6', name: 'Safety Equipment',  requires_serial: true,  description: 'SCBA, harnesses, PPE' },
  { id: 'mc7', name: 'Communication',     requires_serial: true,  description: 'Radios, MDT units, antennas' },
];

const STATIC_SUPPLIER_CATEGORIES: SupplierCategoryRow[] = [
  { id: 'sc1', name: 'Local Supplier',        description: 'Saudi Arabia-based suppliers' },
  { id: 'sc2', name: 'International Supplier',description: 'Import from outside KSA' },
  { id: 'sc3', name: 'Approved Vendor',       description: 'Pre-approved, reduced-review suppliers' },
  { id: 'sc4', name: 'Emergency Vendor',      description: 'One-off emergency procurement only' },
];

const STATIC_DOCUMENT_TYPES: DocumentTypeRow[] = [
  { id: 'dt1',  name: 'Quotation PDF',          required_at: 'Sales',         description: 'Customer-facing price quotation' },
  { id: 'dt2',  name: 'Customer PO / Contract', required_at: 'Sales',         description: 'Signed purchase order or contract' },
  { id: 'dt3',  name: 'PO to Supplier',         required_at: 'Procurement',   description: 'Supplier purchase order (>10,000 SAR requires approval)' },
  { id: 'dt4',  name: 'Raw Material Excel',     required_at: 'Procurement',   description: 'Bill of materials spreadsheet' },
  { id: 'dt5',  name: 'Vehicle Photos',         required_at: 'QC / Delivery', description: 'Chassis + completion photos' },
  { id: 'dt6',  name: 'Release Note',           required_at: 'Delivery',      description: 'Blocked until Project QC closed' },
  { id: 'dt7',  name: 'BOQ',                    required_at: 'Projects',      description: 'Bill of quantities' },
  { id: 'dt8',  name: 'BOM',                    required_at: 'Factory',       description: 'Bill of materials for production' },
  { id: 'dt9',  name: 'GA Drawing',             required_at: 'Factory',       description: 'General arrangement drawing' },
  { id: 'dt10', name: 'Detail Drawing',         required_at: 'Factory',       description: 'Component detail drawing' },
];

const STATIC_SLA_RULES: SlaRuleRow[] = [
  { id: 'sla1', trigger_event: 'Quotation submitted',   required_action: 'Operations Manager review',   sla_hours: 48, escalate_to: 'Admin' },
  { id: 'sla2', trigger_event: 'Customer PO received',  required_action: 'SO creation',                 sla_hours: 24, escalate_to: 'Operations Manager' },
  { id: 'sla3', trigger_event: 'SO created',            required_action: 'WO issuance (Saudi)',          sla_hours: 72, escalate_to: 'Operations Manager' },
  { id: 'sla4', trigger_event: 'SO created',            required_action: 'PN issuance (Dubai)',          sla_hours: 48, escalate_to: 'Operations Manager' },
  { id: 'sla5', trigger_event: 'PO to Supplier raised', required_action: 'Admin approval (>10k SAR)',   sla_hours: 24, escalate_to: 'Admin' },
  { id: 'sla6', trigger_event: 'Material arrived',      required_action: 'Material QC inspection',      sla_hours: 24, escalate_to: 'Operations Manager' },
  { id: 'sla7', trigger_event: 'Production complete',   required_action: 'Project QC inspection',       sla_hours: 48, escalate_to: 'QC Manager' },
  { id: 'sla8', trigger_event: 'QC passed',             required_action: 'Release Note generation',     sla_hours: 24, escalate_to: 'Operations Manager' },
];

const STATIC_ROOT_CAUSE_CATEGORIES: RootCauseCategoryRow[] = [
  { id: 'rc1', name: 'Design Error',       description: 'Engineering or design specification issue' },
  { id: 'rc2', name: 'Supplier Defect',    description: 'Material or component quality failure from supplier' },
  { id: 'rc3', name: 'Installation Error', description: 'Incorrect fitting or assembly in factory' },
  { id: 'rc4', name: 'Transport Damage',   description: 'Damage incurred during shipping or delivery' },
  { id: 'rc5', name: 'Operator Error',     description: 'User or operator misuse or incorrect operation' },
  { id: 'rc6', name: 'Wear & Tear',        description: 'Normal degradation over service life' },
  { id: 'rc7', name: 'Environmental',      description: 'Extreme climate, dust, humidity, or corrosion' },
];

const STATIC_STORE_LOCATIONS: StoreLocationRow[] = [
  { id: 'sl1', name: 'Main Warehouse',   code: 'WH-MAIN', capacity: 'High',   description: 'Primary storage for all incoming materials' },
  { id: 'sl2', name: 'AFS Bay',          code: 'WH-AFS',  capacity: 'Medium', description: 'After-sales and Dubai AFS components' },
  { id: 'sl3', name: 'Production Floor', code: 'WH-PROD', capacity: 'Low',    description: 'In-progress materials on active work orders' },
  { id: 'sl4', name: 'Quarantine Area',  code: 'WH-QRN',  capacity: 'Low',    description: 'Rejected or under-review materials' },
];

const STATIC_WO_STATUSES: StatusRow[] = [
  { id: 'ws1', name: 'Draft',         color: 'bg-gray-100 text-gray-600',   description: 'WO created, not yet submitted for approval', sort_order: 1 },
  { id: 'ws2', name: 'Submitted',     color: 'bg-blue-100 text-blue-700',   description: 'Awaiting Operations Manager review',          sort_order: 2 },
  { id: 'ws3', name: 'Approved',      color: 'bg-brand-100 text-brand-700', description: 'Approved and ready for factory execution',    sort_order: 3 },
  { id: 'ws4', name: 'In Production', color: 'bg-amber-100 text-amber-700', description: 'Factory is actively building',                sort_order: 4 },
  { id: 'ws5', name: 'Completed',     color: 'bg-green-100 text-green-700', description: 'All production tasks finished',               sort_order: 5 },
  { id: 'ws6', name: 'Cancelled',     color: 'bg-red-100 text-red-700',     description: 'WO voided, no further action',                sort_order: 6 },
];

const STATIC_PN_STATUSES: StatusRow[] = [
  { id: 'ps1', name: 'Draft',                  color: 'bg-gray-100 text-gray-600',    description: 'PN created, pending submission',    sort_order: 1 },
  { id: 'ps2', name: 'Submitted',              color: 'bg-blue-100 text-blue-700',    description: 'Awaiting Operations Manager review', sort_order: 2 },
  { id: 'ps3', name: 'Approved',               color: 'bg-brand-100 text-brand-700',  description: 'Approved for Dubai follow-up',       sort_order: 3 },
  { id: 'ps4', name: 'Dubai Follow-up Active', color: 'bg-purple-100 text-purple-700',description: 'AFS team tracking in Dubai',         sort_order: 4 },
  { id: 'ps5', name: 'Vehicle Arrived',        color: 'bg-amber-100 text-amber-700',  description: 'Vehicle landed, QC/handover pending',sort_order: 5 },
  { id: 'ps6', name: 'Completed',              color: 'bg-green-100 text-green-700',  description: 'All steps done, project closed',     sort_order: 6 },
];

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  'Vehicle Types',
  'Material Categories',
  'Supplier Categories',
  'Document Types',
  'SLA Rules',
  'Root Cause Categories',
  'Store Locations',
  'WO / PN Status',
  'System Status',
] as const;

type Tab = (typeof TABS)[number];

// ── Editable master-data config ───────────────────────────────────────────────

export type FieldType = 'text' | 'number' | 'boolean' | 'textarea' | 'select';
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
}

const STATUS_COLOR_OPTIONS = [
  { value: 'bg-gray-100 text-gray-600',   label: 'Gray' },
  { value: 'bg-blue-100 text-blue-700',   label: 'Blue' },
  { value: 'bg-brand-100 text-brand-700', label: 'Brand' },
  { value: 'bg-amber-100 text-amber-700', label: 'Amber' },
  { value: 'bg-green-100 text-green-700', label: 'Green' },
  { value: 'bg-red-100 text-red-700',     label: 'Red' },
  { value: 'bg-purple-100 text-purple-700', label: 'Purple' },
];
const CAPACITY_OPTIONS = [
  { value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' },
];

const STATUS_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Status', type: 'text', required: true },
  { key: 'color', label: 'Color', type: 'select', options: STATUS_COLOR_OPTIONS },
  { key: 'sort_order', label: 'Order', type: 'number' },
  { key: 'description', label: 'Description', type: 'textarea' },
];

const TAB_FIELDS: Record<string, { table: SettingsTable; fields: FieldDef[] }> = {
  'Vehicle Types':        { table: 'vehicle_types', fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'code', label: 'Code', type: 'text', required: true },
    { key: 'category', label: 'Category', type: 'select', options: [
      { value: 'Ambulance & Medical', label: 'Ambulance & Medical' },
      { value: 'Firefighting & Rescue', label: 'Firefighting & Rescue' },
      { value: 'Command & Special-Purpose', label: 'Command & Special-Purpose' },
      { value: 'Other', label: 'Other' },
    ] },
    { key: 'description', label: 'Description', type: 'textarea' },
  ]},
  'Material Categories':  { table: 'material_categories', fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'requires_serial', label: 'Serial Required', type: 'boolean' },
    { key: 'description', label: 'Description', type: 'textarea' },
  ]},
  'Supplier Categories':  { table: 'supplier_categories', fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
  ]},
  'Document Types':       { table: 'document_types', fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'required_at', label: 'Required At', type: 'text' },
    { key: 'description', label: 'Description', type: 'textarea' },
  ]},
  'SLA Rules':            { table: 'sla_rule_templates', fields: [
    { key: 'trigger_event', label: 'Trigger', type: 'text', required: true },
    { key: 'required_action', label: 'Required Action', type: 'text', required: true },
    { key: 'sla_hours', label: 'SLA (hrs)', type: 'number', required: true },
    { key: 'escalate_to', label: 'Escalate To', type: 'text' },
  ]},
  'Root Cause Categories':{ table: 'root_cause_categories', fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
  ]},
  'Store Locations':      { table: 'store_locations', fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'code', label: 'Code', type: 'text', required: true },
    { key: 'capacity', label: 'Capacity', type: 'select', options: CAPACITY_OPTIONS },
    { key: 'description', label: 'Description', type: 'textarea' },
  ]},
};

function colorLabel(value: string): string {
  return STATUS_COLOR_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

// ── Row-edit modal ─────────────────────────────────────────────────────────────

function RowModal({
  title, table, fields, row, onClose, onDone,
}: {
  title: string;
  table: SettingsTable;
  fields: FieldDef[];
  row: Record<string, unknown> | null; // null = create
  onClose: () => void;
  onDone: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const f of fields) {
      init[f.key] = row?.[f.key] ?? (f.type === 'boolean' ? false : f.type === 'select' ? (f.options?.[0]?.value ?? '') : '');
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: string, v: unknown) { setValues((prev) => ({ ...prev, [key]: v })); }

  async function handleSave() {
    // Required-field check
    for (const f of fields) {
      if (f.required && (values[f.key] == null || String(values[f.key]).trim() === '')) {
        setError(`${f.label} is required.`); return;
      }
    }
    // Normalize payload (numbers, trimmed strings, null-empty)
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const v = values[f.key];
      if (f.type === 'number') payload[f.key] = v === '' || v == null ? null : Number(v);
      else if (f.type === 'boolean') payload[f.key] = Boolean(v);
      else payload[f.key] = typeof v === 'string' ? (v.trim() || null) : v;
    }
    setSaving(true); setError(null);
    const res = await saveSettingsRow(table, (row?.id as string) ?? null, payload);
    setSaving(false);
    if (res.ok) { onDone(); return; }
    if (res.unavailable) { setError('This table is not available — its migration is pending.'); return; }
    setError(res.error ?? 'Could not save.');
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-sm font-semibold text-gray-900">{row ? 'Edit' : 'Add'} · {title}</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                {f.label}{f.required && <span className="text-red-500"> *</span>}
              </label>
              {f.type === 'boolean' ? (
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={Boolean(values[f.key])} onChange={(e) => set(f.key, e.target.checked)} className="rounded border-gray-300" />
                  Yes
                </label>
              ) : f.type === 'select' ? (
                <select value={String(values[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea value={String(values[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
              ) : (
                <input type={f.type === 'number' ? 'number' : 'text'} value={String(values[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
              )}
            </div>
          ))}
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={saving}>{row ? 'Save' : 'Add'}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Editable table (generic) ────────────────────────────────────────────────────

function renderCell(f: FieldDef, row: Record<string, unknown>) {
  const v = row[f.key];
  if (f.type === 'boolean') {
    return <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium', v ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500')}>{v ? 'Yes' : 'No'}</span>;
  }
  if (f.key === 'color' && typeof v === 'string') {
    return <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold', v)}>{colorLabel(v)}</span>;
  }
  const text = v == null || v === '' ? '—' : String(v);
  return <span className={cn('text-xs', f.key === 'code' ? 'font-mono text-brand-700' : 'text-gray-600')}>{text}</span>;
}

export function EditableTable({
  title, table, fields, rows, loading, canEdit, onChanged,
}: {
  title: string;
  table: SettingsTable;
  fields: FieldDef[];
  rows: Record<string, unknown>[];
  loading: boolean;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [modal, setModal] = useState<{ row: Record<string, unknown> | null } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function deactivate(row: Record<string, unknown>) {
    if (!window.confirm(`Deactivate "${row.name ?? row.trigger_event ?? 'this item'}"? It will be hidden from the app (reversible in the database).`)) return;
    setBusyId(row.id as string);
    const res = await setSettingsRowActive(table, row.id as string, false);
    setBusyId(null);
    if (res.ok) onChanged();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {canEdit && (
          <Button size="sm" variant="outline" icon={<Plus size={13} />} onClick={() => setModal({ row: null })}>Add</Button>
        )}
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
              {fields.map((f) => <th key={f.key} className="px-4 py-2.5 text-left">{f.label}</th>)}
              {canEdit && <th className="px-4 py-2.5 text-right w-20">Actions</th>}
            </tr>
          </thead>
          {loading ? (
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-gray-100">
                  {fields.map((f) => <td key={f.key} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" /></td>)}
                  {canEdit && <td />}
                </tr>
              ))}
            </tbody>
          ) : (
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr><td colSpan={fields.length + (canEdit ? 1 : 0)} className="px-4 py-8 text-center text-xs text-gray-400">No entries.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={String(r.id)} className="hover:bg-gray-50">
                  {fields.map((f) => <td key={f.key} className="px-4 py-2.5">{renderCell(f, r)}</td>)}
                  {canEdit && (
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => setModal({ row: r })} className="p-1 rounded text-gray-400 hover:text-brand-600 transition-colors" title="Edit"><Pencil size={13} /></button>
                      <button onClick={() => void deactivate(r)} disabled={busyId === r.id} className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40" title="Deactivate"><Power size={13} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      {modal && (
        <RowModal title={title} table={table} fields={fields} row={modal.row}
          onClose={() => setModal(null)} onDone={() => { setModal(null); onChanged(); }} />
      )}
    </div>
  );
}


function SystemStatusTab() {
  const supabaseHost = isSupabaseConfigured
    ? (() => {
        try {
          const url = new URL(import.meta.env.VITE_SUPABASE_URL as string);
          // Mask: show only the subdomain reference (first 8 chars) + ****
          const ref = url.hostname.split('.')[0];
          return `${ref.slice(0, 8)}****.supabase.co`;
        } catch {
          return 'configured';
        }
      })()
    : 'Not configured';

  const rows: Array<{ label: string; value: string; ok: boolean }> = [
    {
      label: 'Supabase Connection',
      value: isSupabaseConfigured ? 'Connected' : 'Dev Mode (not connected)',
      ok: isSupabaseConfigured,
    },
    {
      label: 'Database Host',
      value: supabaseHost,
      ok: isSupabaseConfigured,
    },
    {
      label: 'Authentication',
      value: isSupabaseConfigured ? 'Supabase Auth (email/password)' : 'Dev Mock — any credentials accepted',
      ok: isSupabaseConfigured,
    },
    {
      label: 'Master Data Source',
      value: isSupabaseConfigured ? 'Live — fetched from Supabase' : 'Static — hardcoded fallback data',
      ok: isSupabaseConfigured,
    },
    {
      label: 'Mode',
      value: isSupabaseConfigured ? 'Production' : 'Development',
      ok: isSupabaseConfigured,
    },
  ];

  return (
    <div className="space-y-5">
      <div className={cn(
        'rounded-lg border p-4 flex items-start gap-3',
        isSupabaseConfigured
          ? 'bg-green-50 border-green-200'
          : 'bg-amber-50 border-amber-200',
      )}>
        {isSupabaseConfigured
          ? <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
          : <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        }
        <div>
          <p className={cn('text-sm font-semibold', isSupabaseConfigured ? 'text-green-800' : 'text-amber-800')}>
            {isSupabaseConfigured ? 'Supabase Connected' : 'Running in Development Mode'}
          </p>
          <p className={cn('text-xs mt-0.5', isSupabaseConfigured ? 'text-green-700' : 'text-amber-700')}>
            {isSupabaseConfigured
              ? 'The app is connected to a real Supabase project. Auth and data are live.'
              : 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Using mock data and mock auth. See docs/SUPABASE_SETUP.md to connect.'}
          </p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left">Setting</th>
              <th className="px-4 py-2.5 text-left">Value</th>
              <th className="px-4 py-2.5 text-left w-20">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.label} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs font-medium text-gray-700 flex items-center gap-2">
                  <Database size={12} className="text-gray-400 shrink-0" />
                  {row.label}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 font-mono">{row.value}</td>
                <td className="px-4 py-3">
                  {row.ok
                    ? <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700"><CheckCircle2 size={11} /> OK</span>
                    : <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600"><AlertTriangle size={11} /> Dev</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-brand-600" />
          Security Note
        </p>
        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
          <li>The service role key is never exposed in client code.</li>
          <li>Row Level Security (RLS) is enforced at the database level on all tables.</li>
          <li>Role access is double-enforced: UI navigation filtering + database RLS policies.</li>
          <li>First admin must be assigned via the Supabase SQL Editor (bootstrapping — see docs/SUPABASE_SETUP.md).</li>
        </ul>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('Vehicle Types');
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [dbLoading, setDbLoading] = useState(isSupabaseConfigured);
  // True once the fetch resolved (even with empty results). Used to
  // distinguish "DB returned 0 rows" from "never fetched (dev mode)".
  const [fetchComplete, setFetchComplete] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => { setDbLoading(true); setReloadKey((k) => k + 1); };

  // Editing requires a live Supabase connection (RLS enforces admin/ops on write).
  const canEdit = isSupabaseConfigured;

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    Promise.all([
      supabase.from('vehicle_types').select('id,name,code,description,category').eq('is_active', true).order('category').order('name'),
      supabase.from('material_categories').select('id,name,requires_serial,description').eq('is_active', true).order('name'),
      supabase.from('supplier_categories').select('id,name,description').eq('is_active', true).order('name'),
      supabase.from('document_types').select('id,name,required_at,description').eq('is_active', true).order('name'),
      supabase.from('sla_rule_templates').select('id,trigger_event,required_action,sla_hours,escalate_to').eq('is_active', true),
      supabase.from('root_cause_categories').select('id,name,description').eq('is_active', true).order('name'),
      supabase.from('store_locations').select('id,name,code,capacity,description').eq('is_active', true).order('name'),
      supabase.from('wo_statuses').select('id,name,color,description,sort_order').eq('is_active', true).order('sort_order'),
      supabase.from('pn_statuses').select('id,name,color,description,sort_order').eq('is_active', true).order('sort_order'),
    ]).then(([vt, mc, sc, dt, sla, rcc, sl, wo, pn]) => {
      // If any query errored, fall through to static data for that table
      setLiveData({
        vehicleTypes:       (vt.data  ?? []) as VehicleTypeRow[],
        materialCategories: (mc.data  ?? []) as MaterialCategoryRow[],
        supplierCategories: (sc.data  ?? []) as SupplierCategoryRow[],
        documentTypes:      (dt.data  ?? []) as DocumentTypeRow[],
        slaRules:           (sla.data ?? []) as unknown as SlaRuleRow[],
        rootCauseCategories:(rcc.data ?? []) as RootCauseCategoryRow[],
        storeLocations:     (sl.data  ?? []) as StoreLocationRow[],
        woStatuses:         (wo.data  ?? []) as StatusRow[],
        pnStatuses:         (pn.data  ?? []) as StatusRow[],
      });
    }).catch(() => {
      // Network failure — fall back to static data silently
    }).finally(() => {
      setDbLoading(false);
      setFetchComplete(true);
    });
  }, [reloadKey]);

  // Use live data once the fetch is complete (even if some tables are empty).
  // Only fall back to static arrays when Supabase was never queried (dev mode).
  const useLive = fetchComplete && liveData !== null;
  const d = {
    vehicleTypes:        useLive ? liveData.vehicleTypes        : STATIC_VEHICLE_TYPES,
    materialCategories:  useLive ? liveData.materialCategories  : STATIC_MATERIAL_CATEGORIES,
    supplierCategories:  useLive ? liveData.supplierCategories  : STATIC_SUPPLIER_CATEGORIES,
    documentTypes:       useLive ? liveData.documentTypes       : STATIC_DOCUMENT_TYPES,
    slaRules:            useLive ? liveData.slaRules            : STATIC_SLA_RULES,
    rootCauseCategories: useLive ? liveData.rootCauseCategories : STATIC_ROOT_CAUSE_CATEGORIES,
    storeLocations:      useLive ? liveData.storeLocations      : STATIC_STORE_LOCATIONS,
    woStatuses:          useLive ? liveData.woStatuses          : STATIC_WO_STATUSES,
    pnStatuses:          useLive ? liveData.pnStatuses          : STATIC_PN_STATUSES,
  };

  const dataSourceLabel = isSupabaseConfigured
    ? (dbLoading ? 'Fetching live data…' : 'Supabase — live data')
    : 'Dev mode — static data';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Master data, SLA rules, and system configuration"
        actions={
          <span className={cn(
            'inline-flex items-center gap-1.5 text-[10px] font-medium rounded px-2 py-1 border',
            isSupabaseConfigured
              ? (dbLoading
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-green-50 text-green-700 border-green-200')
              : 'bg-amber-50 text-amber-700 border-amber-200',
          )}>
            {dbLoading
              ? <Loader2 size={10} className="animate-spin" />
              : isSupabaseConfigured
                ? <CheckCircle2 size={10} />
                : <AlertTriangle size={10} />
            }
            {dataSourceLabel}
          </span>
        }
      />

      {/* Editing is live only. In dev-mock mode there is no database to write to. */}
      {activeTab !== 'System Status' && !canEdit && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Dev mode — showing sample data, read-only. Connect Supabase to add, edit, and deactivate
            these entries (admin / operations manager only).
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-0.5 flex-wrap bg-gray-100 rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {activeTab !== 'System Status' && activeTab !== 'WO / PN Status' && (() => {
          const cfg = TAB_FIELDS[activeTab];
          const rowsByTab = {
            'Vehicle Types': d.vehicleTypes, 'Material Categories': d.materialCategories,
            'Supplier Categories': d.supplierCategories, 'Document Types': d.documentTypes,
            'SLA Rules': d.slaRules, 'Root Cause Categories': d.rootCauseCategories,
            'Store Locations': d.storeLocations,
          } as unknown as Record<string, Record<string, unknown>[]>;
          return (
            <EditableTable title={activeTab} table={cfg.table} fields={cfg.fields}
              rows={rowsByTab[activeTab] ?? []} loading={dbLoading} canEdit={canEdit} onChanged={reload} />
          );
        })()}
        {activeTab === 'WO / PN Status' && (
          <div className="space-y-8">
            <EditableTable title="Work Order (WO) Statuses" table="wo_statuses" fields={STATUS_FIELDS}
              rows={d.woStatuses as unknown as Record<string, unknown>[]} loading={dbLoading} canEdit={canEdit} onChanged={reload} />
            <EditableTable title="Part Number (PN) Statuses" table="pn_statuses" fields={STATUS_FIELDS}
              rows={d.pnStatuses as unknown as Record<string, unknown>[]} loading={dbLoading} canEdit={canEdit} onChanged={reload} />
          </div>
        )}
        {activeTab === 'System Status'        && <SystemStatusTab />}
      </div>
    </div>
  );
}
