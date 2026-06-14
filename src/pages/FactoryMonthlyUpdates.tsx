import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { PageLoader } from '../components/ui/PageLoader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { isSupabaseConfigured } from '../lib/supabase';
import { MOCK_FACTORY_RECORDS as MOCK_FACTORY_RECORDS_RAW } from '../data/mockFactory';
import { mockOrEmpty } from '../lib/dataMode';
const MOCK_FACTORY_RECORDS = mockOrEmpty(MOCK_FACTORY_RECORDS_RAW);
import type { FactoryRecord, FactoryProductionStatus } from '../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PROD_STATUS_MAP: Record<FactoryProductionStatus, { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'critical' | 'default' }> = {
  not_started:              { label: 'Not Started',            variant: 'neutral' },
  details_requested:        { label: 'Details Requested',      variant: 'info' },
  boq_pending:              { label: 'BOQ Pending',            variant: 'warning' },
  boq_uploaded:             { label: 'BOQ Uploaded',           variant: 'info' },
  ga_drawing_pending:       { label: 'GA Pending',             variant: 'warning' },
  ga_drawing_uploaded:      { label: 'GA Uploaded',            variant: 'info' },
  detail_drawings_pending:  { label: 'Drawings Pending',       variant: 'warning' },
  detail_drawings_uploaded: { label: 'Drawings Uploaded',      variant: 'info' },
  manhours_pending:         { label: 'Manhours Pending',       variant: 'warning' },
  manhours_added:           { label: 'Manhours Added',         variant: 'info' },
  pending_raw_materials:    { label: 'Pending Raw Materials',  variant: 'warning' },
  in_production:            { label: 'In Production',          variant: 'default' },
  monthly_update_required:  { label: 'Update Required',        variant: 'critical' },
  production_completed:     { label: 'Completed',              variant: 'success' },
  sent_to_qc:               { label: 'Sent to QC',            variant: 'success' },
  on_hold:                  { label: 'On Hold',                variant: 'neutral' },
};

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

interface UpdateFormState {
  progress: string;
  remarks: string;
}

export function FactoryMonthlyUpdates() {
  const [records, setRecords] = useState<FactoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<UpdateFormState>({ progress: '', remarks: '' });
  const [devSuccess, setDevSuccess] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const needsUpdate = MOCK_FACTORY_RECORDS.filter(
        (r) => r.monthly_update_required || r.production_status === 'monthly_update_required',
      );
      setRecords(needsUpdate);
      setLoading(false);
      return;
    }
    // Supabase placeholder
    setRecords([]);
    setLoading(false);
  }, []);

  function toggleExpand(recordId: string, currentProgress: number) {
    if (expandedId === recordId) {
      setExpandedId(null);
      setDevSuccess('');
    } else {
      setExpandedId(recordId);
      setFormState({ progress: String(currentProgress), remarks: '' });
      setDevSuccess('');
    }
  }

  function submitUpdate(record: FactoryRecord) {
    setSubmitting(true);
    if (!isSupabaseConfigured) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === record.id
            ? {
                ...r,
                progress_percentage: Number(formState.progress),
                remarks: formState.remarks || r.remarks,
                monthly_update_required: false,
              }
            : r,
        ),
      );
      setSubmitting(false);
      setDevSuccess('Dev mode — update recorded (not persisted)');
      setExpandedId(null);
      return;
    }
    // Supabase mode would go here
    setSubmitting(false);
    setExpandedId(null);
  }

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Monthly Updates"
        subtitle="Factory records requiring a monthly production status update"
        icon={<Calendar size={18} />}
        breadcrumb={[{ label: 'Factory', path: '/factory' }, { label: 'Monthly Updates' }]}
      />

      {!isSupabaseConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800">
          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
          Dev mode — using mock factory data. Changes will not be persisted.
        </div>
      )}

      {devSuccess && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
          <CheckCircle2 size={14} className="text-green-600" />
          {devSuccess}
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : records.length === 0 ? (
        <EmptyState
          icon={<Calendar size={24} />}
          title="No monthly updates required at this time"
          description="All factory records are up to date."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Project', 'Vehicle Line', 'Status', 'Progress', 'Last Updated', 'Days Since Update', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((record) => {
                  const statusInfo = PROD_STATUS_MAP[record.production_status];
                  const days = daysSince(record.last_updated_at);
                  const isExpanded = expandedId === record.id;
                  const projectCode = record.project?.project_code ?? record.project_id;
                  const lineDesc = record.vehicle_line
                    ? `${record.vehicle_line.vehicle_type}: ${record.vehicle_line.description}`
                    : record.project_vehicle_line_id ?? 'Project-level';

                  return (
                    <>
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900">
                          {projectCode}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">
                          {lineDesc}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full">
                              <div
                                className="h-1.5 bg-brand-600 rounded-full"
                                style={{ width: `${record.progress_percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{record.progress_percentage}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {formatDate(record.last_updated_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${days > 30 ? 'text-red-600' : 'text-gray-700'}`}>
                            {days} day{days !== 1 ? 's' : ''}
                            {days > 30 && <span className="ml-1 text-red-500">⚠</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant={isExpanded ? 'ghost' : 'outline'}
                            size="sm"
                            onClick={() => toggleExpand(record.id, record.progress_percentage)}
                          >
                            {isExpanded ? 'Cancel' : 'Submit Update'}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${record.id}-form`}>
                          <td colSpan={7} className="px-4 py-4 bg-gray-50 border-t border-gray-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-1 block">
                                  New Progress % (current: {record.progress_percentage}%)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={formState.progress}
                                  onChange={(e) => setFormState((s) => ({ ...s, progress: e.target.value }))}
                                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-700 mb-1 block">
                                  Remarks
                                </label>
                                <textarea
                                  rows={2}
                                  placeholder="Update notes…"
                                  value={formState.remarks}
                                  onChange={(e) => setFormState((s) => ({ ...s, remarks: e.target.value }))}
                                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                                />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              loading={submitting}
                              onClick={() => submitUpdate(record)}
                              icon={<ChevronRight size={13} />}
                            >
                              Submit Update
                            </Button>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pending Raw Materials section */}
      <Card className="p-5 mt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Pending Raw Materials</h3>
        <p className="text-sm text-gray-600 mb-3">
          View raw material requests sent to Procurement and their fulfillment status.
        </p>
        <Link to="/factory/raw-material-requests">
          <Button variant="outline" size="sm">View Raw Material Requests</Button>
        </Link>
      </Card>
    </div>
  );
}
