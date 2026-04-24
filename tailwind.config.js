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
      colors: {
        surface: {
          950: '#0b0f14',
          900: '#0f141b',
          850: '#131925',
          800: '#1a2130',
          700: '#232c3d',
          600: '#2f3a4f',
        },
        accent: {
          DEFAULT: '#f59f00',
          hover: '#ffb224',
          muted: '#b7750d',
        },
      },
    },
  },
  plugins: [],
};
