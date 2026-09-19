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
