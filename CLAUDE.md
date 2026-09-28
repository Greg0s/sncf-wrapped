# SNCF Wrapped

A static site that turns the CSV a user gets from SNCF Connect (GDPR data export) into a Spotify-Wrapped-style, scroll-animated recap of their train trips. Personal project, not affiliated with SNCF.

## Non-negotiable constraints

1. **Client-side only.** The user's CSV and every trip/statistic derived from it never leave the browser: no upload, no server, no persistence, no third-party fonts. Parsing, computation and rendering all happen in memory. The landing page promises this, so it must stay true. `src/lib/parsing/privacy.test.ts` guards it by scanning `src/` for network APIs and known trackers. The one deliberate exception is GoatCounter (`index.html`, outside `src/`): a self-hosted-friendly, cookie-less page-view counter that only ever sees anonymous page views, never the CSV or anything derived from it. Document any other exception in the legal page (`src/components/legal/LegalPage.tsx`) and in `privacy.test.ts`'s comment before adding it.
2. **Responsive.** Mobile and desktop both work. The scrollytelling animations must stay smooth and readable on small screens.
3. **Adaptive rankings.** A user's CSV may hold very few trips. Never show a top N larger than the number of distinct items; degrade the presentation instead (single item, or drop the screen). Logic: `src/lib/parsing/ranking.ts` and `src/lib/wrapped/`.
4. **No real export in the repo.** `*.csv` is git-ignored and must never go in `public/` (copied to `dist/` and deployed). Test with fictional data.

## Stack & structure

- React 18, Vite, TypeScript, PapaParse, Vitest; npm. Static build for GitHub Pages under `/sncf-wrapped/`. Stack rationale: `STACK.md`.
- `src/lib/parsing/`: CSV → trips → statistics (pure functions). `src/lib/wrapped/`: statistics → what the screens display. `src/components/`: the design mockup ported to React. `src/App.tsx`: landing → import → wrapped.
- The design mockup lives outside the repo (`SNCF Wrapped v3.dc.html`); how it was ported is in `docs/architecture.md`.

## Working on this project

- Install with `npm ci`, run `npm run dev` (http://localhost:5173/sncf-wrapped/, add `?debug` for the calculation panel).
- Verify with `npm run check` (lint + typecheck + tests + build). It must pass before any PR; CI runs it.
- Fictional exports: `npm run sample -- out.csv --profile tiny` (profiles in `docs/self-improvement.md`). Inspect an export in the console: `npm run inspect -- file.csv`.
- UI copy stays in French (what the site shows users). Everything internal — code comments, identifiers, commit messages, GitHub issues/PRs — is in English.

## Working agreements

- Found a problem outside the current task? Open a GitHub issue (label `auto-improve`) instead of fixing it inline.
- Learned something non-obvious the hard way? Add at most 3 lines to `docs/learnings.md`.

## Reference docs

- `docs/architecture.md`: data flow, modules, decisions, mockup port. Read before structural changes.
- `docs/csv-format.md`: SNCF export structure and interpretation rules. Read before touching the parser.
- `docs/self-improvement.md`: the improvement loop and the `/improve` skill.
- `docs/learnings.md`: pitfalls already hit.
- `src/lib/parsing/data/README.md`: station referential provenance and licence (ODbL).
