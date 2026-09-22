import { describe, expect, it } from 'vitest'
import { buildSncfCsv, type FixtureRow } from './__fixtures__/sncfCsv'
import { computeWrappedStats } from './computeWrappedStats'
import { buildTripDataset, listPeriods, type TripDataset } from './dataset'
import stationData from './data/gares.json'
import { haversineKm, RAIL_DETOUR_FACTOR } from './geo'
import { parseSncfCsv } from './parseSncfCsv'
import { createStationIndex } from './stations'
import type { StationData } from './types'

const index = createStationIndex(stationData as unknown as StationData)
const TODAY = '2026-06-30'

const SEC = 'SAINT ETIENNE CHATEAUCREUX'

function datasetOf(rows: FixtureRow[], today = TODAY): TripDataset {
  const parsed = parseSncfCsv(buildSncfCsv(rows))
  if (!parsed.ok) throw new Error(parsed.error.message)
  return buildTripDataset(parsed.data.trips, index, today)
}

const km = (a: string, b: string) => {
  const [p, q] = [index.resolve(a), index.resolve(b)]
  if (!p || !q) throw new Error(`gare inconnue : ${a} / ${b}`)
  return haversineKm(p.lat, p.lon, q.lat, q.lon)
}

// Reference scenario (today = 2026-06-30), computed by hand in the assertions below.
const scenario: FixtureRow[] = [
  { departure: '2026-01-10T08:00:00.000Z', orderDate: '2026-01-05', origin: SEC, destination: 'ROANNE', amount: '9,2' },
  { departure: '2026-01-12T18:30:00.000Z', orderDate: '2026-01-12', origin: 'ROANNE', destination: SEC, amount: '9,2' },
  // TGV ticket + TER ticket for the same trip: 40 + 5 = 45 €, a single leg
  { order: 'P1', departure: '2026-02-14T09:00:00.000Z', orderDate: '2026-01-20', origin: SEC, destination: 'PARIS GARE DE LYON', amount: '40' },
  { order: 'P1', departure: '2026-02-14T09:00:00.000Z', orderDate: '2026-01-20', origin: SEC, destination: 'PARIS GARE DE LYON', amount: '5' },
  { departure: '2026-02-16T17:00:00.000Z', orderDate: '2026-01-20', origin: 'PARIS GARE DE LYON', destination: SEC, amount: '42' },
  { departure: '2026-03-01T10:00:00.000Z', orderDate: '2026-03-01', origin: 'SAINT ETIENNE CARNOT', destination: 'LYON PART DIEU', amount: '10' },
  // connection within Lyon: counts as a leg and as spend, but not as a route or a destination
  { departure: '2026-03-01T20:00:00.000Z', orderDate: '2026-03-01', origin: 'LYON PERRACHE', destination: 'LYON PART DIEU', amount: '1,2' },
  // round trip: 2 legs
  { departure: '2026-04-05T12:00:00.000Z', orderDate: '2026-03-05', origin: SEC, destination: 'ANNECY', roundTrip: true, amount: '60' },
  // unpaid option: ignored right at parsing time
  { departure: '2026-05-01T10:00:00.000Z', origin: SEC, destination: 'NICE', payment: 'Option posée', amount: '80' },
  // upcoming departure: excluded from all statistics
  { departure: '2026-12-24T10:00:00.000Z', origin: SEC, destination: 'PARIS GARE DE LYON', amount: '50' },
  // previous year
  { departure: '2025-12-20T10:00:00.000Z', orderDate: '2025-12-19', origin: SEC, destination: 'ROANNE', amount: '9,2' },
]

