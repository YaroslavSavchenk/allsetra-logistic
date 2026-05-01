/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      // Surface + accent colours are routed through CSS custom properties so
      // a `data-theme` attribute on <html> swaps the palette instantly without
      // touching individual components. The actual colour values live in
      // `src/index.css` under `[data-theme='dark']` / `[data-theme='light']`.
      // Tailwind opacity utilities (e.g. bg-surface-850/60) keep working
      // because Tailwind 3.3+ wraps custom properties in color-mix() when an
      // alpha modifier is present.
      colors: {
        surface: {
          950: 'var(--color-surface-950)',
          900: 'var(--color-surface-900)',
          850: 'var(--color-surface-850)',
          800: 'var(--color-surface-800)',
          700: 'var(--color-surface-700)',
          600: 'var(--color-surface-600)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          muted: 'var(--color-accent-muted)',
        },
      },
    },
  },
  plugins: [],
};
