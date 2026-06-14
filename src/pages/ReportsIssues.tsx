import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { MOCK_OPERATIONAL_ISSUES } from '../data/mockReports';
import type { OperationalIssue, OperationalIssueStatus, IssueSeverity } from '../types';

type Tab = 'All' | 'Open' | 'In Progress' | 'Resolved / Closed';

function severityBadgeVariant(severity: IssueSeverity): 'critical' | 'warning' | 'info' | 'default' {
  const map: Record<IssueSeverity, 'critical' | 'warning' | 'info' | 'default'> = {
    critical: 'critical',
    high: 'warning',
    medium: 'info',
    low: 'default',
  };
  return map[severity];
}

function statusBadgeVariant(status: OperationalIssueStatus): 'warning' | 'info' | 'success' | 'default' {
  const map: Record<OperationalIssueStatus, 'warning' | 'info' | 'success' | 'default'> = {
    open: 'warning',
    assigned: 'info',
    in_progress: 'info',
    waiting_input: 'warning',
    resolved: 'success',
    closed: 'success',
    cancelled: 'default',
  };
  return map[status];
}

function formatStatusLabel(status: OperationalIssueStatus): string {
  return status.replace(/_/g, ' ');
}

export function ReportsIssues() {
  const { role } = useAuth();
  const [issues, setIssues] = useState<OperationalIssue[]>(MOCK_OPERATIONAL_ISSUES);
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [closureNotes, setClosureNotes] = useState<Record<string, string>>({});
  const [devMessage, setDevMessage] = useState<string | null>(null);

  const tabs: Tab[] = ['All', 'Open', 'In Progress', 'Resolved / Closed'];

  const visibleIssues = issues.filter(issue => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Open') return issue.status === 'open';
    if (activeTab === 'In Progress') return issue.status === 'in_progress';
    if (activeTab === 'Resolved / Closed') return issue.status === 'resolved' || issue.status === 'closed' || issue.status === 'cancelled';
    return true;
  });

  const openCount = issues.filter(i => i.status === 'open').length;
  const inProgressCount = issues.filter(i => i.status === 'in_progress').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved' || i.status === 'closed').length;

  function canClose(issue: OperationalIssue): boolean {
    if (!role) return false;
    if (role === 'admin' || role === 'operations_manager') return true;
    return issue.owner_role === role;
  }

  function handleCloseIssue(issue: OperationalIssue) {
    if (!isSupabaseConfigured) {
      setIssues(prev =>
        prev.map(i =>
          i.id === issue.id ? { ...i, status: 'closed' as OperationalIssueStatus, closure_notes: closureNotes[issue.id] ?? null } : i
        )
      );
      setExpandedId(null);
      setDevMessage('Dev: Issue closed (mock state updated).');
      setTimeout(() => setDevMessage(null), 3000);
    }
  }

  function handleNewIssue() {
    if (!isSupabaseConfigured) {
      setDevMessage('Dev: New Issue creation not available in dev mode.');
      setTimeout(() => setDevMessage(null), 3000);
    }
  }

  function isDueDateOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issues & Risks"
        subtitle="Operational issues, blockers, and escalation register"
        actions={
          <Button variant="primary" size="sm" onClick={handleNewIssue}>
            New Issue
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
          Dev mode — showing mock operational issues.
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 rounded-xl p-4 border border-gray-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Open</p>
            <p className="text-2xl font-bold text-amber-700">{openCount}</p>
          </div>
        </div>
        <div className="bg-sky-50 rounded-xl p-4 border border-gray-200 flex items-center gap-3">
          <Clock className="w-5 h-5 text-sky-600 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-sky-700">{inProgressCount}</p>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-gray-200 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Resolved / Closed</p>
            <p className="text-2xl font-bold text-green-700">{resolvedCount}</p>
          </div>
        </div>
      </div>

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

      {/* Issues table */}
      <Card padding="none">
        {visibleIssues.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500">No issues in this category.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleIssues.map(issue => {
              const isExpanded = expandedId === issue.id;
              const overdue = isDueDateOverdue(issue.due_date);
              const isResolved = issue.status === 'closed' || issue.status === 'cancelled' || issue.status === 'resolved';

              return (
                <div key={issue.id}>
                  {/* Main row */}
                  <button
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                  >
                    <div className="flex items-start gap-3 flex-wrap">
                      <span className="font-mono text-xs text-gray-500 shrink-0 mt-0.5">{issue.issue_number}</span>
                      <Badge variant={severityBadgeVariant(issue.severity)}>{issue.severity}</Badge>
                      <Badge variant="neutral">{issue.issue_type.replace('_', ' ')}</Badge>
                      <span className="font-medium text-sm text-gray-900 flex-1 min-w-0">{issue.title}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap pl-0">
                      <Badge variant="neutral">{issue.module_name.replace(/_/g, ' ')}</Badge>
                      {issue.owner_role && (
                        <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                          {issue.owner_role.replace(/_/g, ' ')}
                        </span>
                      )}
                      <Badge variant={statusBadgeVariant(issue.status)}>
                        {formatStatusLabel(issue.status)}
                      </Badge>
                      {issue.due_date && (
                        <span className={`text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                          {overdue ? 'Overdue' : issue.due_date}
                        </span>
                      )}
                      {issue.project && (
                        <Link
                          to={`/projects/${issue.project_id}`}
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          {issue.project.project_code}
                        </Link>
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-3">
                      <p className="text-sm text-gray-700 mt-3 leading-relaxed">{issue.description}</p>

                      {!isResolved && canClose(issue) && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-600">
                            Closure Notes <span className="text-gray-400">(required to close)</span>
                          </label>
                          <textarea
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                            rows={3}
                            placeholder="Describe the resolution or reason for closure..."
                            value={closureNotes[issue.id] ?? ''}
                            onChange={e =>
                              setClosureNotes(prev => ({ ...prev, [issue.id]: e.target.value }))
                            }
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={!closureNotes[issue.id]?.trim()}
                            onClick={() => handleCloseIssue(issue)}
                          >
                            Close Issue
                          </Button>
                        </div>
                      )}

                      {issue.closure_notes && (
                        <div className="text-xs text-gray-600 bg-white rounded border border-gray-200 px-3 py-2">
                          <span className="font-medium">Closure notes:</span> {issue.closure_notes}
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
