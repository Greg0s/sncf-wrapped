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
  /** Same points as `outline`, pre-parsed: lets a frame be sized so the whole outline fits (see mapModel.ts). */
  points: { x: number; y: number }[]
}

const r1 = (n: number) => Math.round(n * 10) / 10

const REGIONS: (Region & { boundary: [number, number][] })[] = (data.regions as RegionData[]).map((r) => {
  const points = r.boundary.map(([lat, lon]) => {
    const { x, y } = projectToFranceMap(lat, lon)
    return { x: r1(x), y: r1(y) }
  })
  return {
    code: r.code,
    name: r.name,
    boundary: r.boundary,
    points,
    outline: points.map((p) => `${p.x},${p.y}`).join(' '),
  }
})

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
 * Which bundled region a point falls in, null if none contains it — this is also how the map (`mapModel.ts`)
 * tells a foreign city (real coordinates, but outside every French region) apart from a domestic one.
 * No overseas station currently exists in the referential, so only metropolitan regions are ever matched.
 */
export function regionOf(lat: number, lon: number): Region | null {
  return REGIONS.find((r) => containsPoint(r.boundary, lat, lon)) ?? null
}
