import * as React from 'react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

interface TimelineItemProps {
  title: string
  body?: string
  actorName?: string
  timestamp: string
  isSystem?: boolean
  icon?: React.ReactNode
  className?: string
}

export function TimelineItem({
  title,
  body,
  actorName,
  timestamp,
  isSystem = false,
  icon,
  className,
}: TimelineItemProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      <div className="flex flex-col items-center">
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
          isSystem
            ? 'border-muted bg-muted text-muted-foreground'
            : 'border-primary/20 bg-primary/10 text-primary'
        )}>
          {icon ?? (
            <div className="h-2 w-2 rounded-full bg-current" />
          )}
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>
      <div className="pb-6 pt-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {actorName && !isSystem && (
            <span className="text-xs text-muted-foreground">by {actorName}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDate(timestamp)}
          </span>
        </div>
        {body && (
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        )}
      </div>
    </div>
  )
}
