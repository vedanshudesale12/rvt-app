# Design rules

The product name lives in `src/config/brand.ts`. Everything else follows from that.

## Look

- Black and white. Dark purple `#4B1494` is for a few marks only: the logo, the active nav bar, one chart series, a banner word.
- Flat. No gradients, neon, glow, or drop shadows.
- Corners are square, or 2px at most. No `rounded-2xl` or `rounded-3xl`.
- Separation comes from a 1px line and from contrast, not from a floating card.
- Replace the Tailwind default palette. Use the tokens in `src/app/globals.css`: `ink`, `paper`, `panel`, `line`, `muted`, `invert`, `accent`, `danger`, `ok`.
- Do not use `bg-indigo-*`, `bg-violet-*`, `bg-purple-*`, `bg-slate-*`, `from-purple`, `bg-gradient-to-*`, or `shadow-*`. ESLint rule `rvt/no-banned-classes` fails the build on those.

## Type

- Headings and big numbers: Archivo Narrow, bold, tight tracking, often uppercase.
- Body: IBM Plex Sans. Not Inter.

## Words

Plain. "Guest list", "Sales tonight", "Who owes what", "Comps", "Door", "People". Do not write "Empower", "Unlock", "seamless", or "elevate".

## Layout

Mobile first. PRs and door staff use phones. The door screen is a search box and large rows. Tap targets stay at least 44px. The sidebar collapses behind Menu.

## Logo

`public/brand/rvt-mark.svg` is the small mark (sidebar, door, favicon, PWA, email). `public/brand/rvt-logo.svg` is the wide lockup (login). Drop the official PNGs in those slots and run `npm run icons` if you replace the mark.
