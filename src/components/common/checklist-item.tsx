import * as React from 'react'
import { Check, X, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type ChecklistState = 'checked' | 'unchecked' | 'na'

interface ChecklistItemProps {
  label: string
  state?: ChecklistState
  description?: string
  required?: boolean
  className?: string
}

const STATE_STYLES: Record<ChecklistState, { icon: React.ReactNode; className: string }> = {
  checked: {
    icon: <Check className="h-3.5 w-3.5" />,
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  unchecked: {
    icon: <Minus className="h-3.5 w-3.5" />,
    className: 'bg-gray-100 text-gray-400 border-gray-200',
  },
  na: {
    icon: <X className="h-3.5 w-3.5" />,
    className: 'bg-gray-50 text-gray-400 border-gray-200',
  },
}

export function ChecklistItem({
  label,
  state = 'unchecked',
  description,
  required = false,
  className,
}: ChecklistItemProps) {
  const stateStyle = STATE_STYLES[state]

  return (
    <div className={cn('flex items-start gap-3 py-2', className)}>
      <div className={cn(
        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
        stateStyle.className
      )}>
        {stateStyle.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-sm',
          state === 'checked' ? 'text-foreground' : 'text-muted-foreground',
        )}>
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}
