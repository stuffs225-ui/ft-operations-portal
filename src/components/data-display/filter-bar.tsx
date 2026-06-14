import * as React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/primitives/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface FilterOption {
  value: string
  label: string
}

interface FilterBarFilter {
  id: string
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

interface FilterBarProps {
  search?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  filters?: FilterBarFilter[]
  onClear?: () => void
  hasActiveFilters?: boolean
  className?: string
  children?: React.ReactNode
}

export function FilterBar({
  search,
  filters,
  onClear,
  hasActiveFilters,
  className,
  children,
}: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      {search && (
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={search.placeholder ?? 'Search...'}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
      )}

      {filters && filters.map((filter) => (
        <Select key={filter.id} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {filter.label}</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {children}

      {hasActiveFilters && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 px-2">
          <X className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
