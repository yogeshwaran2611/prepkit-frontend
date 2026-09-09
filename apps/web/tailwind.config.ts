import type { Config } from 'tailwindcss';

/**
 * Tailwind is configured to expose ONLY semantic tokens as colours. There is no `blue-500`
 * in this design system, so a component physically cannot introduce an off-palette colour —
 * uniformity by construction rather than by review (PLAN.md §10.2).
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-muted': 'var(--surface-muted)',
        border: 'var(--border)',
        fg: 'var(--fg)',
        'fg-muted': 'var(--fg-muted)',
        'fg-subtle': 'var(--fg-subtle)',
        accent: 'var(--accent)',
        'accent-fg': 'var(--accent-fg)',
        'accent-muted': 'var(--accent-muted)',
        success: 'var(--success)',
        'success-muted': 'var(--success-muted)',
        warning: 'var(--warning)',
        'warning-muted': 'var(--warning-muted)',
        danger: 'var(--danger)',
        'danger-muted': 'var(--danger-muted)',
      },
      borderRadius: { sm: '4px', DEFAULT: '8px', md: '10px', lg: '14px', xl: '20px' },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      transitionDuration: { fast: '120ms', DEFAULT: '180ms', slow: '240ms' },
    },
  },
  plugins: [],
} satisfies Config;
