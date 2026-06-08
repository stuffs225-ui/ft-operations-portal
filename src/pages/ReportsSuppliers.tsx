import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { isSupabaseConfigured } from '../lib/supabase';
import { MOCK_SUPPLIER_SCORECARDS as MOCK_SUPPLIER_SCORECARDS_RAW } from '../data/mockReports';
import { mockOrEmpty } from '../lib/dataMode';
const MOCK_SUPPLIER_SCORECARDS = mockOrEmpty(MOCK_SUPPLIER_SCORECARDS_RAW);
import type { SupplierScorecard, ScoreBand } from '../types';
import { ChevronDown, ChevronRight } from 'lucide-react';

function scoreBandBadgeVariant(band: ScoreBand): 'success' | 'warning' | 'critical' {
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

export function ReportsSuppliers() {
  const { role } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const scorecards: SupplierScorecard[] = MOCK_SUPPLIER_SCORECARDS;

  const excellent = scorecards.filter(s => s.score >= 85).length;
  const good = scorecards.filter(s => s.score >= 70 && s.score < 85).length;
  const needsImprovement = scorecards.filter(s => s.score >= 50 && s.score < 70).length;
  const poor = scorecards.filter(s => s.score < 50).length;

  // role is used to determine if the page is accessible (scores always visible)
  void role;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Reports"
        subtitle="Scorecard, delivery performance, and NCR summary"
        breadcrumb={[{ label: 'Reports' }, { label: 'Suppliers' }]}
      />

      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Dev mode — showing mock supplier scorecard data.
        </div>
      )}

      {/* How scores are calculated */}
      <Card padding="sm">
        <button
          className="flex items-center gap-2 w-full text-left text-sm font-medium text-gray-700 px-2 py-1"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          How this score is calculated
        </button>
        {expanded && (
          <p className="text-xs text-gray-600 mt-2 px-2 pb-2">
            Scores are composite weighted averages of quality (40%), delivery (35%), and responsiveness (25%).
            NCR count reduces quality score by 10 points each. Delayed POs reduce delivery score by 5 points each.
          </p>
        )}
      </Card>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Excellent', count: excellent, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Good', count: good, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Needs Improvement', count: needsImprovement, color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'Poor', count: poor, color: 'text-red-700', bg: 'bg-red-50' },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-xl p-4 border border-gray-200`}>
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
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
              {scorecards.map(s => {
                const band = deriveScoreBand(s.score);
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.supplier_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 w-8">{s.score}</span>
                        <div className="w-24 bg-gray-100 rounded h-2">
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
                      <Badge variant={scoreBandBadgeVariant(band)}>{band.replace('_', ' ')}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
