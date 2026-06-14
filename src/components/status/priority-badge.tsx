import { Badge } from '@/components/ui/primitives/badge'
import { cn } from '@/lib/utils'
import { PRIORITY_CONFIG, type PriorityLevel } from './status-config'

interface PriorityBadgeProps {
  priority: string
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority as PriorityLevel] ?? {
    variant: 'outline' as const,
    label: priority,
    className: '',
  }
  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
