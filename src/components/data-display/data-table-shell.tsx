import * as React from 'react'
import { cn } from '@/lib/utils'

interface DataTableShellProps {
  children: React.ReactNode
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function DataTableShell({ children, toolbar, footer, className }: DataTableShellProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {toolbar && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {toolbar}
        </div>
      )}
      <div className="rounded-md border overflow-hidden">
        {children}
      </div>
      {footer && (
        <div className="flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  )
}
