// Génère src/lib/parsing/data/gares.json à partir de l'export JSON officiel
// « Gares de voyageurs » (SNCF Open Data, licence ODbL) :
//   https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/gares-de-voyageurs/exports/json
//
// Usage : node scripts/build-stations.mjs <export-brut.json>
//
// Le fichier brut n'est pas versionné ; seul le référentiel réduit (nom, coordonnées, ville) l'est.
// Ce script ne tourne qu'au développement : il ne touche jamais aux données d'un utilisateur.
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

// Les arrondissements PLM ont leur propre code INSEE : on les rattache à la commune.
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

const byCommune = new Map()
for (const s of stations) {
  if (!byCommune.has(s.commune)) byCommune.set(s.commune, [])
  byCommune.get(s.commune).push(s)
}

// Mots qui, seuls, ne forment pas un nom de ville (évite « La » pour « La Baule… »).
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

// Nom de « ville » d'une gare, sans référentiel des communes :
//  a) une autre gare de la même commune dont le nom est un préfixe strict (« Nice » pour « Nice Riquier ») ;
//  b) sinon le préfixe commun aux gares de la commune qui partagent le 1er mot (« Lyon » pour « Lyon Part Dieu ») ;
//  c) sinon le nom complet de la gare.
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

const cityIndex = new Map() // "commune|libellé" -> { label, lats[], lons[] }
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
  // [libellé de la ville, latitude moyenne, longitude moyenne]
  cities: cityKeys.map((k) => {
    const c = cityIndex.get(k)
    return [c.label, round(mean(c.lats)), round(mean(c.lons))]
  }),
  // [nom de la gare, latitude, longitude, index dans cities]
  stations: stations
    .map((s) => [s.name, round(s.lat), round(s.lon), cityPos.get(s.cityKey)])
    .sort((a, b) => a[0].localeCompare(b[0], 'fr')),
}

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(data) + '\n')
console.log(`${data.stations.length} gares, ${data.cities.length} villes -> ${output}`)
