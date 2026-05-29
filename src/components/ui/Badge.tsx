import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'critical' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-brand-100 text-brand-800',
  success:  'bg-green-100 text-green-800',
  warning:  'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
  info:     'bg-sky-100 text-sky-800',
  neutral:  'bg-gray-100 text-gray-700',
};

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
