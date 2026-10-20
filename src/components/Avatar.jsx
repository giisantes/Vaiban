import { avatarColour, initials } from '../lib/people.js';

/**
 * Round badge with a person's initials (M7). Unassigned tasks show a
 * dashed "?" circle. The initials are decorative – the name is always
 * shown or announced alongside, so this never stands alone.
 *
 * @param {{ name: string, size?: 'sm'|'md' }} props
 */
export default function Avatar({ name, size = 'md' }) {
  const dims = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-xs';
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
