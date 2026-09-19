# Region outlines (`regions.json`)

**Public** reference data bundled in the site to draw a regional background on the trip map when all
(or most) drawn trips fall in a single French region. This is never user data.

- **Source**: IGN Admin Express COG (2018 edition), via the community mirror
  [gregoiredavid/france-geojson](https://github.com/gregoiredavid/france-geojson) —
  `regions-avec-outre-mer.geojson` (18 regions: 13 metropolitan + Guadeloupe, Martinique, Guyane,
  La Réunion, Mayotte).
- **Licence**: Licence Ouverte / Etalab 2.0 — <https://www.etalab.gouv.fr/licence-ouverte-open-licence>.
- **Content**: `regions` = `[{ code, name, boundary }]`, `boundary` = `[[latitude, longitude], …]`.
  Coordinates are rounded to 4 decimal places (~10 m), matching `../../parsing/data/gares.json`'s
  convention. Only the largest ring of each region's geometry is kept (mainland, dropping small
  offshore islets — the same simplification `franceOutline.ts` already applies to Corsica), then
  simplified with Douglas-Peucker down to ~45–70 points, same spirit as the hand-simplified
  `FRANCE_OUTLINE`/`CORSICA_OUTLINE` in `../../../components/wrapped/franceOutline.ts`.
- **Use**: `regions.ts` does a point-in-polygon test against `boundary` to find which region a city
  belongs to, and projects `boundary` through `projectToFranceMap` (`../../parsing/geo.ts`) to draw
  it in the map's schematic space. No overseas region can currently be matched in practice: the SNCF
  station referential (`gares.json`) has no overseas stations (SNCF doesn't operate there), so these
  entries exist for completeness rather than being reachable today.

## Regenerating

```bash
curl -L -o regions-raw.geojson "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions-avec-outre-mer.geojson"
node scripts/build-region-outlines.mjs regions-raw.geojson
```

The raw file is not version-controlled.
