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
        // ---- Brand primary (steel blue) ----
        primary: {
          50:  '#eef2f7',
          100: '#dce7f0',
          200: '#b9cee1',
          300: '#8fb0cd',
          400: '#5e88b0',
          500: '#356093', // base — buttons, active nav, links
          600: '#2c5080',
          700: '#244066',
          800: '#1e3350',
          900: '#182a41',
        },
        // ---- Warm-paper neutrals (replaces cold gray-50/900) ----
        paper: {
          bg:     '#f7f7f4', // app background
          card:   '#ffffff', // surfaces
          sunken: '#fbfbf9', // header / table zebra / footers
          line:   '#e6e5df', // primary borders
          hair:   '#efeee8', // internal hairlines / row dividers
          faint:  '#f4f3ee', // lightest divider
        },
        ink: {
          DEFAULT: '#1c1c1a', // headings
          strong:  '#20242b', // emphasised numerics
          body:    '#3f3e38', // body text
          muted:   '#6f6e64', // secondary text
          faint:   '#9a998f', // meta / timestamps
          ghost:   '#a6a59a', // labels / placeholders
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
