import { useEffect, useRef } from 'react';
import { TEXT_SIZES, THEMES } from '../lib/settings.js';

/** One group of choices, as real radio buttons styled as cards. */
export function Choice({ legend, name, options, value, onChange }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-semibold text-slate-900">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const checked = value === option.id;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 focus-within:ring-2 focus-within:ring-brand-primary ${
                checked ? 'border-brand-primary bg-highlight' : 'border-slate-300 bg-surface hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={checked}
                onChange={() => onChange(option.id)}
                className="h-4 w-4 accent-[rgb(var(--brand-primary))]"
              />
              <span className="text-sm font-medium text-slate-900">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Text size and theme choices – used in this window and on the account Settings page (D77). */
export function DisplaySettings({ settings, onChange }) {
  return (
    <>
      <Choice legend="Text size" name="text-size" options={TEXT_SIZES} value={settings.textSize} onChange={(textSize) => onChange({ textSize })} />
      <Choice legend="Theme" name="theme" options={THEMES} value={settings.theme} onChange={(theme) => onChange({ theme })} />
    </>
  );
}

/**
 * Settings (D60): text size and colour theme. Changes apply straight away and
 * are saved automatically – there is no Save button, as elsewhere (D10).
 * Built on the native <dialog>, like the task window (D17): focus stays inside,
 * Escape closes it, and focus returns to the Settings button.
 *
 * @param {{ open: boolean, onClose: () => void, settings: object, onChange: (changes: object) => void }} props
 */
export default function SettingsDialog({ open, onClose, settings, onChange }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="settings-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      className="max-h-[calc(100vh-32px)] w-[min(720px,calc(100vw-32px))] overflow-y-auto rounded-lg border border-slate-200 bg-surface p-0 text-slate-900 shadow-xl backdrop:bg-black/60"
    >
      {open && (
        <div className="grid gap-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="settings-title" className="text-lg font-semibold">Settings</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
            >
              Done
            </button>
          </div>

          <Choice
            legend="Text size"
            name="text-size"
            options={TEXT_SIZES}
            value={settings.textSize}
            onChange={(textSize) => onChange({ textSize })}
          />
          <Choice
            legend="Theme"
            name="theme"
            options={THEMES}
            value={settings.theme}
            onChange={(theme) => onChange({ theme })}
          />

          <p className="text-xs text-slate-600">
            Changes are saved automatically. Your browser's own zoom still works on top of these.
          </p>
        </div>
      )}
    </dialog>
  );
}
