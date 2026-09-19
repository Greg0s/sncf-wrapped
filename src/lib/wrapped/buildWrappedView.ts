import { CARD_TOP, type WrappedStats } from '../parsing'
import { cap, fmtEur, fmtNum, plural } from './format'
import { buildFranceMapModel, buildMapModel, type FranceMapModel, type MapModel } from './mapModel'
import { WEEKDAYS_FR } from '../parsing'
import { anticipationNote, eurNote, kmNote, monthName } from './phrases'
import { buildStar, type StarSpoke } from './star'

/*
 * Wrapped display model: turns the statistics (raw numbers) into what the screens show
 * (text, ranking rows, which screens to display). The fields of `d` mirror those of the mockup
 * (`sets()` in "SNCF Wrapped v3").
 *
 * Adaptation to volume (CLAUDE.md, constraint #3): a screen with no data is dropped (and the others are
 * renumbered), a ranking never shows more rows than there are distinct items, and headings switch to
 * singular or change wording when there's only one item or a tie at the top.
 */

export type SectionId = 'teaser' | 'km' | 'budget' | 'cities' | 'routes' | 'anticipation' | 'map' | 'recap'

export interface SectionMeta {
  id: SectionId
  /** "01 — Distance parcourue", null for the teaser. */
  label: string | null
}

export interface DisplayData {
  period: string
  big: string
  bigA: string
  bigB: string
  km: string
  kmNote: string
  trips: string
  tripsLabel: string
  /** "399 km / trajet", null if no distance is known. */
  kmPer: string | null
  /** Note on how distances are estimated. */
  kmFootnote: string
  eur: string
  eurNote: string
  avg: string
  /** Most expensive month ("Juillet"), null if there's no spend. */
  month: string | null
  /** Cheapest ticket, null if there's no paid ticket. */
  min: string | null
  adv: string
  advUnit: string
  advNote: string
  advSideLabel: string
  advSideValue: string
  advMax: string
  advDay: string
}

export interface CityRow {
  rank: string
  name: string
  count: string
  pct: number
}

export interface RouteRow {
  rank: string
  /** Most-used stations: "Saint-Étienne Châteaucreux ↔ Roanne". */
  label: string
  /** "854 km" (empty if no distance is known). */
  meta: string
  count: string
  countLabel: string
}

export interface CardRow {
  n: string
  name: string
}

export interface WrappedView {
  d: DisplayData
  sections: SectionMeta[]
  cities: CityRow[]
  citiesHeading: string
  routes: RouteRow[]
  routesHeading: string
  star: { hubName: string; spokes: StarSpoke[] }
  map: MapModel | null
  mapTitle: string
  franceMap: FranceMapModel
  cardCities: CardRow[]
  cardRoutes: CardRow[]
  /** Caption under the shareable card. */
  recapNote: string
}

const rank = (i: number) => String(i + 1).padStart(2, '0')

