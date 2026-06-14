import { FileText, Download, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/primitives/button'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

interface DocumentCardProps {
  name: string
  documentType?: string
  storageUrl?: string
  uploadedBy?: string
  uploadedAt?: string
  version?: number
  onDownload?: () => void
  onDelete?: () => void
  canDelete?: boolean
  className?: string
}

export function DocumentCard({
  name,
  documentType,
  storageUrl,
  uploadedBy,
  uploadedAt,
  version,
  onDownload,
  onDelete,
  canDelete = false,
  className,
}: DocumentCardProps) {
  return (
    <div className={cn(
      'flex items-start gap-3 rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors',
      className
    )}>
      <div className="mt-0.5 shrink-0 rounded-md bg-muted p-2 text-muted-foreground">
        <FileText className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {documentType && <span>{documentType}</span>}
          {version !== undefined && <span>v{version}</span>}
          {uploadedBy && <span>by {uploadedBy}</span>}
          {uploadedAt && <span>{formatDate(uploadedAt)}</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {storageUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            asChild
          >
            <a href={storageUrl} target="_blank" rel="noopener noreferrer" aria-label="Open document">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
        {onDownload && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onDownload}
            aria-label="Download document"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
        {canDelete && onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete document"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
