import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Factory as FactoryIcon, GitBranch, Wrench, FileText, Package,
  CalendarClock, CheckCircle2, AlertTriangle, AlertCircle,
  ChevronRight, ArrowUpRight,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  MOCK_FACTORY_RECORDS as MOCK_FACTORY_RECORDS_RAW,
  MOCK_FACTORY_REQUIREMENTS as MOCK_FACTORY_REQUIREMENTS_RAW,
  MOCK_RAW_MATERIAL_REQUESTS as MOCK_RAW_MATERIAL_REQUESTS_RAW,
} from '../data/mockFactory';
import { fetchProjectsMissingReference, fetchProjectIdsWithActiveReference } from '../lib/executionGate';
import { mockOrEmpty } from '../lib/dataMode';

const MOCK_FACTORY_RECORDS = mockOrEmpty(MOCK_FACTORY_RECORDS_RAW);
const MOCK_FACTORY_REQUIREMENTS = mockOrEmpty(MOCK_FACTORY_REQUIREMENTS_RAW);
const MOCK_RAW_MATERIAL_REQUESTS = mockOrEmpty(MOCK_RAW_MATERIAL_REQUESTS_RAW);

interface FactoryKpis {
  missingWo: number;
  readyToStart: number;
  inProduction: number;
  waitingMaterials: number;
  updateDue: number;
  updateOverdue: number;
  readyForQc: number;
  blocked: number;
}

const EMPTY_KPIS: FactoryKpis = {
  missingWo: 0, readyToStart: 0, inProduction: 0, waitingMaterials: 0,
  updateDue: 0, updateOverdue: 0, readyForQc: 0, blocked: 0,
};

