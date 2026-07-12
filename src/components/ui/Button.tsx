import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

// Visual Identity D5 — Executive Navy actions, Emergency-Red danger.
const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-action hover:bg-action-hover active:bg-action-pressed text-white shadow-xs',
  secondary: 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 hover:border-gray-400',
  outline:   'bg-transparent hover:bg-brand-50 text-brand-700 border border-brand-300',
  ghost:     'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900',
  danger:    'bg-danger hover:bg-danger-hover active:bg-danger-pressed text-white shadow-xs',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 rounded-btn font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 disabled:border-transparent disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {!loading && icon}
      {children}
    </button>
  );
}
