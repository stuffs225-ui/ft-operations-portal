import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { MOCK_CUSTODY_RECORDS } from '../data/mockStore';
import type { CustodyStatus, CustodyApprovalStatus, CustodyReceiverDecision, UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

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

const CAN_APPROVE: UserRole[] = ['admin', 'operations_manager'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function CustodyDetail() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const [devMsg, setDevMsg] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [receiverRejectReason, setReceiverRejectReason] = useState('');

  const record = MOCK_CUSTODY_RECORDS.find(c => c.id === id);
  const canApprove = role ? CAN_APPROVE.includes(role) : false;
  const isReceiver = role === record?.issued_to_role || role === 'factory_user' || role === 'afs_user';

  function handleAction(action: string) {
    if (!isSupabaseConfigured) {
      setDevMsg(`Dev Mode — "${action}" recorded (not persisted).`);
      return;
    }
  }

  if (!record) {
    return (
      <div className="space-y-5">
        <PageHeader title="Custody Record Not Found" />
        <EmptyState
          icon={<ShieldCheck size={24} className="text-gray-400" />}
          title="Custody record not found"
          description="This custody record does not exist."
        />
        <Link to="/custody" className="text-sm text-sky-600 hover:underline">← Back to custody</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={record.custody_number}
        subtitle={record.item ? `${record.item.item_name} — ${record.item.material_category}` : 'Custody Record'}
        action={
          <Link to="/custody">
            <Button variant="ghost" size="sm"><ArrowLeft size={14} className="mr-1" /> Back</Button>
          </Link>
        }
      />

      {devMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">{devMsg}</div>
      )}

      {/* Status summary */}
      <Card>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <Badge variant={STATUS_VARIANT[record.status]}>{record.status.replace(/_/g, ' ')}</Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Issue Type</p>
            <Badge variant={record.issue_type === 'temporary_custody' ? 'warning' : 'info'}>
              {record.issue_type.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Issued To</p>
            <p className="font-medium">{record.issued_to_role ?? record.issued_to_department ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Issued At</p>
            <p>{formatDate(record.issued_at)}</p>
          </div>
          {record.project && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Project</p>
              <p className="font-mono text-xs">{record.project.project_code}</p>
            </div>
          )}
          {record.remarks && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs text-gray-500 mb-1">Remarks</p>
              <p>{record.remarks}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Approval section */}
      {record.approval_required && (
        <Card>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Approval</h3>
            <Badge variant={APPROVAL_VARIANT[record.approval_status]}>
              {record.approval_status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="p-5">
            {record.approval_status === 'approved' && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle size={16} />
                <span>Approved{record.approved_at ? ` on ${formatDate(record.approved_at)}` : ''}</span>
              </div>
            )}
            {record.approval_status === 'rejected' && (
              <div className="flex items-center gap-2 text-sm text-red-700">
                <XCircle size={16} />
                <span>Rejected — {record.rejection_reason ?? 'No reason provided'}</span>
              </div>
            )}
            {record.approval_status === 'pending_approval' && canApprove && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <Clock size={16} />
                  <span>Awaiting approval from Admin or Operations Manager</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rejection Reason (if rejecting)</label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => handleAction('Approve custody')}>Approve</Button>
                  <Button variant="secondary" size="sm" onClick={() => { if (rejectReason) handleAction('Reject custody'); }}>
                    Reject
                  </Button>
                </div>
              </div>
            )}
            {record.approval_status === 'pending_approval' && !canApprove && (
              <p className="text-sm text-gray-500">Waiting for Admin or Operations Manager approval.</p>
            )}
          </div>
        </Card>
      )}

      {/* Receiver section */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Receiver Acceptance</h3>
          <Badge variant={RECEIVER_VARIANT[record.receiver_decision]}>
            {record.receiver_decision}
          </Badge>
        </div>
        <div className="p-5">
          {record.receiver_decision === 'accepted' && (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle size={16} />
              <span>Accepted{record.accepted_at ? ` on ${formatDate(record.accepted_at)}` : ''}</span>
            </div>
          )}
          {record.receiver_decision === 'rejected' && (
            <div className="flex items-center gap-2 text-sm text-red-700">
              <XCircle size={16} />
              <span>Rejected — {record.receiver_rejection_reason ?? 'No reason given'}</span>
            </div>
          )}
          {record.receiver_decision === 'pending' && record.status === 'issued' && isReceiver && (
            <div className="space-y-3">
              <p className="text-sm text-amber-700">Material has been issued to you. Please accept or reject.</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rejection Reason (if rejecting)</label>
                <textarea value={receiverRejectReason} onChange={e => setReceiverRejectReason(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => handleAction('Accept custody')}>Accept</Button>
                <Button variant="secondary" size="sm" onClick={() => { if (receiverRejectReason) handleAction('Reject custody'); }}>
                  Reject
                </Button>
              </div>
            </div>
          )}
          {record.receiver_decision === 'pending' && record.status !== 'issued' && (
            <p className="text-sm text-gray-500">Receiver acceptance pending issue.</p>
          )}
        </div>
      </Card>

      {/* Actions for items in custody */}
      {record.status === 'in_custody' && (
        <Card>
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Actions</h3>
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-2">
            {(role === 'factory_user' || role === 'afs_user' || canApprove) && (
              <Button variant="primary" size="sm" onClick={() => handleAction('Mark as Installed')}>Mark Installed</Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => handleAction('Return to Store')}>Return to Store</Button>
            {(role === 'factory_user' || canApprove) && (
              <Button variant="ghost" size="sm" onClick={() => handleAction('Mark as Consumed')}>Mark Consumed</Button>
            )}
          </div>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">History</h3>
        </div>
        <div className="px-5 py-4">
          <ol className="space-y-3">
            {[
              { label: 'Custody created', date: record.created_at, done: true },
              { label: 'Approval requested', date: record.approval_required ? record.created_at : null, done: record.approval_required },
              { label: 'Approved', date: record.approved_at, done: Boolean(record.approved_at) },
              { label: 'Issued to receiver', date: record.issued_at, done: ['issued', 'pending_acceptance', 'in_custody', 'installed', 'returned', 'consumed_by_project'].includes(record.status) },
              { label: 'Receiver accepted', date: record.accepted_at, done: record.receiver_decision === 'accepted' },
              { label: 'In custody / installed / returned', date: record.installed_at ?? record.returned_at, done: ['installed', 'returned', 'consumed_by_project'].includes(record.status) },
            ].filter(e => e.done || e.date).map((event, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${event.done ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {event.done ? <CheckCircle size={12} className="text-green-600" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                </div>
                <div>
                  <p className="text-sm text-gray-700">{event.label}</p>
                  {event.date && <p className="text-xs text-gray-400">{formatDate(event.date)}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Card>
    </div>
  );
}
