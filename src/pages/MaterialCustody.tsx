import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Plus, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { MOCK_CUSTODY_RECORDS } from '../data/mockStore';
import type { CustodyStatus, CustodyApprovalStatus, CustodyReceiverDecision, UserRole } from '../types';

const STATUS_TABS: { key: 'all' | CustodyStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'issued', label: 'Issued' },
  { key: 'pending_acceptance', label: 'Pending Acceptance' },
  { key: 'in_custody', label: 'In Custody' },
  { key: 'returned', label: 'Returned' },
  { key: 'installed', label: 'Installed' },
];

const STATUS_VARIANT: Record<CustodyStatus, 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default'> = {
  draft: 'neutral', pending_approval: 'warning', approved_for_issue: 'info',
  issued: 'info', pending_acceptance: 'warning', in_custody: 'default',
  installed: 'success', returned: 'neutral', consumed_by_project: 'success',
  lost_or_damaged: 'critical', cancelled: 'neutral',
};

const APPROVAL_VARIANT: Record<CustodyApprovalStatus, 'neutral' | 'warning' | 'success' | 'critical'> = {
  not_required: 'neutral', pending_approval: 'warning', approved: 'success', rejected: 'critical',
};

const RECEIVER_VARIANT: Record<CustodyReceiverDecision, 'neutral' | 'warning' | 'success' | 'critical'> = {
  pending: 'warning', accepted: 'success', rejected: 'critical',
};

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'store_user'];

export function MaterialCustody() {
  const { role } = useAuth();
  const [statusTab, setStatusTab] = useState<'all' | CustodyStatus>('all');
  const canCreate = role ? CAN_CREATE.includes(role) : false;

  const filtered = useMemo(() => {
    if (statusTab === 'all') return MOCK_CUSTODY_RECORDS;
    return MOCK_CUSTODY_RECORDS.filter(c => c.status === statusTab);
  }, [statusTab]);

  const pendingApproval = MOCK_CUSTODY_RECORDS.filter(c => c.approval_status === 'pending_approval').length;
  const pendingAcceptance = MOCK_CUSTODY_RECORDS.filter(c => c.receiver_decision === 'pending' && c.status === 'issued').length;
  const inCustody = MOCK_CUSTODY_RECORDS.filter(c => c.status === 'in_custody').length;
  const returned = MOCK_CUSTODY_RECORDS.filter(c => c.status === 'returned').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Material Custody"
        subtitle="Issuance, acceptance, installation, and return of store materials"
        action={
          canCreate ? (
            <Link to="/custody/new">
              <Button variant="primary" size="sm"><Plus size={14} className="mr-1" /> Issue Custody</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending Approval', value: pendingApproval, color: pendingApproval > 0 ? 'border-l-red-500' : 'border-l-green-400' },
          { label: 'Pending Acceptance', value: pendingAcceptance, color: 'border-l-amber-400' },
          { label: 'In Custody', value: inCustody, color: 'border-l-sky-400' },
          { label: 'Returned', value: returned, color: 'border-l-gray-400' },
        ].map(k => (
          <div key={k.label} className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 ${k.color}`}>
            <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            <div className="text-sm text-gray-600 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700">
        Temporary custody requires Admin or Operations Manager approval. Receiver must accept or reject within 1 day.
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto border-b border-gray-100">
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={() => setStatusTab(t.key)}
              className={`px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
                statusTab === t.key ? 'text-sky-700 border-b-2 border-sky-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState icon={<ShieldCheck size={24} className="text-gray-400" />} title="No custody records" description="Issue material custody to get started." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Custody #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Item</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Issued To</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Approval</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Receiver</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-sky-700">{c.custody_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">{c.item?.item_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{c.project?.project_code ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.issue_type === 'temporary_custody' ? 'warning' : 'info'}>
                        {c.issue_type === 'temporary_custody' ? 'Temporary' : 'Assign'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                      {c.issued_to_role ?? c.issued_to_department ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {c.approval_required
                        ? <Badge variant={APPROVAL_VARIANT[c.approval_status]}>{c.approval_status.replace(/_/g, ' ')}</Badge>
                        : <Badge variant="neutral">Not required</Badge>}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <Badge variant={RECEIVER_VARIANT[c.receiver_decision]}>{c.receiver_decision}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[c.status] ?? 'neutral'}>{c.status.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/custody/${c.id}`}>
                        <Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
