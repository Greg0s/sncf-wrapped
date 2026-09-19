import { localToday, yearOf } from './dates'
import { haversineKm, projectToFranceMap } from './geo'
import { unresolvedPlace } from './stations'
import type { StationIndex, Trip } from './types'

/** City as the screens work with it. */
export interface CityRef {
  /** Opaque identifier (two stations in the same city share the same key). */
  key: string
  name: string
  /** null when the station is missing from the referential (e.g. a foreign station). */
  lat: number | null
  lon: number | null
  /** Position on the mockup's schematic map (CarteFrance's viewBox), null without coordinates. */
  x: number | null
  y: number | null
}

export interface TripPlace {
  /** Raw label from the CSV. */
  raw: string
  /** Station name for display. */
  station: string
  city: CityRef
  /** Coordinates of the station (or of the city if only the city was identified), null if unknown. */
  lat: number | null
  lon: number | null
  /** "none": station missing from the referential. */
  via: 'exact' | 'stripped' | 'prefix' | 'city-prefix' | 'none'
}

export interface ResolvedTrip extends Trip {
  from: TripPlace
  to: TripPlace
  /** Straight-line distance between origin and destination, null if either end lacks coordinates. */
  straightKm: number | null
}

export interface PlaceUsage {
  raw: string
  /** Name the label was matched to (station or city), null if none. */
  matchedAs: string | null
  via: TripPlace['via']
  count: number
}

export interface TripDataset {
  /** Reference date (YYYY-MM-DD): later departures are "upcoming". */
  today: string
  /** Trips already taken, from oldest to most recent. */
  trips: ResolvedTrip[]
  /** Upcoming departures, excluded from all statistics. */
  upcoming: ResolvedTrip[]
  /** First known departure (YYYY-MM-DD). */
  firstDate: string
  /** Latest date known in the file (past departure or order). */
  dataEnd: string
  /** Labels without coordinates (no distance possible) and labels matched by approximation. */
  unresolvedPlaces: PlaceUsage[]
  approximatedPlaces: PlaceUsage[]
}

export type Period = { kind: 'year'; year: number } | { kind: 'all' }

export interface PeriodOption {
  period: Period
  /** Number of trips (one-way legs) in the period. */
  tripCount: number
}

export const legCount = (t: Pick<Trip, 'roundTrip'>): 1 | 2 => (t.roundTrip ? 2 : 1)

/** Links each trip to its stations/cities, computes distances, and drops upcoming departures. */
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

/** Selectable periods: each year with at least one trip (most recent first), then "all years" if there is more than one. */
export function listPeriods(ds: TripDataset): PeriodOption[] {
  const byYear = new Map<number, number>()
  for (const t of ds.trips) byYear.set(yearOf(t.departureDate), (byYear.get(yearOf(t.departureDate)) ?? 0) + legCount(t))
  const years = [...byYear.keys()].sort((a, b) => b - a)
  const options: PeriodOption[] = years.map((year) => ({ period: { kind: 'year', year }, tripCount: byYear.get(year) ?? 0 }))
  if (years.length > 1) options.push({ period: { kind: 'all' }, tripCount: [...byYear.values()].reduce((a, b) => a + b, 0) })
  return options
}
