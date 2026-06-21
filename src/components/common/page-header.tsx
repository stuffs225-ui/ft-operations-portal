import * as React from 'react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumb?: BreadcrumbItem[]
  actions?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, breadcrumb, actions, icon, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0 flex-1">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            {breadcrumb.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                {item.href ? (
                  <a href={item.href} className="hover:text-foreground transition-colors">
                    {item.label}
                  </a>
                ) : (
                  <span>{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        {icon ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-md flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>}
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>}
          </>
        )}
      </div>
      {actions && (
        <div className="mt-2 flex shrink-0 items-center gap-2 sm:mt-0 sm:ml-4">
          {actions}
        </div>
      )}
    </div>
  )
}
