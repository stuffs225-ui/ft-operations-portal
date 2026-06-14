import { Badge } from '@/components/ui/primitives/badge'
import { cn } from '@/lib/utils'

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  operations_manager: 'bg-blue-100 text-blue-800 border-blue-200',
  sales_user: 'bg-sky-100 text-sky-800 border-sky-200',
  sales_coordinator: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  procurement_user: 'bg-amber-100 text-amber-800 border-amber-200',
  factory_user: 'bg-orange-100 text-orange-800 border-orange-200',
  store_user: 'bg-teal-100 text-teal-800 border-teal-200',
  qc_user: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  afs_user: 'bg-rose-100 text-rose-800 border-rose-200',
  viewer: 'bg-gray-100 text-gray-700 border-gray-200',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  operations_manager: 'Operations',
  sales_user: 'Sales',
  sales_coordinator: 'Coordinator',
  procurement_user: 'Procurement',
  factory_user: 'Factory',
  store_user: 'Store',
  qc_user: 'QC',
  afs_user: 'AFS',
  viewer: 'Viewer',
}

interface RoleBadgeProps {
  role: string
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const style = ROLE_STYLES[role] ?? 'bg-gray-100 text-gray-700 border-gray-200'
  const label = ROLE_LABELS[role] ?? role.replace(/_/g, ' ')
  return (
    <Badge variant="outline" className={cn(style, className)}>
      {label}
    </Badge>
  )
}
