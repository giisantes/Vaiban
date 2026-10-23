import { useEffect } from 'react';

/**
 * Accessibility statement (#/accessibility). Says what has been done, how it
 * was checked, and what still doesn't work – honest gaps are part of being
 * "accessible by default" (Rousen, 2026), and a statement like this is what
 * UK public-sector sites are required to publish.
 */
export default function AccessibilityStatement() {
  useEffect(() => {
    document.title = 'Accessibility statement – Vaiban';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <main className="mx-auto grid max-w-2xl gap-5 text-sm leading-relaxed text-slate-800">
        <a href="#/" className="inline-flex min-h-[24px] items-center justify-self-start rounded py-1 text-link underline underline-offset-2 hover:no-underline">← Back to Vaiban</a>
        <h1 className="text-2xl font-semibold text-slate-900">Accessibility statement</h1>
        <p>
          Vaiban aims to be usable by everyone, including people who use a keyboard instead of a mouse, a screen
          reader, screen magnification or zoom, or who see colours differently. We aim to meet the Web Content
          Accessibility Guidelines (WCAG) 2.2 at level AA.
        </p>

        <section className="grid gap-2">
          <h2 className="text-lg font-semibold text-slate-900">What you can do</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Use everything with a keyboard alone. Press <kbd className="rounded border border-slate-300 bg-surface px-1">Tab</kbd> to move, <kbd className="rounded border border-slate-300 bg-surface px-1">Enter</kbd> to choose and <kbd className="rounded border border-slate-300 bg-surface px-1">Esc</kbd> to close. "Skip to main content" is the first thing on every page.</li>
            <li>Move cards between columns without dragging: use the <strong>Move</strong> button on each card. Dragging with a mouse also works.</li>
            <li>Undo the last change with the <strong>Undo</strong> button in the message at the bottom of the screen, or <kbd className="rounded border border-slate-300 bg-surface px-1">Ctrl</kbd>+<kbd className="rounded border border-slate-300 bg-surface px-1">Z</kbd>.</li>
            <li>Choose your text size in <strong>Settings</strong>. The standard size makes the smallest text 14pt, as recommended in <em>Access for All</em> (Goodwin and Loizides, 2025). You can also pick a smaller or larger size.</li>
            <li>Choose a <strong>light or dark theme</strong> in Settings, or let it follow your device (the default).</li>
            <li>Zoom up to 400%: the board changes to one column instead of scrolling sideways.</li>
            <li>Tell feature, bug and due-date states apart without colour – each has a word and an icon as well.</li>
            <li>Turn on "reduce motion" in your device settings to switch off animations.</li>
            <li>Use a password manager and paste passwords – nothing blocks them.</li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2 className="text-lg font-semibold text-slate-900">How we checked</h2>
          <p>
            Automated checks of colour contrast, target sizes and page structure; keyboard-only testing of every
            task; and testing at 320 pixels wide (the same as 400% zoom). Every text colour meets the 4.5:1 contrast
            ratio.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Known problems</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>We have not yet tested Vaiban with disabled users or with every screen reader. This is planned.</li>
            <li>Cards can't be put in a particular order within a column yet – a moved card goes to the bottom.</li>
            <li>The Context field shows Markdown as plain text, not formatted.</li>
          </ul>
        </section>

        <section className="grid gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Tell us about a problem</h2>
          <p>
            If something doesn't work for you, please{' '}
            <a href="https://github.com/giisantes/vibecoding-project-tracker/issues" className="rounded text-link underline underline-offset-2 hover:no-underline">
              report it on GitHub
            </a>
            . We'll treat accessibility problems as bugs.
          </p>
        </section>

        <p className="text-xs text-slate-600">Last reviewed 22 October 2026.</p>
      </main>
    </div>
  );
}
