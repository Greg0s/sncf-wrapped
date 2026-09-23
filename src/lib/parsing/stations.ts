import { normalizeStationName, titleCaseFr } from './normalize'
import type { Place, StationData, StationIndex } from './types'

// Bus stops listed by SNCF Connect alongside stations ("ROANNE GARE ROUTIERE"): matched to the station/city.
const BUS_SUFFIX = / (GARE ROUTIERE|G ROUTIERE|ROUTIERE|GARE BUS)$/
// Below this length, a city name is too short to serve as a reliable prefix ("ay", "us"…).
const MIN_CITY_PREFIX_LENGTH = 4

/**
 * Resolution index "SNCF label → station/city + coordinates", built on the bundled referential.
 * Resolution order: exact name → without the "gare routière" suffix → station name starting with the label
 * ("PARIS BERCY" → Paris Bercy Bourgogne…) → city name as a prefix ("SAINT ETIENNE CHTX" → Saint-Étienne).
 */
export function createStationIndex(data: StationData): StationIndex {
  const stationByName = new Map<string, number>()
  const stationNames: string[] = []
  data.stations.forEach((s, i) => {
    const key = normalizeStationName(s[0])
    stationNames.push(key)
    if (!stationByName.has(key)) stationByName.set(key, i)
  })

  const citiesByKey = new Map<string, number[]>()
  const stationCount = Array.from({ length: data.cities.length }, () => 0)
  for (const s of data.stations) stationCount[s[3]]++
  data.cities.forEach((c, i) => {
    const key = normalizeStationName(c[0])
    citiesByKey.set(key, [...(citiesByKey.get(key) ?? []), i])
  })

  const stationPlace = (raw: string, i: number, via: Place['via']): Place => {
    const [name, lat, lon, cityIdx] = data.stations[i]
    const [city, cityLat, cityLon] = data.cities[cityIdx]
    return { raw, kind: 'station', via, name, city, cityKey: `g${cityIdx}`, lat, lon, cityLat, cityLon }
  }
  const cityPlace = (raw: string, cityIdx: number): Place => {
    const [label, lat, lon] = data.cities[cityIdx]
    return { raw, kind: 'city', via: 'city-prefix', name: label, city: label, cityKey: `g${cityIdx}`, lat, lon, cityLat: lat, cityLon: lon }
  }

  const cache = new Map<string, Place | null>()

  function resolveUncached(raw: string): Place | null {
    const norm = normalizeStationName(raw)
    if (!norm) return null

    const exact = stationByName.get(norm)
    if (exact !== undefined) return stationPlace(raw, exact, 'exact')

    const stripped = norm.replace(BUS_SUFFIX, '')
    if (stripped !== norm) {
      const s = stationByName.get(stripped)
      if (s !== undefined) return stationPlace(raw, s, 'stripped')
    }

    // Only one station name starts with the label ("PARIS BERCY" → "Paris Bercy Bourgogne - Pays d'Auvergne").
    const prefix = stripped + ' '
    const candidates: number[] = []
    for (let i = 0; i < stationNames.length && candidates.length < 2; i++) {
      if (stationNames[i].startsWith(prefix)) candidates.push(i)
    }
    // In that case we keep the user's label ("Paris Bercy") rather than the longer official name.
    if (candidates.length === 1) return { ...stationPlace(raw, candidates[0], 'prefix'), name: titleCaseFr(stripped) }

    // The longest prefix (in words) that is a known city name.
    const words = stripped.split(' ')
    for (let n = words.length; n >= 1; n--) {
      const key = words.slice(0, n).join(' ')
      if (key.length < MIN_CITY_PREFIX_LENGTH) continue
      const cities = citiesByKey.get(key)
      if (cities) return cityPlace(raw, cities.reduce((best, c) => (stationCount[c] > stationCount[best] ? c : best)))
    }
    return null
  }

  return {
    resolve(rawName) {
      const key = normalizeStationName(rawName)
      if (!cache.has(key)) cache.set(key, resolveUncached(rawName))
      return cache.get(key) ?? null
    },
  }
}

/** Fallback for a station unknown to the referential (a genuinely unknown label): we keep its name, without coordinates. */
export function unresolvedPlace(raw: string): { raw: string; name: string; city: string; cityKey: string } {
  const label = titleCaseFr(normalizeStationName(raw).replace(BUS_SUFFIX, ''))
  return { raw, name: titleCaseFr(normalizeStationName(raw)), city: label, cityKey: `u:${normalizeStationName(raw).replace(BUS_SUFFIX, '')}` }
}

let cached: Promise<StationIndex> | null = null

/**
 * Loads the station referential. It's a static file of the site (never user data):
 * dynamic import, so a separate chunk that is only downloaded when a file is actually parsed.
 */
export function loadStationIndex(): Promise<StationIndex> {
  cached ??= import('./data/gares.json').then((m) => createStationIndex(m.default as unknown as StationData))
  return cached
}
