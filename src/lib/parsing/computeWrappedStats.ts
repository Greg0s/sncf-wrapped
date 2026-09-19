import { dayNumber, monthOf, monthRange, monthsBetween, weekdayOf, yearOf } from './dates'
import type { CityRef, Period, ResolvedTrip, TripDataset, TripPlace } from './dataset'
import { legCount } from './dataset'
import { EARTH_CIRCUMFERENCE_KM, RAIL_DETOUR_FACTOR } from './geo'
import { MAX_TOP, rankTop, type Ranked } from './ranking'

/*
 * Calcule les valeurs affichées par les écrans du wrapped (maquette v3), pour une période donnée.
 * Fonction pure : aucune entrée/sortie, aucun réseau.
 *
 * Vocabulaire : un « trajet » (leg) est un aller simple ; un billet aller-retour en fait deux.
 * Les villes regroupent les gares d'une même commune (« Saint-Étienne » pour Châteaucreux, Carnot, Bellevue…).
 */

export interface StatsOptions {
  /** Taille maximale des classements ; ils rétrécissent d'eux-mêmes si les données sont plus pauvres. */
  maxItems?: number
  /** Facteur appliqué à la distance à vol d'oiseau pour approcher le tracé ferroviaire. */
  detourFactor?: number
}

export interface CityVisit {
  city: CityRef
  visits: number
  /** Largeur de barre (6–100), proportionnelle à la première ville. */
  pct: number
}

export interface RouteStat {
  key: string
  /** A → B : le sens le plus fréquent (ville « de base » en premier quand il y en a une). */
  cityA: CityRef
  cityB: CityRef
  /** Ex. « Saint-Étienne ↔ Roanne ». */
  label: string
  /** Gares les plus utilisées de chaque côté, ex. « Saint-Étienne Châteaucreux ». */
  stations: [string, string]
  /** Trajets, deux sens confondus. */
  trips: number
  /** Km estimés cumulés, null si aucune distance connue. */
  km: number | null
  totalEur: number
}

export interface TripHighlight {
  priceEur: number
  date: string
  time: string | null
  /** 0 = dimanche … 6 = samedi. */
  weekday: number
  partOfDay: 'night' | 'morning' | 'afternoon' | 'evening' | null
  from: string
  to: string
  roundTrip: boolean
}

export interface MonthBucket {
  /** AAAA-MM */
  month: string
  trips: number
  /** Km estimés. */
  km: number
  spendEur: number
  /** Trajets par itinéraire (clé de RouteStat) : alimente l'animation de la carte. */
  routeLegs: Record<string, number>
}

export interface Anticipation {
  /** Trajets ayant une date de commande cohérente. */
  tripsConsidered: number
  /** Jours entre la commande et le départ (moyenne, 1 décimale). */
  averageDays: number
  /** Billets pris le jour même du départ. */
  sameDayCount: number
  minDays: number
  maxDays: number
  /** Jour de la semaine où l'on commande le plus (0 = dimanche), à égalité le premier de la semaine. */
  bookingWeekday: { weekday: number; count: number } | null
}

export interface WrappedStats {
  period: Period
  /** Textes de période des écrans (teaser, carte à partager). */
  display: { period: string; big: string; bigStart: string; bigEnd: string }
  years: number[]
  from: string | null
  to: string | null

  /** Trajets = allers simples (un aller-retour compte pour 2). */
  tripCount: number
  /** Billets/voyages distincts (un aller-retour compte pour 1). */
  bookingCount: number

  distance: {
    /** Km estimés = à vol d'oiseau × facteur de détour. */
    estimatedKm: number
    straightLineKm: number
    detourFactor: number
    kmPerTrip: number | null
    earthLaps: number
    /** Trajets dont la distance est connue / inconnue (gare absente du référentiel). */
    coveredTrips: number
    uncoveredTrips: number
  }

  spend: {
    totalEur: number
    /** Moyenne par trajet (aller simple) sur les billets dont le montant est connu. */
    avgPerTripEur: number | null
    perMonthEur: number | null
    /** Mois pris en compte pour la moyenne mensuelle. */
    monthsSpan: number
    priciest: TripHighlight | null
    /** Billet le moins cher, hors billets à 0 €. */
    cheapest: TripHighlight | null
    priciestMonth: { month: string; totalEur: number } | null
  }

