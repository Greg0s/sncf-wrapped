import { monthOf, type CityRef, type RouteStat, type WrappedStats } from '../parsing'
import { abbreviateCityName } from './cityAbbrev'
import { fmtNum, plural } from './format'
import { CORSICA_OUTLINE, FRANCE_OUTLINE } from './franceOutline'
import { dayMonthLabel, monthName } from './phrases'
import { regionOf, type Region } from './regions'

/*
 * Trip map (screen 06) and the mini-map on the shareable card, built from the actual routes.
 * Positions come from the lat/lon → SVG "CarteFrance" projection (see geo.ts).
 */

export interface Frame {
  /** Frame (viewBox): x, y, side. */
  x: number
  y: number
  size: number
  /** Scale of lines/dots/text: 1 in full-France view, < 1 when the map is zoomed in. */
  k: number
}

export const FULL_FRAME: Frame = { x: 10, y: 10, size: 405, k: 1 }

interface Pt {
  x: number
  y: number
}

/** The outline of France is only drawn if the map isn't too zoomed in (beyond that, it's just a line fragment). */
export const showsOutline = (frame: Frame): boolean => frame.k >= 0.4

/** Frame tightly bounding `points`, without the "give up and show full France" rule (see `computeFrame`). */
function frameFor(points: Pt[]): Frame {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  const half = Math.max(60, span * 0.9 + 30)
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const cx = clamp((Math.min(...xs) + Math.max(...xs)) / 2, 10 + half, 415 - half)
  const cy = clamp((Math.min(...ys) + Math.max(...ys)) / 2, 10 + half, 415 - half)
  return { x: cx - half, y: cy - half, size: half * 2, k: (half * 2) / FULL_FRAME.size }
}

/** Full France, unless all points are clustered: we zoom in (up to ×3.4) so the lines stay readable. */
export function computeFrame(points: Pt[]): Frame {
  if (!points.length) return FULL_FRAME
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  const half = Math.max(60, span * 0.9 + 30)
  return span >= 120 || half >= 150 ? FULL_FRAME : frameFor(points)
}

/**
 * Smallest square frame comfortably containing `points`, with just a small fixed margin instead of
 * `frameFor`'s generous city-cluster padding. Used once a region is chosen as background: the region's
 * own outline already has its natural extent, so fitting it snugly (not re-padding it as if it were a
 * loose handful of cities) is what makes the map use the available space instead of looking tiny.
 *
 * Unlike `frameFor`, the center isn't clamped to the full-France canvas: this frame draws the region's
 * own outline standalone (no shared background to stay aligned with), so a region sitting near the edge
 * of the France projection (Corsica, Bretagne...) still gets centered on its own shape instead of being
 * pushed off-center to keep the frame inside bounds that don't apply here.
 */
const REGION_FRAME_MARGIN = 12
function tightFrameFor(points: Pt[]): Frame {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const half = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + REGION_FRAME_MARGIN
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  return { x: cx - half, y: cy - half, size: half * 2, k: (half * 2) / FULL_FRAME.size }
}

const r1 = (n: number) => Math.round(n * 10) / 10
/** Sign of the arcs' curvature, alternating as in the mockup (Paris +, Marseille +, Nantes −, Dijon +, Strasbourg −). */
const CURVE_SIGNS = [1, 1, -1, 1, -1]

/** Control point of the quadratic arc from a to b: offset perpendicularly by 14% of the chord. */
function controlPoint(a: Pt, b: Pt, index: number): Pt {
  const sign = CURVE_SIGNS[index % CURVE_SIGNS.length]
  const dx = b.x - a.x
  const dy = b.y - a.y
  return { x: (a.x + b.x) / 2 + 0.14 * sign * dy, y: (a.y + b.y) / 2 - 0.14 * sign * dx }
}

/** Quadratic arc from a to b: the control point is offset perpendicularly by 14% of the chord. */
export function arcPath(a: Pt, b: Pt, index: number): string {
  const c = controlPoint(a, b, index)
  return `M${r1(a.x)} ${r1(a.y)} Q${r1(c.x)} ${r1(c.y)} ${r1(b.x)} ${r1(b.y)}`
}

