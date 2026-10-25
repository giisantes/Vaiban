/** @type {import('tailwindcss').Config} */

// Colours come from CSS variables (src/index.css), so one set of class names
// works in both the light and the dark theme: the variables change, the
// classes don't. `<alpha-value>` keeps opacity modifiers like bg-slate-50/95 working.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Greys: the light theme uses Tailwind's own slate values; the dark
        // theme swaps them round (light text on dark surfaces).
        slate: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [n, v(`slate-${n}`)])),
        surface: v('surface'),       // cards, inputs, dialogs (white in the light theme)
        highlight: v('highlight'),   // drop target, import banner
        link: v('link'),             // link text – lighter blue in the dark theme

        // Brand colours from DESIGN.md §2.
        // The accent yellow is 1.6:1 on white: backgrounds and outlines only, never text on light.
        brand: { primary: v('brand-primary'), accent: '#F2C94C' },

        // M6 tag-style — task type colours (DESIGN.md §2).
        // `DEFAULT` = stripe / icon / label text, `soft` = badge background.
        feature: { DEFAULT: v('feature'), soft: v('feature-soft') },
        bug:     { DEFAULT: v('bug'),     soft: v('bug-soft') },

        // M8 due-tint — due-date states (DESIGN.md §2).
        // `DEFAULT` = label text / solid chip, `soft` = card tint, `on` = text on the solid chip.
        due: {
          safe:    { DEFAULT: v('due-safe'),    soft: v('due-safe-soft') },
          warning: { DEFAULT: v('due-warning'), soft: v('due-warning-soft') },
          overdue: { DEFAULT: v('due-overdue'), soft: v('due-overdue-soft'), on: v('due-overdue-on') },
          neutral: { DEFAULT: v('due-neutral'), soft: v('due-neutral-soft') },
        },
      },

      // Text sizes (D59, D60): the actual sizes live in CSS variables in
      // index.css, one set per Settings option (Smaller / Default / Larger).
      fontSize: Object.fromEntries(
        ['xs', 'sm', 'base', 'lg', 'xl', '2xl'].map((k) => [k, [`var(--fs-${k})`, { lineHeight: `var(--lh-${k})` }]])
      ),

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
