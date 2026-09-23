import { describe, expect, it } from 'vitest'
import stationData from '../parsing/data/gares.json'
import { createStationIndex } from '../parsing/stations'
import type { StationData } from '../parsing/types'
import { regionOf } from './regions'

const index = createStationIndex(stationData as unknown as StationData)

function coordsOf(rawStationName: string): { lat: number; lon: number } {
  const place = index.resolve(rawStationName)
  if (!place) throw new Error(`Unknown station in fixture: ${rawStationName}`)
  return { lat: place.cityLat, lon: place.cityLon }
}

describe('regionOf', () => {
  it('matches well-known stations to their region', () => {
    const cases: [string, string][] = [
      ['SAINT ETIENNE CHATEAUCREUX', 'Auvergne-Rhône-Alpes'],
      ['LYON PART DIEU', 'Auvergne-Rhône-Alpes'],
      ['ANNECY', 'Auvergne-Rhône-Alpes'],
      ['PARIS GARE DE LYON', 'Île-de-France'],
      ['MARSEILLE SAINT CHARLES', "Provence-Alpes-Côte d'Azur"],
      ['STRASBOURG', 'Grand Est'],
    ]
    for (const [station, expected] of cases) {
      const { lat, lon } = coordsOf(station)
      expect(regionOf(lat, lon)?.name).toBe(expected)
    }
  })

  it('returns null for a point outside every bundled region', () => {
    expect(regionOf(48.85, -20)).toBeNull() // mid-Atlantic
  })

  it('returns null for a foreign city resolved by the referential (this is how the map tells it apart from a domestic one)', () => {
    for (const station of ['GENEVE', 'BRUXELLES MIDI', 'LONDRES ST PANCRAS']) {
      const { lat, lon } = coordsOf(station)
      expect(regionOf(lat, lon)).toBeNull()
    }
  })
})