describe('computeWrappedStats — scénario de référence, année 2026', () => {
  const ds = datasetOf(scenario)
  const s = computeWrappedStats(ds, { kind: 'year', year: 2026 })

  it('écarte les départs à venir', () => {
    expect(ds.upcoming).toHaveLength(1)
    expect(ds.trips.every((t) => t.departureDate <= TODAY)).toBe(true)
  })

  it('compte trajets (allers simples) et voyages', () => {
    expect(s.tripCount).toBe(8) // 1+1+1+1+1+1 + 2 (round trip)
    expect(s.bookingCount).toBe(7)
    expect(s.quality.roundTripBookings).toBe(1)
    expect(s.quality.sameCityTrips).toBe(1)
  })

  it('estime les km = à vol d’oiseau × facteur de détour, l’aller-retour comptant double', () => {
    const straight =
      2 * km(SEC, 'ROANNE') + 2 * km(SEC, 'PARIS GARE DE LYON') + km('SAINT ETIENNE CARNOT', 'LYON PART DIEU') + km('LYON PERRACHE', 'LYON PART DIEU') + 2 * km(SEC, 'ANNECY')
    expect(s.distance.detourFactor).toBe(RAIL_DETOUR_FACTOR)
    expect(s.distance.straightLineKm).toBe(Math.round(straight))
    expect(s.distance.estimatedKm).toBe(Math.round(straight * RAIL_DETOUR_FACTOR))
    expect(s.distance.coveredTrips).toBe(8)
    expect(s.distance.uncoveredTrips).toBe(0)
    expect(s.distance.kmPerTrip).toBe(Math.round(s.distance.estimatedKm / 8))
    expect(s.distance.earthLaps).toBeCloseTo(s.distance.estimatedKm / 40075, 6)
  })

  it('retient le trajet le plus long (un seul aller)', () => {
    expect(s.distance.longest).toMatchObject({
      km: Math.round(km(SEC, 'PARIS GARE DE LYON') * RAIL_DETOUR_FACTOR),
      from: 'Saint-Étienne',
      to: 'Paris',
      date: '2026-02-14',
      roundTrip: false,
    })
  })

  it("n'a pas de trajet le plus long sans distance connue", () => {
    const s = computeWrappedStats(datasetOf([{ departure: '2026-02-01T10:00:00.000Z', origin: 'GENEVE', destination: 'LAUSANNE', amount: '30' }]), { kind: 'year', year: 2026 })
    expect(s.distance.longest).toBeNull()
  })

  it('additionne le budget (billets fusionnés compris) et ignore l’option et le départ à venir', () => {
    expect(s.spend.totalEur).toBe(176.6) // 9,2+9,2+45+42+10+1,2+60
    expect(s.spend.avgPerTripEur).toBeCloseTo(176.6 / 8, 1)
    expect(s.spend.priciest).toMatchObject({ priceEur: 60, from: 'Saint-Étienne', to: 'Annecy', roundTrip: true })
    expect(s.spend.cheapest).toMatchObject({ priceEur: 1.2, from: 'Lyon', to: 'Lyon' })
    expect(s.spend.priciestMonth).toEqual({ month: '2026-02', totalEur: 87 })
  })

  it('rapporte la dépense mensuelle au nombre de mois couverts par les données (janvier → avril)', () => {
    expect(s.spend.monthsSpan).toBe(4)
    expect(s.spend.perMonthEur).toBeCloseTo(44.15, 2)
  })

  it('détermine la ville de base et la retire des destinations', () => {
    expect(s.hub).toMatchObject({ name: 'Saint-Étienne', appearances: 7 })
    expect(s.destinations.items.map((d) => d.city.name)).not.toContain('Saint-Étienne')
  })

  it('classe les destinations en s’adaptant : 4 villes distinctes → 4 lignes, pas 5', () => {
    expect(s.destinations.mode).toBe('ranking')
    expect(s.destinations.totalDistinct).toBe(4)
    expect(s.destinations.items.map((d) => [d.city.name, d.visits])).toEqual([
      ['Annecy', 1],
      ['Lyon', 1],
      ['Paris', 1],
      ['Roanne', 1],
    ])
    expect(s.destinations.items.every((d) => d.pct === 100)).toBe(true)
  })

  it('classe les itinéraires (deux sens confondus, ville de base en premier), sans l’intra-Lyon', () => {
    expect(s.routes.totalDistinct).toBe(4)
    expect(s.routes.items.map((r) => [r.label, r.trips])).toEqual([
      ['Saint-Étienne ↔ Paris', 2],
      ['Saint-Étienne ↔ Annecy', 2],
      ['Saint-Étienne ↔ Roanne', 2],
      ['Saint-Étienne ↔ Lyon', 1],
    ])
    expect(s.routes.items[0].stations).toEqual(['Saint-Étienne Châteaucreux', 'Paris Gare de Lyon'])
    expect(s.routes.items[0].totalEur).toBe(87)
  })

  it('calcule l’anticipation (jours entre commande et départ)', () => {
    // 5, 0, 25, 27, 0, 0, 31
    expect(s.anticipation).toEqual({
      tripsConsidered: 7,
      averageDays: 12.6,
      sameDayCount: 3,
      minDays: 0,
      maxDays: 31,
      bookingWeekday: { weekday: 1, count: 2 }, // Monday/Tuesday/Sunday tied → first day of the week
    })
  })

  it('fournit la chronologie de 12 mois, y compris les mois vides', () => {
    expect(s.timeline).toHaveLength(12)
    expect(s.timeline[0]).toMatchObject({ month: '2026-01', trips: 2, spendEur: 18.4 })
    expect(s.timeline[4]).toMatchObject({ month: '2026-05', trips: 0, spendEur: 0 })
    const annecy = s.routes.items.find((r) => r.label.endsWith('Annecy'))!
    expect(s.timeline[3].routeLegs[annecy.key]).toBe(2)
  })

  it('liste les trajets individuels par ordre chronologique, sans la connexion intra-Lyon', () => {
    expect(s.travelLegs).toHaveLength(7) // 8 legs - 1 same-city connection
    expect(s.travelLegs.map((l) => l.date)).toEqual(['2026-01-10', '2026-01-12', '2026-02-14', '2026-02-16', '2026-03-01', '2026-04-05', '2026-04-05'])
    expect(s.travelLegs.map((l) => [l.from, l.to])).toEqual([
      ['Saint-Étienne', 'Roanne'],
      ['Roanne', 'Saint-Étienne'],
      ['Saint-Étienne', 'Paris'],
      ['Paris', 'Saint-Étienne'],
      ['Saint-Étienne', 'Lyon'],
      ['Saint-Étienne', 'Annecy'],
      ['Annecy', 'Saint-Étienne'],
    ])
    const annecy = s.routes.items.find((r) => r.label.endsWith('Annecy'))!
    expect(s.travelLegs[5].routeKey).toBe(annecy.key)
  })

  it('fournit les textes de période', () => {
    expect(s.display).toEqual({ period: 'Édition 2026', big: '2026', bigStart: '2026', bigEnd: '2026' })
    expect(s.from).toBe('2026-01-10')
    expect(s.to).toBe('2026-04-05')
  })

  it('donne à chaque ville une position sur la carte schématique', () => {
    for (const r of s.routes.items) {
      for (const c of [r.cityA, r.cityB]) {
        expect(c.x).toBeGreaterThan(10)
        expect(c.x).toBeLessThan(415)
        expect(c.y).toBeGreaterThan(10)
        expect(c.y).toBeLessThan(415)
      }
    }
  })
})

