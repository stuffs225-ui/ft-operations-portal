import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { INBOX_TASKS } from '../data/mockInbox';
import { ROLE_CONFIGS } from '../lib/roles';
import type { InboxTask, TaskPriority, TaskCategory } from '../types';
import { cn } from '../lib/utils';

const priorityConfig: Record<TaskPriority, { label: string; badge: 'critical' | 'warning' | 'default' | 'info' }> = {
  critical: { label: 'Critical', badge: 'critical' },
  high:     { label: 'High',     badge: 'warning'  },
  medium:   { label: 'Medium',   badge: 'default'  },
  low:      { label: 'Low',      badge: 'info'     },
};

const categoryLabels: Record<TaskCategory, string> = {
  quotation:   'Quotation',
  approval:    'Approval',
  procurement: 'Procurement',
  production:  'Production',
  store:       'Store',
  qc:          'Quality',
  afs:         'AFS',
  governance:  'Governance',
};

function TaskCard({ task }: { task: InboxTask }) {
  const navigate = useNavigate();
  const pc = priorityConfig[task.priority];
  const roleConfig = ROLE_CONFIGS[task.assignedRole];

  return (
    <div
      className={cn(
        'bg-white rounded-xl border shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4',
        'hover:shadow-md hover:border-gray-300 transition-all',
        task.priority === 'critical' ? 'border-l-4 border-l-red-500 border-gray-200' : 'border-gray-200',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <Badge variant={pc.badge}>{pc.label}</Badge>
          <Badge variant="neutral">{categoryLabels[task.category]}</Badge>
          {task.project && (
            <span className="text-xs font-mono text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
              {task.project}
            </span>
          )}
          <span className={cn('text-[10px] rounded px-1.5 py-0.5 font-medium', roleConfig.color)}>
            {roleConfig.label}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-gray-900 mb-1">{task.title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{task.description}</p>

        {(task.dueDate || task.overdueBy) && (
          <div className={cn('flex items-center gap-1.5 mt-2 text-xs', task.overdueBy ? 'text-red-600' : 'text-gray-500')}>
            {task.overdueBy ? <AlertTriangle size={12} /> : <Clock size={12} />}
            {task.overdueBy
              ? `Overdue by ${task.overdueBy} day${task.overdueBy > 1 ? 's' : ''}`
              : `Due: ${task.dueDate}`}
          </div>
        )}
      </div>

      <div className="shrink-0">
        <Button
          size="sm"
          variant="outline"
          icon={<ArrowRight size={14} />}
          onClick={() => navigate(task.path)}
        >
          {task.action}
        </Button>
      </div>
    </div>
  );
}

export function ActionInbox() {
  const { role } = useAuth();
  // Admin sees all tasks; other roles see only tasks assigned to their role
  const visibleTasks = INBOX_TASKS.filter(t =>
    role === 'admin' || t.assignedRole === role
  );
  const criticalCount = visibleTasks.filter((t) => t.priority === 'critical').length;
  const overdueCount  = visibleTasks.filter((t) => t.overdueBy !== undefined).length;

  return (
    <div>
      <PageHeader
        title="My Action Inbox"
        subtitle="Tasks requiring your attention across all active workflows"
        breadcrumb={[{ label: 'Inbox' }]}
        action={
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-red-100 text-red-700 rounded-full px-2 py-1 font-semibold">
              {criticalCount} Critical
            </span>
            <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-1 font-semibold">
              {overdueCount} Overdue
            </span>
          </div>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => {
          const count = visibleTasks.filter((t) => t.priority === p).length;
          const pc = priorityConfig[p];
          return (
            <Card key={p} padding="sm">
              <div className="text-xl font-bold text-gray-900">{count}</div>
              <Badge variant={pc.badge} className="mt-1">{pc.label} Priority</Badge>
            </Card>
          );
        })}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {visibleTasks.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No tasks assigned to your role.</div>
        ) : (
          visibleTasks
            .sort((a, b) => {
              const order = { critical: 0, high: 1, medium: 2, low: 3 };
              return order[a.priority] - order[b.priority];
            })
            .map((task) => (
              <TaskCard key={task.id} task={task} />
            ))
        )}
      </div>
    </div>
  );
}
