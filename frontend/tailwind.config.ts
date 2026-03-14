import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7C5CFC',
          pink: '#E879A0',
          bgWarm: '#F5EEE8',
          bgCool: '#EDE9F6',
          card: '#FFFFFF',
        },
      },
      fontFamily: {
        display: ['Outfit', 'DM Sans', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
