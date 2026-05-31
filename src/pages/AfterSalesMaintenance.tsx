import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { MOCK_AFS_MAINTENANCE_REQUESTS } from '../data/mockAfs';
import type { MaintenanceStatus, UserRole } from '../types';

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'sales_user', 'afs_user'];

type Tab = 'all' | MaintenanceStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'under_inspection', label: 'Inspecting' },
  { key: 'parts_waiting', label: 'Parts Waiting' },
  { key: 'in_repair', label: 'In Repair' },
  { key: 'completed', label: 'Completed' },
];

function priorityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'warning';
  if (s === 'medium') return 'info';
  return 'neutral';
}

function statusVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'open' || s === 'assigned') return 'critical';
  if (s === 'under_inspection' || s === 'parts_waiting' || s === 'in_repair') return 'warning';
  if (s === 'completed' || s === 'closed') return 'success';
  return 'neutral';
}

export function AfterSalesMaintenance() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role) : false;
  const [tab, setTab] = useState<Tab>('all');

  const requests = MOCK_AFS_MAINTENANCE_REQUESTS.filter(r =>
    tab === 'all' ? true : r.maintenance_status === tab
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Maintenance Requests"
        subtitle="After-sales maintenance and repair tracking"
        action={canCreate ? (
          <Link to="/after-sales/maintenance/new">
            <Button variant="primary" size="sm"><Plus size={14} className="mr-1" /> New Request</Button>
          </Link>
        ) : undefined}
      />

      <div className="flex gap-1 border-b border-gray-100 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${tab === t.key ? 'bg-white border border-b-white border-gray-100 text-sky-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        {requests.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No maintenance requests found.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {requests.map(r => (
              <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Wrench size={14} className="text-purple-500 shrink-0" />
                    <span className="text-sm font-mono text-sky-700">{r.maintenance_request_number}</span>
                    <Badge variant={priorityVariant(r.priority)}>{r.priority}</Badge>
                    <Badge variant={statusVariant(r.maintenance_status)}>{r.maintenance_status.replace(/_/g, ' ')}</Badge>
                    {r.parts_required && <Badge variant="warning">Parts Required</Badge>}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mt-1">{r.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {r.customer_name}
                    {r.project?.project_code && ` · ${r.project.project_code}`}
                    {r.chassis_number && ` · ${r.chassis_number}`}
                    {` · ${new Date(r.reported_date).toLocaleDateString('en-GB')}`}
                  </div>
                </div>
                <Link to={`/after-sales/maintenance/${r.id}`}>
                  <Button variant="ghost" size="sm">View</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
