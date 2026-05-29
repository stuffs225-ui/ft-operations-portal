import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Settings as SettingsIcon, Plus, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';

// ── Seed data ──────────────────────────────────────────────────────────────

const VEHICLE_TYPES = [
  { id: 'vt1', name: 'Fire Truck', code: 'FT', description: 'Standard fire suppression vehicle' },
  { id: 'vt2', name: 'Ambulance', code: 'AMB', description: 'Emergency medical response vehicle' },
  { id: 'vt3', name: 'SUV (4x4)', code: 'SUV', description: 'Light utility vehicle, off-road capable' },
  { id: 'vt4', name: 'Pick-up Truck', code: 'PUT', description: 'General utility pickup' },
  { id: 'vt5', name: 'Command Vehicle', code: 'CMD', description: 'Incident command and coordination' },
  { id: 'vt6', name: 'Water Tanker', code: 'WTK', description: 'High-capacity water supply vehicle' },
  { id: 'vt7', name: 'Rescue Vehicle', code: 'RSC', description: 'Heavy rescue and extrication' },
];

const MATERIAL_CATEGORIES = [
  { id: 'mc1', name: 'Medical Equipment', requires_serial: true, description: 'AED, stretchers, medical kits' },
  { id: 'mc2', name: 'Electrical', requires_serial: false, description: 'Wiring, panels, lighting systems' },
  { id: 'mc3', name: 'Mechanical', requires_serial: false, description: 'Pumps, valves, mechanical parts' },
  { id: 'mc4', name: 'Hydraulic', requires_serial: false, description: 'Cylinders, hoses, hydraulic systems' },
  { id: 'mc5', name: 'Body Parts', requires_serial: false, description: 'Panels, doors, structural components' },
  { id: 'mc6', name: 'Safety Equipment', requires_serial: true, description: 'SCBA, harnesses, PPE' },
  { id: 'mc7', name: 'Communication', requires_serial: true, description: 'Radios, MDT units, antennas' },
];

const SUPPLIER_CATEGORIES = [
  { id: 'sc1', name: 'Local Supplier', description: 'Saudi Arabia-based suppliers' },
  { id: 'sc2', name: 'International Supplier', description: 'Import from outside KSA' },
  { id: 'sc3', name: 'Approved Vendor', description: 'Pre-approved, reduced-review suppliers' },
  { id: 'sc4', name: 'Emergency Vendor', description: 'One-off emergency procurement only' },
];

const DOCUMENT_TYPES = [
  { id: 'dt1', name: 'Quotation PDF', required_at: 'Sales', description: 'Customer-facing price quotation' },
  { id: 'dt2', name: 'Customer PO / Contract', required_at: 'Sales', description: 'Signed purchase order or contract' },
  { id: 'dt3', name: 'PO to Supplier', required_at: 'Procurement', description: 'Supplier purchase order (>10,000 SAR requires approval)' },
  { id: 'dt4', name: 'Raw Material Excel', required_at: 'Procurement', description: 'Bill of materials spreadsheet' },
  { id: 'dt5', name: 'Vehicle Photos', required_at: 'QC / Delivery', description: 'Chassis + completion photos' },
  { id: 'dt6', name: 'Release Note', required_at: 'Delivery', description: 'Blocked until Project QC closed' },
  { id: 'dt7', name: 'BOQ', required_at: 'Projects', description: 'Bill of quantities' },
  { id: 'dt8', name: 'BOM', required_at: 'Factory', description: 'Bill of materials for production' },
  { id: 'dt9', name: 'GA Drawing', required_at: 'Factory', description: 'General arrangement drawing' },
  { id: 'dt10', name: 'Detail Drawing', required_at: 'Factory', description: 'Component detail drawing' },
];

