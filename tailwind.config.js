/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // M6 tag-style — task type colours from DESIGN.md §2.
        // `DEFAULT` is the strong colour (stripe, icon, label text);
        // `soft` is the light badge background. Both pass WCAG AA together (5.4:1).
        // Use as e.g. `border-l-feature`, `bg-feature-soft text-feature`.
        feature: { DEFAULT: '#2F5FA8', soft: '#E6EEFA' },
        bug:     { DEFAULT: '#B3262D', soft: '#FBE5E6' },
        // Tweak in M8 (due-tint)
      },
    },
  },
  plugins: [],
};