/*
 * A route to a foreign city (real GPS position, so drawn as if the line truly reached it) is cut
 * where it leaves France, with a short fade instead of a hard edge — see `foreignCut` below.
 */

function parseOutline(s: string): Pt[] {
  return s.split(' ').map((pair) => {
    const [x, y] = pair.split(',').map(Number)
    return { x, y }
  })
}
const FRANCE_RING = parseOutline(FRANCE_OUTLINE)
const CORSICA_RING = parseOutline(CORSICA_OUTLINE)

/** Ray-casting point-in-polygon test, in the map's own SVG coordinates (see `regionOf` for the lat/lon equivalent). */
function insideRing(pt: Pt, ring: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const { x: xi, y: yi } = ring[i]
    const { x: xj, y: yj } = ring[j]
    if (yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
function insideAnyRing(pt: Pt, rings: Pt[][]): boolean {
  return rings.some((ring) => insideRing(pt, ring))
}

/** A city with no known position, or whose real coordinates fall outside every bundled French region. */
function isForeign(city: CityRef): boolean {
  return city.lat === null || city.lon === null || regionOf(city.lat, city.lon) === null
}

const lerp = (p: Pt, q: Pt, t: number): Pt => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t })
const quadAt = (p0: Pt, c: Pt, p2: Pt, t: number): Pt => lerp(lerp(p0, c, t), lerp(c, p2, t), t)

/** How far (in curve parameter) the fade extends past the point where the line leaves the outline. */
const FADE_EXTRA_T = 0.05
const CROSSING_SAMPLES = 48

/**
 * Where a route's arc crosses out of `rings` (the outline currently drawn: a region's, or France's),
 * walking from the domestic end (assumed inside) towards the foreign one (assumed outside). Returns the
 * truncated path (domestic point → a little past the crossing) and the two points the fade gradient
 * should run between, or null if `foreign` isn't actually outside `rings` (schematic outline imprecision
 * near the border) — the caller then falls back to the plain, uncut arc.
 */
function foreignCutArc(domestic: Pt, control: Pt, foreign: Pt, rings: Pt[][]): { d: string; fadeFrom: Pt; fadeTo: Pt } | null {
  if (insideAnyRing(foreign, rings)) return null
  let lastInsideT = 0
  for (let i = 1; i <= CROSSING_SAMPLES; i++) {
    const t = i / CROSSING_SAMPLES
    if (insideAnyRing(quadAt(domestic, control, foreign, t), rings)) lastInsideT = t
    else break
  }
  const tEnd = Math.min(1, lastInsideT + FADE_EXTRA_T)
  const subControl = lerp(domestic, control, tEnd)
  const fadeTo = quadAt(domestic, control, foreign, tEnd)
  const fadeFrom = quadAt(domestic, control, foreign, lastInsideT)
  return { d: `M${r1(domestic.x)} ${r1(domestic.y)} Q${r1(subControl.x)} ${r1(subControl.y)} ${r1(fadeTo.x)} ${r1(fadeTo.y)}`, fadeFrom, fadeTo }
}

