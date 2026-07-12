import tailwindAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
// ── FT Operations Portal — Visual Identity v1.0 ──────────────────────────────
// Derived from FTOperationsIdentity.md (NAFFCO Vehicles Division brand system).
//
// The identity is applied primarily at THIS token layer, so the ~5,000 existing
// Tailwind color classes across 138 pages recolor with no page edits:
//   • brand      → Executive Navy (the working primary; NOT red)
//   • gray/slate/charcoal → cool-steel neutral (blue-cast, sits next to navy)
//   • red/rose   → Danger family (NAFFCO Emergency Red #C8102E)
//   • green/emerald/teal → Success family
//   • amber/yellow/orange → Warning family
//   • sky/blue/indigo → Info family (shares the navy hue — one "system" blue,
//     not a fifth competing color)
// Red is reserved for: logo mark, sidebar active bar, and the Danger family.
// ─────────────────────────────────────────────────────────────────────────────

// Executive Navy — the working primary.
const navy = {
  50:  '#F2F5FA', 100: '#E4EAF4', 200: '#C6D3E7', 300: '#9FB4D2',
  400: '#6E8BB4', 500: '#47648F', 600: '#365486', 700: '#2A4572',
  800: '#20375E', 900: '#16294A', 950: '#101F38',
}

// Cool steel — carries 90% of the UI; converges on Navy Ink at the dark end.
const steel = {
  50:  '#F9FAFB', 100: '#F4F5F7', 200: '#E8EBF0', 300: '#D1D9E3',
  400: '#A8B5C5', 500: '#64748B', 600: '#4A5568', 700: '#364256',
  800: '#232D40', 900: '#101F38', 950: '#0B1526',
}

// Danger = NAFFCO Emergency Red.
const dangerScale = {
  50:  '#FDE8EB', 100: '#FBD5DB', 200: '#F5B7C0', 300: '#EE8FA0',
  400: '#E04A63', 500: '#C8102E', 600: '#B5112A', 700: '#9B0E22',
  800: '#7C0B1B', 900: '#5E0814', 950: '#3D050D',
}

const successScale = {
  50:  '#E9F4EE', 100: '#D3E9DD', 200: '#C0DFCE', 300: '#94C8AC',
  400: '#4FA67C', 500: '#1A7A4A', 600: '#177044', 700: '#146039',
  800: '#0F4A2C', 900: '#0B3620', 950: '#062315',
}

const warningScale = {
  50:  '#FBF3E4', 100: '#F7E9C9', 200: '#F0DAAC', 300: '#E6C173',
  400: '#D89A3A', 500: '#B45309', 600: '#A34A07', 700: '#8A4A06',
  800: '#6E3A05', 900: '#522B04', 950: '#3A1E03',
}

// Info shares the navy hue on purpose (reads as "system/process", not a 5th color).
const infoScale = navy

export default {
  darkMode: ['class'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand + neutral remaps (recolor the whole app from tokens) ────────
        brand: navy,
        gray: steel,
        slate: { ...steel, 925: '#0B1526' },
        charcoal: steel,

        // ── Semantic scale remaps (discipline the rainbow → identity families) ─
        red: dangerScale,
        rose: dangerScale,
        green: successScale,
        emerald: successScale,
        teal: successScale,
        amber: warningScale,
        yellow: warningScale,
        orange: warningScale,
        sky: infoScale,
        blue: infoScale,
        indigo: infoScale,

        // ── Named semantic tokens (tint / border / text / solid) for chips ────
        success: { tint: '#E9F4EE', border: '#C0DFCE', text: '#146039', DEFAULT: '#1A7A4A' },
        warning: { tint: '#FBF3E4', border: '#F0DAAC', text: '#8A4A06', DEFAULT: '#B45309' },
        danger:  { tint: '#FDE8EB', border: '#F5B7C0', text: '#9B0E22', DEFAULT: '#C8102E',
                   hover: '#B5112A', pressed: '#9B0E22' },
        info:    { tint: '#EBF1F9', border: '#C6D6EC', text: '#2A4572', DEFAULT: '#365486' },
        action:  { DEFAULT: '#2A4572', hover: '#253E68', pressed: '#20375E' },

        // Surface hierarchy tokens.
        surface: {
          1: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-2))',
          3: 'hsl(var(--surface-3))',
        },
        // shadcn/ui CSS variable tokens.
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans Arabic', '-apple-system', 'Segoe UI', 'Tahoma', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        // Base 6px (cards/tables/alerts); buttons/inputs/chips 4px; modals 8px.
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        btn: '4px',
        chip: '4px',
        card: '6px',
        modal: '8px',
      },
      boxShadow: {
        xs:  'var(--shadow-xs)',
        sm:  'var(--shadow-sm)',
        md:  'var(--shadow-md)',
        lg:  'var(--shadow-lg)',
        xl:  'var(--shadow-xl)',
        focus: '0 0 0 3px rgba(54,84,134,0.35)',
        'focus-danger': '0 0 0 3px rgba(200,16,46,0.30)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    tailwindAnimate,
  ],
}
