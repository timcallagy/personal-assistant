import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom dark theme palette (PA)
        background: {
          DEFAULT: '#0f172a', // slate-900
          secondary: '#1e293b', // slate-800
          tertiary: '#334155', // slate-700
        },
        foreground: {
          DEFAULT: '#f8fafc', // slate-50
          secondary: '#cbd5e1', // slate-300
          muted: '#64748b', // slate-500
        },
        accent: {
          DEFAULT: '#06b6d4', // cyan-500
          hover: '#22d3ee', // cyan-400
          muted: '#0891b2', // cyan-600
        },
        success: '#22c55e', // green-500
        warning: '#f59e0b', // amber-500
        error: '#ef4444', // red-500
        priority: {
          critical: '#ef4444', // red-500
          high: '#f97316', // orange-500
          medium: '#eab308', // yellow-500
          low: '#22c55e', // green-500
        },
        // Blog theme colors (light theme)
        'blog-primary': '#333333',
        'blog-secondary': '#666666',
        'blog-accent': '#c9a959', // Gold accent
        'blog-muted': '#999999',
        'blog-background': '#ffffff',
        'blog-surface': '#f9f9f9',
        'blog-border': '#eeeeee',
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        serif: ['Droid Serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
