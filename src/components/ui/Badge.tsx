import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'critical' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-brand-50 text-brand-700',
  success:  'bg-green-50 text-green-700',
  warning:  'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
  info:     'bg-sky-50 text-sky-700',
  neutral:  'bg-gray-100 text-gray-600',
};

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium',
        size === 'sm' ? 'px-2 py-px text-xs' : 'px-2.5 py-1 text-sm',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
