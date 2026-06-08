import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Optional primary action rendered in the footer. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Right-side slide-over panel. Full-width on mobile, ~480px on desktop.
 * Closes on overlay click or Escape. Used for KPI / summary card detail views.
 */
export function Drawer({ open, onClose, title, subtitle, footer, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // Prevent background scroll while the drawer is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 animate-[fadeIn_120ms_ease-out]"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          'absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl',
          'flex flex-col animate-[slideInRight_180ms_ease-out]',
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="px-5 py-3 border-t border-gray-200 shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
