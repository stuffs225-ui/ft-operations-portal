import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_MATRIX } from '../../lib/roleMatrix';
import { cn } from '../../lib/utils';

interface RoleRulesCardProps {
  className?: string;
}

export function RoleRulesCard({ className }: RoleRulesCardProps) {
  const { role } = useAuth();
  if (!role) return null;

  const matrix = ROLE_MATRIX[role];
  const rules = matrix?.rules ?? [];
  if (rules.length === 0) return null;

  // Accent color derived from module: use a subtle bg/border based on role type
  const accentBg =
    matrix.type === 'admin'
      ? 'bg-purple-950 border-purple-800'
      : matrix.type === 'management'
        ? 'bg-indigo-950 border-indigo-800'
        : 'bg-gray-900 border-gray-700';

  const dotColor =
    matrix.type === 'admin'
      ? 'text-purple-400'
      : matrix.type === 'management'
        ? 'text-indigo-400'
        : 'text-brand-400';

  const headingColor =
    matrix.type === 'admin'
      ? 'text-purple-300'
      : matrix.type === 'management'
        ? 'text-indigo-300'
        : 'text-brand-300';

  const ruleColor = 'text-gray-400';

  return (
    <div className={cn('rounded-xl border p-4', accentBg, className)}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={14} className={dotColor} />
        <span className={cn('text-[11px] font-semibold uppercase tracking-wide', headingColor)}>
          {matrix.label} — Active Rules
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {rules.map((rule) => (
          <div key={rule} className="flex items-start gap-2">
            <span className={cn('shrink-0 mt-0.5', dotColor)}>▸</span>
            <span className={cn('text-xs leading-snug', ruleColor)}>{rule}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
