import { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import {
  Settings as SettingsIcon, Plus, Pencil,
  CheckCircle2, AlertTriangle, Database, ShieldCheck, Loader2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ── Row types (match database.ts + static fallback shape) ─────────────────────

interface VehicleTypeRow       { id: string; name: string; code: string; description: string | null }
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

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      <Button size="sm" variant="outline" icon={<Plus size={13} />} onClick={() => undefined}>
        Add
      </Button>
    </div>
  );
}

function EditBtn() {
  return (
    <button className="p-1 rounded text-gray-400 hover:text-brand-600 transition-colors">
      <Pencil size={13} />
    </button>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <tbody>
      {[1, 2, 3].map((i) => (
        <tr key={i} className="border-b border-gray-100">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + (j * 20) % 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ── Tab content components (all receive data as props) ────────────────────────

function VehicleTypesTab({ data, loading }: { data: VehicleTypeRow[]; loading: boolean }) {
  return (
    <div>
      <SectionHeader title="Vehicle Types" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left">Code</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
            <th className="px-4 py-2.5 text-right w-10" />
          </tr>
        </thead>
        {loading ? <TableSkeleton cols={4} /> : (
          <tbody className="divide-y divide-gray-100">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-brand-700">{r.code}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.description}</td>
                <td className="px-4 py-2.5 text-right"><EditBtn /></td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}

function MaterialCategoriesTab({ data, loading }: { data: MaterialCategoryRow[]; loading: boolean }) {
  return (
    <div>
      <SectionHeader title="Material Categories" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left">Serial Required</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
            <th className="px-4 py-2.5 text-right w-10" />
          </tr>
        </thead>
        {loading ? <TableSkeleton cols={4} /> : (
          <tbody className="divide-y divide-gray-100">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.name}</td>
                <td className="px-4 py-2.5 text-xs">
                  <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium', r.requires_serial ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500')}>
                    {r.requires_serial ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.description}</td>
                <td className="px-4 py-2.5 text-right"><EditBtn /></td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}

function SupplierCategoriesTab({ data, loading }: { data: SupplierCategoryRow[]; loading: boolean }) {
  return (
    <div>
      <SectionHeader title="Supplier Categories" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
            <th className="px-4 py-2.5 text-right w-10" />
          </tr>
        </thead>
        {loading ? <TableSkeleton cols={3} /> : (
          <tbody className="divide-y divide-gray-100">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.name}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.description}</td>
                <td className="px-4 py-2.5 text-right"><EditBtn /></td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}

function DocumentTypesTab({ data, loading }: { data: DocumentTypeRow[]; loading: boolean }) {
  return (
    <div>
      <SectionHeader title="Document Types" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left">Required At</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
            <th className="px-4 py-2.5 text-right w-10" />
          </tr>
        </thead>
        {loading ? <TableSkeleton cols={4} /> : (
          <tbody className="divide-y divide-gray-100">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.name}</td>
                <td className="px-4 py-2.5 text-xs">
                  <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700">{r.required_at}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.description}</td>
                <td className="px-4 py-2.5 text-right"><EditBtn /></td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}

function SlaRulesTab({ data, loading }: { data: SlaRuleRow[]; loading: boolean }) {
  return (
    <div>
      <SectionHeader title="SLA Rules" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left">Trigger</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Required Action</th>
            <th className="px-4 py-2.5 text-left">SLA (hrs)</th>
            <th className="px-4 py-2.5 text-left hidden lg:table-cell">Escalate To</th>
            <th className="px-4 py-2.5 text-right w-10" />
          </tr>
        </thead>
        {loading ? <TableSkeleton cols={5} /> : (
          <tbody className="divide-y divide-gray-100">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.trigger_event}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600 hidden md:table-cell">{r.required_action}</td>
                <td className="px-4 py-2.5 text-xs">
                  <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">{r.sla_hours}h</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 hidden lg:table-cell">{r.escalate_to}</td>
                <td className="px-4 py-2.5 text-right"><EditBtn /></td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}

function RootCauseCategoriesTab({ data, loading }: { data: RootCauseCategoryRow[]; loading: boolean }) {
  return (
    <div>
      <SectionHeader title="Root Cause Categories" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
            <th className="px-4 py-2.5 text-right w-10" />
          </tr>
        </thead>
        {loading ? <TableSkeleton cols={3} /> : (
          <tbody className="divide-y divide-gray-100">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.name}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.description}</td>
                <td className="px-4 py-2.5 text-right"><EditBtn /></td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}

function StoreLocationsTab({ data, loading }: { data: StoreLocationRow[]; loading: boolean }) {
  return (
    <div>
      <SectionHeader title="Store Locations" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left">Code</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Capacity</th>
            <th className="px-4 py-2.5 text-left hidden lg:table-cell">Description</th>
            <th className="px-4 py-2.5 text-right w-10" />
          </tr>
        </thead>
        {loading ? <TableSkeleton cols={5} /> : (
          <tbody className="divide-y divide-gray-100">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-brand-700">{r.code}</td>
                <td className="px-4 py-2.5 text-xs hidden md:table-cell">
                  <span className={cn(
                    'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium',
                    r.capacity === 'High'   ? 'bg-green-100 text-green-700' :
                    r.capacity === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                             'bg-red-100 text-red-700',
                  )}>
                    {r.capacity}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 hidden lg:table-cell">{r.description}</td>
                <td className="px-4 py-2.5 text-right"><EditBtn /></td>
              </tr>
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
}

function WoPnStatusTab({ woData, pnData, loading }: { woData: StatusRow[]; pnData: StatusRow[]; loading: boolean }) {
  return (
    <div className="space-y-8">
      <div>
        <SectionHeader title="Work Order (WO) Statuses" />
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
              <th className="px-4 py-2.5 text-right w-10" />
            </tr>
          </thead>
          {loading ? <TableSkeleton cols={3} /> : (
            <tbody className="divide-y divide-gray-100">
              {woData.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold', r.color)}>{r.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.description}</td>
                  <td className="px-4 py-2.5 text-right"><EditBtn /></td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      <div>
        <SectionHeader title="Part Number (PN) Statuses" />
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
              <th className="px-4 py-2.5 text-right w-10" />
            </tr>
          </thead>
          {loading ? <TableSkeleton cols={3} /> : (
            <tbody className="divide-y divide-gray-100">
              {pnData.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold', r.color)}>{r.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.description}</td>
                  <td className="px-4 py-2.5 text-right"><EditBtn /></td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
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
  const [dbLoading, setDbLoading] = useState(false);
  // True once the fetch resolved (even with empty results). Used to
  // distinguish "DB returned 0 rows" from "never fetched (dev mode)".
  const [fetchComplete, setFetchComplete] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    setDbLoading(true);

    Promise.all([
      supabase.from('vehicle_types').select('id,name,code,description').eq('is_active', true).order('name'),
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
  }, []);

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
        icon={<SettingsIcon size={20} />}
        action={
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
        {activeTab === 'Vehicle Types'        && <VehicleTypesTab        data={d.vehicleTypes}        loading={dbLoading} />}
        {activeTab === 'Material Categories'  && <MaterialCategoriesTab  data={d.materialCategories}  loading={dbLoading} />}
        {activeTab === 'Supplier Categories'  && <SupplierCategoriesTab  data={d.supplierCategories}  loading={dbLoading} />}
        {activeTab === 'Document Types'       && <DocumentTypesTab       data={d.documentTypes}       loading={dbLoading} />}
        {activeTab === 'SLA Rules'            && <SlaRulesTab            data={d.slaRules}            loading={dbLoading} />}
        {activeTab === 'Root Cause Categories'&& <RootCauseCategoriesTab data={d.rootCauseCategories} loading={dbLoading} />}
        {activeTab === 'Store Locations'      && <StoreLocationsTab      data={d.storeLocations}      loading={dbLoading} />}
        {activeTab === 'WO / PN Status'       && <WoPnStatusTab          woData={d.woStatuses}        pnData={d.pnStatuses} loading={dbLoading} />}
        {activeTab === 'System Status'        && <SystemStatusTab />}
      </div>
    </div>
  );
}
