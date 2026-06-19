import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { DataSourceBadge } from '../components/ui/DataSourceBadge';
import {
  MOCK_PROJECT_HEALTH_SCORES as MOCK_PROJECT_HEALTH_SCORES_RAW,
  MOCK_DEPARTMENT_HEALTH_SCORES as MOCK_DEPARTMENT_HEALTH_SCORES_RAW,
  MOCK_SUPPLIER_SCORECARDS as MOCK_SUPPLIER_SCORECARDS_RAW,
} from '../data/mockReports';
import { mockOrEmpty } from '../lib/dataMode';
import type { ProjectHealthScore, DepartmentHealthScore, SupplierScorecard, ScoreBand } from '../types';

const MOCK_PROJECT_HEALTH_SCORES = mockOrEmpty(MOCK_PROJECT_HEALTH_SCORES_RAW);
const MOCK_DEPARTMENT_HEALTH_SCORES = mockOrEmpty(MOCK_DEPARTMENT_HEALTH_SCORES_RAW);
const MOCK_SUPPLIER_SCORECARDS = mockOrEmpty(MOCK_SUPPLIER_SCORECARDS_RAW);

type Tab = 'Projects' | 'Departments' | 'Suppliers';

const DEPT_LABEL_MAP: Record<string, string> = {
  sales: 'Sales',
  sales_coordinator: 'Sales Coordinator',
  procurement: 'Procurement',
  factory: 'Factory',
  store: 'Store',
  qc: 'Quality Control',
  afs: 'Dubai / AFS',
  operations: 'Operations',
};

function scoreBandBadge(band: ScoreBand): 'success' | 'warning' | 'critical' {
  if (band === 'healthy') return 'success';
  if (band === 'watch') return 'warning';
  if (band === 'at_risk') return 'warning';
  return 'critical';
}

function scoreBarColor(band: ScoreBand): string {
  if (band === 'healthy') return 'bg-green-500';
  if (band === 'watch') return 'bg-amber-400';
  if (band === 'at_risk') return 'bg-orange-500';
  return 'bg-red-500';
}

function deriveScoreBand(score: number): ScoreBand {
  if (score >= 85) return 'healthy';
  if (score >= 70) return 'watch';
  if (score >= 50) return 'at_risk';
  return 'critical';
}

