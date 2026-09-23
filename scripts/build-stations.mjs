// Generates src/lib/parsing/data/gares.json from the official JSON export
// "Gares de voyageurs" (SNCF Open Data, ODbL license):
//   https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/gares-de-voyageurs/exports/json
//
// Usage: node scripts/build-stations.mjs <raw-export.json>
//
// The raw file is not versioned; only the reduced referential (name, coordinates, city) is.
// This script only runs during development: it never touches a user's data.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const input = process.argv[2]
if (!input) {
  console.error('Usage : node scripts/build-stations.mjs <export-brut.json>')
  process.exit(1)
}
const output = resolve(dirname(fileURLToPath(import.meta.url)), '../src/lib/parsing/data/gares.json')

const raw = JSON.parse(readFileSync(input, 'utf8'))
if (!Array.isArray(raw)) throw new Error('Export inattendu : un tableau JSON est attendu')

const fold = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'")
const tokens = (s) => s.split(/\s+/).filter(Boolean)

// PLM boroughs have their own INSEE code: we attach them to the parent municipality.
function communeCode(insee) {
  const n = Number(insee)
  if (n >= 75101 && n <= 75120) return '75056' // Paris
  if (n >= 69381 && n <= 69389) return '69123' // Lyon
  if (n >= 13201 && n <= 13216) return '13055' // Marseille
  return String(insee)
}

const stations = raw.map((r, i) => {
  const lat = r.position_geographique?.lat
  const lon = r.position_geographique?.lon
  if (typeof r.nom !== 'string' || typeof lat !== 'number' || typeof lon !== 'number' || !r.codeinsee) {
    throw new Error(`Enregistrement ${i} invalide : ${JSON.stringify(r)}`)
  }
  return { name: r.nom.trim(), lat, lon, commune: communeCode(r.codeinsee) }
})

// CFC (Chemins de Fer de la Corse) is a separate regional operator, not part of the "Gares de
// voyageurs" dataset above, so its stations never appear in the raw export. They're still a fully
// domestic network sold through SNCF Connect, so a small hand-picked set is merged in here
// (approximate coordinates from public geographic data, not covered by the SNCF Open Data licence).
const EXTRA_STATIONS = [
  { name: 'Ajaccio', lat: 41.9192, lon: 8.7386, commune: 'cfc-ajaccio' },
  { name: 'Bastia', lat: 42.6979, lon: 9.452, commune: 'cfc-bastia' },
  { name: 'Calvi', lat: 42.568, lon: 8.757, commune: 'cfc-calvi' },
  { name: 'Corte', lat: 42.3059, lon: 9.1502, commune: 'cfc-corte' },
  { name: 'Île-Rousse', lat: 42.6367, lon: 8.933, commune: 'cfc-ile-rousse' },
]
stations.push(...EXTRA_STATIONS)

// Major foreign cities reachable from France by a direct train sold through SNCF Connect (Eurostar,
// Thalys, TGV Lyria, TGV/Frecciarossa, TGV/Renfe-SNCF, ICE): absent from the domestic "Gares de
// voyageurs" dataset (SNCF doesn't operate there) and genuinely outside France, unlike the CFC set
// above, but still real, plannable destinations — so they get real GPS coordinates (approximate
// station/city-centre positions from public geographic data) instead of being treated as unknown.
// The map draws their line as reaching that real position, cut and faded where it leaves France
// (`mapModel.ts`); `regionOf` (`regions.ts`) never matches them to a French region, which is how the
// rest of the app tells them apart from a domestic station. Extend this list, not this file's logic,
// for more direct destinations.
const FOREIGN_STATIONS = [
  { name: 'Londres St Pancras', lat: 51.5308, lon: -0.1238, commune: 'intl-londres' },
  { name: 'Bruxelles-Midi', lat: 50.8357, lon: 4.3326, commune: 'intl-bruxelles' },
  { name: 'Amsterdam Centraal', lat: 52.3791, lon: 4.9003, commune: 'intl-amsterdam' },
  { name: 'Luxembourg', lat: 49.5999, lon: 6.1338, commune: 'intl-luxembourg' },
  { name: 'Genève', lat: 46.2101, lon: 6.1425, commune: 'intl-geneve' },
  { name: 'Lausanne', lat: 46.517, lon: 6.6293, commune: 'intl-lausanne' },
  { name: 'Berne', lat: 46.9489, lon: 7.4394, commune: 'intl-berne' },
  { name: 'Bâle', lat: 47.5476, lon: 7.5896, commune: 'intl-bale' },
  { name: 'Zurich HB', lat: 47.3779, lon: 8.5403, commune: 'intl-zurich' },
  { name: 'Francfort', lat: 50.1072, lon: 8.6633, commune: 'intl-francfort' },
  { name: 'Stuttgart', lat: 48.7841, lon: 9.1815, commune: 'intl-stuttgart' },
  { name: 'Milan', lat: 45.4859, lon: 9.2044, commune: 'intl-milan' },
  { name: 'Turin', lat: 45.0708, lon: 7.6647, commune: 'intl-turin' },
  { name: 'Barcelone Sants', lat: 41.3792, lon: 2.1401, commune: 'intl-barcelone' },
]
stations.push(...FOREIGN_STATIONS)

