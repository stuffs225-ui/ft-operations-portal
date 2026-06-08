import { cn } from '../../lib/utils';

// Single source of truth for the brand mark location. To switch to the official
// NAFFCO logo, replace /public/naffco-logo.svg (or set this to '/naffco-logo.png'
// after dropping that file into /public).
const LOGO_SRC = '/naffco-logo.svg';

interface BrandLogoProps {
  /** Pixel size of the square mark. Defaults to 32. */
  size?: number;
  /** Show the "NAFFCO / Fire Trucks Department" wordmark next to the mark. */
  withWordmark?: boolean;
  /** Optional tagline under the wordmark, e.g. "Operations Portal". */
  tagline?: string;
  className?: string;
}

/**
 * NAFFCO Fire Trucks brand lockup used in the header and sidebar.
 * Renders the mark from /public so the official asset can be swapped in without
 * touching component code.
 */
export function BrandLogo({ size = 32, withWordmark = false, tagline, className }: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src={LOGO_SRC}
        alt="NAFFCO"
        width={size}
        height={size}
        className="rounded-lg shrink-0"
        style={{ width: size, height: size }}
      />
      {withWordmark && (
        <div className="leading-tight min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold tracking-tight text-gray-900 text-sm">NAFFCO</span>
            <span className="text-[11px] font-medium text-brand-700 hidden sm:inline">Fire Trucks</span>
          </div>
          {tagline && (
            <div className="text-[10px] text-gray-500 truncate">{tagline}</div>
          )}
        </div>
      )}
    </div>
  );
}
