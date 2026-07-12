import { cn } from '../../lib/utils';

// FT Operations brand lockup (Visual Identity D8 — interim mark).
// Renders the identity "FT" red square + "FT Operations" wordmark, with an
// optional "NAFFCO VEHICLES DIVISION" tagline. No image dependency so it never
// shows a broken asset; when the official NAFFCO logo arrives it replaces the
// mark 1:1 (drop /public/naffco-logo.svg and swap the mark element).

interface BrandLogoProps {
  /** Pixel size of the square mark. Defaults to 28. */
  size?: number;
  /** Show the "FT Operations" wordmark next to the mark. */
  withWordmark?: boolean;
  /** Optional tagline under the wordmark (e.g. "NAFFCO Vehicles Division"). */
  tagline?: string;
  /** On-dark contexts (the navy sidebar) — white wordmark. */
  dark?: boolean;
  className?: string;
}

export function BrandLogo({ size = 28, withWordmark = false, tagline, dark = false, className }: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* Emergency-red mark — one of the only three places red appears. */}
      <div
        className="flex items-center justify-center rounded-btn shrink-0 font-extrabold text-white"
        style={{ width: size, height: size, background: '#C8102E', fontSize: Math.round(size * 0.46) }}
      >
        FT
      </div>
      {withWordmark && (
        <div className="leading-tight min-w-0">
          <div className={cn('font-semibold tracking-tight text-sm', dark ? 'text-white' : 'text-gray-900')}>
            FT Operations
          </div>
          {tagline && (
            <div
              className={cn(
                'text-[9px] font-semibold uppercase tracking-[0.08em] truncate',
                dark ? 'text-white/45' : 'text-gray-500',
              )}
            >
              {tagline}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
