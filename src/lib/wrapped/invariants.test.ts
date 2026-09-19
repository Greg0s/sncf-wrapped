import { describe, expect, it } from 'vitest'
import { buildSncfCsv } from '../parsing/__fixtures__/sncfCsv'
import { randomExport } from '../parsing/__fixtures__/randomExport'
import {
  buildTripDataset,
  computeWrappedStats,
  createStationIndex,
  legCount,
  listPeriods,
  parseSncfCsv,
  type Period,
  type StationData,
  type TripDataset,
} from '../parsing'
import stationData from '../parsing/data/gares.json'
import { buildWrappedView } from './buildWrappedView'
import { fmtNum } from './format'
import { evaluateMap } from './mapModel'

/*
 * Robustness tests: hundreds of random fictional exports flow through the whole chain (CSV parsing →
 * statistics → display model → map) and must satisfy invariants regardless of content.
 * This is the guardrail for the goal "any CSV of the same format renders". When a real bug is
 * found elsewhere, add the case here first (or in randomExport.ts), then fix it.
 * On failure, the message gives the seed: `randomExport(<seed>, names)` replays the case.
 */

const data = stationData as unknown as StationData
const index = createStationIndex(data)
const names = data.stations.map((s) => s[0])
// Fast by default; to hunt for bugs: FUZZ_SEEDS=2000 npm test -- invariants
const SEEDS = Number(process.env.FUZZ_SEEDS) || 120

/** Walks the object and fails on any non-finite number or text containing an artifact ("NaN", "undefined"...). */
function assertClean(value: unknown, path: string, context: string): void {
  if (typeof value === 'number') expect(Number.isFinite(value), `${context} : ${path} = ${value}`).toBe(true)
  else if (typeof value === 'string') expect(value, `${context} : ${path}`).not.toMatch(/NaN|undefined|\[object|Infinity/)
  else if (Array.isArray(value)) value.forEach((v, i) => assertClean(v, `${path}[${i}]`, context))
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) assertClean(v, `${path}.${k}`, context)
}

function inPeriod(ds: TripDataset, period: Period) {
  return ds.trips.filter((t) => period.kind === 'all' || Number(t.departureDate.slice(0, 4)) === period.year)
}

