import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/primitives/card'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  noPadding?: boolean
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  noPadding = false,
}: SectionCardProps) {
  const hasHeader = title || description || actions

  return (
    <Card className={cn('shadow-sm border-gray-200/80', className)}>
      {hasHeader && (
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-5">
          <div className="space-y-1">
            {title && <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {actions}
            </div>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(noPadding ? 'p-0' : undefined, contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
