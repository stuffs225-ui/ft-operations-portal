import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Search, Star, ShieldCheck } from 'lucide-react';
import { PageLoader } from '../components/ui/PageLoader';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/status/status-badge';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusTabsWithCounts } from '../components/procurement/ProcurementUI';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MOCK_SUPPLIERS } from '@/data/mockProcurement';
import type { ApprovedSupplier } from '@/types';

type ProcurementStatusFilter =
  | 'all' | 'draft' | 'pending_review' | 'approved' | 'approved_with_conditions'
  | 'suspended' | 'blacklisted' | 'inactive';

const STATUS_TABS: { key: ProcurementStatusFilter; label: string }[] = [
  { key: 'all',                    label: 'All' },
  { key: 'draft',                  label: 'Draft' },
  { key: 'pending_review',         label: 'Pending Review' },
  { key: 'approved',               label: 'Approved' },
  { key: 'approved_with_conditions', label: 'Approved w/ Conditions' },
  { key: 'suspended',              label: 'Suspended' },
  { key: 'blacklisted',            label: 'Blacklisted' },
  { key: 'inactive',               label: 'Inactive' },
];

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-xs text-gray-400">Not rated</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-200'}
        />
      ))}
    </div>
  );
}

export function ProcurementSuppliers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Deep-link support: dashboard KPI cards link here with ?status=<key>
  const urlStatus = searchParams.get('status');
  const initialStatus: ProcurementStatusFilter =
    urlStatus && STATUS_TABS.some((t) => t.key === urlStatus)
      ? (urlStatus as ProcurementStatusFilter)
      : 'all';

  const [suppliers, setSuppliers] = useState<ApprovedSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<ProcurementStatusFilter>(initialStatus);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setSuppliers(MOCK_SUPPLIERS);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('approved_suppliers')
        .select('*')
        .order('supplier_name');
      if (error) console.error(error);
      setSuppliers((data as unknown as ApprovedSupplier[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = suppliers.filter((s) => {
    if (activeStatus !== 'all' && s.procurement_status !== activeStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.supplier_name.toLowerCase().includes(q) ||
        (s.supplier_category ?? '').toLowerCase().includes(q) ||
        (s.contact_person ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Tab counts derived from already-loaded suppliers (no new query).
  const statusCounts: Record<string, number> = { all: suppliers.length };
  for (const tab of STATUS_TABS) {
    if (tab.key === 'all') continue;
    statusCounts[tab.key] = suppliers.filter((s) => s.procurement_status === tab.key).length;
  }

  return (
    <div>
      <PageHeader
        title="Approved Suppliers"
        subtitle="Supplier register with procurement and QC status."
        breadcrumb={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'Approved Suppliers' },
        ]}
        className="mb-4"
      />

      {/* Approved-register governance rule */}
      <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 text-xs text-gray-600">
        <ShieldCheck size={14} className="shrink-0 mt-0.5 text-gray-400" />
        <span>
          <span className="font-semibold text-gray-700">Approved-register rule: </span>
          a supplier must be on the approved register (Procurement status <span className="font-medium">Approved</span> or
          <span className="font-medium"> Approved w/ Conditions</span>) before a PO can be issued to them.
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search supplier name, category, contact person…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        />
      </div>

      {/* Status filter tabs with counts */}
      <StatusTabsWithCounts
        className="mb-5"
        tabs={STATUS_TABS}
        active={activeStatus}
        counts={statusCounts}
        onSelect={setActiveStatus}
      />

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-500 mb-3">
          {filtered.length} {filtered.length === 1 ? 'supplier' : 'suppliers'}
        </p>
      )}

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title={search ? 'No suppliers found' : activeStatus === 'all' ? 'No suppliers registered' : 'No suppliers match this status'}
          description={
            search
              ? 'Try adjusting your search terms.'
              : activeStatus === 'all'
              ? 'Suppliers must be added to the register and approved before issuing a PO. Contact your procurement manager.'
              : 'No suppliers currently have this status.'
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Supplier Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Procurement Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">QC Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Quality</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Special</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('a')) return;
                      navigate(`/procurement/suppliers/${supplier.id}`);
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{supplier.supplier_name}</td>
                    <td className="px-4 py-3 text-gray-700">{supplier.supplier_category ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{supplier.contact_person ?? '—'}</div>
                      {supplier.email && (
                        <div className="text-xs text-gray-400">{supplier.email}</div>
                      )}
                      {supplier.phone && (
                        <div className="text-xs text-gray-400">{supplier.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={supplier.procurement_status} /></td>
                    <td className="px-4 py-3"><StatusBadge status={supplier.qc_status} /></td>
                    <td className="px-4 py-3"><StarRating rating={supplier.quality_rating} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {supplier.approved_for_medical_items && (
                          <Badge variant="info">Medical</Badge>
                        )}
                        {supplier.approved_for_critical_items && (
                          <Badge variant="warning">Critical</Badge>
                        )}
                        {!supplier.approved_for_medical_items && !supplier.approved_for_critical_items && (
                          <span className="text-xs text-gray-400">Standard</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/procurement/suppliers/${supplier.id}`}
                        className="text-xs font-medium text-brand-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