/** Anchor points (map space) of the gradient a foreign-bound route should fade through, or null for a plain domestic route. */
export interface RouteFade {
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * The path to actually draw for a route, its on-screen length (for animation timing) and, when it
 * reaches a foreign city, where it should fade out. `rings` is whichever outline is currently drawn
 * in the background (a region's when zoomed on one, France + Corsica otherwise).
 */
function foreignCut(route: RouteStat, a: Pt, b: Pt, index: number, rings: Pt[][]): { d: string; length: number; fade: RouteFade | null } {
  const aForeign = isForeign(route.cityA)
  const bForeign = isForeign(route.cityB)
  if (!aForeign && !bForeign) return { d: arcPath(a, b, index), length: Math.hypot(b.x - a.x, b.y - a.y), fade: null }

  const control = controlPoint(a, b, index)
  const [domestic, foreign] = aForeign ? [b, a] : [a, b]
  const cut = foreignCutArc(domestic, control, foreign, rings)
  if (!cut) return { d: arcPath(a, b, index), length: Math.hypot(b.x - a.x, b.y - a.y), fade: null }
  return {
    d: cut.d,
    length: Math.hypot(cut.fadeTo.x - domestic.x, cut.fadeTo.y - domestic.y),
    fade: { x1: cut.fadeFrom.x, y1: cut.fadeFrom.y, x2: cut.fadeTo.x, y2: cut.fadeTo.y },
  }
}

type Anchor = 'start' | 'middle' | 'end'
interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}
const CHAR_WIDTH = 6 // average character width at 11px, weight 600 (approximation)
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0

function labelBox(name: string, x: number, y: number, anchor: Anchor, k: number): Box {
  const w = name.length * CHAR_WIDTH * k
  const h = 11 * k
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'start' ? x : x - w
  return { x0, x1: x0 + w, y0: y - h * 0.85, y1: y + h * 0.25 }
}

export interface MapRoute {
  key: string
  /** "Saint-Étienne ↔ Paris" */
  name: string
  /** Path from A (the home city, when it's part of the route) to B — cut short (with `fade`) when B is a foreign city. */
  d: string
  totalLegs: number
  /** On-screen chord length (A to B, or to the fade's end when cut), used to make every line draw in at the same speed regardless of distance. */
  length: number
  /** Set when this route reaches a foreign city: gradient anchors for fading the line out where it leaves France. */
  fade: RouteFade | null
}

export interface MapCity {
  key: string
  name: string
  x: number
  y: number
  isHub: boolean
  routeKeys: string[]
  label: { x: number; y: number; anchor: Anchor; hidden: boolean }
}

/** A single travel leg placed on the animation timeline. */
export interface MapLeg {
  /** Position on the animation progress axis (month index + fraction of the month elapsed). */
  pos: number
  /** "Saint-Étienne → Annecy": actual direction of this leg. */
  label: string
  /** "5 avril" (with the year when the period spans several years). */
  date: string
}

export interface MapModel {
  frame: Frame
  /** Background to draw behind the routes: a region's outline when zoomed in on it, null for the full-France view (drawn separately) or when no region matched. */
  regionOutline: string | null
  routes: MapRoute[]
  cities: MapCity[]
  months: { label: string; legs: Record<string, number>; km: number }[]
  totalKm: number
  maxLegs: number
  doneLabel: string
  /** Wall-clock duration of each month's playback, one entry per `months` (500-4000ms, see `buildMapModel`). */
  monthDurationsMs: number[]
  /**
   * Longest line among those newly appearing in each month (one entry per `months`), 0 when no line
   * appears that month. It sets the reference draw speed: that line draws over the whole month like
   * before, and shorter lines appearing the same month draw at the same speed (so they finish sooner)
   * instead of all stretching to fill the month regardless of their length.
   */
  monthMaxNewRouteLength: number[]
  /** Every travel leg drawn on the map, oldest first: feeds the "last trips" list. */
  log: MapLeg[]
}

/** A line's minimum time on screen, and a month's floor/ceiling, so playback stays readable whatever the volume. */
const PER_EVENT_MS = 500
const MIN_MONTH_MS = 500
const MAX_MONTH_MS = 4000

interface DrawnRoute {
  route: RouteStat
  a: Pt
  b: Pt
}

/**
 * Routes whose two cities both have a position on the map (stations unknown to the referential are
 * excluded), except a route connecting two foreign cities — nothing in it ever touches France, so it
 * has nothing meaningful to cut/fade against and is left off the map (still counted everywhere else).
 * All drawable routes, not just the top-ranked ones shown on the ranking screen.
 */
function drawable(stats: WrappedStats): DrawnRoute[] {
  return stats.allRoutes.flatMap((route) => {
    const { cityA, cityB } = route
    if (cityA.x === null || cityA.y === null || cityB.x === null || cityB.y === null) return []
    if (isForeign(cityA) && isForeign(cityB)) return []
    return [{ route, a: { x: cityA.x, y: cityA.y }, b: { x: cityB.x, y: cityB.y } }]
  })
}

/**
 * The region with the most trips among the drawn routes' cities (a route touching two regions counts
 * for both), or null if none resolves to a bundled region. Used only when the frame is zoomed in on a
 * cluster of cities (see `computeFrame`): the full-France view already has its own outline.
 */
function dominantRegion(routes: DrawnRoute[]): Region | null {
  const totals = new Map<string, { region: Region; trips: number }>()
  for (const { route } of routes) {
    for (const city of [route.cityA, route.cityB]) {
      if (city.lat === null || city.lon === null) continue
      const region = regionOf(city.lat, city.lon)
      if (!region) continue
      const entry = totals.get(region.code)
      if (entry) entry.trips += route.trips
      else totals.set(region.code, { region, trips: route.trips })
    }
  }
  return [...totals.values()].sort((a, b) => b.trips - a.trips || a.region.code.localeCompare(b.region.code))[0]?.region ?? null
}

/**
 * Frame to draw `routes` in, and the region to show as its background (null for the full-France view
 * or when no region matched). Once a region is chosen as background, the frame is grown if needed so
 * the region's whole outline fits inside it — otherwise it gets clipped by the viewBox, leaving a
 * straight, un-region-shaped edge wherever it used to run past the frame.
 */
function frameAndRegion(points: Pt[], routes: DrawnRoute[]): { frame: Frame; region: Region | null } {
  const cityFrame = computeFrame(points)
  if (cityFrame === FULL_FRAME) return { frame: cityFrame, region: null }
  const region = dominantRegion(routes)
  return { frame: region ? tightFrameFor([...points, ...region.points]) : cityFrame, region }
}

function placeLabels(cities: Omit<MapCity, 'label'>[], frame: Frame): Map<string, MapCity['label']> {
  const k = frame.k
  const placed: Box[] = []
  const dots: Box[] = cities.map((c) => ({ x0: c.x - 6 * k, x1: c.x + 6 * k, y0: c.y - 6 * k, y1: c.y + 6 * k }))
  const hub = cities.find((c) => c.isHub)
  const ref = hub ?? { x: FULL_FRAME.x + FULL_FRAME.size / 2, y: FULL_FRAME.y + FULL_FRAME.size / 2 }
  const inside = (b: Box) => b.x0 >= frame.x + 4 * k && b.x1 <= frame.x + frame.size - 4 * k && b.y0 >= frame.y && b.y1 <= frame.y + frame.size
  const out = new Map<string, MapCity['label']>()

  const ordered = [...cities].sort((a, b) => Number(b.isHub) - Number(a.isHub))
  for (const c of ordered) {
    const options: Record<string, { x: number; y: number; anchor: Anchor }> = {
      above: { x: c.x, y: c.y - 8 * k, anchor: 'middle' },
      below: { x: c.x, y: c.y + 16 * k, anchor: 'middle' },
      right: { x: c.x + 9 * k, y: c.y + 4 * k, anchor: 'start' },
      left: { x: c.x - 9 * k, y: c.y + 4 * k, anchor: 'end' },
    }
    const dx = c.x - ref.x
    const dy = c.y - ref.y
    const vertical = Math.abs(dy) > 0.5 * Math.abs(dx)
    const order = c.isHub
      ? ['right', 'below', 'above', 'left']
      : vertical
        ? [dy < 0 ? 'above' : 'below', dx >= 0 ? 'right' : 'left', dx >= 0 ? 'left' : 'right', dy < 0 ? 'below' : 'above']
        : [dx >= 0 ? 'right' : 'left', dy < 0 ? 'above' : 'below', dy < 0 ? 'below' : 'above', dx >= 0 ? 'left' : 'right']
    const pick = order.find((name) => {
      const o = options[name]
      const box = labelBox(c.name, o.x, o.y, o.anchor, k)
      return inside(box) && !placed.some((p) => overlaps(p, box)) && !dots.some((d, i) => cities[i] !== c && overlaps(d, box))
    })
    const chosen = options[pick ?? order[0]]
    if (pick) placed.push(labelBox(c.name, chosen.x, chosen.y, chosen.anchor, k))
    out.set(c.key, { ...chosen, hidden: !pick })
  }
  return out
}

export function buildMapModel(stats: WrappedStats): MapModel | null {
  const routes = drawable(stats)
  if (!routes.length || !stats.timeline.length) return null

  const points = routes.flatMap((r) => [r.a, r.b])
  const { frame, region } = frameAndRegion(points, routes)
  const keys = new Set(routes.map((r) => r.route.key))

  const cityMap = new Map<string, Omit<MapCity, 'label'>>()
  for (const { route, a, b } of routes) {
    for (const [city, p] of [[route.cityA, a], [route.cityB, b]] as [CityRef, Pt][]) {
      const known = cityMap.get(city.key)
      if (known) known.routeKeys.push(route.key)
      else cityMap.set(city.key, { key: city.key, name: abbreviateCityName(city.name), x: p.x, y: p.y, isHub: city.key === stats.hub?.key, routeKeys: [route.key] })
    }
  }
  const labels = placeLabels([...cityMap.values()], frame)
  const all = stats.period.kind === 'all'

  const months = stats.timeline.map((m) => ({
    label: monthName(m.month, all),
    legs: Object.fromEntries(Object.entries(m.routeLegs).filter(([k]) => keys.has(k))),
    km: m.km,
  }))
  const totals = new Map<string, number>()
  for (const m of months) for (const [k, n] of Object.entries(m.legs)) totals.set(k, (totals.get(k) ?? 0) + n)

  // Group each month's legs into readable lines: two consecutive legs on the same route, opposite
  // directions, within the same month, are one aller-retour line ("Paris ↔ Lyon") instead of two.
  // This keeps the line count (hence the month's duration, below) down without hiding a trip.
  interface MapEvent {
    month: string
    label: string
    date: string
  }
  const relevantLegs = stats.travelLegs.filter((l) => keys.has(l.routeKey))
  const events: MapEvent[] = []
  for (let i = 0; i < relevantLegs.length; i++) {
    const leg = relevantLegs[i]
    const next = relevantLegs[i + 1]
    const month = monthOf(leg.date)
    const isRoundTrip = next && next.routeKey === leg.routeKey && next.from === leg.to && next.to === leg.from && monthOf(next.date) === month
    const from = abbreviateCityName(leg.from)
    const to = abbreviateCityName(leg.to)
    if (isRoundTrip) {
      const date = leg.date === next.date ? dayMonthLabel(leg.date, all) : `${dayMonthLabel(leg.date, all)} – ${dayMonthLabel(next.date, all)}`
      events.push({ month, label: `${from} ↔ ${to}`, date })
      i++
    } else {
      events.push({ month, label: `${from} → ${to}`, date: dayMonthLabel(leg.date, all) })
    }
  }
  const eventsByMonth = new Map<string, MapEvent[]>()
  for (const e of events) {
    const list = eventsByMonth.get(e.month)
    if (list) list.push(e)
    else eventsByMonth.set(e.month, [e])
  }

  // Each month plays for as long as its lines need to be readable (500ms each), clamped so an empty
  // month doesn't stall and a very busy one doesn't drag the whole animation out.
  const monthDurationsMs = stats.timeline.map((m) => {
    const n = eventsByMonth.get(m.month)?.length ?? 0
    return Math.min(MAX_MONTH_MS, Math.max(MIN_MONTH_MS, n * PER_EVENT_MS))
  })

  // Lines are spread evenly across their month's playback (not at their real calendar date), so every
  // one gets the same time on screen regardless of how the trips happened to fall in the month.
  const log: MapLeg[] = stats.timeline.flatMap((m, idx) => {
    const monthEvents = eventsByMonth.get(m.month) ?? []
    return monthEvents.map((e, j) => ({ pos: idx + (j + 0.5) / monthEvents.length, label: e.label, date: e.date }))
  })

  // Whichever outline is actually drawn behind the routes (a region's when zoomed in on one, France +
  // Corsica otherwise) is also what a foreign-bound route's line is cut and faded against.
  const rings: Pt[][] = region ? [region.points] : [FRANCE_RING, CORSICA_RING]
  const cuts = new Map(routes.map(({ route, a, b }, i) => [route.key, foreignCut(route, a, b, i, rings)]))
  const lengths = new Map(routes.map(({ route }) => [route.key, cuts.get(route.key)!.length]))
  // The month a route is first drawn: the earliest month where it has any leg.
  const firstMonthByRoute = new Map<string, number>()
  months.forEach((m, i) => {
    for (const key of Object.keys(m.legs)) if (!firstMonthByRoute.has(key)) firstMonthByRoute.set(key, i)
  })
  const monthMaxNewRouteLength = months.map((_, i) => Math.max(0, ...[...firstMonthByRoute.entries()].filter(([, mi]) => mi === i).map(([key]) => lengths.get(key) ?? 0)))

  return {
    frame,
    regionOutline: region?.outline ?? null,
    routes: routes.map(({ route }) => {
      const cut = cuts.get(route.key)!
      return {
        key: route.key,
        name: `${abbreviateCityName(route.cityA.name)} ↔ ${abbreviateCityName(route.cityB.name)}`,
        d: cut.d,
        totalLegs: totals.get(route.key) ?? route.trips,
        length: cut.length,
        fade: cut.fade,
      }
    }),
    cities: [...cityMap.values()].map((c) => ({ ...c, label: labels.get(c.key) as MapCity['label'] })),
    months,
    totalKm: stats.distance.estimatedKm,
    maxLegs: Math.max(1, ...totals.values()),
    monthMaxNewRouteLength,
    doneLabel: `${all ? 'Toute la période' : "Sur toute l'année"}, ${routes.length} ${plural(routes.length, 'ligne', 'lignes')}`,
    monthDurationsMs,
    log,
  }
}

export interface MapState {
  arcs: { d: string; off: number; o: number; w: string; fade: RouteFade | null }[]
  dots: { x: number; y: number; r: number; o: number }[]
  labels: { name: string; x: number; y: number; anchor: Anchor; o: number; fontSize: number }[]
  /** Up to 5 most recent travel legs at the current progress, most recent first. */
  recentTrips: { label: string; date: string }[]
  /** Colors of the monthly ticks: accent (elapsed), accent 50% (in progress), grey (upcoming). */
  ticks: ('done' | 'current' | 'todo')[]
  km: string
  phase: string
}

/**
 * Map state for a progress value `p` (0 → number of months): mirrors `mapVals` from the mockup, with
 * actual routes and months. Line widths grow with the number of trips, relative to the most frequent
 * route.
 */
export function evaluateMap(model: MapModel, progress: number): MapState {
  const n = model.months.length
  const p = Math.min(n, Math.max(0, Number.isFinite(progress) ? progress : 0)) // always within [0, n]
  const done = Math.floor(p)
  const frac = p - done
  const k = model.frame.k
  const cum: Record<string, number> = {}
  let km = 0
  for (let i = 0; i < Math.min(done, n); i++) {
    for (const [key, legs] of Object.entries(model.months[i].legs)) cum[key] = (cum[key] ?? 0) + legs
    km += model.months[i].km
  }
  const partial = done < n ? model.months[done].legs : {}
  if (done < n) km += model.months[done].km * frac
  const finished = p >= n

  const routesOfCity = (c: MapCity) => c.routeKeys
  const seen = (c: MapCity) => c.isHub || routesOfCity(c).some((key) => cum[key] || partial[key])
  const active = (c: MapCity) => routesOfCity(c).some((key) => partial[key])

  // Lines newly appearing this month draw at the same speed regardless of their length: the longest
  // one among them uses the whole month's frac (as before), shorter ones finish sooner instead of
  // stretching to fill the month too.
  const maxNewLength = done < n ? model.monthMaxNewRouteLength[done] : 0
  return {
    arcs: model.routes.map((r) => {
      const w = cum[r.key] ?? 0
      const drawing = partial[r.key] !== undefined && !w
      const share = maxNewLength > 0 ? r.length / maxNewLength : 1
      const drawFrac = share > 0 ? Math.min(1, frac / share) : 1
      return {
        d: r.d,
        off: w ? 0 : drawing ? Math.round(100 - drawFrac * 100) : 100,
        o: w || drawing ? (partial[r.key] ? 1 : 0.5) : 0,
        w: ((1.2 + (w / model.maxLegs) * 3.4) * k).toFixed(2),
        fade: r.fade,
      }
    }),
    dots: model.cities.map((c) => ({ x: c.x, y: c.y, r: (c.isHub ? 6 : active(c) ? 5 : 3.6) * k, o: seen(c) ? 1 : 0 })),
    labels: model.cities.map((c) => ({
      name: c.name,
      x: c.label.x,
      y: c.label.y,
      anchor: c.label.anchor,
      fontSize: 11 * k,
      o: c.label.hidden || !seen(c) ? 0 : active(c) || c.isHub ? 1 : 0.55,
    })),
    recentTrips: model.log
      .filter((l) => l.pos <= p)
      .slice(-5)
      .reverse()
      .map((l) => ({ label: l.label, date: l.date })),
    ticks: model.months.map((_, i) => (i < p - 0.5 ? 'done' : i <= p ? 'current' : 'todo')),
    km: fmtNum(finished ? model.totalKm : km),
    phase: finished ? model.doneLabel : model.months[Math.min(done, n - 1)].label,
  }
}

/** Widths and radii by rank, as in "CarteFrance" (Paris 6.4 → Strasbourg 2.4). */
const WIDTHS = [6.4, 3.6, 3.4, 2.8, 2.4]
const DOT_RADII = [6.4, 5.4, 5.4, 4.6, 4.6]

export interface FranceMapModel {
  frame: Frame
  regionOutline: string | null
  hub: Pt | null
  arcs: { d: string; w: number; fade: RouteFade | null; dots: { x: number; y: number; r: number }[] }[]
}

/** Mini-map for the shareable card: the same routes, without animation. */
export function buildFranceMapModel(stats: WrappedStats): FranceMapModel {
  const routes = drawable(stats)
  if (!routes.length) return { frame: FULL_FRAME, regionOutline: null, hub: null, arcs: [] }
  const { frame, region } = frameAndRegion(routes.flatMap((r) => [r.a, r.b]), routes)
  const rings: Pt[][] = region ? [region.points] : [FRANCE_RING, CORSICA_RING]
  const hubKey = stats.hub?.key
  const hubPoint = routes.flatMap((r) => (r.route.cityA.key === hubKey ? [r.a] : r.route.cityB.key === hubKey ? [r.b] : []))[0] ?? null
  return {
    frame,
    regionOutline: region?.outline ?? null,
    hub: hubPoint,
    arcs: routes.map(({ route, a, b }, i) => {
      const cut = foreignCut(route, a, b, i, rings)
      return {
        d: cut.d,
        w: WIDTHS[i] ?? WIDTHS[WIDTHS.length - 1],
        fade: cut.fade,
        dots: [
          // No label on this mini-map: a foreign city's dot (past the fade, outside France) would read as a stray mark, so it's left off.
          ...(route.cityA.key === hubKey || isForeign(route.cityA) ? [] : [{ ...a, r: DOT_RADII[i] ?? 4.6 }]),
          ...(route.cityB.key === hubKey || isForeign(route.cityB) ? [] : [{ ...b, r: DOT_RADII[i] ?? 4.6 }]),
        ],
      }
    }),
  }
}
