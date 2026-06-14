import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, UserPlus, X, ChevronDown, Eye, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn, formatDate } from '../lib/utils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ROLE_CONFIGS } from '../lib/roles';
import { MOCK_USER_ACCOUNTS } from '../data/mockAccessRequests';
import type { UserRole, UserAccount, AccountStatus } from '../types';

function statusVariant(status: AccountStatus): 'success' | 'warning' | 'critical' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'suspended') return 'critical';
  return 'neutral';
}

interface AssignRoleModalProps {
  user: UserAccount;
  onClose: () => void;
}

function AssignRoleModal({ user, onClose }: AssignRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Assign Role</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">User</p>
            <p className="text-sm font-medium text-gray-900">{user.full_name ?? '—'}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {(Object.keys(ROLE_CONFIGS) as UserRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_CONFIGS[r].label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {selectedRole && (
              <p className="mt-1.5 text-xs text-gray-500">{ROLE_CONFIGS[selectedRole].description}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onClose}>Save Role</Button>
        </div>
      </div>
    </div>
  );
}

interface ViewUserModalProps {
  user: UserAccount;
  onClose: () => void;
}

function ViewUserModal({ user, onClose }: ViewUserModalProps) {
  const rows: { label: string; value: string }[] = [
    { label: 'Full Name', value: user.full_name ?? '—' },
    { label: 'Email', value: user.email },
    { label: 'Employee Number', value: user.employee_number ?? '—' },
    { label: 'Job Title', value: user.job_title ?? '—' },
    { label: 'Department', value: user.department ?? '—' },
    { label: 'Role', value: ROLE_CONFIGS[user.role]?.label ?? user.role },
    { label: 'Joining Date', value: user.joining_date ? formatDate(user.joining_date) : '—' },
    { label: 'Mobile', value: user.mobile_number ?? '—' },
    { label: 'Extension', value: user.extension_number ?? '—' },
    { label: 'Direct Manager', value: user.direct_manager_name ?? '—' },
    { label: 'Account Origin', value: user.id.startsWith('usr-') ? 'Provisioned account' : 'Imported / external' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end">
      <div className="bg-white shadow-2xl w-full max-w-md h-full overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-sm font-semibold text-gray-900">Employee Details</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">
                {(user.full_name ?? user.email)
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{user.full_name ?? '—'}</p>
              <Badge variant={statusVariant(user.account_status)}>{user.account_status}</Badge>
            </div>
          </div>

          <dl className="divide-y divide-gray-100">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 py-2.5">
                <dt className="text-xs text-gray-500 shrink-0">{row.label}</dt>
                <dd className="text-sm text-gray-900 text-right break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

const STATUS_OPTIONS: AccountStatus[] = ['pending', 'active', 'suspended', 'inactive'];

export function AdminUsers() {
  const [users, setUsers] = useState<UserAccount[]>(MOCK_USER_ACCOUNTS);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  const [assignTarget, setAssignTarget] = useState<UserAccount | null>(null);
  const [viewTarget, setViewTarget] = useState<UserAccount | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseConfigured || !supabase) return;
      const { data } = await supabase.from('profiles').select('*');
      if (cancelled || !data) return;
      const mapped: UserAccount[] = (data as unknown as Record<string, unknown>[]).map((row) => ({
        id: String(row.id ?? ''),
        full_name: (row.full_name as string | null) ?? null,
        email: String(row.email ?? ''),
        employee_number: (row.employee_number as string | null) ?? null,
        joining_date: (row.joining_date as string | null) ?? null,
        job_title: (row.job_title as string | null) ?? null,
        mobile_number: (row.mobile_number as string | null) ?? null,
        extension_number: (row.extension_number as string | null) ?? null,
        department: (row.department as string | null) ?? null,
        direct_manager_name: (row.direct_manager_name as string | null) ?? null,
        account_status: (row.account_status as AccountStatus) ?? 'active',
        role: (row.role as UserRole) ?? 'viewer',
        created_at: String(row.created_at ?? new Date().toISOString()),
        updated_at: String(row.updated_at ?? new Date().toISOString()),
      }));
      setUsers(mapped);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const departments = Array.from(
    new Set(users.map((u) => u.department).filter((d): d is string => Boolean(d))),
  ).sort();

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.department ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || u.department === departmentFilter;
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.account_status === statusFilter;
    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  function flash(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  }

  function toggleSuspend(user: UserAccount) {
    const next: AccountStatus = user.account_status === 'suspended' ? 'active' : 'suspended';
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, account_status: next } : u)));
    flash(
      next === 'suspended'
        ? `${user.full_name ?? user.email} suspended (dev — not persisted).`
        : `${user.full_name ?? user.email} reactivated (dev — not persisted).`,
    );
  }

  const selectClass =
    'appearance-none pl-3 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin / Users"
        subtitle="Manage user accounts and role assignments"
        actions={
          <Button size="sm" icon={<UserPlus size={14} />}>
            Invite User
          </Button>
        }
      />

      <Link
        to="/admin/access-requests"
        className="rounded-lg bg-sky-50 border border-sky-200 px-4 py-2.5 text-xs text-sky-800 flex items-center justify-between hover:bg-sky-100 transition-colors"
      >
        <span>New access requests are reviewed here.</span>
        <ArrowRight size={14} />
      </Link>

      {message && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-800">
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className={selectClass}
          >
            <option value="all">All Roles</option>
            {(Object.keys(ROLE_CONFIGS) as UserRole[]).map((r) => (
              <option key={r} value={r}>{ROLE_CONFIGS[r].label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AccountStatus | 'all')}
            className={selectClass}
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, email, department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <span className="text-xs text-gray-400">{filtered.length} users</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left">Name</th>
                <th className="px-4 py-2.5 text-left hidden lg:table-cell">Employee #</th>
                <th className="px-4 py-2.5 text-left">Role</th>
                <th className="px-4 py-2.5 text-left hidden md:table-cell">Department</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left hidden lg:table-cell">Joined</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((user) => {
                const roleConfig = ROLE_CONFIGS[user.role];
                const displayName = user.full_name ?? user.email;
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white text-[10px] font-semibold">
                            {displayName
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-xs">{displayName}</div>
                          <div className="text-[10px] text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">{user.employee_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium', roleConfig?.color)}>
                        {roleConfig?.label ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{user.department ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(user.account_status)}>{user.account_status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {user.joining_date ? formatDate(user.joining_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setViewTarget(user)}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          onClick={() => setAssignTarget(user)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                        >
                          Assign Role
                        </button>
                        <button
                          onClick={() => toggleSuspend(user)}
                          className={cn(
                            'text-xs font-medium',
                            user.account_status === 'suspended'
                              ? 'text-green-600 hover:text-green-700'
                              : 'text-red-600 hover:text-red-700',
                          )}
                        >
                          {user.account_status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">No users match the current filter.</div>
        )}
      </div>

      {assignTarget && <AssignRoleModal user={assignTarget} onClose={() => setAssignTarget(null)} />}
      {viewTarget && <ViewUserModal user={viewTarget} onClose={() => setViewTarget(null)} />}
    </div>
  );
}