describe(`${SEEDS} exports aléatoires`, () => {
  it('respectent tous les invariants de la chaîne', () => {
    let analysed = 0
    for (let seed = 1; seed <= SEEDS; seed++) {
      const ctx = `graine ${seed}`
      const { rows, today } = randomExport(seed, names)
      const csv = buildSncfCsv(rows)

      const parsed = parseSncfCsv(csv)
      if (!parsed.ok) {
        // The only legitimate case: nothing usable (everything is optional or unreadable)
        expect(parsed.error.code, ctx).toBe('no-valid-rows')
        continue
      }
      const ds = buildTripDataset(parsed.data.trips, index, today)
      const periods = listPeriods(ds)
      // Determinism: same file, same result
      expect(JSON.stringify(parseSncfCsv(csv)), `${ctx} : lecture non déterministe`).toBe(JSON.stringify(parsed))

      let sumOfYears = 0
      for (const { period, tripCount } of periods) {
        const c = `${ctx}, ${period.kind === 'all' ? 'toutes années' : period.year}`
        const trips = inPeriod(ds, period)
        const stats = computeWrappedStats(ds, period)
        const view = buildWrappedView(stats)
        analysed++
        if (period.kind === 'year') sumOfYears += tripCount

        expect(JSON.stringify(computeWrappedStats(ds, period)), `${c} : statistiques non déterministes`).toBe(JSON.stringify(stats))
        assertClean(stats, 'stats', c)
        assertClean(view, 'view', c)
        expect(JSON.stringify(view), `${c} : « heures à bord » réapparu`).not.toMatch(/h à bord|heures? de train/)

        // Counts
        const legs = trips.reduce((n, t) => n + legCount(t), 0)
        expect(stats.tripCount, `${c} : trajets`).toBe(legs)
        expect(tripCount, `${c} : trajets annoncés dans la fenêtre d'import`).toBe(legs)
        expect(stats.bookingCount, `${c} : voyages`).toBe(trips.length)
        expect(stats.distance.coveredTrips + stats.distance.uncoveredTrips, `${c} : distances`).toBe(stats.tripCount)
        expect(stats.distance.estimatedKm, `${c} : km`).toBeGreaterThanOrEqual(0)

        // Budget: sum of trip prices computed independently
        const total = Math.round(trips.reduce((s, t) => s + (t.priceEur ?? 0), 0) * 100) / 100
        expect(stats.spend.totalEur, `${c} : total`).toBeCloseTo(total, 2)

        // Adaptive rankings: never more rows than distinct items, sorted, consistent bars
        for (const [name, ranked, key] of [
          ['destinations', stats.destinations, (x: { visits: number }) => x.visits],
          ['itinéraires', stats.routes, (x: { trips: number }) => x.trips],
        ] as const) {
          const items = ranked.items as never[]
          expect(items.length, `${c} : ${name}`).toBe(Math.min(5, ranked.totalDistinct))
          const counts = items.map(key as (x: never) => number)
          expect(counts, `${c} : ${name} triés`).toEqual([...counts].sort((a, b) => b - a))
          expect(ranked.mode, `${c} : ${name} mode`).toBe(ranked.totalDistinct === 0 ? 'empty' : ranked.totalDistinct === 1 ? 'single' : 'ranking')
        }
        if (stats.destinations.items.length) {
          expect(stats.destinations.items[0].pct, c).toBe(100)
          for (const d of stats.destinations.items) expect(d.pct, c).toBeGreaterThanOrEqual(6)
        }
        expect(stats.destinations.items.every((d) => d.city.key !== stats.hub?.key), `${c} : la ville de base est exclue des destinations`).toBe(true)

        // Timeline: it adds back up to the totals (km are rounded month by month)
        expect(stats.timeline.reduce((n, m) => n + m.trips, 0), `${c} : trajets par mois`).toBe(stats.tripCount)
        expect(Math.abs(stats.timeline.reduce((n, m) => n + m.km, 0) - stats.distance.estimatedKm), `${c} : km par mois`).toBeLessThanOrEqual(stats.timeline.length)

        // Screens: teaser first, recap last, continuous numbering, no duplicates
        const ids = view.sections.map((s) => s.id)
        expect(ids[0], c).toBe('teaser')
        expect(ids[ids.length - 1], c).toBe('recap')
        expect(new Set(ids).size, `${c} : écrans uniques`).toBe(ids.length)
        expect(view.sections.slice(1).map((s) => s.label?.slice(0, 2)), `${c} : numérotation`).toEqual(ids.slice(1).map((_, i) => String(i + 1).padStart(2, '0')))
        expect(ids.includes('map'), `${c} : carte`).toBe(view.map !== null)
        expect(ids.includes('cities'), `${c}: cities`).toBe(stats.destinations.mode !== 'empty')

        // Star and shareable cards
        expect(view.star.spokes.length, c).toBeLessThanOrEqual(4)
        expect(new Set(view.star.spokes.map((s) => s.draw)).size, `${c} : rayons distincts`).toBe(view.star.spokes.length)
        expect(view.cardCities.length, c).toBeLessThanOrEqual(3)
        expect(view.cardRoutes.length, c).toBeLessThanOrEqual(3)

        // Animated map: finite at every instant, and the counter ends on the total
        if (view.map) {
          const n = view.map.months.length
          for (const p of [0, 0.3, 1, n / 2, n - 0.01, n]) assertClean(evaluateMap(view.map, p), `map@${p}`, c)
          expect(evaluateMap(view.map, n).km, `${c} : km final de la carte`).toBe(fmtNum(stats.distance.estimatedKm))
        }
      }
      // "All years" = sum of the years
      const all = periods.find((p) => p.period.kind === 'all')
      if (all) expect(all.tripCount, `${ctx} : toutes années`).toBe(sumOfYears)
    }
    // The generator does produce usable cases (otherwise the test would prove nothing)
    expect(analysed).toBeGreaterThan(SEEDS)
  }, Math.max(60_000, SEEDS * 100))
})
