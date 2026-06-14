import * as React from 'react'
import { Card, CardContent } from '@/components/ui/primitives/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    label?: string
  }
  href?: string
  className?: string
}

export function MetricCard({ title, value, subtitle, icon, trend, href, className }: MetricCardProps) {
  const content = (
    <Card className={cn('shadow-sm transition-shadow hover:shadow-md', href && 'cursor-pointer', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend !== undefined && (
              <p className={cn(
                'mt-2 text-xs font-medium',
                trend.value >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                {trend.label && <span className="ml-1 text-muted-foreground font-normal">{trend.label}</span>}
              </p>
            )}
          </div>
          {icon && (
            <div className="ml-4 shrink-0 rounded-lg bg-muted p-2 text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <a href={href} className="block no-underline">{content}</a>
  }

  return content
}

// Alias for compatibility
export { MetricCard as KpiCard }
