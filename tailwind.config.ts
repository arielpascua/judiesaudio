import type { Config } from 'tailwindcss';
import { COLOURS } from './lib/design/tokens';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chalk: { DEFAULT: COLOURS.chalk, deep: COLOURS.chalkDeep },
        ink: { DEFAULT: COLOURS.ink, muted: COLOURS.inkMuted },
        cobalt: { DEFAULT: COLOURS.cobalt, dark: COLOURS.cobaltDark },
        graphite: COLOURS.graphite,
        amber: COLOURS.amber,
        line: COLOURS.line,
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      maxWidth: { page: '88rem' },
    },
  },
  plugins: [],
};

export default config;
