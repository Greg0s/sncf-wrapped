# Station reference (`gares.json`)

**Public** reference data bundled in the site to convert a station name from the CSV into GPS coordinates
and a city. This is never user data.

- **Source**: SNCF Open Data, "Gares de voyageurs" dataset —
  <https://data.sncf.com/explore/dataset/gares-de-voyageurs/> (2,782 stations, exported 2026-09-19).
- **Licence**: ODbL 1.0 — <https://opendatacommons.org/licenses/odbl/1-0/>. The notice "Contains SNCF
  Open Data (ODbL licence)" must appear in the public interface (footer).
- **Content**: `stations` = `[name, latitude, longitude, city index]`, `cities` = `[label, average latitude, average longitude]`.
  Coordinates are rounded to 4 decimal places (~10 m); only the name, position and INSEE code from the raw export are kept.
- **Cities**: the export only gives the municipality's INSEE code (not its name). The city label is inferred from the
  station names sharing the same municipality ("Lyon Part Dieu" and "Lyon Perrache" → "Lyon"), with the districts of Paris, Lyon
  and Marseille attached to their municipality. Known limitation: a single-station city whose name carries a qualifier
  keeps its full name ("Bordeaux Saint-Jean", "Toulouse Matabiau").

## Regenerating

```bash
curl -L -o gares-raw.json "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/gares-de-voyageurs/exports/json"
node scripts/build-stations.mjs gares-raw.json
```

The raw file is not version-controlled. After regenerating, rerun `npm test` (some tests check a few known stations).

## CFC (Corsica) stations

CFC (Chemins de Fer de la Corse) is a separate regional operator: its stations (Ajaccio, Bastia,
Calvi, Corte, Île-Rousse) are fully domestic and sold through SNCF Connect, but absent from the
"Gares de voyageurs" dataset above, which only covers the mainline SNCF network. `build-stations.mjs`
merges a small hand-picked `EXTRA_STATIONS` list for them (approximate coordinates from public
geographic data, not covered by the SNCF Open Data licence) so their trips still get a distance and a
map position, instead of being treated like a foreign/unknown station. Extend that list, not this
file, if more CFC stations need coverage.

## Foreign cities in direct connection

Major foreign cities reachable from France by a direct train sold through SNCF Connect (Eurostar,
Thalys, TGV Lyria, TGV/Frecciarossa, TGV/Renfe-SNCF, ICE — e.g. Genève, Bruxelles, Londres, Barcelone,
Milan, Francfort) are absent from the domestic dataset above for the same reason as CFC, but are
**not domestic**: `build-stations.mjs` merges a `FOREIGN_STATIONS` list for them, with real GPS
coordinates (approximate, from public geographic data), so their trips get a real distance. `regionOf`
(`src/lib/wrapped/regions.ts`) never matches their coordinates to a bundled French region — that's how
the app tells a foreign city apart from a domestic one (rather than a data flag). On the map, a route
reaching one is drawn as if it truly reached that position, then cut and faded where it leaves France
(`src/lib/wrapped/mapModel.ts`). Extend `FOREIGN_STATIONS`, not this file's logic, for more destinations.
