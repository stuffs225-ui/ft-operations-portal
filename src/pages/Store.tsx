import { Link } from 'react-router-dom';
import { Package, Truck, ShieldCheck, Plus, ChevronRight, AlertCircle, Info } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { MOCK_STORE_RECEIPTS, MOCK_VEHICLE_RECEIPTS, MOCK_CUSTODY_RECORDS, MOCK_VEHICLE_PHOTOS } from '../data/mockStore';
import type { UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

const REQUIRED_PHOTOS = ['front', 'rear', 'left_side', 'right_side', 'chassis_plate'];
const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'store_user'];

export function Store() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role) : false;

  const receiptsCount = MOCK_STORE_RECEIPTS.length;
  const pendingQcCount = MOCK_STORE_RECEIPTS.filter(r => r.status === 'pending_material_qc').length;
  const vehiclesCount = MOCK_VEHICLE_RECEIPTS.length;
  const vehiclesMissingPhotos = MOCK_VEHICLE_RECEIPTS.filter(v => {
    const photos = MOCK_VEHICLE_PHOTOS[v.id] ?? [];
    return photos.filter(p => REQUIRED_PHOTOS.includes(p.photo_type)).length < REQUIRED_PHOTOS.length;
  }).length;
  const custodyPendingApproval = MOCK_CUSTODY_RECORDS.filter(c => c.approval_status === 'pending_approval').length;
  const custodyPendingAcceptance = MOCK_CUSTODY_RECORDS.filter(c => c.receiver_decision === 'pending' && c.status === 'issued').length;
  const inCustody = MOCK_CUSTODY_RECORDS.filter(c => c.status === 'in_custody').length;
  const unallocated = MOCK_STORE_RECEIPTS.filter(r => !r.project_id).length;

  const kpis = [
    { label: 'Material Receipts', value: receiptsCount, sub: 'Total received', color: 'border-l-sky-400', path: '/store/receipts', icon: <Package size={18} /> },
    { label: 'Pending QC', value: pendingQcCount, sub: 'Awaiting inspection', color: 'border-l-amber-400', path: '/store/receipts', icon: <AlertCircle size={18} /> },
    { label: 'Vehicles Received', value: vehiclesCount, sub: 'All vehicle receipts', color: 'border-l-indigo-400', path: '/store/vehicle-receiving', icon: <Truck size={18} /> },
    { label: 'Missing Photos', value: vehiclesMissingPhotos, sub: 'Vehicle receipts incomplete', color: vehiclesMissingPhotos > 0 ? 'border-l-red-500' : 'border-l-green-400', path: '/store/vehicle-receiving', icon: <Truck size={18} /> },
    { label: 'Custody Pending Approval', value: custodyPendingApproval, sub: 'Awaiting Admin/Ops', color: custodyPendingApproval > 0 ? 'border-l-red-500' : 'border-l-green-400', path: '/custody', icon: <ShieldCheck size={18} /> },
    { label: 'Custody Pending Acceptance', value: custodyPendingAcceptance, sub: 'Receiver not yet confirmed', color: 'border-l-orange-400', path: '/custody', icon: <ShieldCheck size={18} /> },
    { label: 'Materials in Custody', value: inCustody, sub: 'Currently issued', color: 'border-l-gray-400', path: '/custody', icon: <ShieldCheck size={18} /> },
    { label: 'Unallocated Materials', value: unallocated, sub: 'No project link', color: 'border-l-yellow-400', path: '/store/unallocated', icon: <Package size={18} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store / Warehouse"
        subtitle="Material and vehicle receiving, inventory, and custody management"
        action={
          canCreate ? (
            <div className="flex items-center gap-2">
              <Link to="/store/receipts/new">
                <Button variant="secondary" size="sm"><Plus size={14} className="mr-1" /> New Receipt</Button>
              </Link>
              <Link to="/store/vehicle-receiving/new">
                <Button variant="primary" size="sm"><Plus size={14} className="mr-1" /> New Vehicle</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <Info size={16} className="text-amber-600" />
          <p className="text-sm text-amber-700">Dev Mode — showing mock data. Connect Supabase to use live data.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Link to={k.path} key={k.label}>
            <div className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer ${k.color}`}>
              <div className="text-gray-400 mb-2">{k.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{k.value}</div>
              <div className="text-sm font-semibold text-gray-700 mt-0.5">{k.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{k.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Quick Actions</h2>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-3">
          <Link to="/store/receipts"><Button variant="secondary" size="sm"><Package size={14} className="mr-1" /> Material Receipts</Button></Link>
          <Link to="/store/vehicle-receiving"><Button variant="secondary" size="sm"><Truck size={14} className="mr-1" /> Vehicle Receiving</Button></Link>
          <Link to="/store/inventory"><Button variant="secondary" size="sm"><Package size={14} className="mr-1" /> Inventory</Button></Link>
          <Link to="/store/unallocated"><Button variant="secondary" size="sm"><AlertCircle size={14} className="mr-1" /> Unallocated</Button></Link>
          <Link to="/custody"><Button variant="secondary" size="sm"><ShieldCheck size={14} className="mr-1" /> Custody</Button></Link>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Governance Rules</h2>
        </div>
        <div className="px-5 py-4 space-y-2">
          {[
            'Vehicle receipt is incomplete without chassis number and all 5 required photos (Front, Rear, Left Side, Right Side, Chassis Plate).',
            'Medical items must be received with serial number tracking.',
            'Temporary custody to Production or AFS requires Admin or Operations Manager approval before issue.',
            'Store users must not see purchase cost values.',
            'Receiver must accept or reject issued material within the SLA period.',
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <ChevronRight size={14} className="text-sky-400 mt-0.5 flex-shrink-0" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
