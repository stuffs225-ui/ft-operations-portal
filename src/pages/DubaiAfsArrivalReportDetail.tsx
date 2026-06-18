import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_AFS_ARRIVAL_REPORTS, MOCK_AFS_MISSING_ITEMS } from '../data/mockAfs';
import { recordAfsAudit } from '../lib/afsAudit';
import type { AfsArrivalReport, AfsMissingItem, UserRole } from '../types';

const CAN_MANAGE: UserRole[] = ['admin', 'operations_manager', 'afs_user'];

function missingVariant(s: string): 'neutral' | 'warning' | 'success' | 'critical' | 'info' | 'default' {
  if (s === 'open') return 'critical';
  if (s === 'requested') return 'warning';
  if (s === 'received' || s === 'waived') return 'success';
  return 'neutral';
}

function severityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'warning';
  if (s === 'medium') return 'info';
  return 'neutral';
}

export function DubaiAfsArrivalReportDetail() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const canManage = role ? CAN_MANAGE.includes(role) : false;

  const [report, setReport] = useState<AfsArrivalReport | undefined>(undefined);
  const [missingItems, setMissingItems] = useState<AfsMissingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [devMessage, setDevMessage] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newQtyExpected, setNewQtyExpected] = useState(1);
  const [newSeverity, setNewSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        setReport(MOCK_AFS_ARRIVAL_REPORTS.find(r => r.id === id));
        setMissingItems(MOCK_AFS_MISSING_ITEMS.filter(i => i.arrival_report_id === id));
        setLoading(false);
        return;
      }
      const [repRes, miRes] = await Promise.all([
        supabase
          .from('afs_arrival_reports')
          .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description)')
          .eq('id', id!)
          .single(),
        supabase
          .from('afs_missing_items')
          .select('*')
          .eq('arrival_report_id', id!)
          .order('created_at', { ascending: false }),
      ]);
      setReport((repRes.data as unknown as AfsArrivalReport) ?? undefined);
      setMissingItems((miRes.data as unknown as AfsMissingItem[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <PageLoader />;

  if (!report) {
    return (
      <div className="text-center py-16 text-gray-500">
        Arrival report not found.{' '}
        <Link to="/dubai-afs/arrival-reports" className="text-sky-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  async function addMissingItem() {
    if (!newItemName.trim()) return;
    setSaveError(null);

    if (!isSupabaseConfigured || !supabase) {
      const item: AfsMissingItem = {
        id: `ami-new-${Date.now()}`,
        arrival_report_id: id!,
        project_id: report!.project_id,
        project_vehicle_line_id: report!.project_vehicle_line_id,
        item_name: newItemName,
        item_code: newItemCode || null,
        quantity_expected: newQtyExpected,
        quantity_received: 0,
        missing_item_status: 'open',
        severity: newSeverity,
        store_request_id: null,
        notes: null,
        resolved_at: null,
        resolved_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMissingItems(prev => [item, ...prev]);
      setNewItemName(''); setNewItemCode(''); setNewQtyExpected(1); setShowForm(false);
      setDevMessage('Dev: Missing item added (not persisted)');
      setTimeout(() => setDevMessage(''), 2000);
      return;
    }

    const { data: inserted, error } = await supabase
      .from('afs_missing_items')
      .insert({
        arrival_report_id: id!,
        project_id: report!.project_id,
        item_name: newItemName,
        item_code: newItemCode || null,
        quantity_expected: newQtyExpected,
        severity: newSeverity,
      })
      .select()
      .single();

    if (error) { setSaveError(error.message); return; }

    setMissingItems(prev => [(inserted as unknown as AfsMissingItem), ...prev]);
    void recordAfsAudit('missing_item_added', id!, `Missing item added: ${newItemName}`, null);
    setNewItemName(''); setNewItemCode(''); setNewQtyExpected(1); setShowForm(false);
  }

  const openItems = missingItems.filter(i => i.missing_item_status === 'open' || i.missing_item_status === 'requested');

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link to="/dubai-afs/arrival-reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader
          title={report.arrival_report_number}
          subtitle="AFS Arrival Report"
          breadcrumb={[{ label: 'Dubai / AFS', href: '/dubai-afs' }, { label: 'Arrival Reports', href: '/dubai-afs/arrival-reports' }, { label: report.arrival_report_number }]}
        />
        <Badge variant={report.arrival_status === 'arrived' ? 'success' : report.arrival_status === 'delayed' ? 'critical' : 'neutral'}>
          {report.arrival_status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {openItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle size={16} /> {openItems.length} open missing item(s) — pre-delivery readiness is blocked.
        </div>
      )}

      {devMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">{devMessage}</div>
      )}

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{saveError}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Arrival Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Project</span><span className="font-mono text-xs">{report.project?.project_code}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{report.project?.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Vehicle Line</span><span>{report.vehicle_line?.vehicle_type ?? 'Project-wide'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Arrival Date</span><span>{new Date(report.arrival_date).toLocaleDateString('en-GB')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Received By</span><span>{report.received_by_profile?.full_name ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Quantity</span><span>{report.received_quantity} / {report.expected_quantity} units</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Storage</span><span>{report.storage_location ?? '—'}</span></div>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Condition on Arrival</h3>
          <p className="text-sm text-gray-700">{report.condition_on_arrival ?? 'No condition notes recorded.'}</p>
          {report.remarks && <p className="text-xs text-gray-500 mt-3">{report.remarks}</p>}
        </Card>
      </div>

      <Card>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Package size={15} className="text-orange-500" /> Missing Items ({missingItems.length})
          </h3>
          {canManage && (
            <Button variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>+ Add</Button>
          )}
        </div>

        {showForm && (
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Item Name <span className="text-red-500">*</span></label>
                <input value={newItemName} onChange={e => setNewItemName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Item Code</label>
                <input value={newItemCode} onChange={e => setNewItemCode(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Qty Expected</label>
                <input type="number" min={1} value={newQtyExpected} onChange={e => setNewQtyExpected(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
                <select value={newSeverity} onChange={e => setNewSeverity(e.target.value as typeof newSeverity)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                  {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={addMissingItem}>Add Item</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {missingItems.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">No missing items.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {missingItems.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{item.item_name}</span>
                    {item.item_code && <span className="text-xs text-gray-400 font-mono">{item.item_code}</span>}
                    <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                    <Badge variant={missingVariant(item.missing_item_status)}>{item.missing_item_status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Qty: {item.quantity_received}/{item.quantity_expected}
                    {item.notes && ` — ${item.notes}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Link to="/dubai-afs/predelivery-reports">
          <Button variant="secondary" size="sm">View Pre-Delivery Reports →</Button>
        </Link>
      </div>
    </div>
  );
}
