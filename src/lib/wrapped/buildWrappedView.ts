import { CARD_TOP, type WrappedStats } from '../parsing'
import { cap, fmtEur, fmtNum, plural } from './format'
import { buildFranceMapModel, buildMapModel, type FranceMapModel, type MapModel } from './mapModel'
import { WEEKDAYS_FR } from '../parsing'
import { anticipationNote, eurNote, kmNote, monthName } from './phrases'
import { buildStar, type StarSpoke } from './star'

/*
 * Modèle d'affichage du wrapped : transforme les statistiques (chiffres bruts) en ce que les écrans montrent
 * (textes, lignes de classement, écrans à afficher). Les champs de `d` reprennent ceux de la maquette
 * (`sets()` dans « SNCF Wrapped v3 »).
 *
 * Adaptation aux volumes (CLAUDE.md, contrainte n°3) : un écran sans données est retiré (et les autres sont
 * renumérotés), un classement n'affiche jamais plus de lignes qu'il n'y a d'éléments distincts, et les
 * intitulés passent au singulier ou changent quand il n'y a qu'un élément ou une égalité en tête.
 */

export type SectionId = 'teaser' | 'km' | 'budget' | 'cities' | 'routes' | 'anticipation' | 'map' | 'recap'

export interface SectionMeta {
  id: SectionId
  /** « 01 — Distance parcourue », null pour le teaser. */
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
  /** « 399 km / trajet », null si aucune distance connue. */
  kmPer: string | null
  /** Précision sur l'estimation des distances. */
  kmFootnote: string
  eur: string
  eurNote: string
  avg: string
  /** Mois le plus cher (« Juillet »), null sans dépense. */
  month: string | null
  /** Billet le moins cher, null sans billet payant. */
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
  /** Gares les plus utilisées : « Saint-Étienne Châteaucreux ↔ Roanne ». */
  label: string
  /** « 854 km » (vide sans distance connue). */
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
  villes: CityRow[]
  villesHeading: string
  routes: RouteRow[]
  routesHeading: string
  star: { hubName: string; spokes: StarSpoke[] }
  map: MapModel | null
  mapTitle: string
  franceMap: FranceMapModel
  cardVilles: CardRow[]
  cardRoutes: CardRow[]
  /** Légende sous la carte à partager. */
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
    villes: destinations.items.map((v, i) => ({
      rank: rank(i),
      name: v.city.name,
      count: `${v.visits} ${plural(v.visits, 'visite', 'visites')}`,
      // Sans écart entre les villes, toutes les barres pleines : la maquette exagère les écarts, on reste proportionnel.
      pct: topVisits ? v.pct : 100,
    })),
    villesHeading: destinations.mode === 'single' ? 'Une seule ville vous a vu arriver.' : 'Les villes qui vous ont vu arriver.',
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
    cardVilles: destinations.items.slice(0, CARD_TOP).map((v, i) => ({ n: `N°${i + 1}`, name: v.city.name })),
    cardRoutes: routes.items.slice(0, CARD_TOP).map((r, i) => ({ n: `N°${i + 1}`, name: r.label })),
    recapNote: "Km estimés à vol d'oiseau entre les gares (+ 20 %) · Contient des données SNCF Open Data (licence ODbL)",
  }
}
