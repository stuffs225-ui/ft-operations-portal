import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  rows?: number
  className?: string
  variant?: 'table' | 'cards' | 'detail' | 'metric' | 'page-header' | 'form'
}

export function LoadingState({ rows = 5, className, variant = 'table' }: LoadingStateProps) {
  if (variant === 'metric') {
    return (
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200/80 bg-white p-6 space-y-3">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'page-header') {
    return (
      <div className={cn('flex items-center gap-3 mb-8', className)}>
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
    )
  }

  if (variant === 'form') {
    return (
      <div className={cn('space-y-5', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200/80 bg-card p-6 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'detail') {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-gray-200/80 bg-card p-6 space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Default: table skeleton
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