  /** Ville « de base » : la plus présente (départs + arrivées), exclue du classement des destinations. */
  hub: (CityRef & { appearances: number }) | null
  destinations: Ranked<CityVisit>
  routes: Ranked<RouteStat>
  anticipation: Anticipation | null
  /** Un bloc par mois (12 pour une année), y compris les mois vides. */
  timeline: MonthBucket[]

  quality: {
    sameCityTrips: number
    unpricedBookings: number
    freeBookings: number
    multiPassengerBookings: number
    roundTripBookings: number
    negativeLeadBookings: number
  }
}

interface Leg {
  trip: ResolvedTrip
  from: TripPlace
  to: TripPlace
  km: number | null
  eur: number
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const roundCents = (n: number) => Math.round(n * 100) / 100
const sameCity = (l: Leg) => l.from.city.key === l.to.city.key

function legsOf(t: ResolvedTrip): Leg[] {
  const eur = (t.priceEur ?? 0) / legCount(t)
  const legs: Leg[] = [{ trip: t, from: t.from, to: t.to, km: t.straightKm, eur }]
  if (t.roundTrip) legs.push({ trip: t, from: t.to, to: t.from, km: t.straightKm, eur })
  return legs
}

function partOfDay(time: string | null): TripHighlight['partOfDay'] {
  if (!time) return null
  const h = Number(time.slice(0, 2))
  return h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
}

function highlight(t: ResolvedTrip): TripHighlight {
  return {
    priceEur: t.priceEur ?? 0,
    date: t.departureDate,
    time: t.departureTime,
    weekday: weekdayOf(t.departureDate),
    partOfDay: partOfDay(t.departureTime),
    from: t.from.city.name,
    to: t.to.city.name,
    roundTrip: t.roundTrip,
  }
}

function displayOf(period: Period, years: number[]): WrappedStats['display'] {
  if (period.kind === 'year') return { period: `Édition ${period.year}`, big: String(period.year), bigStart: String(period.year), bigEnd: String(period.year) }
  if (!years.length) return { period: '—', big: '—', bigStart: '', bigEnd: '' }
  const [first, last] = [years[0], years[years.length - 1]]
  return { period: `${first} → ${last}`, big: `${last - first + 1} ans`, bigStart: String(first), bigEnd: String(last) }
}

/** Élément le plus fréquent d'une table de comptage ; à égalité, le premier par ordre alphabétique. */
function mostFrequent(counts: Map<string, number>): string {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))[0]?.[0] ?? ''
}

