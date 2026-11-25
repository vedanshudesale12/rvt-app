# Design rules

The product name lives in `src/config/brand.ts`. Everything else follows from that.

## Look

- Dark. The page is near-black `#121212`, text is off-white `#F3F3EE`, panels are `#1C1C1C`, and lines and quiet text are grey. Those pairs meet WCAG AA (off-white on the page is about 17:1, muted grey about 10:1, input borders about 3.3:1).
- One dark purple accent, `#4B1494`. It is a fill with off-white type on it (about 10:1), or a bar sitting on the off-white chart rail. It is not small purple type on the black page, which would fail contrast.
- Flat. No gradients, neon, glow, or drop shadows. The logo file may keep its own gradient.
- Corners are square, or 2px at most. No `rounded-2xl` or `rounded-3xl`.
- Separation comes from a 1px line and from contrast, not from a floating card.
- Replace the Tailwind default palette. Use the tokens in `src/app/globals.css`: `ink`, `paper`, `panel`, `line`, `muted`, `invert`, `accent`, `danger`, `ok`.
- Do not use `bg-indigo-*`, `bg-violet-*`, `bg-purple-*`, `bg-slate-*`, `from-purple`, `bg-gradient-to-*`, `bg-linear-to-*`, or `shadow-*`. ESLint rule `rvt/no-banned-classes` fails the build on those.

Guests are 18 or older. The guest and comp forms require that confirmation. There is no under-18 event type.

## Type

- Headings and big numbers: Archivo Narrow, bold, tight tracking, often uppercase.
- Body: IBM Plex Sans. Not Inter.

## Words

Plain. "Guest list", "Sales tonight", "Who owes what", "Comps", "Door", "People". Do not write "Empower", "Unlock", "seamless", or "elevate".

## Layout

Mobile first. PRs and door staff use phones. The door screen is a search box and large rows. Tap targets stay at least 44px. The sidebar collapses behind Menu.

## Logo

`public/brand/rvt-logo.webp` is the full lockup used on login, signup, and the door (under 150 KB). `public/brand/rvt-logo.png` is the source file. `public/brand/rvt-mark.png` is the RVT mark (sidebar, favicon, PWA). The logo file may contain its own purple gradient. The interface around it stays flat. `npm run icons` rebuilds the small icons from the mark.
