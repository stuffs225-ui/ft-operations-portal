import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { MOCK_AFS_PREDELIVERY_REPORTS } from '../data/mockAfs';
import type { AfsPredeliveryReport, UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { recordAfsEvent, recordAfsAudit } from '../lib/afsAudit';

const CAN_APPROVE: UserRole[] = ['admin', 'operations_manager'];
const CAN_INSPECT: UserRole[] = ['admin', 'operations_manager', 'afs_user', 'qc_user'];

type ChecklistItem = { label: string; passed: boolean; blocking: boolean };

function buildChecklist(r: AfsPredeliveryReport): ChecklistItem[] {
  return [
    { label: 'Release Note issued', passed: r.release_note_issued, blocking: true },
    { label: 'No open missing items', passed: r.open_missing_items === 0, blocking: true },
    { label: 'No open NCRs', passed: r.open_ncrs === 0, blocking: true },
    { label: 'All checklist items passed', passed: r.checklist_items_passed >= r.checklist_items_total && r.checklist_items_total > 0, blocking: false },
    { label: 'Chassis number recorded', passed: !!r.chassis_number, blocking: false },
  ];
}

export function DubaiAfsPredeliveryReportDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, profile } = useAuth();
  const canApprove = role ? CAN_APPROVE.includes(role) : false;
  const canInspect = role ? CAN_INSPECT.includes(role) : false;

  const base = MOCK_AFS_PREDELIVERY_REPORTS.find(r => r.id === id);
  const [report, setReport] = useState<AfsPredeliveryReport | undefined>(base);
  const [devMessage, setDevMessage] = useState('');

  if (!report) {
    return (
      <div className="text-center py-16 text-gray-500">
        Pre-delivery report not found.{' '}
        <Link to="/dubai-afs/predelivery-reports" className="text-sky-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  const checklist = buildChecklist(report);
  const allBlockingPassed = checklist.filter(c => c.blocking).every(c => c.passed);

  function devUpdate(patch: Partial<AfsPredeliveryReport>, msg: string) {
    setReport(prev => prev ? { ...prev, ...patch } : prev);
    setDevMessage(msg);
    setTimeout(() => setDevMessage(''), 3000);
  }

  async function handleApproveDelivery() {
    if (!report) return;
    if (!allBlockingPassed) { alert('All blocking checklist items must be passed before approving delivery.'); return; }
    if (!isSupabaseConfigured) {
      devUpdate({ ready_for_delivery: true, delivery_approved_by: profile?.id ?? 'user', delivery_approved_at: new Date().toISOString() }, 'Dev: Delivery approved');
      return;
    }
    await recordAfsEvent(report.project_id, 'delivery_approved', `Pre-delivery approved for ${report.predelivery_report_number}`, null, profile?.id ?? null, profile?.full_name ?? null, null);
    await recordAfsAudit('delivery_approved', id!, `Delivery approved for ${report.predelivery_report_number}`, profile?.id ?? null);
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link to="/dubai-afs/predelivery-reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader title={report.predelivery_report_number} subtitle="Pre-Delivery Report" />
        <Badge variant={report.ready_for_delivery ? 'success' : 'warning'}>
          {report.ready_for_delivery ? 'Ready for Delivery' : 'Not Ready'}
        </Badge>
      </div>

      {devMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">{devMessage}</div>
      )}

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700">
          Dev Mode — actions update local state only.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Report Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Project</span><span className="font-mono text-xs">{report.project?.project_code}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{report.project?.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Vehicle Line</span><span>{report.vehicle_line?.vehicle_type ?? 'Project-wide'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Chassis No.</span><span className="font-mono text-xs">{report.chassis_number ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Report Date</span><span>{new Date(report.report_date).toLocaleDateString('en-GB')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Checklist</span><span>{report.checklist_items_passed}/{report.checklist_items_total} passed</span></div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Readiness Checklist</h3>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm ${item.passed ? 'text-green-700' : item.blocking ? 'text-red-700 font-medium' : 'text-gray-500'}`}>
                {item.passed
                  ? <CheckCircle size={14} className="text-green-500 shrink-0" />
                  : <XCircle size={14} className={item.blocking ? 'text-red-500 shrink-0' : 'text-gray-400 shrink-0'} />
                }
                {item.label}
                {!item.passed && item.blocking && (
                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Blocking</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {report.remarks && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Remarks</h3>
          <p className="text-sm text-gray-700">{report.remarks}</p>
        </Card>
      )}

      {!report.ready_for_delivery && allBlockingPassed && canApprove && (
        <Card className="p-5 bg-green-50 border-green-200">
          <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
            <CheckCircle size={15} /> Approve for Delivery
          </h3>
          <p className="text-xs text-green-700 mb-3">All blocking readiness checks are passed. You can now approve this vehicle for delivery.</p>
          <Button variant="primary" size="sm" onClick={handleApproveDelivery}>
            <CheckCircle size={14} className="mr-1" /> Approve Delivery
          </Button>
        </Card>
      )}

      {!allBlockingPassed && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-xs text-amber-700 flex items-center gap-2">
          <AlertTriangle size={14} /> Delivery cannot be approved until all blocking checklist items are resolved.
        </div>
      )}

      {report.ready_for_delivery && (
        <Card className="p-5 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
            <CheckCircle size={15} /> Vehicle Approved for Delivery
          </div>
          {report.delivery_approved_at && (
            <p className="text-xs text-green-600 mt-1">Approved {new Date(report.delivery_approved_at).toLocaleDateString('en-GB')}</p>
          )}
        </Card>
      )}

      {canInspect && !report.inspected_at && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Inspection Documents</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
            Vehicle inspection document upload requires Supabase storage configuration.
          </div>
        </Card>
      )}
    </div>
  );
}
