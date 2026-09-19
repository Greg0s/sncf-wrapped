# Wrapped SNCF

[![CI](https://github.com/Greg0s/wrapped-sncf/actions/workflows/ci.yml/badge.svg)](https://github.com/Greg0s/wrapped-sncf/actions/workflows/ci.yml)

*Lire en français : [README.md](README.md)*

🔗 **[greg0s.github.io/wrapped-sncf](https://greg0s.github.io/wrapped-sncf/)**

Your year on the rails, Wrapped-style: import your SNCF Connect personal data export and discover your kilometers, your budget, your cities, your routes and how you book, screen by screen, with a shareable card.

> Personal project, unofficial: not affiliated with SNCF.

## Privacy

**Everything happens in your browser.** The file is neither sent nor stored: no server, no account, no tracking, no third-party font service. Close the tab, and nothing remains. This guarantee is a project constraint, checked by an automated test (`src/lib/parsing/privacy.test.ts`) that fails if a network API shows up in the app's code.

## Getting your data

SNCF Connect doesn't offer a one-click export. GDPR lets you request your data: an email to the data protection officer is enough, and the reply arrives within a month. The site includes a page that drafts the message ("Obtenir les données").

## What the file contains (and doesn't)

The CSV lists train orders: dates, stations, amounts, payment method. It contains **no delay, no duration, no distance**. The kilometers shown are therefore an **estimate**: straight-line distance between stations, increased by 20%. "Option posée" (unpaid) bookings are ignored. Details: [`docs/csv-format.md`](docs/csv-format.md).

## Developing

Requirements: Node 20.19+ or 22.12+.

```bash
npm ci
npm run dev
```

The site is served at <http://localhost:5173/wrapped-sncf/>. Add `?debug` to the address for the panel that details the calculations.

| Command | Role |
| --- | --- |
| `npm run check` | Typecheck + tests + build: must pass before any PR (CI does the same) |
| `npm test` | Tests only (including hundreds of random exports: `FUZZ_SEEDS=2500 npm test -- invariants`) |
| `npm run sample -- out.csv --profile tiny` | Generates a **fictional** test export (profiles: `lyon`, `regional`, `tiny`, `single`, `foreign`, `roundtrips`) |
| `npm run inspect -- out.csv` | Prints to the console what the app computes for an export |

**Never add a real export to the repo**: it contains your identity, address and phone number. `*.csv` files are git-ignored, and must also never be placed in `public/` (this folder is copied into the deployed site).

## How it's built

React 18, Vite, TypeScript, PapaParse, Vitest. The CSV is read by `src/lib/parsing/`, turned into text and screens by `src/lib/wrapped/`, then displayed by the components in `src/components/` (the mockup ported to React, design and animations unchanged). To go further:

- [`docs/architecture.md`](docs/architecture.md): data flow, modules, decisions.
- [`docs/csv-format.md`](docs/csv-format.md): export structure and interpretation rules.
- [`STACK.md`](STACK.md): technical choices and their rationale.

## Tracking and continuous improvement

Outstanding work is tracked as [issues](https://github.com/Greg0s/wrapped-sncf/issues). Those labeled `auto-improve` feed a **self-improvement loop**: Claude Code's `/improve` skill handles one issue at a time, verifies with `npm run check`, and opens a draft PR for review. The principle and guardrails are in [`docs/self-improvement.md`](docs/self-improvement.md).

## Data and licences

- Station coordinates come from the "Gares de voyageurs" dataset by [SNCF Open Data](https://data.sncf.com/explore/dataset/gares-de-voyageurs/), under the [ODbL](https://opendatacommons.org/licenses/odbl/1-0/) licence. The site displays the notice *Contient des données SNCF Open Data (licence ODbL)*. Update procedure: [`src/lib/parsing/data/README.md`](src/lib/parsing/data/README.md).
- Schibsted Grotesk font, self-hosted via `@fontsource` (OFL licence).
