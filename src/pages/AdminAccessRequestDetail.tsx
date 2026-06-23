import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  UserCheck, Loader2, Info, AlertCircle, X, CheckCircle2,
  Mail, Phone, Building2, Briefcase, Calendar, Hash, UserCog,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ROLE_CONFIGS } from '../lib/roles';
import { getMockAccessRequest } from '../data/mockAccessRequests';
import { formatDate } from '../lib/utils';
import { statusBadge } from './AdminAccessRequests';
import type { AccessRequest, AccountStatus, UserRole } from '../types';

const ROLE_OPTIONS = Object.values(ROLE_CONFIGS);

const ACCOUNT_STATUS_OPTIONS: AccountStatus[] = ['pending', 'active', 'suspended', 'inactive'];

const inputClass =
  'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow disabled:opacity-60 disabled:bg-gray-50';

function DetailField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        {icon}
        {label}
      </div>
      <div className="text-sm text-gray-900">{value ?? '—'}</div>
    </div>
  );
}

export function AdminAccessRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();

  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [role, setRole] = useState<UserRole | ''>('');
  const [department, setDepartment] = useState('');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('active');
  const [reviewNotes, setReviewNotes] = useState('');

  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (!isSupabaseConfigured || !supabase) {
      Promise.resolve().then(() => {
        const req = getMockAccessRequest(id);
        if (!req) {
          setNotFound(true);
        } else {
          setRequest(req);
          setRole(req.requested_role ?? '');
          setDepartment(req.department ?? '');
          setReviewNotes(req.admin_review_notes ?? '');
        }
        setLoading(false);
      });
      return;
    }
    supabase
      .from('access_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error: loadErr }) => {
        if (loadErr) console.error(loadErr);
        const req = (data as unknown as AccessRequest) ?? null;
        if (!req) {
          setNotFound(true);
        } else {
          setRequest(req);
          setRole(req.requested_role ?? '');
          setDepartment(req.department ?? '');
          setReviewNotes(req.admin_review_notes ?? '');
        }
        setLoading(false);
      });
  }, [id]);

  async function applyUpdate(patch: Partial<AccessRequest>, successMsg: string) {
    if (!request) return;
    setWorking(true);
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 400));
      setRequest((prev) => (prev ? { ...prev, ...patch } : prev));
      setMessage('Dev mode — changes not persisted');
      setWorking(false);
      return;
    }

    const { error: updateErr } = await supabase
      .from('access_requests')
      .update(patch)
      .eq('id', request.id);
    setWorking(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setRequest((prev) => (prev ? { ...prev, ...patch } : prev));
    setMessage(successMsg);
  }

  function handleApprove() {
    if (!role) {
      setError('Select a role before approving.');
      return;
    }
    void applyUpdate(
      {
        request_status: 'approved',
        requested_role: role,
        department: department.trim() || null,
        admin_review_notes: reviewNotes.trim() || null,
        reviewed_by: profile?.id ?? null,
        reviewed_at: new Date().toISOString(),
      },
      'Decision recorded — role assignment captured. Create the auth user manually to complete onboarding.',
    );
  }

  function handleUnderReview() {
    void applyUpdate(
      {
        request_status: 'under_review',
        department: department.trim() || null,
        admin_review_notes: reviewNotes.trim() || null,
        reviewed_by: profile?.id ?? null,
        reviewed_at: new Date().toISOString(),
      },
      'Marked under review.',
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !request) {
    return (
      <div className="text-center py-16 text-gray-500">
        Access request not found.{' '}
        <Link to="/admin/access-requests" className="text-brand-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  const isClosed = request.request_status === 'approved' || request.request_status === 'rejected';

  return (
    <div>
      <PageHeader
        title="Review Access Request"
        subtitle={request.full_name}
        icon={<UserCheck size={18} />}
        breadcrumb={[
          { label: 'Access Requests', path: '/admin/access-requests' },
          { label: request.full_name },
        ]}
        action={statusBadge(request.request_status)}
      />

      {message && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 mb-5">
          <CheckCircle2 size={15} className="text-green-600 shrink-0 mt-0.5" />
          <p className="text-xs text-green-800">{message}</p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
          <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Submitted details */}
        <Card className="lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Submitted Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <DetailField icon={<UserCog size={11} />} label="Full Name" value={request.full_name} />
            <DetailField icon={<Mail size={11} />} label="Email" value={request.email} />
            <DetailField icon={<Hash size={11} />} label="Employee Number" value={request.employee_number} />
            <DetailField icon={<Calendar size={11} />} label="Joining Date" value={request.joining_date ? formatDate(request.joining_date) : null} />
            <DetailField icon={<Briefcase size={11} />} label="Job Title" value={request.job_title} />
            <DetailField icon={<Building2 size={11} />} label="Department" value={request.department} />
            <DetailField icon={<Phone size={11} />} label="Mobile Number" value={request.mobile_number} />
            <DetailField icon={<Phone size={11} />} label="Extension" value={request.extension_number} />
            <DetailField icon={<UserCog size={11} />} label="Direct Manager" value={request.direct_manager_name} />
            <DetailField
              icon={<UserCheck size={11} />}
              label="Requested Role"
              value={request.requested_role ? ROLE_CONFIGS[request.requested_role].label : null}
            />
            <DetailField icon={<Calendar size={11} />} label="Submitted" value={formatDate(request.created_at)} />
          </div>
          {request.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Reason for Access</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.notes}</p>
            </div>
          )}
          {request.admin_review_notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Admin Review Notes</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.admin_review_notes}</p>
            </div>
          )}
        </Card>

        {/* Review panel */}
        <div className="space-y-5">
          <Card>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Admin Review</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign Role</label>
                <select
                  value={role}
                  disabled={working || isClosed}
                  onChange={(e) => setRole(e.target.value as UserRole | '')}
                  className={inputClass}
                >
                  <option value="">Select role…</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                <input
                  type="text"
                  value={department}
                  disabled={working || isClosed}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Department"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Status</label>
                <select
                  value={accountStatus}
                  disabled={working || isClosed}
                  onChange={(e) => setAccountStatus(e.target.value as AccountStatus)}
                  className={inputClass}
                >
                  {ACCOUNT_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Review Notes</label>
                <textarea
                  value={reviewNotes}
                  rows={3}
                  disabled={working || isClosed}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Internal review notes…"
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="primary"
                  loading={working}
                  disabled={working || isClosed}
                  icon={<CheckCircle2 size={16} />}
                  onClick={handleApprove}
                >
                  Approve &amp; Assign
                </Button>
                <Button
                  variant="secondary"
                  disabled={working || isClosed}
                  onClick={handleUnderReview}
                >
                  Mark Under Review
                </Button>
                <Button
                  variant="danger"
                  disabled={working || isClosed}
                  icon={<X size={16} />}
                  onClick={() => setShowReject(true)}
                >
                  Reject
                </Button>
              </div>
              {isClosed && (
                <p className="text-xs text-gray-400 text-center">
                  This request is {request.request_status} and is read-only.
                </p>
              )}
            </div>
          </Card>

          {/* Manual user creation notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info size={15} className="text-amber-600 shrink-0" />
              <h3 className="text-sm font-semibold text-amber-900">Manual user creation required</h3>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Approving here records the decision and the intended role only. An administrator must still
              create or link the Supabase Auth user in the Supabase Dashboard (or via a server-side script
              using the service role key). The app never creates auth users or passwords in the browser.
              See <span className="font-mono">docs/ACCESS_REQUEST_WORKFLOW_DESIGN.md</span>.
            </p>
          </div>
        </div>
      </div>

      {showReject && (
        <RejectModal
          request={request}
          onClose={() => setShowReject(false)}
          onSubmit={async (reason) => {
            await applyUpdate(
              {
                request_status: 'rejected',
                admin_review_notes: reason,
                reviewed_by: profile?.id ?? null,
                reviewed_at: new Date().toISOString(),
              },
              'Request rejected.',
            );
            setReviewNotes(reason);
            setShowReject(false);
          }}
        />
      )}
    </div>
  );
}

interface RejectModalProps {
  request: AccessRequest;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

function RejectModal({ request, onClose, onSubmit }: RejectModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    await onSubmit(reason.trim());
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-red-700">Reject Access Request</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{request.full_name} — {request.email}</p>
        </div>
        <form onSubmit={handleReject}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={4}
                placeholder="Describe why this request is being rejected…"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="danger" loading={submitting} disabled={!reason.trim()}>
              Reject Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
