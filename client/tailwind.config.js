/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            pre: {
              backgroundColor: '#f9fafb',
              color: '#1f2937',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
            },
            'pre code': {
              backgroundColor: 'transparent',
              color: 'inherit',
              padding: 0,
              borderRadius: 0,
              fontWeight: '400',
            },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
