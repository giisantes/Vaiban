import { avatarColour, initials } from '../lib/people.js';

/**
 * Round badge with a person's initials (M7). Unassigned tasks show a
 * dashed "?" circle. The initials are decorative – the name is always
 * shown or announced alongside, so this never stands alone.
 *
 * @param {{ name: string, size?: 'sm'|'md' }} props
 */
export default function Avatar({ name, size = 'md' }) {
  // Initials are decorative (the name is always written next to them), so they
  // can be smaller than body text; rem keeps them in step with the text-size setting.
  const dims = size === 'sm' ? 'h-7 w-7 text-[0.75rem]' : 'h-9 w-9 text-[0.875rem]';
  if (!name) {
    return (
      <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-slate-400 font-semibold text-slate-600 ${dims}`}>
        ?
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${avatarColour(name)} ${dims}`}>
      {initials(name)}
    </span>
  );
}
