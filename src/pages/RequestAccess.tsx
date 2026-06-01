import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus, AlertCircle, Info, CheckCircle2, ArrowLeft,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ROLE_CONFIGS } from '../lib/roles';
import type { UserRole } from '../types';

const DEPARTMENTS = [
  'Sales', 'Sales Coordination', 'Procurement', 'Factory', 'Store',
  'Quality Control', 'AFS', 'Operations', 'Management', 'Other',
];

const ROLE_OPTIONS = Object.values(ROLE_CONFIGS);

const inputClass =
  'w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow disabled:opacity-60 disabled:bg-gray-50';

export function RequestAccess() {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [extensionNumber, setExtensionNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [directManagerName, setDirectManagerName] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole | ''>('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);

    const payload = {
      employee_number: employeeNumber.trim() || null,
      joining_date: joiningDate || null,
      job_title: jobTitle.trim() || null,
      full_name: fullName.trim(),
      email: email.trim(),
      mobile_number: mobileNumber.trim() || null,
      extension_number: extensionNumber.trim() || null,
      department: department || null,
      direct_manager_name: directManagerName.trim() || null,
      requested_role: requestedRole || null,
      notes: notes.trim() || null,
      request_status: 'submitted' as const,
    };

    if (!isSupabaseConfigured || !supabase) {
      await new Promise((r) => setTimeout(r, 500));
      setSubmitting(false);
      setSubmitted(true);
      return;
    }

    const { error: insertErr } = await supabase.from('access_requests').insert(payload);
    setSubmitting(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">FT</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FT Operations Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Request Account Access</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-7">
          {submitted ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Request submitted</h2>
              <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                Request submitted — an administrator will review your access. You will be
                contacted once your account has been created.
              </p>
              <div className="mt-6">
                <Link to="/login">
                  <Button variant="secondary" icon={<ArrowLeft size={16} />}>Back to login</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <UserPlus size={18} className="text-brand-600" />
                <h2 className="text-lg font-semibold text-gray-900">Access Request</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                Complete the form below to request access to the portal.
              </p>

              <div className="flex items-start gap-2 bg-sky-50 border border-sky-200 rounded-lg p-3 mb-5">
                <Info size={15} className="text-sky-600 shrink-0 mt-0.5" />
                <p className="text-xs text-sky-800">
                  Submitting this form does not create an account immediately. An administrator
                  must review and approve your request before access is granted.
                </p>
              </div>

              {!isSupabaseConfigured && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
                  <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">Dev Mode</span> — Your request will be simulated and not persisted.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <span className="text-xs text-red-700">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" required value={fullName} disabled={submitting}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name" className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email" required value={email} disabled={submitting}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com" className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee number</label>
                    <input
                      type="text" value={employeeNumber} disabled={submitting}
                      onChange={(e) => setEmployeeNumber(e.target.value)}
                      placeholder="EMP-0000" className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Joining date</label>
                    <input
                      type="date" value={joiningDate} disabled={submitting}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Job title</label>
                    <input
                      type="text" value={jobTitle} disabled={submitting}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Procurement Officer" className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                    <select
                      value={department} disabled={submitting}
                      onChange={(e) => setDepartment(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select department…</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile number</label>
                    <input
                      type="tel" value={mobileNumber} disabled={submitting}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="+966500000000" className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Extension number</label>
                    <input
                      type="text" value={extensionNumber} disabled={submitting}
                      onChange={(e) => setExtensionNumber(e.target.value)}
                      placeholder="4000" className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Direct manager name</label>
                    <input
                      type="text" value={directManagerName} disabled={submitting}
                      onChange={(e) => setDirectManagerName(e.target.value)}
                      placeholder="Manager full name" className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Requested role</label>
                    <select
                      value={requestedRole} disabled={submitting}
                      onChange={(e) => setRequestedRole(e.target.value as UserRole | '')}
                      className={inputClass}
                    >
                      <option value="">No preference</option>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.key} value={r.key}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason for access</label>
                  <textarea
                    value={notes} rows={3} disabled={submitting}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Briefly describe why you need access…"
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <Button
                  type="submit" className="w-full justify-center" size="md"
                  loading={submitting} disabled={submitting}
                  icon={!submitting ? <UserPlus size={16} /> : undefined}
                >
                  {submitting ? 'Submitting…' : 'Submit request'}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/login" className="text-sm text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1">
                  <ArrowLeft size={14} />
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          FT Operations Portal v0.1 · Phase 1
        </p>
      </div>
    </div>
  );
}