export function buildWrappedView(s: WrappedStats): WrappedView {
  const all = s.period.kind === 'all'
  const { distance, spend, anticipation: a, destinations, routes } = s

  const hasKm = distance.coveredTrips > 0
  const hasBudget = spend.avgPerTripEur !== null
  const map = buildMapModel(s)

  const titles: [SectionMeta['id'], string, boolean][] = [
    ['km', 'Distance parcourue', hasKm],
    ['budget', 'Ce que ça vous a coûté', hasBudget],
    ['cities', 'Vos destinations', destinations.mode !== 'empty'],
    ['routes', 'Vos itinéraires', routes.mode !== 'empty'],
    ['anticipation', 'Votre anticipation', a !== null],
    ['map', all ? 'Vos lignes de la période' : "Vos lignes de l'année", map !== null],
    ['recap', 'Votre carte à partager', true],
  ]
  const sections: SectionMeta[] = [{ id: 'teaser', label: null }]
  titles
    .filter(([, , visible]) => visible)
    .forEach(([id, title], i) => sections.push({ id, label: `${String(i + 1).padStart(2, '0')} — ${title}` }))

  const topVisits = destinations.items[0]?.visits ?? 0
  const tiedTop = routes.items.length > 1 && routes.items[0].trips === routes.items[1].trips
  const cheapest = spend.cheapest
  const partialKm = distance.uncoveredTrips > 0

  const d: DisplayData = {
    period: s.display.period,
    big: s.display.big,
    bigA: s.display.bigStart,
    bigB: s.display.bigEnd,
    km: fmtNum(distance.estimatedKm),
    kmNote: kmNote(distance.earthLaps, s.tripCount),
    trips: fmtNum(s.tripCount),
    tripsLabel: plural(s.tripCount, 'trajet', 'trajets'),
    kmPer: distance.kmPerTrip !== null ? `${fmtNum(distance.kmPerTrip)} km / trajet` : null,
    kmFootnote:
      "Distances estimées à vol d'oiseau entre les gares, majorées de 20 %" +
      (partialKm ? ` — connues pour ${distance.coveredTrips} trajets sur ${s.tripCount}.` : '.'),
    eur: fmtNum(spend.totalEur),
    eurNote: eurNote(s),
    avg: spend.avgPerTripEur !== null ? fmtEur(spend.avgPerTripEur) : '—',
    month: spend.priciestMonth ? monthName(spend.priciestMonth.month, all) : null,
    min: cheapest ? fmtEur(cheapest.priceEur) : null,
    adv: a ? String(Math.round(a.averageDays)) : '—',
    advUnit: a ? plural(Math.round(a.averageDays), 'jour', 'jours') : 'jours',
    advNote: a ? anticipationNote(a, s) : '',
    advSideLabel: a && a.sameDayCount > 0 ? 'Achats le jour même' : 'Le plus tardif',
    advSideValue: a ? (a.sameDayCount > 0 ? `${a.sameDayCount} ${plural(a.sameDayCount, 'trajet', 'trajets')}` : `${a.minDays} ${plural(a.minDays, 'jour', 'jours')}`) : '—',
    advMax: a ? `${a.maxDays} ${plural(a.maxDays, 'jour', 'jours')}` : '—',
    advDay: a?.bookingWeekday ? cap(WEEKDAYS_FR[a.bookingWeekday.weekday]) : '—',
  }

  return {
    d,
    sections,
    cities: destinations.items.map((v, i) => ({
      rank: rank(i),
      name: v.city.name,
      count: `${v.visits} ${plural(v.visits, 'visite', 'visites')}`,
      // With no gap between cities, all bars are full: the mockup exaggerates gaps, we keep it proportional.
      pct: topVisits ? v.pct : 100,
    })),
    citiesHeading: destinations.mode === 'single' ? 'Une seule ville vous a vu arriver.' : 'Les villes qui vous ont vu arriver.',
    routes: routes.items.map((r, i) => ({
      rank: rank(i),
      label: r.stations.join(' ↔ '),
      meta: r.km !== null ? `${fmtNum(r.km)} km` : '',
      count: String(r.trips),
      countLabel: plural(r.trips, 'trajet', 'trajets'),
    })),
    routesHeading:
      routes.mode === 'single'
        ? "Vous n'avez fait qu'un seul itinéraire."
        : tiedTop
          ? 'Les trajets que vous refaites le plus.'
          : 'Un trajet revient plus souvent que tous les autres.',
    star: { hubName: s.hub?.name ?? '', spokes: buildStar(s.hub, destinations.items.map((v) => v.city)) },
    map,
    mapTitle: all ? 'Vos lignes de la période' : "Vos lignes de l'année",
    franceMap: buildFranceMapModel(s),
    cardCities: destinations.items.slice(0, CARD_TOP).map((v, i) => ({ n: `N°${i + 1}`, name: v.city.name })),
    cardRoutes: routes.items.slice(0, CARD_TOP).map((r, i) => ({ n: `N°${i + 1}`, name: r.label })),
    recapNote: "Km estimés à vol d'oiseau entre les gares (+ 20 %) · Contient des données SNCF Open Data (licence ODbL) et IGN Admin Express (Licence Ouverte / Etalab)",
  }
}
