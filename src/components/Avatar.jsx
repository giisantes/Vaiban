import { avatarColour, initials } from '../lib/people.js';
import { useAvatarFor } from '../lib/profiles.js';

/**
 * Round badge with a person's initials (M7), or their profile picture if they
 * have one (D77). Unassigned tasks show a dashed "?" circle. Decorative –
 * the name is always shown or announced alongside, so this never stands alone.
 *
 * @param {{ name: string, size?: 'sm'|'md'|'lg', src?: string }} props
 *   src: a picture to show; otherwise one is looked up by name (AvatarContext)
 */
export default function Avatar({ name, size = 'md', src }) {
  const found = useAvatarFor(name);
  const picture = src ?? found;
  // Initials are decorative (the name is always written next to them), so they
  // can be smaller than body text; rem keeps them in step with the text-size setting.
  const dims = size === 'sm' ? 'h-7 w-7 text-[0.75rem]' : size === 'lg' ? 'h-24 w-24 text-[1.75rem]' : 'h-9 w-9 text-[0.875rem]';
  if (picture) {
    return <img src={picture} alt="" aria-hidden="true" className={`inline-block shrink-0 rounded-full border border-slate-200 bg-surface object-cover ${dims}`} />;
  }
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
