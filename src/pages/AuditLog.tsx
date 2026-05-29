import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { ScrollText, Search, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'APPROVE'
  | 'REJECT'
  | 'ASSIGN_ROLE';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
}

const SAMPLE_ENTRIES: AuditEntry[] = [
  {
    id: 'aud-001',
    timestamp: '2025-01-15T09:14:22Z',
    actor: 'Ahmed Al-Rashidi',
    actorRole: 'admin',
    action: 'APPROVE',
    entity: 'PurchaseOrder',
    entityId: 'PO-2025-0041',
    description: 'Approved PO to Supplier for hydraulic components',
    before: { status: 'pending_approval', amount: 14500 },
    after: { status: 'approved', amount: 14500, approved_by: 'Ahmed Al-Rashidi' },
    ipAddress: '10.0.1.5',
  },
  {
    id: 'aud-002',
    timestamp: '2025-01-15T09:02:11Z',
    actor: 'Sara Khalid',
    actorRole: 'sales_coordinator',
    action: 'CREATE',
    entity: 'Quotation',
    entityId: 'QT-2025-0088',
    description: 'Created quotation for Civil Defense Fire Truck order',
    after: { so_number: null, status: 'draft', customer: 'Civil Defense Dept.' },
    ipAddress: '10.0.1.22',
  },
  {
    id: 'aud-003',
    timestamp: '2025-01-15T08:47:58Z',
    actor: 'Mohammed Bin Saud',
    actorRole: 'operations_manager',
    action: 'UPDATE',
    entity: 'WorkOrder',
    entityId: 'WO-2025-0013',
    description: 'Updated work order status to In Production',
    before: { status: 'approved', assigned_factory: null },
    after: { status: 'in_production', assigned_factory: 'Factory A — Bay 3' },
    ipAddress: '10.0.1.8',
  },
  {
    id: 'aud-004',
    timestamp: '2025-01-15T08:31:00Z',
    actor: 'Faisal Al-Otaibi',
    actorRole: 'factory_user',
    action: 'UPDATE',
    entity: 'WorkOrder',
    entityId: 'WO-2025-0011',
    description: 'Marked work order as completed',
    before: { status: 'in_production', completion_pct: 80 },
    after: { status: 'completed', completion_pct: 100, completed_at: '2025-01-15T08:31:00Z' },
    ipAddress: '10.0.2.14',
  },
  {
    id: 'aud-005',
    timestamp: '2025-01-15T08:15:44Z',
    actor: 'System',
    actorRole: 'system',
    action: 'LOGIN',
    entity: 'Session',
    entityId: 'sess-7fa2b',
    description: 'User logged in successfully',
    after: { user: 'sara.khalid@ft-ops.local', method: 'email_password' },
    ipAddress: '10.0.1.22',
  },
  {
    id: 'aud-006',
    timestamp: '2025-01-14T16:58:03Z',
    actor: 'Ahmed Al-Rashidi',
    actorRole: 'admin',
    action: 'ASSIGN_ROLE',
    entity: 'User',
    entityId: 'usr-0034',
    description: 'Assigned role to new user Khalid Ibrahim',
    before: { role: null },
    after: { role: 'procurement_user', user_email: 'khalid.ibrahim@ft-ops.local' },
    ipAddress: '10.0.1.5',
  },
  {
    id: 'aud-007',
    timestamp: '2025-01-14T15:22:19Z',
    actor: 'Layla Nasser',
    actorRole: 'qc_user',
    action: 'REJECT',
    entity: 'MaterialQC',
    entityId: 'QCI-2025-0007',
    description: 'Rejected incoming material batch — failed tensile test',
    before: { qc_status: 'under_review' },
    after: { qc_status: 'rejected', rejection_reason: 'Failed tensile strength test', quarantine: true },
    ipAddress: '10.0.1.31',
  },
  {
    id: 'aud-008',
    timestamp: '2025-01-14T14:05:37Z',
    actor: 'Mohammed Bin Saud',
    actorRole: 'operations_manager',
    action: 'CREATE',
    entity: 'PartNumber',
    entityId: 'PN-2025-0022',
    description: 'Created Part Number for Dubai AFS follow-up',
    after: { status: 'draft', destination: 'Dubai AFS', vehicle_chassis: 'CHS-2025-14' },
    ipAddress: '10.0.1.8',
  },
];

const ACTION_COLORS: Record<AuditAction, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-gray-100 text-gray-600',
  LOGOUT: 'bg-gray-100 text-gray-600',
  APPROVE: 'bg-brand-100 text-brand-700',
  REJECT: 'bg-orange-100 text-orange-700',
  ASSIGN_ROLE: 'bg-purple-100 text-purple-700',
};

