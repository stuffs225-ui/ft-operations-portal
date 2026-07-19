// ── Runtime-configurable reference lists (Phase 0) ────────────────────────────
// Single source of truth for the reference lists a DOMAIN role may manage from
// the "Manage Lists" page. Governance-adjacent lists (WO/PN statuses, SLA rules,
// vehicle/document types) are intentionally NOT here — they stay on the admin-only
// Settings page. Write access is enforced by RLS (migration 116); the `owners`
// field mirrors that RLS so the UI only offers editing to roles that will succeed.

import type { UserRole } from '../types';
import type { SettingsTable } from './settingsQueries';
import type { FieldDef } from '../pages/Settings';

export interface ReferenceListDef {
  /** Stable identifier (also used as the React key). */
  key: string;
  /** Display title. */
  title: string;
  /** Short one-line explanation shown under the title. */
  blurb: string;
  /** Target table (has the admin/ops + owner write RLS and an is_active column). */
  table: SettingsTable;
  /** Columns to fetch. */
  select: string;
  /** Column to order by (ascending). */
  orderBy: string;
  /** Editable fields (reuses the Settings editor's field model). */
  fields: FieldDef[];
  /** Roles that OWN this list (besides admin / operations_manager). */
  owners: UserRole[];
}

const CAPACITY_OPTIONS = [
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export const REFERENCE_LISTS: ReferenceListDef[] = [
  {
    key: 'factory_requirement_types',
    title: 'Factory Requirement Types',
    blurb: 'The requirement checklist a project must satisfy (BOQ, BOM, GA Drawing, …). New types appear in the project workspace checklist.',
    table: 'factory_requirement_types',
    select: 'id,name,description,sort_order',
    orderBy: 'sort_order',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'sort_order', label: 'Order', type: 'number' },
    ],
    owners: ['factory_user'],
  },
  {
    key: 'factory_process_steps',
    title: 'Factory Process Steps',
    blurb: 'The weighted production steps used to compute a project’s progress %. Weights are relative — a step’s share of total progress. Editing here affects new set-ups only; projects already in progress keep their snapshot.',
    table: 'factory_process_steps',
    select: 'id,name,weight,sort_order',
    orderBy: 'sort_order',
    fields: [
      { key: 'name', label: 'Step Name', type: 'text', required: true },
      { key: 'weight', label: 'Weight', type: 'number', required: true },
      { key: 'sort_order', label: 'Order', type: 'number' },
    ],
    owners: ['factory_user'],
  },
  {
    key: 'supplier_categories',
    title: 'Supplier Categories',
    blurb: 'How suppliers are classified during procurement.',
    table: 'supplier_categories',
    select: 'id,name,description',
    orderBy: 'name',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    owners: ['procurement_user'],
  },
  {
    key: 'material_categories',
    title: 'Material Categories',
    blurb: 'Material classifications used across procurement and store. "Serial Required" drives medical/serialized tracking.',
    table: 'material_categories',
    select: 'id,name,requires_serial,description',
    orderBy: 'name',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'requires_serial', label: 'Serial Required', type: 'boolean' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    owners: ['procurement_user', 'store_user'],
  },
  {
    key: 'qc_checklist_items',
    title: 'QC Checklist Items',
    blurb: 'The inspection checklist QC ticks off on each inspection. Category scopes an item to material inspections, project inspections, or both.',
    table: 'qc_checklist_items',
    select: 'id,name,category,sort_order',
    orderBy: 'sort_order',
    fields: [
      { key: 'name', label: 'Item', type: 'text', required: true },
      { key: 'category', label: 'Applies To', type: 'select', options: [
        { value: 'both', label: 'Both' },
        { value: 'material', label: 'Material inspections' },
        { value: 'project', label: 'Project inspections' },
      ] },
      { key: 'sort_order', label: 'Order', type: 'number' },
    ],
    owners: ['qc_user'],
  },
  {
    key: 'afs_predelivery_checklist_items',
    title: 'AFS Pre-Delivery Checklist',
    blurb: 'The pre-delivery readiness checklist AFS ticks off before a vehicle is released for delivery.',
    table: 'afs_predelivery_checklist_items',
    select: 'id,name,sort_order',
    orderBy: 'sort_order',
    fields: [
      { key: 'name', label: 'Item', type: 'text', required: true },
      { key: 'sort_order', label: 'Order', type: 'number' },
    ],
    owners: ['afs_user'],
  },
  {
    key: 'root_cause_categories',
    title: 'Root Cause Categories',
    blurb: 'The root-cause options selectable when investigating an NCR.',
    table: 'root_cause_categories',
    select: 'id,name,description',
    orderBy: 'name',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    owners: ['qc_user'],
  },
  {
    key: 'store_locations',
    title: 'Store Locations',
    blurb: 'Physical storage locations goods can be received into and issued from.',
    table: 'store_locations',
    select: 'id,name,code,capacity,description',
    orderBy: 'name',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'capacity', label: 'Capacity', type: 'select', options: CAPACITY_OPTIONS },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    owners: ['store_user'],
  },
];

/** Roles that manage every domain list (see all of them on the page). */
const SUPER_OWNERS: UserRole[] = ['admin', 'operations_manager'];

/** Can this role edit this specific list? (mirrors the migration-116 RLS.) */
export function canEditList(list: ReferenceListDef, role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return SUPER_OWNERS.includes(role) || list.owners.includes(role);
}

/** The lists this role should see on the Manage Lists page. */
export function listsForRole(role: UserRole | null | undefined): ReferenceListDef[] {
  if (!role) return [];
  if (SUPER_OWNERS.includes(role)) return REFERENCE_LISTS;
  return REFERENCE_LISTS.filter((l) => l.owners.includes(role));
}

/** Roles that own at least one list — used for route/nav gating. */
export const REFERENCE_LIST_ROLES: UserRole[] = Array.from(
  new Set<UserRole>([...SUPER_OWNERS, ...REFERENCE_LISTS.flatMap((l) => l.owners)]),
);
