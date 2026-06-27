import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_MATRIX } from '../../lib/roleMatrix';
import { cn } from '../../lib/utils';

interface RoleRulesCardProps {
  className?: string;
}

// Light executive card. The previous treatment used a heavy dark
// purple/indigo panel that clashed with the rest of the dashboard; this renders
// the same governance content as a restrained white card with a charcoal body
// and a single NAFFCO-red accent on the heading icon for emphasis only.
export function RoleRulesCard({ className }: RoleRulesCardProps) {
  const { role } = useAuth();
  if (!role) return null;

  const matrix = ROLE_MATRIX[role];
  const rules = matrix?.rules ?? [];
  if (rules.length === 0) return null;

  return (
    <div className={cn('rounded-lg border border-gray-200/80 bg-white shadow-sm p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={14} className="text-brand-600" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-gray-700">
          {matrix.label} — Active Rules
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {rules.map((rule) => (
          <div key={rule} className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5 text-brand-500" aria-hidden>▸</span>
            <span className="text-xs leading-snug text-gray-600">{rule}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
