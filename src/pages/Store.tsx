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
import { ROLE_MATRIX } from '../lib/roleMatrix';
import type { UserRole } from '../types';
import { mockOrEmpty } from '../lib/dataMode';

const MOCK_STORE_RECEIPTS = mockOrEmpty(MOCK_STORE_RECEIPTS_RAW);
const MOCK_VEHICLE_RECEIPTS = mockOrEmpty(MOCK_VEHICLE_RECEIPTS_RAW);
const MOCK_CUSTODY_RECORDS = mockOrEmpty(MOCK_CUSTODY_RECORDS_RAW);

const REQUIRED_PHOTOS = ['front', 'rear', 'left_side', 'right_side', 'chassis_plate'];
const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'store_user'];

interface KpiData {
  materialsReceived: number;
  pendingQC: number;
  inStore: number;
  issuedInCustody: number;
  missingSerials: number;
  vehiclesMissingPhotos: number;
  unallocated: number;
  custodyPendingAcceptance: number;
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

  const [kpi, setKpi] = useState<KpiData>({
    materialsReceived: 0,
    pendingQC: 0,
    inStore: 0,
    issuedInCustody: 0,
    missingSerials: 0,
    vehiclesMissingPhotos: 0,
    unallocated: 0,
    custodyPendingAcceptance: 0,
  });

