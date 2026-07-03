import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Plus, ChevronRight, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { StatusTabsWithCounts } from '../components/store/StoreUI';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockOrEmpty } from '../lib/dataMode';
import { MOCK_CUSTODY_RECORDS } from '../data/mockStore';
import type { MaterialCustodyRecord, CustodyStatus, CustodyApprovalStatus, CustodyReceiverDecision, UserRole } from '../types';

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
  const [records, setRecords] = useState<MaterialCustodyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<'all' | CustodyStatus>('all');
  const canCreate = role ? CAN_CREATE.includes(role) : false;

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
          .from('material_custody_records')
          .select('*, project:projects(project_code, so_number, customer_name), item:store_receipt_items(item_name, item_code, material_category)')
          .order('issued_at', { ascending: false })
          .limit(300);
        if (data) setRecords(data as unknown as MaterialCustodyRecord[]);
      } else {
        setRecords(mockOrEmpty(MOCK_CUSTODY_RECORDS));
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (statusTab === 'all') return records;
    return records.filter(c => c.status === statusTab);
  }, [statusTab, records]);

  const pendingApproval = records.filter(c => c.approval_status === 'pending_approval').length;
  const pendingAcceptance = records.filter(c => c.receiver_decision === 'pending' && c.status === 'issued').length;
  const inCustody = records.filter(c => c.status === 'in_custody').length;
  const returned = records.filter(c => c.status === 'returned').length;

  // Tab counts derived from already-loaded records (no new query).
  const statusCounts: Record<string, number> = { all: records.length };
  for (const t of STATUS_TABS) {
    if (t.key === 'all') continue;
    statusCounts[t.key] = records.filter(c => c.status === t.key).length;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Material Custody"
        subtitle="Issuance, acceptance, installation, and return of store materials"
        breadcrumb={[{ label: 'Store', href: '/store' }, { label: 'Material Custody' }]}
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge variant="auto" />
            {canCreate && (
              <Link to="/custody/new">
                <Button variant="primary" size="sm">
                  <Plus size={14} className="mr-1" /> Issue Custody
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {pendingApproval > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            <strong>{pendingApproval}</strong> custody record{pendingApproval !== 1 ? 's' : ''} awaiting Admin or Operations Manager approval before issuance.
          </span>
        </div>
      )}

      {/* Lifecycle KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending Approval', value: pendingApproval, color: pendingApproval > 0 ? 'border-l-red-500' : 'border-l-gray-200' },
          { label: 'Pending Acceptance', value: pendingAcceptance, color: pendingAcceptance > 0 ? 'border-l-amber-400' : 'border-l-gray-200' },
          { label: 'In Custody', value: inCustody, color: 'border-l-gray-300' },
          { label: 'Returned', value: returned, color: 'border-l-gray-400' },
        ].map(k => (
          <div key={k.label} className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 ${k.color}`}>
            <div className="text-2xl font-bold text-gray-900">{loading ? '…' : k.value}</div>
            <div className="text-sm text-gray-600 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700">
        Temporary custody requires Admin or Operations Manager approval. Receiver must accept or reject upon receipt.
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Status tabs with counts */}
        <div className="px-4 pt-3">
          <StatusTabsWithCounts
            tabs={STATUS_TABS}
            active={statusTab}
            counts={statusCounts}
            onSelect={setStatusTab}
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading custody records…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<ShieldCheck size={24} className="text-gray-400" />}
              title={records.length === 0 ? 'No custody records' : 'No records in this status'}
              description={
                records.length === 0
                  ? 'Issue material custody to a project or personnel to start tracking.'
                  : 'Switch tabs to see records in other lifecycle stages.'
              }
            />
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
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{c.custody_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell">{c.item?.item_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">
                      {c.project?.project_code ?? '—'}
                    </td>
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
                        : <Badge variant="neutral">Not required</Badge>
                      }
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <Badge variant={RECEIVER_VARIANT[c.receiver_decision]}>{c.receiver_decision}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[c.status] ?? 'neutral'}>
                        {c.status.replace(/_/g, ' ')}
                      </Badge>
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
