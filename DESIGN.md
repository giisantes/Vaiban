# Vibecoding Project Tracker — Design

**Status:** Hackathon starter design doc · fill in the **`<TODO>`** sections before you tag `design-done`.

**Why this file exists.** This tracker is your tool. It should look like *your* tool — not a generic Kanban with default Tailwind blue. Twenty minutes of design decisions here will be visible on every screen for the next six weeks of Module 5.

**Who owns this.** Person B, during the same window the rest of the team is reviewing the PRD. By the time the team converges to start M4 (`data-model`), this file should be filled in and the colors should already be in `tailwind.config.js`.

---

## 1. Mood / vibe

One sentence that captures the feeling the tracker should leave you with.

A calm, tidy workbench for messy, fast-moving AI projects: everything has a place, and the one thing that needs your attention stands out.

Two or three references that capture the vibe (links to dribbble shots, screenshots of apps you admire, Pinterest boards — anything visual):

- A physical sticky-note wall: the yellow accent and a board of cards, one idea per note.
- Trello's cards: readable at a glance, with the title doing most of the work.
- GitHub Projects: quiet and dense, built for developers rather than for show.

Anti-references — what we are explicitly **not** trying to look like:

- A default Tailwind template with blue buttons everywhere, or a neon "gamer" dashboard with glowing gradients — and anything that shows status by colour alone (red/green dots with no words).

## 2. Color palette

These are the colors the build milestones will reference. Once chosen, paste the hex values into `tailwind.config.js` so the rest of the team can use Tailwind utility classes (e.g. `bg-brand-primary`, `border-due-warning`).

### Brand

| Token | Hex | Where it shows up |
|---|---|---|
| `brand-primary` | `#23466E` | Header, "+" button, focus rings |
| `brand-accent` | `#F2C94C` | Highlights, hover states, links |
| `surface-page` | `#F4F6F8` | Page background |
| `surface-card` | `#FFFFFF` | Card background |
| `text-primary` | `#1B2430` | Body text |
| `text-muted` | `#5B6878` | Captions, dates, counts |

### Task type (M6 `tag-style`)

| Token | Hex | When used |
|---|---|---|
| `type-feature` | `#2F5FA8` | Cards tagged `feature` (accent stripe + icon) |
| `type-bug` | `#B3262D` | Cards tagged `bug` (accent stripe + icon) |

### Due-date states (M8 `due-tint`)

| Token | Hex | When used |
|---|---|---|
| `due-safe` | `#2F6B55` | More than 2 days out |
| `due-warning` | `#8A5A00` | Less than 24 hours |
| `due-overdue` | `#A3242B` | Past due |
| `due-neutral` | `#5B6878` | Done (overrides date) |

## 3. Typography

| Role | Font | Why |
|---|---|---|
| Heading | Bricolage Grotesque | Has character without being loud, so headings feel made for this tool rather than templated. |
| Body | IBM Plex Sans | Very readable at small sizes on dense cards, and designed for technical products. |
| Monospace (tags, badges, code) | IBM Plex Mono | Matches the body font and reads naturally for prompts and context briefings. |

Suggested sizes (override only if the design demands it):

- Page title: 24 px / semibold
- Section header: 16 px / semibold uppercase
- Card title: 14 px / medium
- Body: 14 px / regular
- Caption: 12 px / regular muted

## 4. Component principles

One short sentence per element. These set the tone for the build phase — Person A's modal and Person B's anchor board should both feel like they came from this doc.

- **Cards:** White with a 1px border and a 4px coloured left stripe for the type; the background only changes colour when a deadline needs attention.
- **Buttons:** One solid brand-primary button per screen for the main action; everything else is outlined and quiet.
- **Modal:** The native dialog element, centred, max 640px wide, dark backdrop at 50% opacity; Escape closes it and keyboard focus stays inside.
- **Empty states:** Dashed border and one plain sentence saying what will appear and how to add the first item.
- **Drag affordance (if used):** A dashed outline on the target column while dragging; the status dropdown always works too, so the keyboard is never a second-class way in.

## 5. Voice / microcopy

Three lines of microcopy that capture the tone of the product. Keep it short — these are the words a stressed user reads at 11pm.

| Where | Text |
|---|---|
| "+" button label | + Task |
| Empty column placeholder | Nothing here yet. |
| Toast after "Copy as Prompt Context" | Context copied. Paste it into your AI tool. |
| Confirm-delete message | Delete this task? You can undo it straight after. |
| Handoff toast (M7 `task-owner`) | Handed "{task}" to {name}. |
| Move toast (M12 `secret-sauce`) | Moved "{task}" to {column}. — with an **Undo** button |
| After undo (M12) | Undid {what was changed}. |

## 6. Logo / wordmark

The tracker probably doesn't need a logo, but it does need a name and a wordmark style.

- **Product name:** Vaiban – "vai" from the *vibe* in vibe coding, "ban" from kan*ban*. (Called Vibeboard until 23 Oct.)
- **Wordmark style:** The name in Bricolage Grotesque, text-primary colour, beside a small brand-accent sticky-note square.

## 7. Out of scope (this hackathon)

To keep design tight, the following are explicitly not part of `design-done`:

- A dark mode toggle. Pick one mode and ship it.
- Multiple themes. One brand, applied consistently.
- Animations beyond a 200 ms fade on toast notifications.
- A custom icon set. Use [Lucide icons](https://lucide.dev) via Tailwind classes if you need any.

---

*DESIGN.md version: hackathon-starter v1*
