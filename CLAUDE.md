# Wrapped SNCF

A static site that turns the CSV a user gets from SNCF Connect (GDPR data export) into a Spotify-Wrapped-style, scroll-animated recap of their train trips. Personal project, not affiliated with SNCF.

## Non-negotiable constraints

1. **Client-side only.** No user data is stored or sent anywhere. Parsing, computation and rendering all happen in the browser: no upload, no analytics or trackers, no third-party fonts, no persistence. The landing page promises this, so it must stay true. `src/lib/parsing/privacy.test.ts` guards part of it; keep it green.
2. **Responsive.** Mobile and desktop both work. The scrollytelling animations must stay smooth and readable on small screens.
3. **Adaptive rankings.** A user's CSV may hold very few trips. Never show a top N larger than the number of distinct items; degrade the presentation instead (single item, or drop the screen). Logic: `src/lib/parsing/ranking.ts` and `src/lib/wrapped/`.
4. **No real export in the repo.** `*.csv` is git-ignored and must never go in `public/` (copied to `dist/` and deployed). Test with fictional data.

## Stack & structure

- React 18, Vite, TypeScript, PapaParse, Vitest; npm. Static build for GitHub Pages under `/wrapped-sncf/`. Stack rationale: `STACK.md` (French).
- `src/lib/parsing/`: CSV → trips → statistics (pure functions). `src/lib/wrapped/`: statistics → what the screens display. `src/components/`: the design mockup ported to React. `src/App.tsx`: landing → import → wrapped.
- The design mockup lives outside the repo (`SNCF Wrapped v3.dc.html`); how it was ported is in `docs/architecture.md`.

## Working on this project

- Install with `npm ci`, run `npm run dev` (http://localhost:5173/wrapped-sncf/, add `?debug` for the calculation panel).
- Verify with `npm run check` (lint + typecheck + tests + build). It must pass before any PR; CI runs it.
- Fictional exports: `npm run sample -- out.csv --profile tiny` (profiles in `docs/self-improvement.md`). Inspect an export in the console: `npm run inspect -- file.csv`.
- UI copy and code comments are in French; identifiers are in English.

## Working agreements

- Found a problem outside the current task? Open a GitHub issue (label `auto-improve`) instead of fixing it inline.
- Learned something non-obvious the hard way? Add at most 3 lines to `docs/learnings.md`.

## Reference docs

- `docs/architecture.md`: data flow, modules, decisions, mockup port. Read before structural changes.
- `docs/csv-format.md`: SNCF export structure and interpretation rules. Read before touching the parser.
- `docs/self-improvement.md`: the improvement loop and the `/improve` skill.
- `docs/learnings.md`: pitfalls already hit.
- `src/lib/parsing/data/README.md`: station referential provenance and licence (ODbL).