describe('périodes', () => {
  const ds = datasetOf(scenario)

  it('propose chaque année (récente d’abord) puis « toutes les années »', () => {
    expect(listPeriods(ds)).toEqual([
      { period: { kind: 'year', year: 2026 }, tripCount: 8 },
      { period: { kind: 'year', year: 2025 }, tripCount: 1 },
      { period: { kind: 'all' }, tripCount: 9 },
    ])
  })

  it('ne propose pas « toutes les années » quand il n’y en a qu’une', () => {
    const one = datasetOf(scenario.filter((r) => r.departure.startsWith('2026')))
    expect(listPeriods(one).map((p) => p.period.kind)).toEqual(['year'])
  })

  it('cumule plusieurs années', () => {
    const all = computeWrappedStats(ds, { kind: 'all' })
    expect(all.tripCount).toBe(9)
    expect(all.spend.totalEur).toBe(185.8)
    expect(all.display).toEqual({ period: '2025 → 2026', big: '2 ans', bigStart: '2025', bigEnd: '2026' })
    expect(all.spend.monthsSpan).toBe(5) // December 2025 → April 2026
    expect(all.timeline[0].month).toBe('2025-12')
    expect(all.timeline).toHaveLength(5)
  })
})

describe('classements adaptatifs', () => {
  const to = (dest: string, day: number): FixtureRow => ({ departure: `2026-02-${String(day).padStart(2, '0')}T10:00:00.000Z`, origin: SEC, destination: dest })

  it('coupe à 5 quand il y a plus de 5 destinations distinctes', () => {
    const cities = ['ROANNE', 'LYON PART DIEU', 'PARIS GARE DE LYON', 'ANNECY', 'MONTPELLIER SAINT ROCH', 'BORDEAUX SAINT JEAN', 'RENNES', 'LILLE FLANDRES']
    const s = computeWrappedStats(datasetOf(cities.map((c, i) => to(c, i + 1))), { kind: 'year', year: 2026 })
    expect(s.destinations.items).toHaveLength(5)
    expect(s.destinations.totalDistinct).toBe(8)
    expect(s.routes.items).toHaveLength(5)
    expect(s.allRoutes).toHaveLength(8) // unranked, unlike routes.items: the map needs every one of them
  })

  it('ne fabrique pas un top 5 avec 3 trajets', () => {
    const s = computeWrappedStats(datasetOf([to('ROANNE', 1), to('LYON PART DIEU', 2), to('PARIS GARE DE LYON', 3)]), { kind: 'year', year: 2026 })
    expect(s.destinations.items).toHaveLength(3)
    expect(s.routes.items).toHaveLength(3)
  })

  it('classe par nombre de visites, puis par ordre alphabétique', () => {
    const s = computeWrappedStats(datasetOf([to('ROANNE', 1), to('LYON PART DIEU', 2), to('ROANNE', 3), to('ANNECY', 4)]), { kind: 'year', year: 2026 })
    expect(s.destinations.items.map((d) => [d.city.name, d.visits, d.pct])).toEqual([
      ['Roanne', 2, 100],
      ['Annecy', 1, 50],
      ['Lyon', 1, 50],
    ])
  })

  it('passe en « single » quand une seule destination existe', () => {
    const s = computeWrappedStats(datasetOf([to('ROANNE', 1), to('ROANNE', 2)]), { kind: 'year', year: 2026 })
    expect(s.destinations.mode).toBe('single')
    expect(s.routes.mode).toBe('single')
  })

  it('passe en « empty » quand tous les trajets restent dans une même ville', () => {
    const s = computeWrappedStats(datasetOf([{ departure: '2026-02-01T10:00:00.000Z', origin: 'LYON PERRACHE', destination: 'LYON PART DIEU' }]), { kind: 'year', year: 2026 })
    expect(s.destinations.mode).toBe('empty')
    expect(s.routes.mode).toBe('empty')
    expect(s.hub).toBeNull()
    expect(s.tripCount).toBe(1)
  })

  it('respecte une taille maximale personnalisée', () => {
    const cities = ['ROANNE', 'LYON PART DIEU', 'PARIS GARE DE LYON', 'ANNECY']
    const s = computeWrappedStats(datasetOf(cities.map((c, i) => to(c, i + 1))), { kind: 'year', year: 2026 }, { maxItems: 3 })
    expect(s.destinations.items).toHaveLength(3)
    expect(s.destinations.totalDistinct).toBe(4)
  })
})

