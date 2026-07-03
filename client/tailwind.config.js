/**
 * MNC Fleet — "Signal" design system
 * Tailwind theme tokens.
 *
 * Philosophy: utilitarian, data-dense, borders-over-shadows.
 * Warm-paper neutrals (not cold gray), one steel-blue primary,
 * a deliberate semantic status palette, and a mono face for all
 * numerics / IDs / plates so tabular data lines up and reads as "data".
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Brand primary (Assemble49 indigo) ----
        primary: {
          50:  '#eeeef8',
          100: '#dcdcf0',
          200: '#bbbce1',
          300: '#9596cf', // periwinkle — matches the logo "A" outline
          400: '#6365a4',
          500: '#40427a', // base — buttons, active nav, links (logo "A" fill)
          600: '#343565',
          700: '#2a2b50',
          800: '#232340',
          900: '#1c1c31',
        },
        // periwinkle accent from the logo outline
        accent: {
          DEFAULT: '#9596cf',
          soft:    '#e9e9f6',
        },
        // ---- Cool slate-paper neutrals (sit with the indigo/slate brand) ----
        paper: {
          bg:     '#f4f5f8', // app background
          card:   '#ffffff', // surfaces
          sunken: '#f8f9fc', // header / table zebra / footers
          line:   '#e2e3ec', // primary borders
          hair:   '#ecedf3', // internal hairlines / row dividers
          faint:  '#f1f2f7', // lightest divider
        },
        ink: {
          DEFAULT: '#1e1e2a', // headings
          strong:  '#232430', // emphasised numerics
          body:    '#3e3f4b', // body text
          muted:   '#696a78', // secondary text
          faint:   '#9597a5', // meta / timestamps
          ghost:   '#a2a4b1', // labels / placeholders
        },
        // ---- Semantic status palette (see theme/status.ts for enum mapping) ----
        success:  { DEFAULT: '#17935b', bg: '#e4f4ec' },
        warning:  { DEFAULT: '#bd7f14', bg: '#f7edd6' }, // also "in-progress"
        info:     { DEFAULT: '#2f6ea8', bg: '#e6eff7' },
        danger:   { DEFAULT: '#b0392f', bg: '#f6e6e3' },
        neutral:  { DEFAULT: '#6b7688', bg: '#eceef2' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'meta':  ['10px', { lineHeight: '14px', letterSpacing: '0.08em' }],
        'xs':    ['11px', { lineHeight: '16px' }],
        'sm':    ['13px', { lineHeight: '18px' }],
        'base':  ['14px', { lineHeight: '20px' }],
        'lg':    ['15px', { lineHeight: '22px' }],
        'xl':    ['17px', { lineHeight: '24px' }],
        'stat':  ['26px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        control: '8px',
        card:    '11px',
        pill:    '999px',
      },
      boxShadow: {
        pop: '0 24px 60px -32px rgba(30,30,25,0.4)',
        pin: '0 2px 6px rgba(0,0,0,0.28)',
      },
    },
  },
  plugins: [],
};
