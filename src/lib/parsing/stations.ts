import { normalizeStationName, titleCaseFr } from './normalize'
import type { Place, StationData, StationIndex } from './types'

// Arrêts routiers listés par SNCF Connect à côté des gares (« ROANNE GARE ROUTIERE ») : rattachés à la gare/ville.
const BUS_SUFFIX = / (GARE ROUTIERE|G ROUTIERE|ROUTIERE|GARE BUS)$/
// En dessous de cette longueur, un nom de ville est trop court pour servir de préfixe fiable (« ay », « us »…).
const MIN_CITY_PREFIX_LENGTH = 4

/**
 * Index de résolution « libellé SNCF → gare/ville + coordonnées », construit sur le référentiel embarqué.
 * Ordre de résolution : nom exact → sans suffixe « gare routière » → nom de gare qui commence par le libellé
 * (« PARIS BERCY » → Paris Bercy Bourgogne…) → nom de ville en préfixe (« SAINT ETIENNE CHTX » → Saint-Étienne).
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
  const stationCount = new Array<number>(data.cities.length).fill(0)
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

    // Un seul nom de gare commence par le libellé (« PARIS BERCY » → « Paris Bercy Bourgogne - Pays d'Auvergne »).
    const prefix = stripped + ' '
    const candidates: number[] = []
    for (let i = 0; i < stationNames.length && candidates.length < 2; i++) {
      if (stationNames[i].startsWith(prefix)) candidates.push(i)
    }
    // On garde alors le libellé de l'utilisateur (« Paris Bercy ») plutôt que le nom officiel, plus long.
    if (candidates.length === 1) return { ...stationPlace(raw, candidates[0], 'prefix'), name: titleCaseFr(stripped) }

    // Le plus long préfixe (en mots) qui est un nom de ville connu.
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

/** Repli pour une gare inconnue du référentiel (ex. gare étrangère) : on garde son nom, sans coordonnées. */
export function unresolvedPlace(raw: string): { raw: string; name: string; city: string; cityKey: string } {
  const label = titleCaseFr(normalizeStationName(raw).replace(BUS_SUFFIX, ''))
  return { raw, name: titleCaseFr(normalizeStationName(raw)), city: label, cityKey: `u:${normalizeStationName(raw).replace(BUS_SUFFIX, '')}` }
}

let cached: Promise<StationIndex> | null = null

/**
 * Charge le référentiel des gares. C'est un fichier statique du site (jamais une donnée utilisateur) :
 * import dynamique, donc un chunk séparé qui n'est téléchargé qu'au moment d'analyser un fichier.
 */
export function loadStationIndex(): Promise<StationIndex> {
  cached ??= import('./data/gares.json').then((m) => createStationIndex(m.default as unknown as StationData))
  return cached
}
