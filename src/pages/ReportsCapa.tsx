import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { MOCK_CAPA_RECORDS } from '../data/mockReports';
import type { CapaRecord, CapaStatus } from '../types';

type Tab = 'All' | 'Draft' | 'In Progress' | 'Pending Check' | 'Closed';

function statusBadgeVariant(status: CapaStatus): 'default' | 'info' | 'warning' | 'success' | 'critical' {
  const map: Record<CapaStatus, 'default' | 'info' | 'warning' | 'success' | 'critical'> = {
    draft: 'default',
    assigned: 'info',
    in_progress: 'info',
    pending_effectiveness_check: 'warning',
    effective: 'success',
    ineffective: 'critical',
    closed: 'success',
    cancelled: 'default',
  };
  return map[status];
}

function formatStatusLabel(status: CapaStatus): string {
  return status.replace(/_/g, ' ');
}

function linkedTo(capa: CapaRecord): string {
  if (capa.issue_id && capa.ncr_id) return `Issue ${capa.issue_id} / NCR ${capa.ncr_id}`;
  if (capa.issue_id) return `Issue ${capa.issue_id}`;
  if (capa.ncr_id) return `NCR ${capa.ncr_id}`;
  return 'Standalone';
}

export function ReportsCapa() {
  const { role } = useAuth();
  const [capas, setCapas] = useState<CapaRecord[]>(MOCK_CAPA_RECORDS);
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [effectivenessResult, setEffectivenessResult] = useState<Record<string, string>>({});
  const [devMessage, setDevMessage] = useState<string | null>(null);

  const tabs: Tab[] = ['All', 'Draft', 'In Progress', 'Pending Check', 'Closed'];

  const canManage = role === 'admin' || role === 'operations_manager';

  const visibleCapas = capas.filter(capa => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Draft') return capa.status === 'draft';
    if (activeTab === 'In Progress') return capa.status === 'assigned' || capa.status === 'in_progress';
    if (activeTab === 'Pending Check') return capa.status === 'pending_effectiveness_check';
    if (activeTab === 'Closed') return (
      capa.status === 'effective' ||
      capa.status === 'ineffective' ||
      capa.status === 'closed' ||
      capa.status === 'cancelled'
    );
    return true;
  });

  function handleMarkEffective(capa: CapaRecord) {
    if (!isSupabaseConfigured) {
      setCapas(prev =>
        prev.map(c =>
          c.id === capa.id
            ? { ...c, status: 'effective' as CapaStatus, effectiveness_result: effectivenessResult[capa.id] ?? null }
            : c
        )
      );
      setExpandedId(null);
      setDevMessage('Dev: CAPA marked effective (mock state updated).');
      setTimeout(() => setDevMessage(null), 3000);
    }
  }

  function handleMarkIneffective(capa: CapaRecord) {
    if (!isSupabaseConfigured) {
      setCapas(prev =>
        prev.map(c =>
          c.id === capa.id
            ? { ...c, status: 'ineffective' as CapaStatus, effectiveness_result: effectivenessResult[capa.id] ?? null }
            : c
        )
      );
      setExpandedId(null);
      setDevMessage('Dev: CAPA marked ineffective (mock state updated).');
      setTimeout(() => setDevMessage(null), 3000);
    }
  }

  function handleNewCapa() {
    if (canManage && !isSupabaseConfigured) {
      setDevMessage('Dev: New CAPA creation not available in dev mode.');
      setTimeout(() => setDevMessage(null), 3000);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CAPA Records"
        subtitle="Corrective and preventive action tracking"
        action={
          <Button variant="primary" size="sm" onClick={handleNewCapa} disabled={!canManage}>
            New CAPA
          </Button>
        }
      />

      {devMessage && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          {devMessage}
        </div>
      )}

      {!isSupabaseConfigured && !devMessage && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          Dev mode — showing mock CAPA records.
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: capas.length, bg: 'bg-gray-50', color: 'text-gray-700' },
          { label: 'In Progress', count: capas.filter(c => c.status === 'assigned' || c.status === 'in_progress').length, bg: 'bg-sky-50', color: 'text-sky-700' },
          { label: 'Pending Check', count: capas.filter(c => c.status === 'pending_effectiveness_check').length, bg: 'bg-amber-50', color: 'text-amber-700' },
          { label: 'Closed', count: capas.filter(c => c.status === 'effective' || c.status === 'ineffective' || c.status === 'closed').length, bg: 'bg-green-50', color: 'text-green-700' },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-xl p-4 border border-gray-200`}>
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.count}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CAPA table */}
      <Card padding="none">
        {visibleCapas.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">No CAPA records in this category.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleCapas.map(capa => {
              const isExpanded = expandedId === capa.id;
              const isPendingCheck = capa.status === 'pending_effectiveness_check';
              const resultText = effectivenessResult[capa.id] ?? '';
              const canSubmit = resultText.trim().length > 0 && canManage;

              return (
                <div key={capa.id}>
                  {/* Main row */}
                  <button
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : capa.id)}
                  >
                    <div className="flex items-start gap-3 flex-wrap">
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
                      <span className="font-mono text-xs text-gray-500 shrink-0 mt-0.5">{capa.capa_number}</span>
                      <Badge variant={statusBadgeVariant(capa.status)}>
                        {formatStatusLabel(capa.status)}
                      </Badge>
                      {capa.status === 'effective' && (
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      )}
                      <span className="flex-1 min-w-0 text-sm text-gray-700 truncate">
                        {linkedTo(capa)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 pl-6 flex-wrap">
                      <span className="text-xs text-gray-500">
                        Owner: {capa.owner_id ?? 'Unassigned'}
                      </span>
                      {capa.due_date && (
                        <span className={`text-xs ${new Date(capa.due_date) < new Date() && !['effective','ineffective','closed','cancelled'].includes(capa.status) ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          Due: {capa.due_date}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-6 pb-5 bg-gray-50 border-t border-gray-100 space-y-4">
                      <div className="pt-3 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Root Cause</p>
                          <p className="text-sm text-gray-800 mt-1">{capa.root_cause}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Corrective Action</p>
                          <p className="text-sm text-gray-800 mt-1">{capa.corrective_action}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preventive Action</p>
                          <p className="text-sm text-gray-800 mt-1">{capa.preventive_action}</p>
                        </div>
                        {capa.effectiveness_check_date && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Effectiveness Check Date</p>
                            <p className="text-sm text-gray-700 mt-1">{capa.effectiveness_check_date}</p>
                          </div>
                        )}
                        {capa.effectiveness_result && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Effectiveness Result</p>
                            <p className="text-sm text-gray-700 mt-1">{capa.effectiveness_result}</p>
                          </div>
                        )}
                      </div>

                      {isPendingCheck && canManage && (
                        <div className="space-y-2 border-t border-gray-200 pt-3">
                          <label className="text-xs font-medium text-gray-600">
                            Effectiveness Review Notes <span className="text-gray-400">(required)</span>
                          </label>
                          <textarea
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                            rows={3}
                            placeholder="Describe the effectiveness check findings..."
                            value={resultText}
                            onChange={e =>
                              setEffectivenessResult(prev => ({ ...prev, [capa.id]: e.target.value }))
                            }
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!canSubmit}
                              onClick={() => handleMarkEffective(capa)}
                            >
                              Mark Effective
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={!canSubmit}
                              onClick={() => handleMarkIneffective(capa)}
                            >
                              Mark Ineffective
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