interface FormulaBoxProps {
  show: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FormulaBox({ show, onToggle, children }: FormulaBoxProps) {
  return (
    <Card padding="sm">
      <button
        className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-700 px-2 py-1"
        onClick={onToggle}
      >
        {show
          ? <ChevronDown className="w-4 h-4 text-gray-400" />
          : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <Info className="w-4 h-4 text-blue-400" />
        How this score is calculated
      </button>
      {show && (
        <p className="text-xs text-gray-600 mt-2 px-2 pb-2 leading-relaxed">{children}</p>
      )}
    </Card>
  );
}

export function ReportsHealthScores() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Projects');
  const [showProjectFormula, setShowProjectFormula] = useState(false);
  const [showDeptFormula, setShowDeptFormula] = useState(false);
  const [showSupplierFormula, setShowSupplierFormula] = useState(false);

  const tabs: Tab[] = ['Projects', 'Departments', 'Suppliers'];

  const projects: ProjectHealthScore[] = MOCK_PROJECT_HEALTH_SCORES;
  const departments: DepartmentHealthScore[] = MOCK_DEPARTMENT_HEALTH_SCORES;
  const suppliers: SupplierScorecard[] = MOCK_SUPPLIER_SCORECARDS;

  const canViewProjectScores = role === 'admin' || role === 'operations_manager';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health Scores"
        subtitle="Project, department, and supplier health with scoring transparency"
        actions={<DataSourceBadge variant="preview" />}
      />

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Dev mode — showing mock health score data.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1: Projects */}
      {activeTab === 'Projects' && (
        <div className="space-y-4">
          <FormulaBox show={showProjectFormula} onToggle={() => setShowProjectFormula(v => !v)}>
            Score = weighted average of 7 dimensions (delay 20%, data quality 15%, procurement 15%, factory 15%, store 10%, qc 15%, afs 10%). Each dimension scores 0–100. Blockers and open issues reduce total score by 5 points each.
          </FormulaBox>

          {!canViewProjectScores ? (
            <Card>
              <p className="text-sm text-gray-500 py-4 text-center">
                Health scores are visible to Operations and Admin only.
              </p>
            </Card>
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Project</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Band</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Blockers</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Issues</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Delay</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">QC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(p => {
                      const band = p.score_band;
                      return (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <Link
                              to={`/projects/${p.project_id}`}
                              className="font-medium text-brand-600 hover:underline font-mono text-xs"
                            >
                              {p.project?.project_code ?? p.project_id}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-700 text-xs">{p.project?.customer_name ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 w-8 text-xs">{p.score}</span>
                              <div className="w-20 bg-gray-100 rounded h-2">
                                <div
                                  className={`${scoreBarColor(band)} h-2 rounded`}
                                  style={{ width: `${p.score}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={scoreBandBadge(band)}>{band.replace('_', ' ')}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{p.blockers_count}</td>
                          <td className="px-4 py-3 text-gray-700">{p.open_issues_count}</td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.delay_score}</td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.qc_score}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Departments */}
      {activeTab === 'Departments' && (
        <div className="space-y-4">
          <FormulaBox show={showDeptFormula} onToggle={() => setShowDeptFormula(v => !v)}>
            Score = 100 − (overdue_tasks × 10) − (sla_breaches × 15) − (overdue/total × 20). Higher is better.
          </FormulaBox>

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Band</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Open Tasks</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Overdue</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">SLA Breaches</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Avg Cycle Time</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(d => {
                    const band = d.score_band;
                    return (
                      <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {DEPT_LABEL_MAP[d.department_key] ?? d.department_key}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 w-8 text-xs">{d.score}</span>
                            <div className="w-20 bg-gray-100 rounded h-2">
                              <div
                                className={`${scoreBarColor(band)} h-2 rounded`}
                                style={{ width: `${d.score}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={scoreBandBadge(band)}>{band.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{d.open_tasks_count}</td>
                        <td className="px-4 py-3 text-gray-700">{d.overdue_tasks_count}</td>
                        <td className="px-4 py-3 text-gray-700">{d.sla_breaches_count}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {d.average_cycle_time_hours != null ? `${d.average_cycle_time_hours}h` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Suppliers */}
      {activeTab === 'Suppliers' && (
        <div className="space-y-4">
          <FormulaBox show={showSupplierFormula} onToggle={() => setShowSupplierFormula(v => !v)}>
            Scores are composite weighted averages of quality (40%), delivery (35%), and responsiveness (25%). NCR count reduces quality score by 10 points each. Delayed POs reduce delivery score by 5 points each.
          </FormulaBox>

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Quality</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Delivery</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Responsiveness</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">NCRs</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Delayed / Total POs</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(s => {
                    const band = deriveScoreBand(s.score);
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{s.supplier_name}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 w-8 text-xs">{s.score}</span>
                            <div className="w-20 bg-gray-100 rounded h-2">
                              <div
                                className={`${scoreBarColor(band)} h-2 rounded`}
                                style={{ width: `${s.score}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{s.quality_score}</td>
                        <td className="px-4 py-3 text-gray-700">{s.delivery_score}</td>
                        <td className="px-4 py-3 text-gray-700">{s.responsiveness_score}</td>
                        <td className="px-4 py-3 text-gray-700">{s.ncr_count}</td>
                        <td className="px-4 py-3 text-gray-700">{s.delayed_po_count} / {s.total_po_count}</td>
                        <td className="px-4 py-3">
                          <Badge variant={scoreBandBadge(band)}>{band.replace('_', ' ')}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
