import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        sunken: token('sunken'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        accent: token('accent'),
        'accent-fg': token('accent-fg'),
        mark: token('mark'),
        danger: token('danger'),
        ok: token('ok'),
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['"Bricolage Grotesque Variable"', 'var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: { shell: '76rem' },
    },
  },
  plugins: [],
};

export default config;
