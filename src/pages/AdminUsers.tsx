import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Users, Search, UserPlus, X, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import type { UserRole } from '../types';
import { ROLE_CONFIGS } from '../lib/roles';

interface MockUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string;
  is_active: boolean;
  joined: string;
}

const MOCK_USERS: MockUser[] = [
  { id: 'u001', full_name: 'Ahmed Al-Rashidi', email: 'ahmed.alrashidi@ft-ops.local', role: 'admin', department: 'Management', is_active: true, joined: '2024-01-10' },
  { id: 'u002', full_name: 'Mohammed Bin Saud', email: 'mohammed.binsaud@ft-ops.local', role: 'operations_manager', department: 'Operations', is_active: true, joined: '2024-01-12' },
  { id: 'u003', full_name: 'Sara Khalid', email: 'sara.khalid@ft-ops.local', role: 'sales_coordinator', department: 'Sales', is_active: true, joined: '2024-02-01' },
  { id: 'u004', full_name: 'Tariq Al-Mansouri', email: 'tariq.almansouri@ft-ops.local', role: 'sales_user', department: 'Sales', is_active: true, joined: '2024-02-15' },
  { id: 'u005', full_name: 'Khalid Ibrahim', email: 'khalid.ibrahim@ft-ops.local', role: 'procurement_user', department: 'Procurement', is_active: true, joined: '2024-03-05' },
  { id: 'u006', full_name: 'Faisal Al-Otaibi', email: 'faisal.alotaibi@ft-ops.local', role: 'factory_user', department: 'Factory', is_active: true, joined: '2024-03-10' },
  { id: 'u007', full_name: 'Nasser Al-Qahtani', email: 'nasser.alqahtani@ft-ops.local', role: 'store_user', department: 'Warehouse', is_active: true, joined: '2024-03-12' },
  { id: 'u008', full_name: 'Layla Nasser', email: 'layla.nasser@ft-ops.local', role: 'qc_user', department: 'Quality Control', is_active: true, joined: '2024-04-01' },
  { id: 'u009', full_name: 'Omar Hassan', email: 'omar.hassan@ft-ops.local', role: 'afs_user', department: 'Dubai AFS', is_active: true, joined: '2024-04-20' },
  { id: 'u010', full_name: 'Reem Al-Zahrani', email: 'reem.alzahrani@ft-ops.local', role: 'viewer', department: 'Executive', is_active: false, joined: '2024-05-01' },
  { id: 'u011', full_name: 'Bader Al-Harbi', email: 'bader.alharbi@ft-ops.local', role: 'factory_user', department: 'Factory', is_active: true, joined: '2024-05-15' },
  { id: 'u012', full_name: 'Hana Al-Dosari', email: 'hana.aldosari@ft-ops.local', role: 'sales_user', department: 'Sales', is_active: false, joined: '2024-06-01' },
];

const ROLE_TABS: Array<{ label: string; value: UserRole | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Admin', value: 'admin' },
  { label: 'Ops Manager', value: 'operations_manager' },
  { label: 'Sales', value: 'sales_user' },
  { label: 'Sales Coord.', value: 'sales_coordinator' },
  { label: 'Procurement', value: 'procurement_user' },
  { label: 'Factory', value: 'factory_user' },
  { label: 'Store', value: 'store_user' },
  { label: 'QC', value: 'qc_user' },
  { label: 'AFS', value: 'afs_user' },
  { label: 'Viewer', value: 'viewer' },
];

interface AssignRoleModalProps {
  user: MockUser;
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
            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
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

export function AdminUsers() {
  const [search, setSearch] = useState('');
  const [roleTab, setRoleTab] = useState<UserRole | 'all'>('all');
  const [assignTarget, setAssignTarget] = useState<MockUser | null>(null);

  const filtered = MOCK_USERS.filter((u) => {
    const matchesSearch =
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleTab === 'all' || u.role === roleTab;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin / Users"
        subtitle="Manage user accounts and role assignments"
        icon={<Users size={20} />}
        action={
          <Button size="sm" icon={<UserPlus size={14} />}>
            Invite User
          </Button>
        }
      />

      {/* Role filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {ROLE_TABS.map((tab) => {
          const count =
            tab.value === 'all'
              ? MOCK_USERS.length
              : MOCK_USERS.filter((u) => u.role === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setRoleTab(tab.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                roleTab === tab.value
                  ? 'bg-brand-700 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'text-[10px] rounded-full px-1.5 py-0.5 font-semibold',
                  roleTab === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
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

        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left">Name</th>
              <th className="px-4 py-2.5 text-left">Role</th>
              <th className="px-4 py-2.5 text-left hidden md:table-cell">Department</th>
              <th className="px-4 py-2.5 text-left hidden lg:table-cell">Joined</th>
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((user) => {
              const roleConfig = ROLE_CONFIGS[user.role];
              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-white text-[10px] font-semibold">
                          {user.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-xs">{user.full_name}</div>
                        <div className="text-[10px] text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium', roleConfig.color)}>
                      {roleConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{user.department}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                    {new Date(user.joined).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5',
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', user.is_active ? 'bg-green-500' : 'bg-gray-400')} />
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setAssignTarget(user)}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Assign Role
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">No users match the current filter.</div>
        )}
      </div>

      {assignTarget && <AssignRoleModal user={assignTarget} onClose={() => setAssignTarget(null)} />}
    </div>
  );
}
