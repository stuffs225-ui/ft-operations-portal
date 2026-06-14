import * as React from 'react'
import { StatusBadge } from '@/components/status/status-badge'
import { cn } from '@/lib/utils'

interface DetailHeaderProps {
  title: string
  subtitle?: string
  status?: string
  meta?: Array<{ label: string; value: React.ReactNode }>
  actions?: React.ReactNode
  className?: string
}

export function DetailHeader({ title, subtitle, status, meta, actions, className }: DetailHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {status && <StatusBadge status={status} />}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {meta && meta.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {meta.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">{item.label}:</span>
              <span className="font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
