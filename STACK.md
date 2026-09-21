# Tech stack — SNCF Wrapped

Project context: see [CLAUDE.md](CLAUDE.md). Constraints shaping every choice below: fully static/client-side rendering, no data sent to any server, free hosting (GitHub Pages).

## 1. Front-end framework — React + Vite + TypeScript

**Choice:** React 18 + Vite + TypeScript.

**Rationale:** Vite produces a fully static build (HTML/CSS/JS), with no server, directly servable by GitHub Pages. React has the richest ecosystem for the specific pieces this project needs (map, scroll animations, image export): the libraries recommended in points 2/4/5 are all React-first and well maintained. TypeScript secures the data transformations (raw CSV → aggregated stats), which limits silent bugs on an export format whose content can vary.

*Alternative ruled out:* Svelte/SvelteKit (lighter bundle, native transitions) — less mature ecosystem for the map and image export.

## 2. Scroll animations and micro-animations — GSAP + ScrollTrigger

**Choice:** GSAP + ScrollTrigger plugin, via the `@gsap/react` binding (the `useGSAP` hook).

**Rationale:** This is the reference for scrollytelling (pinned sections, animations "scrubbed" by scroll position), exactly what's needed for a Wrapped-style experience. The DrawSVG plugin (progressive drawing of an SVG path) — useful for "the lines that draw themselves on the map" — has been free since Webflow acquired GreenSock in 2025. GSAP is framework-agnostic, so animation timing doesn't depend on React's render cycle.

*Alternative ruled out:* Framer Motion — simpler for basic reveal-on-scroll (`whileInView`), but less suited to section pinning and precise scrubbing. Could be added later for small UI micro-interactions, without replacing GSAP for the narrative sequences.

## 3. Client-side CSV parsing — PapaParse

**Choice:** PapaParse.

**Rationale:** De facto standard for parsing CSV in JS. Can run in a Web Worker (doesn't block the UI while parsing), auto-detects delimiters/encodings, TypeScript types available. Runs entirely in memory in the browser — consistent with the privacy constraint.

## 4. Map of France + routes — react-simple-maps (D3-geo) + static geo data bundled in

**Choice:** `react-simple-maps` (based on `d3-geo`) for the SVG map rendering, with two static datasets bundled as local assets at build time:
- a base map of France (region/department outlines) from a free GeoJSON (e.g. the `gregoiredavid/france-geojson` repo, MIT);
- an SNCF station reference with GPS coordinates (SNCF open data portal, open licence), to convert station names from the CSV into points on the map.

**Rationale:** Fully SVG rendering, so no network calls to a tile server or API key. Routes are simple SVG `<path>` elements, directly animatable with GSAP/DrawSVG. The style is fully customizable (dark background, gradients, glow) to match the Wrapped aesthetic — unlike a realistic base map (Leaflet/OSM-style) which would impose a "road map" look. No geographic data is loaded from outside: everything is bundled at build time, in keeping with "nothing leaves the browser."

*Alternative ruled out:* Leaflet + OpenStreetMap tiles — requires network requests to a tile server at runtime, and a less stylable look for a Wrapped-style visual.

## 5. Shareable image export — html-to-image

**Choice:** `html-to-image`.

**Rationale:** Converts a DOM node (the styled "results card" component in HTML/CSS) to PNG/JPEG directly in the browser, with no server rendering. Lighter and better maintained than `html2canvas` for modern layouts (flexbox/grid, web fonts, CSS gradients). Simple API (`toPng(node)`), sufficient for a fixed-layout component, without having to manually redraw on a `<canvas>`.

*Implementation watch-out:* preload web fonts and avoid cross-origin images that aren't converted to data-URIs, otherwise the canvas can get "tainted" and the export fails silently.

## 6. Hosting / deployment — GitHub Pages + GitHub Actions

**Choice:** GitHub Pages, deployed via a GitHub Action (`actions/upload-pages-artifact` + `actions/deploy-pages`) on every push to `main`.

**Rationale:** Free, already tied to the existing GitHub repo (`Greg0s/sncf-wrapped`), and sufficient since the site is fully static after build. No backend to host, so no server cost or maintenance.

*Implementation watch-out:* a GitHub Pages project site (`greg0s.github.io/sncf-wrapped`) is served under a subpath — remember to set `base: '/sncf-wrapped/'` in `vite.config.ts`.

---

## Resulting folder architecture

```
sncf-wrapped/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Vite build + GitHub Pages deployment
├── public/
│   └── data/
│       ├── france-map.json     # GeoJSON/TopoJSON of France's outlines (static asset)
│       └── gares-sncf.json     # station reference + GPS coordinates (static asset)
├── src/
│   ├── assets/                 # images, icons, fonts
│   ├── components/
│   │   ├── landing/            # hero, privacy pitch, upload CTA
│   │   ├── upload/              # CSV drop zone / picker
│   │   ├── story/                # scrolled narrative sections (Wrapped-style)
│   │   ├── map/                    # map of France + route lines (react-simple-maps)
│   │   ├── stats/                    # rankings/visualizations (top cities, routes…)
│   │   ├── share-card/                 # exportable card component + share button
│   │   └── ui/                          # buttons, layout, generic elements
│   ├── lib/
│   │   ├── csv/                 # PapaParse wrapper + validation/mapping of expected columns
│   │   ├── stats/                 # aggregations (adaptive top N, distances, frequencies…)
│   │   ├── geo/                     # station-name-to-coordinates resolution, route geometry
│   │   └── export/                    # html-to-image wrapper
│   ├── hooks/                   # e.g. useGsapScrollTimeline, useCsvUpload
│   ├── types/                   # Trip, Station, WrappedStats, etc.
│   ├── App.tsx                  # simple global state: landing → story → results
│   └── main.tsx
├── CLAUDE.md
├── STACK.md
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

**Notes on the architecture:**
- No router (react-router): the journey is a single-state flow (landing → upload → story → share), handled by local React state rather than routes.
- `public/data/` only holds static reference data (geography, stations) — never user data.
- The ranking-adaptation logic (the CLAUDE.md constraint on the dynamic "top N") lives in `src/lib/stats/`, separate from the display components, to stay testable independently of rendering.

---

## Points not asked for but to settle quickly at the next step

Beyond the 6 points requested, but needed to scaffold:
- **Styling:** suggest Tailwind CSS (fast for a Wrapped-like design system with gradients/dark mode) — to confirm.
- **Package manager:** npm by default (no extra install needed) — to confirm if there's a preference otherwise (pnpm/yarn).

---

## Deviations found during implementation

The project is now scaffolded. What differs from this document:

- **Folders**: `src/lib/parsing/` (reading the CSV, computations, station reference) and `src/lib/wrapped/` (display model) replace `lib/csv`, `lib/stats` and `lib/geo`. The station reference is `src/lib/parsing/data/gares.json`, loaded via dynamic import (not `public/data/`).
- **Animations**: CSS + IntersectionObserver, ported as-is from the mockup (no GSAP for now).
- **Styling**: neither Tailwind nor another CSS framework; the mockup's inline styles are kept (`src/lib/css.ts`).
- **Map**: schematic SVG from the mockup (affine projection of the coordinates), not `react-simple-maps`.
- **Fonts**: Schibsted Grotesk self-hosted (`@fontsource`), no third-party font service.
- **Image export** (`html-to-image`): not done yet, see issue #3. **Pages deployment**: see issue #10.

Up-to-date architecture: `docs/architecture.md`.