export function computeWrappedStats(ds: TripDataset, period: Period, options: StatsOptions = {}): WrappedStats {
  const maxItems = options.maxItems ?? MAX_TOP
  const factor = options.detourFactor ?? RAIL_DETOUR_FACTOR

  const trips = ds.trips.filter((t) => period.kind === 'all' || yearOf(t.departureDate) === period.year)
  const legs = trips.flatMap(legsOf)
  const years = [...new Set(trips.map((t) => yearOf(t.departureDate)))].sort((a, b) => a - b)

  // ── Distance ────────────────────────────────────────────────────────────────
  const measured = legs.filter((l) => l.km !== null)
  const straight = sum(measured.map((l) => l.km as number))
  const estimatedKm = Math.round(straight * factor)

  // ── Ville de base, destinations, itinéraires ───────────────────────────────
  const travelLegs = legs.filter((l) => !sameCity(l))
  const appearances = new Map<string, { city: CityRef; n: number }>()
  for (const l of travelLegs) {
    for (const c of [l.from.city, l.to.city]) appearances.set(c.key, { city: c, n: (appearances.get(c.key)?.n ?? 0) + 1 })
  }
  const firstOrigin = trips[0]?.from.city.key
  const ranked = [...appearances.values()].sort(
    (a, b) => b.n - a.n || Number(b.city.key === firstOrigin) - Number(a.city.key === firstOrigin) || a.city.name.localeCompare(b.city.name, 'fr'),
  )
  const hub = ranked[0] ? { ...ranked[0].city, appearances: ranked[0].n } : null

  const visits = new Map<string, { city: CityRef; n: number }>()
  for (const l of travelLegs) {
    if (l.to.city.key === hub?.key) continue
    visits.set(l.to.city.key, { city: l.to.city, n: (visits.get(l.to.city.key)?.n ?? 0) + 1 })
  }
  const visitList = [...visits.values()].sort((a, b) => b.n - a.n || a.city.name.localeCompare(b.city.name, 'fr'))
  const topVisits = visitList[0]?.n ?? 1
  const destinations = rankTop(
    visitList.map((v): CityVisit => ({ city: v.city, visits: v.n, pct: Math.max(6, Math.round((v.n / topVisits) * 100)) })),
    maxItems,
  )

  interface RouteAcc {
    cities: Map<string, CityRef>
    origins: Map<string, number>
    stations: Map<string, Map<string, number>>
    trips: number
    km: number
    kmKnown: boolean
    eur: number
  }
  const routeKeyOf = (l: Leg) => [l.from.city.key, l.to.city.key].sort().join('|')
  const accs = new Map<string, RouteAcc>()
  for (const l of travelLegs) {
    const key = routeKeyOf(l)
    let a = accs.get(key)
    if (!a) accs.set(key, (a = { cities: new Map(), origins: new Map(), stations: new Map(), trips: 0, km: 0, kmKnown: false, eur: 0 }))
    a.trips++
    a.eur += l.eur
    if (l.km !== null) {
      a.km += l.km * factor
      a.kmKnown = true
    }
    a.origins.set(l.from.city.key, (a.origins.get(l.from.city.key) ?? 0) + 1)
    for (const p of [l.from, l.to]) {
      a.cities.set(p.city.key, p.city)
      const byStation = a.stations.get(p.city.key) ?? new Map<string, number>()
      byStation.set(p.station, (byStation.get(p.station) ?? 0) + 1)
      a.stations.set(p.city.key, byStation)
    }
  }
  const routeList = [...accs.entries()]
    .map(([key, a]): RouteStat => {
      // Sens d'affichage : la ville de base en premier, sinon la ville d'où l'on part le plus souvent.
      const leadsFirst = (x: CityRef, y: CityRef): boolean => {
        if (x.key === hub?.key) return true
        if (y.key === hub?.key) return false
        const [ox, oy] = [a.origins.get(x.key) ?? 0, a.origins.get(y.key) ?? 0]
        return ox !== oy ? ox > oy : x.name.localeCompare(y.name, 'fr') <= 0
      }
      const [c1, c2] = [...a.cities.values()]
      const [cityA, cityB] = leadsFirst(c1, c2) ? [c1, c2] : [c2, c1]
      return {
        key,
        cityA,
        cityB,
        label: `${cityA.name} ↔ ${cityB.name}`,
        stations: [mostFrequent(a.stations.get(cityA.key) ?? new Map()), mostFrequent(a.stations.get(cityB.key) ?? new Map())],
        trips: a.trips,
        km: a.kmKnown ? Math.round(a.km) : null,
        totalEur: roundCents(a.eur),
      }
    })
    .sort((a, b) => b.trips - a.trips || (b.km ?? -1) - (a.km ?? -1) || a.label.localeCompare(b.label, 'fr'))
  const routes = rankTop(routeList, maxItems)

  // ── Budget ──────────────────────────────────────────────────────────────────
  const priced = trips.filter((t) => t.priceEur !== null)
  const totalEur = roundCents(sum(priced.map((t) => t.priceEur as number)))
  const pricedLegs = sum(priced.map(legCount))
  const paid = priced.filter((t) => (t.priceEur as number) > 0)
  const pick = (better: (a: number, b: number) => boolean) =>
    paid.length ? highlight(paid.reduce((best, t) => (better(t.priceEur as number, best.priceEur as number) ? t : best))) : null

  // Moyenne mensuelle : du 1er mois de la période (ou des données) au dernier mois connu du fichier.
  const dataStart = monthOf(ds.firstDate)
  const dataEnd = monthOf(ds.dataEnd)
  const periodStart = period.kind === 'year' ? `${period.year}-01` : dataStart
  const periodEnd = period.kind === 'year' ? `${period.year}-12` : dataEnd
  const spanStart = periodStart > dataStart ? periodStart : dataStart
  const spanEnd = periodEnd < dataEnd ? periodEnd : dataEnd
  const monthsSpan = Math.max(1, monthsBetween(spanStart, spanEnd) + 1)

  // ── Chronologie mensuelle (dépense rattachée au mois de départ) ────────────
  const timelineMonths = trips.length
    ? period.kind === 'year'
      ? monthRange(`${period.year}-01`, `${period.year}-12`)
      : monthRange(monthOf(trips[0].departureDate), monthOf(trips[trips.length - 1].departureDate))
    : []
  const buckets = new Map<string, MonthBucket>(timelineMonths.map((month) => [month, { month, trips: 0, km: 0, spendEur: 0, routeLegs: {} }]))
  for (const l of legs) {
    const b = buckets.get(monthOf(l.trip.departureDate))
    if (!b) continue
    b.trips++
    b.spendEur += l.eur
    if (l.km !== null) b.km += l.km * factor
    if (!sameCity(l)) b.routeLegs[routeKeyOf(l)] = (b.routeLegs[routeKeyOf(l)] ?? 0) + 1
  }
  const timeline = [...buckets.values()].map((b) => ({ ...b, km: Math.round(b.km), spendEur: roundCents(b.spendEur) }))
  const priciestMonth = timeline.reduce<MonthBucket | null>((best, b) => (b.spendEur > (best?.spendEur ?? 0) ? b : best), null)

  // ── Anticipation (jours entre la commande et le départ) ────────────────────
  let negativeLead = 0
  const leads: { lead: number; orderWeekday: number }[] = []
  for (const t of trips) {
    if (!t.orderDate) continue
    const lead = dayNumber(t.departureDate) - dayNumber(t.orderDate)
    if (lead < 0) negativeLead++
    else leads.push({ lead, orderWeekday: weekdayOf(t.orderDate) })
  }
  let anticipation: Anticipation | null = null
  if (leads.length) {
    const byWeekday = new Map<number, number>()
    for (const l of leads) byWeekday.set(l.orderWeekday, (byWeekday.get(l.orderWeekday) ?? 0) + 1)
    let bookingWeekday: Anticipation['bookingWeekday'] = null
    for (const weekday of [1, 2, 3, 4, 5, 6, 0]) {
      const count = byWeekday.get(weekday) ?? 0
      if (count > (bookingWeekday?.count ?? 0)) bookingWeekday = { weekday, count }
    }
    const values = leads.map((l) => l.lead)
    anticipation = {
      tripsConsidered: leads.length,
      averageDays: Math.round((sum(values) / values.length) * 10) / 10,
      sameDayCount: values.filter((v) => v === 0).length,
      minDays: Math.min(...values),
      maxDays: Math.max(...values),
      bookingWeekday,
    }
  }

  return {
    period,
    display: displayOf(period, years),
    years,
    from: trips[0]?.departureDate ?? null,
    to: trips[trips.length - 1]?.departureDate ?? null,
    tripCount: legs.length,
    bookingCount: trips.length,
    distance: {
      estimatedKm,
      straightLineKm: Math.round(straight),
      detourFactor: factor,
      kmPerTrip: measured.length ? Math.round(estimatedKm / measured.length) : null,
      earthLaps: estimatedKm / EARTH_CIRCUMFERENCE_KM,
      coveredTrips: measured.length,
      uncoveredTrips: legs.length - measured.length,
    },
    spend: {
      totalEur,
      avgPerTripEur: pricedLegs ? roundCents(totalEur / pricedLegs) : null,
      perMonthEur: priced.length ? roundCents(totalEur / monthsSpan) : null,
      monthsSpan,
      priciest: pick((a, b) => a > b),
      cheapest: pick((a, b) => a < b),
      priciestMonth: priciestMonth ? { month: priciestMonth.month, totalEur: priciestMonth.spendEur } : null,
    },
    hub,
    destinations,
    routes,
    anticipation,
    timeline,
    quality: {
      sameCityTrips: legs.length - travelLegs.length,
      unpricedBookings: trips.length - priced.length,
      freeBookings: priced.length - paid.length,
      multiPassengerBookings: trips.filter((t) => t.passengers > 1).length,
      roundTripBookings: trips.filter((t) => t.roundTrip).length,
      negativeLeadBookings: negativeLead,
    },
  }
}
