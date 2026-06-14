import { Badge } from '@/components/ui/primitives/badge'
import { cn } from '@/lib/utils'
import { getStatusConfig } from './status-config'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = getStatusConfig(status)
  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