const byCommune = new Map()
for (const s of stations) {
  if (!byCommune.has(s.commune)) byCommune.set(s.commune, [])
  byCommune.get(s.commune).push(s)
}

// Words that, alone, do not form a city name (avoids "La" for "La Baule…").
const WEAK = new Set([
  'le', 'la', 'les', "l'", 'un', 'une', 'du', 'de', 'des', "d'", 'et', 'en', 'sur', 'sous',
  'saint', 'sainte', 'st', 'ste', 'bas', 'haut', 'haute', 'grand', 'grande', 'petit', 'petite',
  'mont', 'val', 'port', 'pont', 'gare',
])
const isWeak = (toks) => toks.length === 1 && WEAK.has(fold(toks[0]))

function commonPrefix(lists) {
  const out = []
  for (let i = 0; ; i++) {
    const w = lists[0][i]
    if (!w || !lists.every((t) => t[i] && fold(t[i]) === fold(w))) break
    out.push(w)
  }
  return out
}

// "City" name of a station, without a municipality referential:
//  a) another station in the same municipality whose name is a strict prefix ("Nice" for "Nice Riquier");
//  b) otherwise the common prefix of the municipality's stations that share the 1st word ("Lyon" for "Lyon Part Dieu");
//  c) otherwise the station's full name.
function cityLabel(station) {
  const group = byCommune.get(station.commune)
  const t = tokens(station.name)
  const shorter = group
    .filter((o) => o !== station)
    .map((o) => tokens(o.name))
    .filter((ot) => ot.length < t.length && ot.every((w, i) => fold(w) === fold(t[i])) && !isWeak(ot))
    .sort((a, b) => a.length - b.length)[0]
  if (shorter) return shorter.join(' ')
  const siblings = group.filter((o) => fold(tokens(o.name)[0]) === fold(t[0]))
  if (siblings.length > 1) {
    const p = commonPrefix(siblings.map((o) => tokens(o.name)))
    if (p.length && !isWeak(p)) return p.join(' ')
  }
  return station.name
}

const cityIndex = new Map() // "commune|label" -> { label, lats[], lons[] }
for (const s of stations) {
  s.city = cityLabel(s)
  const key = `${s.commune}|${fold(s.city)}`
  if (!cityIndex.has(key)) cityIndex.set(key, { label: s.city, lats: [], lons: [] })
  const c = cityIndex.get(key)
  c.lats.push(s.lat)
  c.lons.push(s.lon)
  s.cityKey = key
}

const round = (n) => Math.round(n * 1e4) / 1e4
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
const cityKeys = [...cityIndex.keys()].sort(
  (a, b) => cityIndex.get(a).label.localeCompare(cityIndex.get(b).label, 'fr') || a.localeCompare(b),
)
const cityPos = new Map(cityKeys.map((k, i) => [k, i]))

const data = {
  source: 'SNCF Open Data — Gares de voyageurs (https://data.sncf.com/explore/dataset/gares-de-voyageurs/)',
  license: 'ODbL 1.0 — https://opendatacommons.org/licenses/odbl/1-0/',
  retrievedAt: new Date().toISOString().slice(0, 10),
  // [city label, average latitude, average longitude]
  cities: cityKeys.map((k) => {
    const c = cityIndex.get(k)
    return [c.label, round(mean(c.lats)), round(mean(c.lons))]
  }),
  // [station name, latitude, longitude, index into cities]
  stations: stations
    .map((s) => [s.name, round(s.lat), round(s.lon), cityPos.get(s.cityKey)])
    .sort((a, b) => a[0].localeCompare(b[0], 'fr')),
}

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(data) + '\n')
console.log(`${data.stations.length} gares, ${data.cities.length} villes -> ${output}`)
