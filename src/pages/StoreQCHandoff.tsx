import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { ReadOnlyBanner } from '../components/store/StoreUI';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// QC handoff: store_user perspective — shows material_qc_inspections for items
// the store has handed off to QC. Read-only; QC actions happen in the QC module.

type HandoffTab = 'pending' | 'accepted' | 'rejected';

interface QcHandoffItem {
  id: string;
  inspection_number: string;
  inspection_status: string;
  inspection_result: string;
  store_receipt_item_id: string;
  project_id: string | null;
  created_at: string;
  item?: { item_name: string; item_code: string | null } | null;
  project?: { project_code: string } | null;
}

// material_inspection_result_enum (live): pending | accepted | accepted_with_comments
// | rejected | pending_supplier_clarification | pending_rework.
const RESULT_VARIANT: Record<string, 'neutral' | 'warning' | 'success' | 'critical'> = {
  pending: 'warning',
  accepted: 'success',
  accepted_with_comments: 'success',
  rejected: 'critical',
  pending_supplier_clarification: 'warning',
  pending_rework: 'warning',
};

// inspection_status_enum (live): pending | in_progress | completed | cancelled.
// The previous map keyed 'scheduled'/'on_hold' (values that don't exist in the
// enum) and was MISSING 'pending' — the most common live status fell through to
// the neutral fallback.
const STATUS_VARIANT: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'critical'> = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'neutral',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Mock data for non-Supabase mode
const MOCK_QC_HANDOFF: QcHandoffItem[] = [
  {
    id: 'qci-001',
    inspection_number: 'QCI-2025-0001',
    inspection_status: 'completed',
    inspection_result: 'accepted',
    store_receipt_item_id: 'rcpi-005',
    project_id: 'proj-005',
    created_at: '2025-03-20T10:00:00Z',
    item: { item_name: 'Cardiac Science Powerheart G5 AED', item_code: 'DEFIB-AED-PRO' },
    project: { project_code: 'FT-2025-0005' },
  },
  {
    id: 'qci-002',
    inspection_number: 'QCI-2025-0002',
    inspection_status: 'in_progress',
    inspection_result: 'pending',
    store_receipt_item_id: 'rcpi-003',
    project_id: 'proj-005',
    created_at: '2025-03-21T09:30:00Z',
    item: { item_name: 'Fire Hose 50mm x 20m', item_code: 'HOSE-50MM-20M' },
    project: { project_code: 'FT-2025-0005' },
  },
  {
    id: 'qci-003',
    inspection_number: 'QCI-2025-0003',
    inspection_status: 'completed',
    inspection_result: 'rejected',
    store_receipt_item_id: 'rcpi-008',
    project_id: 'proj-006',
    created_at: '2025-04-08T14:00:00Z',
    item: { item_name: 'Centrifugal Fire Pump 1500 LPM', item_code: 'PUMP-CENTRIFUGAL-1500' },
    project: { project_code: 'FT-2025-0006' },
  },
];

export function StoreQCHandoff() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('status') as HandoffTab | null) ?? 'pending';

  const [tab, setTab] = useState<HandoffTab>(
    ['pending', 'accepted', 'rejected'].includes(initialTab) ? initialTab : 'pending'
  );
  const [items, setItems] = useState<QcHandoffItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
          .from('material_qc_inspections')
          .select('*, item:store_receipt_items(item_name, item_code), project:projects(project_code)')
          .order('created_at', { ascending: false })
          .limit(300);
        if (data) setItems(data as unknown as QcHandoffItem[]);
      } else {
        setItems(MOCK_QC_HANDOFF);
      }
      setLoading(false);
    })();
  }, []);

  function handleTabChange(t: HandoffTab) {
    setTab(t);
    setSearchParams(t === 'pending' ? {} : { status: t });
  }

  // Terminal QC outcomes are accepted / accepted_with_comments (pass) and rejected
  // (fail). Everything else — 'pending', an inspection still scheduled/in-progress,
  // or awaiting supplier clarification / rework — is still open, so it lives under
  // the Pending tab.
  const isAccepted = (r: string) => r === 'accepted' || r === 'accepted_with_comments';
  const isRejected = (r: string) => r === 'rejected';
  const pending = items.filter(
    i => !isAccepted(i.inspection_result) && !isRejected(i.inspection_result)
  );
  const accepted = items.filter(i => isAccepted(i.inspection_result));
  const rejected = items.filter(i => isRejected(i.inspection_result));

  const tabItems = tab === 'pending' ? pending : tab === 'accepted' ? accepted : rejected;

  const TABS: { id: HandoffTab; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending Material QC', count: pending.length },
    { id: 'accepted', label: 'QC Accepted', count: accepted.length },
    { id: 'rejected', label: 'QC Rejected / NCR', count: rejected.length },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="QC Handoff"
        subtitle="Material QC status from the store perspective — read-only"
        breadcrumb={[{ label: 'Store', href: '/store' }, { label: 'QC Handoff' }]}
        actions={<DataSourceBadge variant="auto" />}
      />

      <ReadOnlyBanner>
        <span className="font-semibold text-gray-700">Read-only view. </span>
        QC owns pass / fail / NCR decisions — Store can view handoff status here but cannot change QC
        outcomes. Materials requiring QC must not be issued before QC acceptance.{' '}
        <Link to="/material-qc" className="underline font-medium text-gray-700 hover:text-gray-900">
          Go to Material QC
        </Link>{' '}
        if you have QC access.
      </ReadOnlyBanner>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === t.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 text-[10px] rounded-full px-1.5 py-0.5 ${
                t.id === 'rejected' && t.count > 0
                  ? 'bg-red-100 text-red-700'
                  : t.id === 'pending' && t.count > 0
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading QC records…</div>
        ) : tabItems.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={tab === 'rejected' ? <ClipboardCheck size={24} className="text-green-400" /> : <Package size={24} className="text-gray-400" />}
              title={
                tab === 'pending' ? 'No materials pending QC'
                : tab === 'accepted' ? 'No QC accepted items'
                : 'No QC rejections — all clear'
              }
              description={
                tab === 'pending' ? 'All received materials have been inspected.'
                : tab === 'accepted' ? 'No materials have been accepted by QC yet.'
                : 'No materials have failed QC inspection.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Inspection #</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Item</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Project</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Result</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tabItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono font-medium text-gray-800">
                        {item.inspection_number}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-gray-800">
                        {(item.item as any)?.item_name ?? '—'}
                      </p>
                      {(item.item as any)?.item_code && (
                        <p className="text-xs text-gray-400 font-mono">
                          {(item.item as any).item_code}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                      {(item.project as any)?.project_code ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={RESULT_VARIANT[item.inspection_result] ?? 'neutral'}>
                        {item.inspection_result.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant={STATUS_VARIANT[item.inspection_status] ?? 'neutral'}>
                        {item.inspection_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell">
                      {formatDate(item.created_at)}
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