describe('cas limites', () => {
  it('reste cohérent quand tous les billets sont pour des départs à venir', () => {
    const ds = datasetOf([{ departure: '2026-12-24T10:00:00.000Z', origin: SEC, destination: 'PARIS GARE DE LYON' }])
    expect(ds.trips).toHaveLength(0)
    expect(ds.upcoming).toHaveLength(1)
    expect(listPeriods(ds)).toEqual([])
    const s = computeWrappedStats(ds, { kind: 'all' })
    expect(s.tripCount).toBe(0)
    expect(s.display.period).toBe('—')
    expect(s.distance.estimatedKm).toBe(0)
    expect(s.destinations.mode).toBe('empty')
    expect(JSON.stringify(s)).not.toMatch(/NaN|null.*Infinity/)
  })

  it('prend pour ville de base la ville de départ du premier trajet en cas d’égalité', () => {
    const s = computeWrappedStats(datasetOf([{ departure: '2026-02-01T10:00:00.000Z', origin: 'PARIS GARE DE LYON', destination: 'LYON PART DIEU' }]), { kind: 'year', year: 2026 })
    expect(s.hub?.name).toBe('Paris')
    expect(s.destinations.items.map((d) => d.city.name)).toEqual(['Lyon'])
  })

  it('garde une gare étrangère dans les classements, sans distance', () => {
    const ds = datasetOf([
      { departure: '2026-02-01T10:00:00.000Z', origin: 'LYON PART DIEU', destination: 'GENEVE', amount: '30' },
      { departure: '2026-02-10T10:00:00.000Z', origin: 'LYON PART DIEU', destination: 'ANNECY', amount: '20' },
    ])
    const s = computeWrappedStats(ds, { kind: 'year', year: 2026 })
    expect(ds.unresolvedPlaces).toEqual([{ raw: 'GENEVE', matchedAs: null, via: 'none', count: 1 }])
    expect(s.destinations.items.map((d) => d.city.name).sort()).toEqual(['Annecy', 'Geneve'])
    expect(s.distance.coveredTrips).toBe(1)
    expect(s.distance.uncoveredTrips).toBe(1)
    expect(s.distance.estimatedKm).toBe(Math.round(km('LYON PART DIEU', 'ANNECY') * RAIL_DETOUR_FACTOR))
    const geneve = s.routes.items.find((r) => r.label.includes('Geneve'))!
    expect(geneve.km).toBeNull()
    expect(geneve.cityB.x).toBeNull() // no position on the map
  })

  it('n’attribue pas un prix inventé aux trajets sans montant', () => {
    const s = computeWrappedStats(datasetOf([{ departure: '2026-02-01T10:00:00.000Z', origin: SEC, destination: 'ROANNE', amount: '' }]), { kind: 'year', year: 2026 })
    expect(s.spend.totalEur).toBe(0)
    expect(s.spend.avgPerTripEur).toBeNull()
    expect(s.spend.perMonthEur).toBeNull()
    expect(s.spend.priciest).toBeNull()
    expect(s.quality.unpricedBookings).toBe(1)
  })

  it('exclut les voyages à 0 € de « billet le moins cher »', () => {
    const s = computeWrappedStats(
      datasetOf([
        { departure: '2026-02-01T10:00:00.000Z', origin: SEC, destination: 'ROANNE', amount: '0' },
        { departure: '2026-02-02T10:00:00.000Z', origin: SEC, destination: 'ROANNE', amount: '9,2' },
      ]),
      { kind: 'year', year: 2026 },
    )
    expect(s.spend.cheapest?.priceEur).toBe(9.2)
    expect(s.quality.freeBookings).toBe(1)
  })

  it('ignore une date de commande postérieure au départ (donnée incohérente)', () => {
    const s = computeWrappedStats(datasetOf([{ departure: '2026-02-01T10:00:00.000Z', orderDate: '2026-02-05', origin: SEC, destination: 'ROANNE' }]), { kind: 'year', year: 2026 })
    expect(s.anticipation).toBeNull()
    expect(s.quality.negativeLeadBookings).toBe(1)
  })

  it('formate le dernier mois d’une année non terminée sans diviser par 12', () => {
    const s = computeWrappedStats(datasetOf([{ departure: '2026-03-10T10:00:00.000Z', origin: SEC, destination: 'ROANNE', amount: '12' }]), { kind: 'year', year: 2026 })
    expect(s.spend.monthsSpan).toBe(1) // first and last data points both in March
    expect(s.spend.perMonthEur).toBe(12)
  })
})
