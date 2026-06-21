import * as React from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  accent?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Standardized section header used inside tab panels and page sections.
 * Renders a short colored accent bar + title + optional action slot.
 * Used in ProjectDetail tab sub-sections and Dashboard section labels.
 */
export function SectionHeader({ title, accent = 'bg-brand-500', action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <span className={cn('w-0.5 h-4 rounded-full inline-block shrink-0', accent)} />
        {title}
      </h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
