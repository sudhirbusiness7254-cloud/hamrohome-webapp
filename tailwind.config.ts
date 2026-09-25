import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#11241f',
        clay: '#e9623d',
        mint: '#dcefe8',
        paper: '#f8f8f5'
      }
    }
  },
  plugins: []
};

export default config;