const SLA_RULES = [
  { id: 'sla1', trigger: 'Quotation submitted', action: 'Operations Manager review', sla_hours: 48, escalate_to: 'Admin' },
  { id: 'sla2', trigger: 'Customer PO received', action: 'SO creation', sla_hours: 24, escalate_to: 'Operations Manager' },
  { id: 'sla3', trigger: 'SO created', action: 'WO issuance (Saudi)', sla_hours: 72, escalate_to: 'Operations Manager' },
  { id: 'sla4', trigger: 'SO created', action: 'PN issuance (Dubai)', sla_hours: 48, escalate_to: 'Operations Manager' },
  { id: 'sla5', trigger: 'PO to Supplier raised', action: 'Admin approval (>10k SAR)', sla_hours: 24, escalate_to: 'Admin' },
  { id: 'sla6', trigger: 'Material arrived', action: 'Material QC inspection', sla_hours: 24, escalate_to: 'Operations Manager' },
  { id: 'sla7', trigger: 'Production complete', action: 'Project QC inspection', sla_hours: 48, escalate_to: 'QC Manager' },
  { id: 'sla8', trigger: 'QC passed', action: 'Release Note generation', sla_hours: 24, escalate_to: 'Operations Manager' },
];

const ROOT_CAUSE_CATEGORIES = [
  { id: 'rc1', name: 'Design Error', description: 'Engineering or design specification issue' },
  { id: 'rc2', name: 'Supplier Defect', description: 'Material or component quality failure from supplier' },
  { id: 'rc3', name: 'Installation Error', description: 'Incorrect fitting or assembly in factory' },
  { id: 'rc4', name: 'Transport Damage', description: 'Damage incurred during shipping or delivery' },
  { id: 'rc5', name: 'Operator Error', description: 'User or operator misuse or incorrect operation' },
  { id: 'rc6', name: 'Wear & Tear', description: 'Normal degradation over service life' },
  { id: 'rc7', name: 'Environmental', description: 'Extreme climate, dust, humidity, or corrosion' },
];

const STORE_LOCATIONS = [
  { id: 'sl1', name: 'Main Warehouse', code: 'WH-MAIN', capacity: 'High', description: 'Primary storage for all incoming materials' },
  { id: 'sl2', name: 'AFS Bay', code: 'WH-AFS', capacity: 'Medium', description: 'After-sales and Dubai AFS components' },
  { id: 'sl3', name: 'Production Floor', code: 'WH-PROD', capacity: 'Low', description: 'In-progress materials on active work orders' },
  { id: 'sl4', name: 'Quarantine Area', code: 'WH-QRN', capacity: 'Low', description: 'Rejected or under-review materials' },
];

const WO_STATUSES = [
  { id: 'ws1', name: 'Draft', color: 'bg-gray-100 text-gray-600', description: 'WO created, not yet submitted for approval' },
  { id: 'ws2', name: 'Submitted', color: 'bg-blue-100 text-blue-700', description: 'Awaiting Operations Manager review' },
  { id: 'ws3', name: 'Approved', color: 'bg-brand-100 text-brand-700', description: 'Approved and ready for factory execution' },
  { id: 'ws4', name: 'In Production', color: 'bg-amber-100 text-amber-700', description: 'Factory is actively building' },
  { id: 'ws5', name: 'Completed', color: 'bg-green-100 text-green-700', description: 'All production tasks finished' },
  { id: 'ws6', name: 'Cancelled', color: 'bg-red-100 text-red-700', description: 'WO voided, no further action' },
];

const PN_STATUSES = [
  { id: 'ps1', name: 'Draft', color: 'bg-gray-100 text-gray-600', description: 'PN created, pending submission' },
  { id: 'ps2', name: 'Submitted', color: 'bg-blue-100 text-blue-700', description: 'Awaiting Operations Manager review' },
  { id: 'ps3', name: 'Approved', color: 'bg-brand-100 text-brand-700', description: 'Approved for Dubai follow-up' },
  { id: 'ps4', name: 'Dubai Follow-up Active', color: 'bg-purple-100 text-purple-700', description: 'AFS team tracking in Dubai' },
  { id: 'ps5', name: 'Vehicle Arrived', color: 'bg-amber-100 text-amber-700', description: 'Vehicle landed, QC/handover pending' },
  { id: 'ps6', name: 'Completed', color: 'bg-green-100 text-green-700', description: 'All steps done, project closed' },
];

// ── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  'Vehicle Types',
  'Material Categories',
  'Supplier Categories',
  'Document Types',
  'SLA Rules',
  'Root Cause Categories',
  'Store Locations',
  'WO / PN Status',
] as const;

type Tab = (typeof TABS)[number];

// ── Generic table helpers ───────────────────────────────────────────────────

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      <Button size="sm" variant="outline" icon={<Plus size={13} />} onClick={onAdd}>
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

// ── Tab content ─────────────────────────────────────────────────────────────

