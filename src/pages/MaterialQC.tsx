import { Link } from 'react-router-dom';
import { ClipboardCheck, AlertTriangle, CheckCircle, XCircle, Clock, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import {
  MOCK_MATERIAL_QC_INSPECTIONS,
  MOCK_MATERIAL_NCRS,
} from '../data/mockQc';
import type { UserRole } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

const CAN_CREATE: UserRole[] = ['admin', 'operations_manager', 'qc_user'];

function resultVariant(r: string): 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'default' {
  if (r === 'accepted') return 'success';
  if (r === 'accepted_with_comments') return 'warning';
  if (r === 'rejected') return 'critical';
  if (r === 'pending_supplier_clarification') return 'warning';
  if (r === 'pending_rework') return 'info';
  return 'neutral';
}

function statusVariant(s: string): 'neutral' | 'info' | 'warning' | 'success' | 'critical' | 'default' {
  if (s === 'pending') return 'neutral';
  if (s === 'in_progress') return 'info';
  if (s === 'completed') return 'success';
  if (s === 'cancelled') return 'critical';
  return 'neutral';
}

function severityVariant(s: string): 'neutral' | 'warning' | 'critical' | 'info' | 'default' {
  if (s === 'critical') return 'critical';
  if (s === 'high') return 'warning';
  if (s === 'medium') return 'info';
  return 'neutral';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function MaterialQC() {
  const { role } = useAuth();
  const canCreate = role ? CAN_CREATE.includes(role) : false;

  const inspections = MOCK_MATERIAL_QC_INSPECTIONS;
  const ncrs = MOCK_MATERIAL_NCRS;

  const pending = inspections.filter(i => i.inspection_status === 'pending').length;
  const inProgress = inspections.filter(i => i.inspection_status === 'in_progress').length;
  const accepted = inspections.filter(i => i.inspection_result === 'accepted' || i.inspection_result === 'accepted_with_comments').length;
  const rejected = inspections.filter(i => i.inspection_result === 'rejected').length;
  const openNcrs = ncrs.filter(n => n.ncr_status !== 'closed' && n.ncr_status !== 'cancelled').length;
  const medicalPending = inspections.filter(i => i.medical_serial_number_id !== null && i.inspection_status === 'pending').length;

  const kpis = [
    { label: 'Pending Inspection', value: pending, color: 'border-l-amber-400', icon: <Clock size={16} className="text-amber-500" /> },
    { label: 'In Progress', value: inProgress, color: 'border-l-sky-400', icon: <ClipboardCheck size={16} className="text-sky-500" /> },
    { label: 'Accepted', value: accepted, color: 'border-l-green-400', icon: <CheckCircle size={16} className="text-green-500" /> },
    { label: 'Rejected', value: rejected, color: rejected > 0 ? 'border-l-red-500' : 'border-l-green-400', icon: <XCircle size={16} className="text-red-500" /> },
    { label: 'Open NCRs', value: openNcrs, color: openNcrs > 0 ? 'border-l-red-500' : 'border-l-green-400', icon: <AlertTriangle size={16} className="text-red-500" /> },
    { label: 'Medical Serials Pending', value: medicalPending, color: 'border-l-purple-400', icon: <ClipboardCheck size={16} className="text-purple-500" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material QC"
        subtitle="Inspect received materials, manage NCRs, and track serial numbers"
        action={
          canCreate ? (
            <Link to="/material-qc/inspections">
              <Button variant="primary" size="sm"><Plus size={14} className="mr-1" /> New Inspection</Button>
            </Link>
          ) : undefined
        }
      />

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700">
          Dev Mode — showing mock data. QC users do not have financial visibility.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 ${k.color}`}>
            <div className="text-gray-400 mb-2">{k.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            <div className="text-sm font-medium text-gray-700 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/material-qc/inspections"><Button variant="secondary" size="sm"><ClipboardCheck size={14} className="mr-1" /> All Inspections</Button></Link>
        <Link to="/material-qc/ncrs"><Button variant="secondary" size="sm"><AlertTriangle size={14} className="mr-1" /> NCR List</Button></Link>
      </div>

      {/* Recent inspections */}
      <Card>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Recent Inspections</h3>
          <Link to="/material-qc/inspections"><Button variant="ghost" size="sm">View All <ChevronRight size={14} /></Button></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-xs font-medium text-gray-500">Inspection #</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">Item</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500 hidden lg:table-cell">Project</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500">Result</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-xs font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inspections.slice(0, 5).map(i => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm font-mono text-sky-700">{i.inspection_number}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 hidden md:table-cell">{i.item?.item_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 hidden lg:table-cell font-mono text-xs">{i.project?.project_code ?? '—'}</td>
                  <td className="px-4 py-2.5"><Badge variant={resultVariant(i.inspection_result)}>{i.inspection_result.replace(/_/g, ' ')}</Badge></td>
                  <td className="px-4 py-2.5"><Badge variant={statusVariant(i.inspection_status)}>{i.inspection_status.replace(/_/g, ' ')}</Badge></td>
                  <td className="px-4 py-2.5">
                    <Link to={`/material-qc/inspections/${i.id}`}><Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Open NCRs */}
      <Card>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500" /> Open NCRs
          </h3>
          <Link to="/material-qc/ncrs"><Button variant="ghost" size="sm">View All <ChevronRight size={14} /></Button></Link>
        </div>
        {ncrs.filter(n => n.ncr_status !== 'closed' && n.ncr_status !== 'cancelled').length === 0 ? (
          <div className="px-5 py-6 text-sm text-gray-400 text-center">No open NCRs.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500">NCR #</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500">Severity</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">Item</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 hidden lg:table-cell">Due</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ncrs.filter(n => n.ncr_status !== 'closed' && n.ncr_status !== 'cancelled').map(n => (
                  <tr key={n.id} className={`hover:bg-gray-50 ${n.severity === 'critical' ? 'border-l-2 border-l-red-500' : ''}`}>
                    <td className="px-4 py-2.5 text-sm font-mono text-sky-700">{n.ncr_number}</td>
                    <td className="px-4 py-2.5"><Badge variant={severityVariant(n.severity)}>{n.severity}</Badge></td>
                    <td className="px-4 py-2.5 text-sm text-gray-700 hidden md:table-cell">{n.item?.item_name ?? '—'}</td>
                    <td className="px-4 py-2.5"><Badge variant="warning">{n.ncr_status.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 hidden lg:table-cell">{n.due_date ? formatDate(n.due_date) : '—'}</td>
                    <td className="px-4 py-2.5">
                      <Link to={`/material-qc/ncrs/${n.id}`}><Button variant="ghost" size="sm">View <ChevronRight size={14} /></Button></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Governance Rules</h2>
        </div>
        <div className="px-5 py-4 space-y-2">
          {[
            'Material QC starts after Store receives materials.',
            'Rejected material must create an NCR with root cause and corrective action.',
            'Open NCRs block Release Note issuance.',
            'QC users must not see purchase cost values.',
            'Medical items must be received with serial number tracking.',
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <ChevronRight size={14} className="text-sky-400 mt-0.5 shrink-0" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
