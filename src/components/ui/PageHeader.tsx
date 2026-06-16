import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  breadcrumb?: { label: string; path?: string }[];
  className?: string;
}

export function PageHeader({ title, subtitle, action, icon, breadcrumb, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-300">/</span>}
              <span className={i === breadcrumb.length - 1 ? 'text-gray-700 font-medium' : 'hover:text-gray-700'}>
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0 ml-4">{action}</div>}
      </div>
    </div>
  );
}
