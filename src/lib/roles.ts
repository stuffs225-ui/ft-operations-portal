import type { RoleConfig, UserRole } from '../types';

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    key: 'admin',
    label: 'Admin',
    description: 'Full governance, users, settings, approvals, reports',
    financialVisibility: 'full',
    color: 'bg-purple-100 text-purple-800',
  },
  operations_manager: {
    key: 'operations_manager',
    label: 'Operations Manager',
    description: 'Operations, escalation, Dubai, PO approvals, Temporary Custody',
    financialVisibility: 'partial',
    color: 'bg-blue-100 text-blue-800',
  },
  sales_user: {
    key: 'sales_user',
    label: 'Sales',
    description: 'Quotations, Hot Projects, SO, Aging, Invoicing',
    financialVisibility: 'quotation_only',
    color: 'bg-green-100 text-green-800',
  },
  sales_coordinator: {
    key: 'sales_coordinator',
    label: 'Sales Coordinator',
    description: 'Quotation processing, PDF upload, line values',
    financialVisibility: 'quotation_only',
    color: 'bg-teal-100 text-teal-800',
  },
  procurement_user: {
    key: 'procurement_user',
    label: 'Procurement',
    description: 'PR, PO to Supplier, ETA, suppliers',
    financialVisibility: 'cost_only',
    color: 'bg-orange-100 text-orange-800',
  },
  factory_user: {
    key: 'factory_user',
    label: 'Factory / Production',
    description: 'WO, BOQ, BOM, Raw Material Requests, production progress',
    financialVisibility: 'none',
    color: 'bg-yellow-100 text-yellow-800',
  },
  store_user: {
    key: 'store_user',
    label: 'Store / Warehouse',
    description: 'Material & vehicle receiving, custody, issuance',
    financialVisibility: 'none',
    color: 'bg-amber-100 text-amber-800',
  },
  qc_user: {
    key: 'qc_user',
    label: 'Quality Control',
    description: 'Material QC, Vehicle QC, NCR, Release Note',
    financialVisibility: 'none',
    color: 'bg-red-100 text-red-800',
  },
  afs_user: {
    key: 'afs_user',
    label: 'AFS',
    description: 'Dubai projects, vehicle arrival, pre-delivery, after-sales maintenance',
    financialVisibility: 'none',
    color: 'bg-cyan-100 text-cyan-800',
  },
  viewer: {
    key: 'viewer',
    label: 'Viewer / Management',
    description: 'Read-only access to reports and dashboards',
    financialVisibility: 'partial',
    color: 'bg-gray-100 text-gray-700',
  },
};
