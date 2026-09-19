import { localToday, yearOf } from './dates'
import { haversineKm, projectToFranceMap } from './geo'
import { unresolvedPlace } from './stations'
import type { StationIndex, Trip } from './types'

/** Ville telle que les écrans la manipulent. */
export interface CityRef {
  /** Identifiant opaque (deux gares d'une même ville partagent la même clé). */
  key: string
  name: string
  /** null quand la gare est absente du référentiel (ex. gare étrangère). */
  lat: number | null
  lon: number | null
  /** Position sur la carte schématique de la maquette (viewBox de CarteFrance), null sans coordonnées. */
  x: number | null
  y: number | null
}

export interface TripPlace {
  /** Libellé brut du CSV. */
  raw: string
  /** Nom de gare pour l'affichage. */
  station: string
  city: CityRef
  /** Coordonnées de la gare (ou de la ville si seule la ville a été identifiée), null si inconnues. */
  lat: number | null
  lon: number | null
  /** « none » : gare absente du référentiel. */
  via: 'exact' | 'stripped' | 'prefix' | 'city-prefix' | 'none'
}

export interface ResolvedTrip extends Trip {
  from: TripPlace
  to: TripPlace
  /** Distance à vol d'oiseau entre origine et destination, null si une extrémité n'a pas de coordonnées. */
  straightKm: number | null
}

export interface PlaceUsage {
  raw: string
  /** Nom auquel le libellé a été rattaché (gare ou ville), null si aucun. */
  matchedAs: string | null
  via: TripPlace['via']
  count: number
}

export interface TripDataset {
  /** Date de référence (AAAA-MM-JJ) : les départs postérieurs sont « à venir ». */
  today: string
  /** Trajets déjà effectués, du plus ancien au plus récent. */
  trips: ResolvedTrip[]
  /** Départs à venir, exclus de toutes les statistiques. */
  upcoming: ResolvedTrip[]
  /** Premier départ connu (AAAA-MM-JJ). */
  firstDate: string
  /** Dernière date connue dans le fichier (départ passé ou commande). */
  dataEnd: string
  /** Libellés sans coordonnées (aucune distance possible) et libellés rattachés par approximation. */
  unresolvedPlaces: PlaceUsage[]
  approximatedPlaces: PlaceUsage[]
}

export type Period = { kind: 'year'; year: number } | { kind: 'all' }

export interface PeriodOption {
  period: Period
  /** Nombre de trajets (allers simples) de la période. */
  tripCount: number
}

export const legCount = (t: Pick<Trip, 'roundTrip'>): 1 | 2 => (t.roundTrip ? 2 : 1)

/** Rattache chaque trajet à ses gares/villes, calcule les distances, et écarte les départs à venir. */
export function buildTripDataset(trips: Trip[], index: StationIndex, today: string = localToday()): TripDataset {
  const places = new Map<string, TripPlace>()
  const usage = new Map<string, number>()

  const placeOf = (raw: string): TripPlace => {
    usage.set(raw, (usage.get(raw) ?? 0) + 1)
    const known = places.get(raw)
    if (known) return known
    const p = index.resolve(raw)
    let place: TripPlace
    if (p) {
      const { x, y } = projectToFranceMap(p.cityLat, p.cityLon)
      place = {
        raw,
        station: p.name,
        city: { key: p.cityKey, name: p.city, lat: p.cityLat, lon: p.cityLon, x, y },
        lat: p.lat,
        lon: p.lon,
        via: p.via,
      }
    } else {
      const u = unresolvedPlace(raw)
      place = { raw, station: u.name, city: { key: u.cityKey, name: u.city, lat: null, lon: null, x: null, y: null }, lat: null, lon: null, via: 'none' }
    }
    places.set(raw, place)
    return place
  }

  const resolved: ResolvedTrip[] = trips.map((t) => {
    const from = placeOf(t.origin)
    const to = placeOf(t.destination)
    const straightKm =
      from.lat !== null && from.lon !== null && to.lat !== null && to.lon !== null ? haversineKm(from.lat, from.lon, to.lat, to.lon) : null
    return { ...t, from, to, straightKm }
  })

  const chronological = (a: ResolvedTrip, b: ResolvedTrip) =>
    `${a.departureDate}${a.departureTime ?? ''}`.localeCompare(`${b.departureDate}${b.departureTime ?? ''}`) || a.key.localeCompare(b.key)
  const past = resolved.filter((t) => t.departureDate <= today).sort(chronological)
  const upcoming = resolved.filter((t) => t.departureDate > today).sort(chronological)

  const known = [...past.map((t) => t.departureDate), ...resolved.map((t) => t.orderDate).filter((d): d is string => !!d && d <= today)]
  const usageList = (pick: (p: TripPlace) => boolean): PlaceUsage[] =>
    [...places.values()]
      .filter(pick)
      .map((p) => ({ raw: p.raw, matchedAs: p.via === 'none' ? null : p.city.name === p.station ? p.station : `${p.station} (${p.city.name})`, via: p.via, count: usage.get(p.raw) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.raw.localeCompare(b.raw))

  return {
    today,
    trips: past,
    upcoming,
    firstDate: past.length ? past.reduce((min, t) => (t.departureDate < min ? t.departureDate : min), past[0].departureDate) : today,
    dataEnd: known.length ? known.reduce((max, d) => (d > max ? d : max)) : today,
    unresolvedPlaces: usageList((p) => p.via === 'none'),
    approximatedPlaces: usageList((p) => p.via !== 'none' && p.via !== 'exact'),
  }
}

/** Périodes proposables : chaque année avec au moins un trajet (récente d'abord), puis « toutes les années » s'il y en a plusieurs. */
export function listPeriods(ds: TripDataset): PeriodOption[] {
  const byYear = new Map<number, number>()
  for (const t of ds.trips) byYear.set(yearOf(t.departureDate), (byYear.get(yearOf(t.departureDate)) ?? 0) + legCount(t))
  const years = [...byYear.keys()].sort((a, b) => b - a)
  const options: PeriodOption[] = years.map((year) => ({ period: { kind: 'year', year }, tripCount: byYear.get(year) ?? 0 }))
  if (years.length > 1) options.push({ period: { kind: 'all' }, tripCount: [...byYear.values()].reduce((a, b) => a + b, 0) })
  return options
}