  useEffect(() => {
    (async () => {
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
        });
        return;
      }

      const sb = supabase;
      const [receiptRes, itemsRes, custodyRes] = await Promise.all([
        sb.from('store_receipts').select('id, project_id, status', { count: 'exact' }),
        sb.from('store_receipt_items').select('status, serial_required', { count: 'exact' }),
        sb.from('material_custody_records').select('receiver_decision, status', { count: 'exact' }),
      ]);

      const receipts = receiptRes.data ?? [];
      const items = itemsRes.data ?? [];
      const custody = custodyRes.data ?? [];

      // For vehicles missing photos we need a separate query
      const { data: photoDataRaw } = await sb
        .from('vehicle_receipts')
        .select('id')
        .not('status', 'in', '(closed,cancelled)');
      const photoData = (photoDataRaw ?? []) as any[];

      const vehiclesMissingPhotos = photoData.filter((v: { id: string; vehicle_receipt_photos?: { photo_type: string; storage_path: string | null }[] }) => {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    })();
  }, []);

  const kpiCards = [
    { label: 'Materials Received', value: kpi.materialsReceived, color: 'border-l-sky-400', href: '/store/receipts', icon: <Package size={16} /> },
    { label: 'Pending QC', value: kpi.pendingQC, color: kpi.pendingQC > 0 ? 'border-l-amber-500' : 'border-l-gray-200', href: '/store/qc-handoff', icon: <AlertCircle size={16} />, critical: kpi.pendingQC > 0 },
    { label: 'In Store', value: kpi.inStore, color: 'border-l-cyan-400', href: '/store/inventory', icon: <Layers size={16} /> },
    { label: 'Issued / In Custody', value: kpi.issuedInCustody, color: 'border-l-indigo-400', href: '/custody', icon: <ShieldCheck size={16} /> },
    { label: 'Missing Serials', value: kpi.missingSerials, color: kpi.missingSerials > 0 ? 'border-l-red-500' : 'border-l-gray-200', href: '/store/serials', icon: <Hash size={16} />, critical: kpi.missingSerials > 0 },
    { label: 'Vehicles Missing Photos', value: kpi.vehiclesMissingPhotos, color: kpi.vehiclesMissingPhotos > 0 ? 'border-l-red-500' : 'border-l-gray-200', href: '/store/vehicle-receiving', icon: <Truck size={16} />, critical: kpi.vehiclesMissingPhotos > 0 },
    { label: 'Unallocated Materials', value: kpi.unallocated, color: kpi.unallocated > 0 ? 'border-l-orange-400' : 'border-l-gray-200', href: '/store/unallocated', icon: <Package size={16} />, critical: kpi.unallocated > 0 },
    { label: 'Pending Acceptance', value: kpi.custodyPendingAcceptance, color: kpi.custodyPendingAcceptance > 0 ? 'border-l-amber-500' : 'border-l-gray-200', href: '/custody', icon: <ShieldCheck size={16} /> },
  ];

  const workQueues: WorkQueue[] = [
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
      label: 'Vehicles Missing Photos',
      count: kpi.vehiclesMissingPhotos,
      description: 'Vehicles without all 5 required photos — cannot be accepted.',
      href: '/store/vehicle-receiving',
      critical: kpi.vehiclesMissingPhotos > 0,
      icon: <Truck size={15} />,
    },
    {
      label: 'QC Accepted — Ready to Issue',
      count: 0,
      description: 'Items cleared by QC and ready for issuance to Factory or AFS.',
      href: '/store/qc-handoff?status=accepted',
      icon: <CheckCircle2 size={15} />,
    },
    {
      label: 'Custody Pending Approval',
      count: 0,
      description: 'Temporary custody records awaiting Admin or Ops approval.',
      href: '/custody',
      icon: <ShieldCheck size={15} />,
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
      label: 'Unallocated Materials',
      count: kpi.unallocated,
      description: 'Received materials with no project link — assign, stock, or resolve.',
      href: '/store/unallocated',
      critical: kpi.unallocated > 0,
      icon: <Package size={15} />,
    },
    {
      label: 'QC Rejected / NCR Items',
      count: 0,
      description: 'Items rejected by QC — blocked from issuance until NCR is closed.',
      href: '/store/qc-handoff?status=rejected',
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
                <Button variant="primary" size="sm" icon={<Truck size={14} />} className="bg-cyan-600 hover:bg-cyan-700 border-cyan-600">
                  Receive Vehicle
                </Button>
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
            <Button variant="ghost" size="sm" icon={<Package size={13} />} className="border border-gray-200 bg-white hover:bg-cyan-50 hover:border-cyan-300 text-gray-700">
              Receive Material
            </Button>
          </Link>
          <Link to="/store/vehicle-receiving/new">
            <Button variant="ghost" size="sm" icon={<Truck size={13} />} className="border border-gray-200 bg-white hover:bg-cyan-50 hover:border-cyan-300 text-gray-700">
              Receive Vehicle
            </Button>
          </Link>
          <Link to="/store/issuance">
            <Button variant="ghost" size="sm" icon={<ArrowUpRight size={13} />} className="border border-gray-200 bg-white hover:bg-cyan-50 hover:border-cyan-300 text-gray-700">
              Issue Material
            </Button>
          </Link>
          <Link to="/store/serials">
            <Button variant="ghost" size="sm" icon={<Hash size={13} />} className="border border-gray-200 bg-white hover:bg-cyan-50 hover:border-cyan-300 text-gray-700">
              Register Serial
            </Button>
          </Link>
          <Link to="/store/receipts">
            <Button variant="ghost" size="sm" icon={<Package size={13} />} className="border border-gray-200 bg-white hover:bg-cyan-50 hover:border-cyan-300 text-gray-700">
              Return Material
            </Button>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map((k) => (
          <Link to={k.href} key={k.label}>
            <div className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 hover:shadow-md transition-shadow ${k.color}`}>
              <div className={`mb-2 ${k.critical ? 'text-red-500' : 'text-gray-400'}`}>{k.icon}</div>
              <div className={`text-2xl font-bold ${k.critical ? 'text-red-600' : 'text-gray-900'}`}>{k.value}</div>
              <div className="text-xs font-semibold text-gray-700 mt-0.5">{k.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Work Queues */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Work Queues</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {workQueues.map((q) => (
            <Link to={q.href} key={q.label} className="block">
              <div className={`bg-white rounded-xl border shadow-sm p-4 h-full hover:shadow-md transition-shadow ${
                q.critical && q.count > 0 ? 'border-red-200 border-l-4 border-l-red-400' : 'border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className={q.critical && q.count > 0 ? 'text-red-500' : 'text-gray-400'}>{q.icon}</div>
                  {q.count > 0 ? (
                    <Badge variant={q.critical ? 'critical' : 'warning'}>{q.count}</Badge>
                  ) : (
                    <Badge variant="success">Clear</Badge>
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-800 mb-1">{q.label}</div>
                <div className="text-xs text-gray-500 line-clamp-2">{q.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Module Navigation */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Store Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {modules.map((m) => (
            <Link to={m.href} key={m.label}>
              <Card className="p-4 h-full hover:shadow-md transition-shadow hover:border-cyan-300 cursor-pointer">
                <div className="text-cyan-600 mb-2">{m.icon}</div>
                <div className="text-sm font-semibold text-gray-800">{m.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Store Rules Card */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-cyan-600" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {ROLE_MATRIX.store_user?.label ?? 'Store User'} — Governance Rules
          </span>
          <Badge variant="info" className="ml-auto">{ROLE_MATRIX.store_user?.badgeClass ? 'Store' : ''}</Badge>
        </div>
        <div className="space-y-1.5">
          {storeRules.map((rule, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <div className="w-1 h-1 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
