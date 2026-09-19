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
 * Tests de robustesse : des centaines d'exports fictifs aléatoires traversent toute la chaîne (lecture du CSV →
 * statistiques → modèle d'affichage → carte) et doivent respecter des invariants, quel que soit le contenu.
 * C'est le garde-fou de l'objectif « n'importe quel CSV du même format s'affiche ». Quand un vrai bug est
 * trouvé ailleurs, ajouter d'abord le cas ici (ou dans randomExport.ts), puis corriger.
 * En cas d'échec, le message indique la graine : `randomExport(<graine>, noms)` rejoue le cas.
 */

const data = stationData as unknown as StationData
const index = createStationIndex(data)
const names = data.stations.map((s) => s[0])
// Rapide par défaut ; pour chasser les bugs : FUZZ_SEEDS=2000 npm test -- invariants
const SEEDS = Number(process.env.FUZZ_SEEDS) || 120

/** Parcourt l'objet et échoue sur tout nombre non fini ou texte contenant un artefact (« NaN », « undefined »…). */
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
        // Seul cas légitime : rien d'exploitable (tout est option ou illisible)
        expect(parsed.error.code, ctx).toBe('no-valid-rows')
        continue
      }
      const ds = buildTripDataset(parsed.data.trips, index, today)
      const periods = listPeriods(ds)
      // Déterminisme : même fichier, même résultat
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

        // Comptages
        const legs = trips.reduce((n, t) => n + legCount(t), 0)
        expect(stats.tripCount, `${c} : trajets`).toBe(legs)
        expect(tripCount, `${c} : trajets annoncés dans la fenêtre d'import`).toBe(legs)
        expect(stats.bookingCount, `${c} : voyages`).toBe(trips.length)
        expect(stats.distance.coveredTrips + stats.distance.uncoveredTrips, `${c} : distances`).toBe(stats.tripCount)
        expect(stats.distance.estimatedKm, `${c} : km`).toBeGreaterThanOrEqual(0)

        // Budget : la somme indépendante des prix des voyages
        const total = Math.round(trips.reduce((s, t) => s + (t.priceEur ?? 0), 0) * 100) / 100
        expect(stats.spend.totalEur, `${c} : total`).toBeCloseTo(total, 2)

        // Classements adaptatifs : jamais plus de lignes que d'éléments distincts, triés, barres cohérentes
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

        // Chronologie : elle redonne les totaux (les km sont arrondis mois par mois)
        expect(stats.timeline.reduce((n, m) => n + m.trips, 0), `${c} : trajets par mois`).toBe(stats.tripCount)
        expect(Math.abs(stats.timeline.reduce((n, m) => n + m.km, 0) - stats.distance.estimatedKm), `${c} : km par mois`).toBeLessThanOrEqual(stats.timeline.length)

        // Écrans : teaser en tête, récap en queue, numérotation continue, sans doublon
        const ids = view.sections.map((s) => s.id)
        expect(ids[0], c).toBe('teaser')
        expect(ids[ids.length - 1], c).toBe('recap')
        expect(new Set(ids).size, `${c} : écrans uniques`).toBe(ids.length)
        expect(view.sections.slice(1).map((s) => s.label?.slice(0, 2)), `${c} : numérotation`).toEqual(ids.slice(1).map((_, i) => String(i + 1).padStart(2, '0')))
        expect(ids.includes('map'), `${c} : carte`).toBe(view.map !== null)
        expect(ids.includes('cities'), `${c} : villes`).toBe(stats.destinations.mode !== 'empty')

        // Étoile et cartes à partager
        expect(view.star.spokes.length, c).toBeLessThanOrEqual(4)
        expect(new Set(view.star.spokes.map((s) => s.draw)).size, `${c} : rayons distincts`).toBe(view.star.spokes.length)
        expect(view.cardVilles.length, c).toBeLessThanOrEqual(3)
        expect(view.cardRoutes.length, c).toBeLessThanOrEqual(3)

        // Carte animée : finie à tout instant, et le compteur finit sur le total
        if (view.map) {
          const n = view.map.months.length
          for (const p of [0, 0.3, 1, n / 2, n - 0.01, n]) assertClean(evaluateMap(view.map, p), `map@${p}`, c)
          expect(evaluateMap(view.map, n).km, `${c} : km final de la carte`).toBe(fmtNum(stats.distance.estimatedKm))
        }
      }
      // « Toutes les années » = somme des années
      const all = periods.find((p) => p.period.kind === 'all')
      if (all) expect(all.tripCount, `${ctx} : toutes années`).toBe(sumOfYears)
    }
    // Le générateur produit bien des cas exploitables (sinon le test ne prouverait rien)
    expect(analysed).toBeGreaterThan(SEEDS)
  }, Math.max(60_000, SEEDS * 100))
})
