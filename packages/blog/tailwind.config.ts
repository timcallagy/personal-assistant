import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Editor template inspired colors
        primary: '#333333',
        secondary: '#666666',
        accent: '#c9a959', // Gold accent from Editor template
        muted: '#999999',
        background: '#ffffff',
        surface: '#f9f9f9',
        border: '#eeeeee',
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        serif: ['Droid Serif', 'Georgia', 'serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#333',
            a: {
              color: '#c9a959',
              '&:hover': {
                color: '#a88a3d',
              },
            },
            h1: {
              fontFamily: 'Droid Serif, Georgia, serif',
            },
            h2: {
              fontFamily: 'Droid Serif, Georgia, serif',
            },
            h3: {
              fontFamily: 'Droid Serif, Georgia, serif',
            },
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
