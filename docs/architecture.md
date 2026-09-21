# Architecture

Data flows one way, through pure functions, entirely in the browser:

```
CSV file ─▶ decode ─▶ parseSncfCsv ─▶ buildTripDataset ─▶ computeWrappedStats ─▶ buildWrappedView ─▶ React components
(File API)  encoding   trips section     stations + km        numbers, one period     texts + screens      mockup port
```

`importSncfCsv(file)` in `src/lib/parsing/index.ts` runs the first three steps; `App.tsx` runs the rest.

## Modules

| Path | Role |
| --- | --- |
| `src/lib/parsing/decode.ts` | UTF-8 strict, falling back to Windows-1252 (the real export encoding) |
| `src/lib/parsing/parseSncfCsv.ts` | Finds the trips section by its columns, groups tickets into trips |
| `src/lib/parsing/stations.ts`, `data/gares.json` | Station label → city + GPS (SNCF Open Data, ODbL — see `data/README.md`) |
| `src/lib/parsing/dataset.ts` | Attaches stations/distances to trips, drops upcoming departures, lists periods |
| `src/lib/parsing/computeWrappedStats.ts` | Every number the screens show, for one period |
| `src/lib/parsing/ranking.ts` | Adaptive top-N (`rankTop`): never more rows than distinct items |
| `src/lib/wrapped/` | Display model: texts, which screens exist, star/map geometry (`buildWrappedView`) |
| `src/lib/css.ts` | Turns the mockup's inline CSS strings into React `style` objects |
| `src/components/wrapped/` | The 8 screens, `useReveal.ts` (all scroll/reveal animations), `Wrapped.tsx` |
| `src/components/landing/`, `data/` | Landing + import modal, and the "get your data" (GDPR e-mail) page |
| `src/components/Logo.tsx` | The brand mark (landing header, shareable card); its line draws itself once, on the landing's first appearance |
| `src/components/debug/` | Calculation panel, reachable with `?debug` |
| `public/` | Copied as-is into `dist/`: the favicon set (`favicon.svg`, the same drawing as `Logo.tsx`, plus PNG fallbacks). Never user data |
| `scripts/` | `build-stations.mjs` (referential), `inspect-csv.ts` (console), `make-sample-csv.ts` (fictional exports) |

## Decisions (validated with the owner, 2026-09-19)

Details of the CSV side are in `csv-format.md`.

- **Options excluded.** "Option posée" rows are unpaid holds. `parseSncfCsv(text, { includeOptions: true })` exists for comparison only.
- **A trip = one departure + origin + destination.** Ticket lines sharing them are merged and their amounts summed (a TER + TGV journey, or an exchange).
- **Round-trip ticket = 2 trips** (the return date is not in the file; both legs are attributed to the outbound month).
- **Distances are estimates**: great-circle between stations × `RAIL_DETOUR_FACTOR` (1.2, `geo.ts`). The UI says so. No duration exists in the file, so nothing shows "hours on board".
- **Home city ("hub")** = city with the most departures + arrivals in the period. It is excluded from the destinations ranking, and comes first in route labels.
- **Cities** group stations of one commune (INSEE code) and take the common name prefix ("Lyon Part Dieu" → "Lyon"). Known limit: a single-station city keeps its full name ("Bordeaux Saint-Jean"); accepted.
- **Adaptive screens**: a screen without data is removed and the others renumbered; rankings shrink; headings switch to singular/tie wording. All in `buildWrappedView`.
- **Map**: `projectToFranceMap` is an exact affine fit of the mockup's schematic map. The frame zooms when all cities are close; the France outline is only drawn at moderate zoom.

## Porting the mockup

The mockup (`SNCF Wrapped v3.dc.html`, outside the repo) was converted to JSX by a script instead of retyped, then edited:

- Inline styles stay as the mockup's CSS strings, wrapped in `css(...)` (do not rewrite them as objects: diffs against the mockup stay reviewable).
- The per-period accent colour is the CSS variable `--ac`, set on the app root (`accentFor`).
- `style-hover`/`style-focus` became the `hv-*` / `focus-accent` classes in `src/styles/global.css`.
- Animations use `data-*` attributes read by `useReveal.ts` (speed `REVEAL_SPEED = 0.6`, the mockup's default). Those styles are set on the DOM by hand, so keep them out of the JSX `style` props.
- Component props mirror the mockup's data shape (`DisplayData` = its `sets()` entries).

## Privacy design

Nothing leaves the browser: no `fetch`/XHR, no analytics, no third-party fonts (Schibsted Grotesk is self-hosted), no `localStorage`; the imported data lives in React state only. The stations referential is a static chunk loaded with a dynamic `import()`. `privacy.test.ts` fails if a network API appears in application code. An `ErrorBoundary` shows a message (and discards the file from memory) instead of a blank page.

## Testing

`npm run check` = lint (oxlint) + typecheck + Vitest + build. Besides unit tests, `src/lib/wrapped/invariants.test.ts` pushes hundreds of random fictional exports through the whole chain and checks invariants (no `NaN`, adaptive rankings, consistent totals, screen numbering). More seeds: `FUZZ_SEEDS=2500 npm test -- invariants`. UI is checked by hand with fictional profiles (`npm run sample`, see `self-improvement.md`).
