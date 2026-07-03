import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Truck, ShieldCheck, AlertCircle, Layers,
  ArrowUpRight, Hash, CheckCircle2, XCircle, Warehouse,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  MOCK_STORE_RECEIPTS as MOCK_STORE_RECEIPTS_RAW,
  MOCK_VEHICLE_RECEIPTS as MOCK_VEHICLE_RECEIPTS_RAW,
  MOCK_CUSTODY_RECORDS as MOCK_CUSTODY_RECORDS_RAW,
  MOCK_VEHICLE_PHOTOS,
  MOCK_RECEIPT_ITEMS,
  MOCK_MEDICAL_SERIALS,
} from '../data/mockStore';
import { MOCK_MATERIAL_QC_INSPECTIONS } from '../data/mockQc';
import { ROLE_MATRIX } from '../lib/roleMatrix';
import type { UserRole } from '../types';
import { mockOrEmpty } from '../lib/dataMode';

const MOCK_STORE_RECEIPTS = mockOrEmpty(MOCK_STORE_RECEIPTS_RAW);
const MOCK_VEHICLE_RECEIPTS = mockOrEmpty(MOCK_VEHICLE_RECEIPTS_RAW);
const MOCK_CUSTODY_RECORDS = mockOrEmpty(MOCK_CUSTODY_RECORDS_RAW);

const REQUIRED_PHOTOS = ['front', 'rear', 'left_side', 'right_side', 'chassis_plate'];
const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'store_user'];

// Material-QC inspection_result classification. Handles both the live-DB enum
// (pass / pass_with_observations / conditional_pass / fail) and the mock-data
// vocabulary (passed / accepted / rejected) so counts are correct in both modes.
// This mirrors how StoreQCHandoff derives accepted vs rejected — read-only, no
// QC business logic is changed here.
const QC_ACCEPTED_RESULTS = ['pass', 'passed', 'pass_with_observations', 'conditional_pass', 'accepted'];
const QC_REJECTED_RESULTS = ['fail', 'failed', 'rejected'];

interface KpiData {
  materialsReceived: number;
  pendingQC: number;
  inStore: number;
  issuedInCustody: number;
  missingSerials: number;
  vehiclesMissingPhotos: number;
  unallocated: number;
  custodyPendingAcceptance: number;
  qcAccepted: number;
  qcRejected: number;
  custodyPendingApproval: number;
}

interface WorkQueue {
  label: string;
  count: number;
  description: string;
  href: string;
  critical?: boolean;
  icon: React.ReactNode;
}

