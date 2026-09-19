import { projectToFranceMap } from '../parsing/geo'
import data from './data/regions.json'

/*
 * French region outlines (metropolitan + overseas), for the map's regional background (screen 06,
 * see mapModel.ts) when the drawn trips don't span the whole country. See data/README.md for the
 * source/licence and how `regions.json` was built.
 */

interface RegionData {
  code: string
  name: string
  /** [latitude, longitude], simplified boundary of the region's largest ring. */
  boundary: [number, number][]
}

export interface Region {
  code: string
  name: string
  /** SVG polyline points, already projected into the map's schematic space (see geo.ts). */
  outline: string
}

const r1 = (n: number) => Math.round(n * 10) / 10

const REGIONS: (Region & { boundary: [number, number][] })[] = (data.regions as RegionData[]).map((r) => ({
  code: r.code,
  name: r.name,
  boundary: r.boundary,
  outline: r.boundary
    .map(([lat, lon]) => {
      const { x, y } = projectToFranceMap(lat, lon)
      return `${r1(x)},${r1(y)}`
    })
    .join(' '),
}))

/** Ray-casting point-in-polygon test; `boundary` points are [latitude, longitude]. */
function containsPoint(boundary: [number, number][], lat: number, lon: number): boolean {
  let inside = false
  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const [yi, xi] = boundary[i]
    const [yj, xj] = boundary[j]
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Which bundled region a point falls in, null if none contains it (e.g. a foreign station).
 * No overseas station currently exists in the referential, so only metropolitan regions are ever matched.
 */
export function regionOf(lat: number, lon: number): Region | null {
  return REGIONS.find((r) => containsPoint(r.boundary, lat, lon)) ?? null
}
