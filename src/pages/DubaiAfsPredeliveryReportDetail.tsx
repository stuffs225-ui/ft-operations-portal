import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AfsPredeliveryChecklist } from '../components/features/AfsPredeliveryChecklist';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { PageLoader } from '../components/ui/PageLoader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_AFS_PREDELIVERY_REPORTS, MOCK_AFS_CONDITION_REPORTS } from '../data/mockAfs';
import { recordAfsEvent, recordAfsAudit } from '../lib/afsAudit';
import type { AfsPredeliveryReport, AfsConditionReport, UserRole } from '../types';

const CAN_APPROVE: UserRole[] = ['admin', 'operations_manager'];
const CAN_INSPECT: UserRole[] = ['admin', 'operations_manager', 'afs_user', 'qc_user'];

type ChecklistItem = { label: string; passed: boolean; blocking: boolean };

function buildChecklist(r: AfsPredeliveryReport, conditionReports: AfsConditionReport[]): ChecklistItem[] {
  const hasMajorCondition = conditionReports.some(
    cr => cr.project_id === r.project_id
      && (cr.project_vehicle_line_id === null || cr.project_vehicle_line_id === r.project_vehicle_line_id)
      && (cr.overall_condition === 'major_damage' || cr.overall_condition === 'requires_repair')
      && cr.report_status !== 'resolved' && cr.report_status !== 'closed' && cr.report_status !== 'cancelled'
  );
  return [
    { label: 'Release Note issued', passed: r.release_note_issued, blocking: true },
    { label: 'No open missing items', passed: r.open_missing_items === 0, blocking: true },
    { label: 'No open NCRs', passed: r.open_ncrs === 0, blocking: true },
    { label: 'No major open condition reports', passed: !hasMajorCondition, blocking: true },
    { label: 'All checklist items passed', passed: r.checklist_items_passed >= r.checklist_items_total && r.checklist_items_total > 0, blocking: false },
    { label: 'Chassis number recorded', passed: !!r.chassis_number, blocking: false },
  ];
}

export function DubaiAfsPredeliveryReportDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, profile } = useAuth();
  const canApprove = role ? CAN_APPROVE.includes(role) : false;
  const canInspect = role ? CAN_INSPECT.includes(role) : false;

  const [report, setReport] = useState<AfsPredeliveryReport | undefined>(undefined);
  const [conditionReports, setConditionReports] = useState<AfsConditionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [devMessage, setDevMessage] = useState('');

  useEffect(() => {
    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        const base = MOCK_AFS_PREDELIVERY_REPORTS.find(r => r.id === id);
        setReport(base);
        setConditionReports(MOCK_AFS_CONDITION_REPORTS);
        setLoading(false);
        return;
      }
      const pdrRes = await supabase
        .from('afs_predelivery_reports')
        .select('*, project:projects(project_code, customer_name), vehicle_line:project_vehicle_lines(vehicle_type, description)')
        .eq('id', id!)
        .single();
      const pdr = pdrRes.data as unknown as AfsPredeliveryReport | null;
      setReport(pdr ?? undefined);

      if (pdr?.project_id) {
        const crRes = await supabase
          .from('afs_condition_reports')
          .select('*')
          .eq('project_id', pdr.project_id);
        setConditionReports((crRes.data as unknown as AfsConditionReport[]) ?? []);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <PageLoader />;

  if (!report) {
    return (
      <div className="text-center py-16 text-gray-500">
        Pre-delivery report not found.{' '}
        <Link to="/dubai-afs/predelivery-reports" className="text-sky-600 hover:underline">Back to list</Link>
      </div>
    );
  }

  const checklist = buildChecklist(report, conditionReports);
  const allBlockingPassed = checklist.filter(c => c.blocking).every(c => c.passed);

  async function handleApproveDelivery() {
    if (!report) return;
    if (!allBlockingPassed) { setSaveError('All blocking checklist items must be passed before approving delivery.'); return; }
    setSaveError(null);

    if (!isSupabaseConfigured || !supabase) {
      setReport(prev => prev ? { ...prev, ready_for_delivery: true, delivery_approved_by: profile?.id ?? 'user', delivery_approved_at: new Date().toISOString() } : prev);
      setDevMessage('Dev: Delivery approved');
      setTimeout(() => setDevMessage(''), 3000);
      return;
    }

    const { error } = await supabase
      .from('afs_predelivery_reports')
      .update({
        ready_for_delivery: true,
        delivery_approved_by: profile?.id ?? null,
        delivery_approved_at: new Date().toISOString(),
      })
      .eq('id', id!);

    if (error) { setSaveError(error.message); return; }

    void recordAfsEvent(report.project_id, 'delivery_approved', `Pre-delivery approved for ${report.predelivery_report_number}`, null, profile?.id ?? null, profile?.full_name ?? null, null);
    void recordAfsAudit('delivery_approved', id!, `Delivery approved for ${report.predelivery_report_number}`, profile?.id ?? null);

    setReport(prev => prev ? { ...prev, ready_for_delivery: true, delivery_approved_by: profile?.id ?? null, delivery_approved_at: new Date().toISOString() } : prev);
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link to="/dubai-afs/predelivery-reports" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <PageHeader
          title={report.predelivery_report_number}
          subtitle="Pre-Delivery Report"
          breadcrumb={[{ label: 'Dubai / AFS', href: '/dubai-afs' }, { label: 'Pre-Delivery Reports', href: '/dubai-afs/predelivery-reports' }, { label: report.predelivery_report_number }]}
        />
        <Badge variant={report.ready_for_delivery ? 'success' : 'warning'}>
          {report.ready_for_delivery ? 'Ready for Delivery' : 'Not Ready'}
        </Badge>
      </div>

      {id && (
        <AfsPredeliveryChecklist
          reportId={id}
          onCountsChange={(passed, total) => setReport((r) => (r ? { ...r, checklist_items_passed: passed, checklist_items_total: total } : r))}
        />
      )}

      {devMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">{devMessage}</div>
      )}

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700">
          Dev Mode — actions update local state only.
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">{saveError}</div>
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
