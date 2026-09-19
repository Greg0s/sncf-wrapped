// Generates src/lib/wrapped/data/regions.json from the "regions-avec-outre-mer.geojson" export
// (IGN Admin Express COG, via the community mirror gregoiredavid/france-geojson, Licence Ouverte /
// Etalab 2.0): https://github.com/gregoiredavid/france-geojson
//
// Usage: node scripts/build-region-outlines.mjs <regions-avec-outre-mer.geojson>
//
// The raw file is not version-controlled; only the reduced outlines (name, INSEE code, simplified
// boundary) are. This script only runs during development: it never touches a user's data.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const input = process.argv[2]
if (!input) {
  console.error('Usage: node scripts/build-region-outlines.mjs <regions-avec-outre-mer.geojson>')
  process.exit(1)
}
const output = resolve(dirname(fileURLToPath(import.meta.url)), '../src/lib/wrapped/data/regions.json')

const raw = JSON.parse(readFileSync(input, 'utf8'))
if (raw.type !== 'FeatureCollection') throw new Error('Unexpected export: a GeoJSON FeatureCollection is expected')

// Shoelace formula, planar approximation — good enough to rank rings by size, not for a precise area.
function ringArea(ring) {
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    a += x1 * y2 - x2 * y1
  }
  return Math.abs(a / 2)
}

// A region can be a MultiPolygon (mainland + small islands): we keep only the largest ring, the
// same simplification FRANCE_OUTLINE/CORSICA_OUTLINE already make (no scattered islets in the schematic outline).
function largestRing(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.map((p) => p[0]).sort((a, b) => ringArea(b) - ringArea(a))[0]
}

// Douglas-Peucker simplification on [lon, lat] points.
function perpendicularDistance([x, y], [x1, y1], [x2, y2]) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  return len === 0 ? Math.hypot(x - x1, y - y1) : Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / len
}

function douglasPeucker(points, epsilon) {
  if (points.length < 3) return points
  let maxDist = -1
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1])
    if (d > maxDist) [maxDist, index] = [d, i]
  }
  if (maxDist <= epsilon) return [points[0], points[points.length - 1]]
  const left = douglasPeucker(points.slice(0, index + 1), epsilon)
  const right = douglasPeucker(points.slice(index), epsilon)
  return [...left.slice(0, -1), ...right]
}

// Binary-search the epsilon that gets simplification close to a target point count.
function simplifyToCount(points, targetCount) {
  let lo = 0
  let hi = 1
  let result = points
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2
    const simplified = douglasPeucker(points, mid)
    if (simplified.length > targetCount) lo = mid
    else {
      hi = mid
      result = simplified
    }
  }
  return result
}

const regions = raw.features.map((f) => {
  const ring = largestRing(f.geometry)
  const targetCount = ring.length > 400 ? 70 : ring.length > 150 ? 55 : Math.min(45, ring.length)
  const simplified = simplifyToCount(ring, targetCount)
  // [lat, lon], rounded like the station referential (~10 m): matches gares.json's convention.
  const boundary = simplified.map(([lon, lat]) => [Math.round(lat * 10000) / 10000, Math.round(lon * 10000) / 10000])
  return { code: f.properties.code, name: f.properties.nom, boundary }
})

const out = {
  source: 'IGN Admin Express COG (2018) via gregoiredavid/france-geojson (regions-avec-outre-mer.geojson)',
  license: 'Licence Ouverte / Etalab 2.0',
  retrievedAt: new Date().toISOString().slice(0, 10),
  regions,
}

writeFileSync(output, JSON.stringify(out))
console.log(`Wrote ${regions.length} regions to ${output} (${Buffer.byteLength(JSON.stringify(out))} bytes)`)
