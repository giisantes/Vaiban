/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand colours from DESIGN.md §2.
        // The accent yellow is 1.6:1 on white: backgrounds and outlines only, never text.
        brand: { primary: '#23466E', accent: '#F2C94C' },

        // M6 tag-style — task type colours from DESIGN.md §2.
        // `DEFAULT` is the strong colour (stripe, icon, label text);
        // `soft` is the light badge background. Both pass WCAG AA together (5.4:1).
        // Use as e.g. `border-l-feature`, `bg-feature-soft text-feature`.
        feature: { DEFAULT: '#2F5FA8', soft: '#E6EEFA' },
        bug:     { DEFAULT: '#B3262D', soft: '#FBE5E6' },

        // M8 due-tint — due-date states from DESIGN.md §2.
        // `DEFAULT` = label text / solid chip, `soft` = card tint.
        // Every DEFAULT passes WCAG AA on its soft tint (5.0–6.2:1) and on white.
        due: {
          safe:    { DEFAULT: '#2F6B55', soft: '#E7F2EC' },
          warning: { DEFAULT: '#8A5A00', soft: '#FDF1D6' },
          overdue: { DEFAULT: '#A3242B', soft: '#FBE6E7' },
          neutral: { DEFAULT: '#5B6878', soft: '#EEF1F4' },
        },
      },
      // M7 task-owner — the handoff toast fades in over 200 ms (DESIGN.md §7).
      keyframes: {
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: { 'toast-in': 'toast-in 200ms ease-out' },
    },
  },
  plugins: [],
};