export function Factory() {
  const { role } = useAuth();
  const [kpis, setKpis] = useState<FactoryKpis>(EMPTY_KPIS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!isSupabaseConfigured || !supabase) {
        // "Missing WO" = Saudi approved projects with no active WO in the
        // execution-reference register (matches the WO/PN Gate). A WO counts as
        // present the moment it is created — no separate confirmation is needed.
        const missingWo = (await fetchProjectsMissingReference('wo')).length;
        // "Ready to Start" = approved Saudi projects that HAVE an active WO but
        // whose production has not begun yet. WO presence comes from the
        // execution-reference register (same source as the gate), not from
        // factory_records — a project with a valid WO is ready even before any
        // production record exists. A project counts as "started" once it has a
        // record beyond not_started.
        const woProjectIds = await fetchProjectIdsWithActiveReference('wo');
        const startedProjectIds = new Set(
          MOCK_FACTORY_RECORDS.filter((r) => r.production_status !== 'not_started').map((r) => r.project_id),
        );
        const readyToStart = [...woProjectIds].filter((id) => !startedProjectIds.has(id)).length;
        const inProduction = MOCK_FACTORY_RECORDS.filter((r) => r.production_status === 'in_production').length;
        const waitingMaterials = MOCK_FACTORY_RECORDS.filter((r) => r.production_status === 'pending_raw_materials').length;
        const updateDue = MOCK_FACTORY_RECORDS.filter((r) => r.monthly_update_required).length;
        const updateOverdue = MOCK_FACTORY_RECORDS.filter(
          (r) => r.monthly_update_required && (Date.now() - new Date(r.last_updated_at).getTime()) > 30 * 86400000,
        ).length;
        const readyForQc = MOCK_FACTORY_RECORDS.filter((r) => r.production_status === 'production_completed').length;
        const blocked = MOCK_FACTORY_RECORDS.filter((r) => r.production_status === 'on_hold').length;
        const pendingReqs = MOCK_FACTORY_REQUIREMENTS.filter((r) => r.status === 'pending').length;
        const openRmrs = MOCK_RAW_MATERIAL_REQUESTS.filter(
          (r) => !['fulfilled', 'rejected', 'cancelled'].includes(r.status),
        ).length;
        setKpis({ missingWo, readyToStart, inProduction, waitingMaterials, updateDue, updateOverdue, readyForQc, blocked });
        void pendingReqs; void openRmrs;
        setLoading(false);
        return;
      }

      const [missingWoProjects, woProjectIds, recordsRes, monthlyRes, rmrRes] = await Promise.all([
        // "Missing WO" comes from the execution-reference register (same source as
        // the WO/PN Gate). A created WO already counts as present — no confirmation
        // step. This replaces the old factory_records-based count, which reported
        // projects with a valid WO as "missing" until a production record existed.
        fetchProjectsMissingReference('wo'),
        // "Ready to Start" is the positive counterpart: approved Saudi projects
        // that already have an active WO. Deriving this from the register (not
        // factory_records) fixes the contradiction where a project with a
        // confirmed WO showed 0 "ready" until a production record existed.
        fetchProjectIdsWithActiveReference('wo'),
        supabase.from('factory_records').select('project_id, production_status, monthly_update_required, last_updated_at, wo_reference_id'),
        supabase.from('factory_records').select('*', { count: 'exact', head: true }).eq('monthly_update_required', true),
        supabase.from('production_raw_material_requests').select('*', { count: 'exact', head: true }).not('status', 'in', '("fulfilled","rejected","cancelled")'),
      ]);

      const allRecords = (recordsRes.data ?? []) as { project_id: string; production_status: string; monthly_update_required: boolean; last_updated_at: string; wo_reference_id: string | null }[];
      void rmrRes;

      // A project has "started" once it has any record beyond not_started; the
      // rest of its WO-cleared peers are still ready to start.
      const startedProjectIds = new Set(
        allRecords.filter((r) => r.production_status !== 'not_started').map((r) => r.project_id),
      );

      setKpis({
        missingWo: missingWoProjects.length,
        readyToStart: [...woProjectIds].filter((id) => !startedProjectIds.has(id)).length,
        inProduction: allRecords.filter((r) => r.production_status === 'in_production').length,
        waitingMaterials: allRecords.filter((r) => r.production_status === 'pending_raw_materials').length,
        updateDue: monthlyRes.count ?? 0,
        updateOverdue: allRecords.filter(
          (r) => r.monthly_update_required && (Date.now() - new Date(r.last_updated_at).getTime()) > 30 * 86400000,
        ).length,
        readyForQc: allRecords.filter((r) => r.production_status === 'production_completed').length,
        blocked: allRecords.filter((r) => r.production_status === 'on_hold').length,
      });
      setLoading(false);
    })();
  }, []);

  const kpiCards = [
    { label: 'Missing WO', value: kpis.missingWo, link: '/wo-pn-gate', accent: kpis.missingWo > 0 ? 'border-l-red-500' : 'border-l-gray-200', valueClass: kpis.missingWo > 0 ? 'text-red-600' : 'text-gray-900' },
    { label: 'Ready to Start', value: kpis.readyToStart, link: '/factory/projects', accent: 'border-l-orange-400', valueClass: 'text-orange-700' },
    { label: 'In Production', value: kpis.inProduction, link: '/factory/projects', accent: 'border-l-green-500', valueClass: 'text-green-700' },
    { label: 'Waiting Materials', value: kpis.waitingMaterials, link: '/factory/raw-material-requests', accent: kpis.waitingMaterials > 0 ? 'border-l-amber-500' : 'border-l-gray-200', valueClass: kpis.waitingMaterials > 0 ? 'text-amber-700' : 'text-gray-900' },
    { label: 'Update Due', value: kpis.updateDue, link: '/factory/monthly-updates', accent: kpis.updateDue > 0 ? 'border-l-orange-500' : 'border-l-gray-200', valueClass: kpis.updateDue > 0 ? 'text-orange-700' : 'text-gray-900' },
    { label: 'Update Overdue', value: kpis.updateOverdue, link: '/factory/monthly-updates', accent: kpis.updateOverdue > 0 ? 'border-l-red-600' : 'border-l-gray-200', valueClass: kpis.updateOverdue > 0 ? 'text-red-700' : 'text-gray-900' },
    { label: 'Ready for QC', value: kpis.readyForQc, link: '/factory/send-to-qc', accent: 'border-l-sky-500', valueClass: 'text-sky-700' },
    { label: 'Blocked', value: kpis.blocked, link: '/factory/projects', accent: kpis.blocked > 0 ? 'border-l-gray-600' : 'border-l-gray-200', valueClass: 'text-gray-700' },
  ];

  type QueueVariant = 'critical' | 'warning' | 'clear';

  const workQueues: { label: string; count: number; description: string; link: string; action: string; variant: QueueVariant }[] = [
    { label: 'Projects Missing WO', count: kpis.missingWo, description: 'Saudi projects cannot start without a Work Order', link: '/wo-pn-gate', action: 'Enter WO', variant: kpis.missingWo > 0 ? 'critical' : 'clear' },
    { label: 'Ready to Start', count: kpis.readyToStart, description: 'WO in place — production can begin', link: '/factory/projects', action: 'View Projects', variant: kpis.readyToStart > 0 ? 'warning' : 'clear' },
    { label: 'Waiting Raw Materials', count: kpis.waitingMaterials, description: 'Production on hold pending material delivery', link: '/factory/raw-material-requests', action: 'Check Status', variant: kpis.waitingMaterials > 0 ? 'warning' : 'clear' },
    { label: 'Monthly Updates Due', count: kpis.updateDue, description: 'Production records requiring a progress update', link: '/factory/monthly-updates', action: 'Submit Update', variant: kpis.updateDue > 0 ? 'warning' : 'clear' },
    { label: 'Updates Overdue', count: kpis.updateOverdue, description: 'No update submitted in over 30 days', link: '/factory/monthly-updates', action: 'Submit Now', variant: kpis.updateOverdue > 0 ? 'critical' : 'clear' },
    { label: 'Ready for QC Handoff', count: kpis.readyForQc, description: 'Production completed — send to QC for inspection', link: '/factory/send-to-qc', action: 'Send to QC', variant: kpis.readyForQc > 0 ? 'warning' : 'clear' },
    { label: 'Blocked / On Hold', count: kpis.blocked, description: 'Projects halted — review and resolve blockers', link: '/factory/projects', action: 'View Blocked', variant: kpis.blocked > 0 ? 'critical' : 'clear' },
  ];

  const queueVariantStyles: Record<QueueVariant, string> = {
    critical: 'border-red-200 bg-red-50',
    warning: 'border-amber-200 bg-amber-50',
    clear: 'border-gray-100 bg-white',
  };

  const queueBadgeVariant: Record<QueueVariant, 'critical' | 'warning' | 'neutral'> = {
    critical: 'critical', warning: 'warning', clear: 'neutral',
  };

  const modules = [
    { label: 'WO Gate', icon: <GitBranch size={20} className="text-orange-600" />, path: '/wo-pn-gate', description: 'Confirm work orders' },
    { label: 'Factory Projects', icon: <Wrench size={20} className="text-orange-600" />, path: '/factory/projects', description: 'Production tracking' },
    { label: 'Requirements', icon: <FileText size={20} className="text-orange-600" />, path: '/factory/requirements', description: 'BOQ / BOM / Drawings' },
    { label: 'Raw Materials', icon: <Package size={20} className="text-orange-600" />, path: '/factory/raw-material-requests', description: 'Material requests' },
    { label: 'Monthly Updates', icon: <CalendarClock size={20} className="text-orange-600" />, path: '/factory/monthly-updates', description: 'Progress updates' },
    { label: 'Send to QC', icon: <CheckCircle2 size={20} className="text-orange-600" />, path: '/factory/send-to-qc', description: 'QC handoff queue' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Factory Dashboard"
        subtitle="Manage WO readiness, production requirements, raw material requests, progress updates, and QC handoff."
        breadcrumb={[{ label: 'Factory', href: '/factory' }]}
        actions={
          <div className="flex items-center gap-2">
            <DataSourceBadge variant="auto" />
            {role && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                <FactoryIcon size={11} className="mr-1" />
                {role === 'admin' ? 'Admin · Factory' : role === 'operations_manager' ? 'Operations' : 'Factory User'}
              </span>
            )}
          </div>
        }
      />

      {/* WO gate alert */}
      {kpis.missingWo > 0 && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>
            <strong>{kpis.missingWo}</strong> Saudi project{kpis.missingWo !== 1 ? 's' : ''} missing a Work Order — factory execution is blocked until WO is entered.
          </span>
          <Link to="/wo-pn-gate" className="ml-auto shrink-0">
            <Button size="sm" variant="primary" className="bg-red-600 hover:bg-red-700 text-white border-0">
              <GitBranch size={12} className="mr-1" /> Enter WO
            </Button>
          </Link>
        </div>
      )}

      {kpis.updateOverdue > 0 && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-amber-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>{kpis.updateOverdue}</strong> production record{kpis.updateOverdue !== 1 ? 's' : ''} overdue for monthly update — submit progress now.
          </span>
          <Link to="/factory/monthly-updates" className="ml-auto shrink-0">
            <Button size="sm" variant="secondary">Submit Update</Button>
          </Link>
        </div>
      )}

      {/* Top Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/wo-pn-gate"><Button size="sm" variant="primary" className="bg-orange-600 hover:bg-orange-700 border-0 text-white"><GitBranch size={13} className="mr-1.5" />Enter WO</Button></Link>
          <Link to="/factory/projects"><Button size="sm" variant="secondary"><Wrench size={13} className="mr-1.5" />Start Production</Button></Link>
          <Link to="/factory/requirements"><Button size="sm" variant="secondary"><FileText size={13} className="mr-1.5" />Upload Requirement</Button></Link>
          <Link to="/factory/raw-material-requests/new"><Button size="sm" variant="secondary"><Package size={13} className="mr-1.5" />Request Raw Materials</Button></Link>
          <Link to="/factory/monthly-updates"><Button size="sm" variant="secondary"><CalendarClock size={13} className="mr-1.5" />Submit Monthly Update</Button></Link>
          <Link to="/factory/send-to-qc"><Button size="sm" variant="secondary"><CheckCircle2 size={13} className="mr-1.5" />Send to QC</Button></Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map((k) => (
          <Link key={k.label} to={k.link}>
            <div className={`bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-4 hover:shadow-md transition-shadow ${k.accent}`}>
              <div className={`text-2xl font-bold ${k.valueClass}`}>{loading ? '…' : k.value}</div>
              <div className="text-sm text-gray-600 mt-0.5">{k.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Work Queues */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Work Queues</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {workQueues.map((q) => (
            <div key={q.label} className={`rounded-xl border p-4 ${queueVariantStyles[q.variant]}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{q.label}</span>
                    <Badge variant={queueBadgeVariant[q.variant]} size="sm">
                      {loading ? '…' : q.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{q.description}</p>
                </div>
                <Link to={q.link} className="shrink-0">
                  <button className="text-xs text-orange-600 font-medium hover:text-orange-700 flex items-center gap-0.5 whitespace-nowrap">
                    {q.action} <ChevronRight size={12} />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Module Tiles */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Factory Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {modules.map((m) => (
            <Link key={m.path} to={m.path}>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                  {m.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                  <p className="text-xs text-gray-500">{m.description}</p>
                </div>
                <ArrowUpRight size={14} className="text-gray-300 ml-auto shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
