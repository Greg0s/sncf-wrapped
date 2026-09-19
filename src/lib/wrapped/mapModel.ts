import { monthOf, type CityRef, type RouteStat, type WrappedStats } from '../parsing'
import { fmtNum, plural } from './format'
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

/** Full France, unless all points are clustered: we zoom in (up to ×3.4) so the lines stay readable. */
export function computeFrame(points: Pt[]): Frame {
  if (!points.length) return FULL_FRAME
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  const half = Math.max(60, span * 0.9 + 30)
  if (span >= 120 || half >= 150) return FULL_FRAME
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const cx = clamp((Math.min(...xs) + Math.max(...xs)) / 2, 10 + half, 415 - half)
  const cy = clamp((Math.min(...ys) + Math.max(...ys)) / 2, 10 + half, 415 - half)
  return { x: cx - half, y: cy - half, size: half * 2, k: (half * 2) / FULL_FRAME.size }
}

const r1 = (n: number) => Math.round(n * 10) / 10
/** Sign of the arcs' curvature, alternating as in the mockup (Paris +, Marseille +, Nantes −, Dijon +, Strasbourg −). */
const CURVE_SIGNS = [1, 1, -1, 1, -1]

/** Quadratic arc from a to b: the control point is offset perpendicularly by 14% of the chord. */
export function arcPath(a: Pt, b: Pt, index: number): string {
  const sign = CURVE_SIGNS[index % CURVE_SIGNS.length]
  const dx = b.x - a.x
  const dy = b.y - a.y
  return `M${r1(a.x)} ${r1(a.y)} Q${r1((a.x + b.x) / 2 + 0.14 * sign * dy)} ${r1((a.y + b.y) / 2 - 0.14 * sign * dx)} ${r1(b.x)} ${r1(b.y)}`
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
  /** Path from A (the home city, when it's part of the route) to B. */
  d: string
  totalLegs: number
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

/** Routes whose two cities both have a position on the map (foreign stations are excluded). All of them, not just the top-ranked ones shown on the ranking screen. */
function drawable(stats: WrappedStats): DrawnRoute[] {
  return stats.allRoutes.flatMap((route) => {
    const { cityA, cityB } = route
    return cityA.x !== null && cityA.y !== null && cityB.x !== null && cityB.y !== null
      ? [{ route, a: { x: cityA.x, y: cityA.y }, b: { x: cityB.x, y: cityB.y } }]
      : []
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

/** Regional outline to draw as background, or null for the full-France view / when no region matched. */
function regionOutlineFor(frame: Frame, routes: DrawnRoute[]): string | null {
  return frame === FULL_FRAME ? null : (dominantRegion(routes)?.outline ?? null)
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
  const frame = computeFrame(points)
  const keys = new Set(routes.map((r) => r.route.key))

  const cityMap = new Map<string, Omit<MapCity, 'label'>>()
  for (const { route, a, b } of routes) {
    for (const [city, p] of [[route.cityA, a], [route.cityB, b]] as [CityRef, Pt][]) {
      const known = cityMap.get(city.key)
      if (known) known.routeKeys.push(route.key)
      else cityMap.set(city.key, { key: city.key, name: city.name, x: p.x, y: p.y, isHub: city.key === stats.hub?.key, routeKeys: [route.key] })
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
    if (isRoundTrip) {
      const date = leg.date === next.date ? dayMonthLabel(leg.date, all) : `${dayMonthLabel(leg.date, all)} – ${dayMonthLabel(next.date, all)}`
      events.push({ month, label: `${leg.from} ↔ ${leg.to}`, date })
      i++
    } else {
      events.push({ month, label: `${leg.from} → ${leg.to}`, date: dayMonthLabel(leg.date, all) })
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

  return {
    frame,
    regionOutline: regionOutlineFor(frame, routes),
    routes: routes.map(({ route, a, b }, i) => ({ key: route.key, name: route.label, d: arcPath(a, b, i), totalLegs: totals.get(route.key) ?? route.trips })),
    cities: [...cityMap.values()].map((c) => ({ ...c, label: labels.get(c.key) as MapCity['label'] })),
    months,
    totalKm: stats.distance.estimatedKm,
    maxLegs: Math.max(1, ...totals.values()),
    doneLabel: `${all ? 'Toute la période' : "Toute l'année"}, ${routes.length} ${plural(routes.length, 'ligne', 'lignes')}`,
    monthDurationsMs,
    log,
  }
}

export interface MapState {
  arcs: { d: string; off: number; o: number; w: string }[]
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

  return {
    arcs: model.routes.map((r) => {
      const w = cum[r.key] ?? 0
      const drawing = partial[r.key] !== undefined && !w
      return {
        d: r.d,
        off: w ? 0 : drawing ? Math.round(100 - frac * 100) : 100,
        o: w || drawing ? (partial[r.key] ? 1 : 0.5) : 0,
        w: ((1.2 + (w / model.maxLegs) * 3.4) * k).toFixed(2),
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
  arcs: { d: string; w: number; dots: { x: number; y: number; r: number }[] }[]
}

/** Mini-map for the shareable card: the same routes, without animation. */
export function buildFranceMapModel(stats: WrappedStats): FranceMapModel {
  const routes = drawable(stats)
  if (!routes.length) return { frame: FULL_FRAME, regionOutline: null, hub: null, arcs: [] }
  const frame = computeFrame(routes.flatMap((r) => [r.a, r.b]))
  const hubKey = stats.hub?.key
  const hubPoint = routes.flatMap((r) => (r.route.cityA.key === hubKey ? [r.a] : r.route.cityB.key === hubKey ? [r.b] : []))[0] ?? null
  return {
    frame,
    regionOutline: regionOutlineFor(frame, routes),
    hub: hubPoint,
    arcs: routes.map(({ route, a, b }, i) => ({
      d: arcPath(a, b, i),
      w: WIDTHS[i] ?? WIDTHS[WIDTHS.length - 1],
      dots: [
        ...(route.cityA.key === hubKey ? [] : [{ ...a, r: DOT_RADII[i] ?? 4.6 }]),
        ...(route.cityB.key === hubKey ? [] : [{ ...b, r: DOT_RADII[i] ?? 4.6 }]),
      ],
    })),
  }
}
