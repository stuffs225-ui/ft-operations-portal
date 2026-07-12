import { cn } from '../../lib/utils';

// Visual Identity D5 — status chip: RECTANGLE (radius 4px), tint + border + text,
// 11px/600 UPPERCASE. Only `dangerSolid` (overdue / CRITICAL) fills solid.
type BadgeVariant =
  | 'default' | 'success' | 'warning' | 'critical' | 'info' | 'neutral'
  | 'dangerSolid' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:     'bg-info-tint border border-info-border text-info-text',
  info:        'bg-info-tint border border-info-border text-info-text',
  success:     'bg-success-tint border border-success-border text-success-text',
  warning:     'bg-warning-tint border border-warning-border text-warning-text',
  critical:    'bg-danger-tint border border-danger-border text-danger-text',
  neutral:     'bg-gray-100 border border-gray-300 text-gray-600',
  dangerSolid: 'bg-danger border border-danger text-white',
  outline:     'bg-transparent border border-gray-300 text-gray-600',
};

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-btn font-semibold uppercase tracking-[0.04em] whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