export function Store() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role as UserRole) : false;
  const storeRules = ROLE_MATRIX.store_user?.rules ?? [];

  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KpiData>({
    materialsReceived: 0,
    pendingQC: 0,
    inStore: 0,
    issuedInCustody: 0,
    missingSerials: 0,
    vehiclesMissingPhotos: 0,
    unallocated: 0,
    custodyPendingAcceptance: 0,
    qcAccepted: 0,
    qcRejected: 0,
    custodyPendingApproval: 0,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!isSupabaseConfigured || !supabase) {
        // Derive KPIs from mock data
        const allItems = Object.values(MOCK_RECEIPT_ITEMS).flat();
        const missingSerials = mockOrEmpty(MOCK_MEDICAL_SERIALS).filter(
          (s) => s.qc_status === 'not_checked' && s.current_status === 'in_store',
        ).length;
        const vehiclesMissingPhotos = MOCK_VEHICLE_RECEIPTS.filter((v) => {
          const photos = MOCK_VEHICLE_PHOTOS[v.id] ?? [];
          return photos.filter((p) => REQUIRED_PHOTOS.includes(p.photo_type) && p.storage_path).length < REQUIRED_PHOTOS.length;
        }).length;

        const mockInspections = mockOrEmpty(MOCK_MATERIAL_QC_INSPECTIONS);
        setKpi({
          materialsReceived: MOCK_STORE_RECEIPTS.length,
          pendingQC: allItems.filter((i) => i.status === 'pending_qc').length,
          inStore: allItems.filter((i) => i.status === 'in_store').length,
          issuedInCustody: allItems.filter((i) => ['issued', 'in_custody'].includes(i.status)).length,
          missingSerials,
          vehiclesMissingPhotos,
          unallocated: MOCK_STORE_RECEIPTS.filter((r) => !r.project_id).length,
          custodyPendingAcceptance: MOCK_CUSTODY_RECORDS.filter(
            (c) => c.receiver_decision === 'pending' && c.status === 'issued',
          ).length,
          qcAccepted: mockInspections.filter((i) => QC_ACCEPTED_RESULTS.includes(i.inspection_result)).length,
          qcRejected: mockInspections.filter((i) => QC_REJECTED_RESULTS.includes(i.inspection_result)).length,
          custodyPendingApproval: MOCK_CUSTODY_RECORDS.filter((c) => c.approval_status === 'pending_approval').length,
        });
        setLoading(false);
        return;
      }

      const sb = supabase;
      const [receiptRes, itemsRes, custodyRes, inspectionsRes] = await Promise.all([
        sb.from('store_receipts').select('id, project_id, status', { count: 'exact' }),
        sb.from('store_receipt_items').select('status, serial_required', { count: 'exact' }),
        sb.from('material_custody_records').select('receiver_decision, status, approval_status', { count: 'exact' }),
        // Cross-module read-only visibility: QC inspection outcomes for store materials.
        sb.from('material_qc_inspections').select('inspection_result'),
      ]);

      const receipts = receiptRes.data ?? [];
      const items = itemsRes.data ?? [];
      const custody = custodyRes.data ?? [];
      const inspections = (inspectionsRes.data ?? []) as { inspection_result: string }[];

      // For vehicles missing photos we need a separate query
      const { data: photoDataRaw } = await sb
        .from('vehicle_receipts')
        .select('id')
        .not('status', 'in', '(closed,cancelled)');
      const photoData = (photoDataRaw ?? []) as { id: string; vehicle_receipt_photos?: { photo_type: string; storage_path: string | null }[] }[];

      const vehiclesMissingPhotos = photoData.filter((v) => {
        const uploaded = (v.vehicle_receipt_photos ?? [])
          .filter((p) => REQUIRED_PHOTOS.includes(p.photo_type) && p.storage_path)
          .map((p) => p.photo_type);
        return REQUIRED_PHOTOS.some((req) => !uploaded.includes(req));
      }).length;

      setKpi({
        materialsReceived: receiptRes.count ?? receipts.length,
        pendingQC: items.filter((i: { status: string }) => i.status === 'pending_qc').length,
        inStore: items.filter((i: { status: string }) => i.status === 'in_store').length,
        issuedInCustody: items.filter((i: { status: string }) => ['issued', 'in_custody'].includes(i.status)).length,
        missingSerials: items.filter((i: { status: string; serial_required: boolean }) => i.serial_required && i.status === 'received').length,
        vehiclesMissingPhotos,
        unallocated: receipts.filter((r: { project_id: string | null }) => !r.project_id).length,
        custodyPendingAcceptance: custody.filter((c: { receiver_decision: string; status: string }) =>
          c.receiver_decision === 'pending' && c.status === 'issued',
        ).length,
        qcAccepted: inspections.filter((i) => QC_ACCEPTED_RESULTS.includes(i.inspection_result)).length,
        qcRejected: inspections.filter((i) => QC_REJECTED_RESULTS.includes(i.inspection_result)).length,
        custodyPendingApproval: custody.filter((c: { approval_status?: string }) =>
          c.approval_status === 'pending_approval',
        ).length,
      });
      setLoading(false);
    })();
  }, []);

  // Compact 6-KPI band — headline metrics. Neutral by default; restrained red
  // only for genuinely critical values. Every count and destination is preserved
  // (unallocated / custody counts also surface in the priority queue below).
  const kpiCards = [
    { label: 'Materials Received', value: kpi.materialsReceived, href: '/store/receipts', icon: <Package size={16} /> },
    { label: 'In Store', value: kpi.inStore, href: '/store/inventory', icon: <Layers size={16} /> },
    { label: 'Issued / In Custody', value: kpi.issuedInCustody, href: '/custody', icon: <ShieldCheck size={16} /> },
    { label: 'Pending QC', value: kpi.pendingQC, href: '/store/qc-handoff', icon: <AlertCircle size={16} />, critical: kpi.pendingQC > 0 },
    { label: 'Vehicles Missing Photos', value: kpi.vehiclesMissingPhotos, href: '/store/vehicle-receiving', icon: <Truck size={16} />, critical: kpi.vehiclesMissingPhotos > 0 },
    { label: 'Missing Serials', value: kpi.missingSerials, href: '/store/serials', icon: <Hash size={16} />, critical: kpi.missingSerials > 0 },
  ];

  // One urgency-ordered priority queue (replaces the previous second 8-card grid
  // that duplicated the KPIs). Order per the approved Artifact: Vehicles Missing
  // Photos → Materials Pending QC → Missing Serials → Unallocated → Custody
  // Pending Approval → QC-Accepted Ready to Issue, then the remaining follow-ups.
  // All counts and links preserved.
  const priorityQueues: WorkQueue[] = [
    {
      label: 'Vehicles Missing Photos',
      count: kpi.vehiclesMissingPhotos,
      description: 'Vehicles without all 5 required photos — cannot be accepted.',
      href: '/store/vehicle-receiving',
      critical: kpi.vehiclesMissingPhotos > 0,
      icon: <Truck size={15} />,
    },
    {
      label: 'Materials Pending QC',
      count: kpi.pendingQC,
      description: 'Items received but not yet handed to Quality Control.',
      href: '/store/qc-handoff',
      critical: kpi.pendingQC > 0,
      icon: <AlertCircle size={15} />,
    },
    {
      label: 'Missing Serial Numbers',
      count: kpi.missingSerials,
      description: 'Medical/serialized items received without serial registration.',
      href: '/store/serials',
      critical: kpi.missingSerials > 0,
      icon: <Hash size={15} />,
    },
    {
      label: 'Unallocated Materials',
      count: kpi.unallocated,
      description: 'Received materials with no project link — assign, stock, or resolve.',
      href: '/store/unallocated',
      critical: kpi.unallocated > 0,
      icon: <Package size={15} />,
    },
    {
      label: 'Custody Pending Approval',
      count: kpi.custodyPendingApproval,
      description: 'Temporary custody records awaiting Admin or Ops approval.',
      href: '/custody',
      critical: kpi.custodyPendingApproval > 0,
      icon: <ShieldCheck size={15} />,
    },
    {
      label: 'QC Accepted — Ready to Issue',
      count: kpi.qcAccepted,
      description: 'Items cleared by QC and ready for issuance to Factory or AFS.',
      href: '/store/qc-handoff?status=accepted',
      icon: <CheckCircle2 size={15} />,
    },
    {
      label: 'Custody Pending Acceptance',
      count: kpi.custodyPendingAcceptance,
      description: 'Issued materials awaiting receiver acceptance confirmation.',
      href: '/custody',
      critical: kpi.custodyPendingAcceptance > 0,
      icon: <ShieldCheck size={15} />,
    },
    {
      label: 'QC Rejected / NCR Items',
      count: kpi.qcRejected,
      description: 'Items rejected by QC — blocked from issuance until NCR is closed.',
      href: '/store/qc-handoff?status=rejected',
      critical: kpi.qcRejected > 0,
      icon: <XCircle size={15} />,
    },
  ];

  const modules = [
    { label: 'Inventory', href: '/store/inventory', icon: <Layers size={18} />, desc: 'All received items and current status' },
    { label: 'Material Receiving', href: '/store/receipts', icon: <Package size={18} />, desc: 'Inbound receipts and delivery notes' },
    { label: 'Vehicle Receiving', href: '/store/vehicle-receiving', icon: <Truck size={18} />, desc: 'Vehicle intake, photos, and acceptance' },
    { label: 'Material Issuance', href: '/store/issuance', icon: <ArrowUpRight size={18} />, desc: 'Issue to Factory, AFS, or temporary custody' },
    { label: 'Serial Register', href: '/store/serials', icon: <Hash size={18} />, desc: 'Medical and serialized item tracking' },
    { label: 'Unallocated Materials', href: '/store/unallocated', icon: <AlertCircle size={18} />, desc: 'Materials without project assignment' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Dashboard"
        subtitle="Manage receiving, inventory, vehicle intake, serials, issuance, custody, and warehouse handoffs."
        icon={<Warehouse size={18} />}
        breadcrumb={[{ label: 'Store Dashboard' }]}
        actions={
          canCreate ? (
            <div className="flex items-center gap-2">
              <Link to="/store/receipts/new">
                <Button variant="secondary" size="sm" icon={<Package size={14} />}>Receive Material</Button>
              </Link>
              <Link to="/store/vehicle-receiving/new">
                <Button variant="primary" size="sm" icon={<Truck size={14} />}>Receive Vehicle</Button>
              </Link>
            </div>
          ) : undefined
        }
        className="mb-6"
      />

      {/* Top quick actions */}
      {canCreate && (
        <div className="flex flex-wrap gap-2">
          <Link to="/store/receipts/new">
            <Button variant="ghost" size="sm" icon={<Package size={13} />} className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700">
              Receive Material
            </Button>
          </Link>
          <Link to="/store/vehicle-receiving/new">
            <Button variant="ghost" size="sm" icon={<Truck size={13} />} className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700">
              Receive Vehicle
            </Button>
          </Link>
          <Link to="/store/issuance">
            <Button variant="ghost" size="sm" icon={<ArrowUpRight size={13} />} className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700">
              Issue Material
            </Button>
          </Link>
          <Link to="/store/serials">
            <Button variant="ghost" size="sm" icon={<Hash size={13} />} className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700">
              Register Serial
            </Button>
          </Link>
          <Link to="/store/receipts">
            <Button variant="ghost" size="sm" icon={<Package size={13} />} className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700">
              Return Material
            </Button>
          </Link>
        </div>
      )}

      {/* Compact KPI band */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {kpiCards.map((k) => {
          const isCritical = !!k.critical && k.value > 0;
          return (
            <Link to={k.href} key={k.label} className="group block">
              <div className={`bg-white rounded-lg border px-3 py-2.5 hover:shadow-sm transition-all ${isCritical ? 'border-gray-200 border-l-4 border-l-red-500' : 'border-gray-200/80'}`}>
                <div className="flex items-center gap-2">
                  <span className={isCritical ? 'text-red-500' : 'text-gray-300'}>{k.icon}</span>
                  <span className={`text-xl font-bold tabular-nums ${isCritical ? 'text-red-700' : 'text-gray-900'}`}>{loading ? '…' : k.value}</span>
                </div>
                <div className="text-[11px] text-gray-500 mt-1 leading-tight group-hover:text-gray-700 transition-colors">{k.label}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Priority Queues — single urgency-ordered block */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400 mb-3">Priority Queues</h2>
        <div className="rounded-lg border border-gray-200/80 bg-white divide-y divide-gray-100 overflow-hidden">
          {priorityQueues.map((q) => {
            const isUrgent = q.critical && q.count > 0;
            return (
              <Link to={q.href} key={q.label} className="group flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                <span className={`shrink-0 ${isUrgent ? 'text-red-500' : 'text-gray-300'}`}>{q.icon}</span>
                <span className={`text-2xl font-bold tabular-nums w-12 shrink-0 ${isUrgent ? 'text-red-700' : q.count === 0 ? 'text-gray-300' : 'text-gray-900'}`}>
                  {loading ? '…' : q.count}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{q.label}</span>
                    {!loading && (isUrgent ? <Badge variant="critical">Action</Badge> : q.count === 0 ? <Badge variant="success">Clear</Badge> : null)}
                  </div>
                  <p className="text-xs text-gray-500 leading-snug mt-0.5">{q.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Module Navigation — compact */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400 mb-3">Store Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {modules.map((m) => (
            <Link to={m.href} key={m.label} className="group flex items-center gap-3 rounded-lg border border-gray-200/80 bg-white px-3 py-2.5 hover:shadow-sm hover:border-gray-300 transition-all">
              <div className="w-8 h-8 bg-gray-50 rounded-md flex items-center justify-center shrink-0 text-gray-500 group-hover:text-brand-600 transition-colors">
                {m.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{m.label}</div>
                <div className="text-xs text-gray-500 leading-snug truncate">{m.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Store Governance Rules */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={14} className="text-brand-600" />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-[0.04em]">
            {ROLE_MATRIX.store_user?.label ?? 'Store User'} — Governance Rules
          </span>
        </div>
        <div className="space-y-1.5">
          {storeRules.map((rule, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="text-brand-500 mt-0.5 shrink-0" aria-hidden>▸</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