function VehicleTypesTab() {
  return (
    <div>
      <SectionHeader title="Vehicle Types" onAdd={() => undefined} />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left">Code</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
            <th className="px-4 py-2.5 text-right w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {VEHICLE_TYPES.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.name}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-brand-700">{r.code}</td>
              <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.description}</td>
              <td className="px-4 py-2.5 text-right"><EditBtn /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaterialCategoriesTab() {
  return (
    <div>
      <SectionHeader title="Material Categories" onAdd={() => undefined} />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left">Serial Required</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
            <th className="px-4 py-2.5 text-right w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {MATERIAL_CATEGORIES.map((r) => (
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
      </table>
    </div>
  );
}

function SupplierCategoriesTab() {
  return (
    <div>
      <SectionHeader title="Supplier Categories" onAdd={() => undefined} />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
            <th className="px-4 py-2.5 text-right w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {SUPPLIER_CATEGORIES.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.name}</td>
              <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.description}</td>
              <td className="px-4 py-2.5 text-right"><EditBtn /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentTypesTab() {
  return (
    <div>
      <SectionHeader title="Document Types" onAdd={() => undefined} />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left">Required At</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
            <th className="px-4 py-2.5 text-right w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {DOCUMENT_TYPES.map((r) => (
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
      </table>
    </div>
  );
}

function SlaRulesTab() {
  return (
    <div>
      <SectionHeader title="SLA Rules" onAdd={() => undefined} />
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
        <tbody className="divide-y divide-gray-100">
          {SLA_RULES.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.trigger}</td>
              <td className="px-4 py-2.5 text-xs text-gray-600 hidden md:table-cell">{r.action}</td>
              <td className="px-4 py-2.5 text-xs">
                <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">{r.sla_hours}h</span>
              </td>
              <td className="px-4 py-2.5 text-xs text-gray-500 hidden lg:table-cell">{r.escalate_to}</td>
              <td className="px-4 py-2.5 text-right"><EditBtn /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RootCauseCategoriesTab() {
  return (
    <div>
      <SectionHeader title="Root Cause Categories" onAdd={() => undefined} />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
            <th className="px-4 py-2.5 text-right w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {ROOT_CAUSE_CATEGORIES.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.name}</td>
              <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.description}</td>
              <td className="px-4 py-2.5 text-right"><EditBtn /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StoreLocationsTab() {
  return (
    <div>
      <SectionHeader title="Store Locations" onAdd={() => undefined} />
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
        <tbody className="divide-y divide-gray-100">
          {STORE_LOCATIONS.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.name}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-brand-700">{r.code}</td>
              <td className="px-4 py-2.5 text-xs hidden md:table-cell">
                <span className={cn(
                  'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium',
                  r.capacity === 'High' ? 'bg-green-100 text-green-700' :
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
      </table>
    </div>
  );
}

function WoPnStatusTab() {
  return (
    <div className="space-y-8">
      <div>
        <SectionHeader title="Work Order (WO) Statuses" onAdd={() => undefined} />
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
              <th className="px-4 py-2.5 text-right w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {WO_STATUSES.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold', r.color)}>{r.name}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.description}</td>
                <td className="px-4 py-2.5 text-right"><EditBtn /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <SectionHeader title="Part Number (PN) Statuses" onAdd={() => undefined} />
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-left hidden md:table-cell">Description</th>
              <th className="px-4 py-2.5 text-right w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {PN_STATUSES.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold', r.color)}>{r.name}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">{r.description}</td>
                <td className="px-4 py-2.5 text-right"><EditBtn /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('Vehicle Types');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Master data, SLA rules, and system configuration"
        icon={<SettingsIcon size={20} />}
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
        {activeTab === 'Vehicle Types' && <VehicleTypesTab />}
        {activeTab === 'Material Categories' && <MaterialCategoriesTab />}
        {activeTab === 'Supplier Categories' && <SupplierCategoriesTab />}
        {activeTab === 'Document Types' && <DocumentTypesTab />}
        {activeTab === 'SLA Rules' && <SlaRulesTab />}
        {activeTab === 'Root Cause Categories' && <RootCauseCategoriesTab />}
        {activeTab === 'Store Locations' && <StoreLocationsTab />}
        {activeTab === 'WO / PN Status' && <WoPnStatusTab />}
      </div>
    </div>
  );
}