function DiffViewer({ before, after }: { before?: Record<string, unknown>; after?: Record<string, unknown> }) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return (
    <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden text-xs font-mono">
      <div className="grid grid-cols-2 divide-x divide-gray-200">
        <div className="p-3">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Before</div>
          {before ? (
            [...keys].map((k) =>
              before[k] !== undefined ? (
                <div key={k} className="text-red-700 leading-relaxed">
                  <span className="text-gray-400">{k}: </span>
                  {String(before[k])}
                </div>
              ) : null,
            )
          ) : (
            <span className="text-gray-400 italic">—</span>
          )}
        </div>
        <div className="p-3">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">After</div>
          {after ? (
            [...keys].map((k) =>
              after[k] !== undefined ? (
                <div key={k} className="text-green-700 leading-relaxed">
                  <span className="text-gray-400">{k}: </span>
                  {String(after[k])}
                </div>
              ) : null,
            )
          ) : (
            <span className="text-gray-400 italic">—</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = entry.before !== undefined || entry.after !== undefined;

  const date = new Date(entry.timestamp);
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className={cn('border-b border-gray-100 last:border-0', expanded && 'bg-gray-50')}>
      <div
        className={cn('flex items-start gap-3 px-4 py-3', hasDiff && 'cursor-pointer hover:bg-gray-50')}
        onClick={() => hasDiff && setExpanded((v) => !v)}
      >
        {/* Expand toggle */}
        <div className="w-4 shrink-0 mt-0.5">
          {hasDiff ? (
            expanded ? (
              <ChevronDown size={14} className="text-gray-400" />
            ) : (
              <ChevronRight size={14} className="text-gray-400" />
            )
          ) : null}
        </div>

        {/* Timestamp */}
        <div className="w-36 shrink-0">
          <div className="text-xs font-medium text-gray-800">{timeStr}</div>
          <div className="text-[10px] text-gray-400">{dateStr}</div>
        </div>

        {/* Action badge */}
        <div className="w-28 shrink-0">
          <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold', ACTION_COLORS[entry.action])}>
            {entry.action}
          </span>
        </div>

        {/* Actor */}
        <div className="w-44 shrink-0">
          <div className="text-xs font-medium text-gray-800 truncate">{entry.actor}</div>
          <div className="text-[10px] text-gray-400">{entry.actorRole}</div>
        </div>

        {/* Entity */}
        <div className="w-40 shrink-0">
          <div className="text-xs text-gray-600">{entry.entity}</div>
          <div className="text-[10px] text-brand-600 font-mono">{entry.entityId}</div>
        </div>

        {/* Description */}
        <div className="flex-1 text-xs text-gray-700">{entry.description}</div>

        {/* IP */}
        {entry.ipAddress && (
          <div className="text-[10px] text-gray-400 font-mono shrink-0">{entry.ipAddress}</div>
        )}
      </div>

      {expanded && hasDiff && (
        <div className="px-4 pb-3 ml-7">
          <DiffViewer before={entry.before} after={entry.after} />
        </div>
      )}
    </div>
  );
}

export function AuditLog() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'ALL'>('ALL');

  const actions: Array<AuditAction | 'ALL'> = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'ASSIGN_ROLE', 'LOGIN'];

  const filtered = SAMPLE_ENTRIES.filter((e) => {
    const matchesSearch =
      !search ||
      e.actor.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.entityId.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'ALL' || e.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Log"
        subtitle="Immutable record of all system actions and changes"
        icon={<ScrollText size={20} />}
      />

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search actor, description, entity ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={13} className="text-gray-400" />
          <div className="flex gap-1 flex-wrap">
            {actions.map((a) => (
              <button
                key={a}
                onClick={() => setActionFilter(a)}
                className={cn(
                  'px-2.5 py-1 rounded text-[11px] font-medium transition-colors',
                  actionFilter === a
                    ? 'bg-brand-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto text-xs text-gray-400">{filtered.length} entries</div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
          <div className="w-4" />
          <div className="w-36">Timestamp</div>
          <div className="w-28">Action</div>
          <div className="w-44">Actor</div>
          <div className="w-40">Entity</div>
          <div className="flex-1">Description</div>
          <div className="w-20">IP</div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No audit entries match the current filter.</div>
        ) : (
          filtered.map((entry) => <AuditRow key={entry.id} entry={entry} />)
        )}
      </div>

      <p className="text-[11px] text-gray-400 text-center">
        Sample data — live entries will be stored in the <code className="bg-gray-100 px-1 rounded">audit_log</code> table and are immutable once written.
      </p>
    </div>
  );
}
