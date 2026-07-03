/**
 * Assemble49 Fleet Console — "Signal" theme.
 * darkMode: 'class' + colours point at CSS variables (src/styles/tokens.css),
 * so a single `.dark` / `.compact` class on <html> re-themes the whole app and
 * every existing `bg-paper-card` / `text-ink` / `bg-success-bg` utility flips
 * for free — no `dark:` variants needed.
 */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          50:  'var(--primary-50)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
        },
        peri: 'var(--peri)',
        accent: { DEFAULT: 'var(--peri)', soft: 'var(--primary-50)' },
        paper: {
          bg:     'var(--bg)',
          card:   'var(--card)',
          sunken: 'var(--sunken)',
          line:   'var(--border)',
          hair:   'var(--hair)',
          faint:  'var(--faintline)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          strong:  'var(--num)',
          body:    'var(--body)',
          muted:   'var(--muted)',
          faint:   'var(--faint)',
          ghost:   'var(--ghost)',
        },
        success: { DEFAULT: 'var(--success)', bg: 'var(--success-bg)' },
        warning: { DEFAULT: 'var(--warning)', bg: 'var(--warning-bg)' },
        info:    { DEFAULT: 'var(--info)',    bg: 'var(--info-bg)' },
        danger:  { DEFAULT: 'var(--danger)',  bg: 'var(--danger-bg)' },
        neutral: { DEFAULT: 'var(--neutral)', bg: 'var(--neutral-bg)' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        meta: ['10px', { lineHeight: '14px', letterSpacing: '0.08em' }],
        xs:   ['11px', { lineHeight: '16px' }],
        sm:   ['13px', { lineHeight: '18px' }],
        base: ['14px', { lineHeight: '20px' }],
        lg:   ['15px', { lineHeight: '22px' }],
        xl:   ['17px', { lineHeight: '24px' }],
        stat: ['26px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
      },
      borderRadius: { control: '8px', card: '11px', pill: '999px' },
      boxShadow: {
        card: 'var(--sh)',
        pop: '0 24px 60px -32px rgba(20,20,35,0.45)',
        pin: '0 2px 6px rgba(0,0,0,0.28)',
      },
      // density-aware spacing (flip with .compact): p-pad / px-pad / gap-gap …
      spacing: { pad: 'var(--pad)', rpad: 'var(--rpad)', gap: 'var(--gap)' },
    },
  },
  plugins: [],
};
