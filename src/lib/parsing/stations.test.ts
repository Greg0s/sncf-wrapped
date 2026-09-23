import { describe, expect, it } from 'vitest'
import stationData from './data/gares.json'
import { createStationIndex, unresolvedPlace } from './stations'
import type { StationData } from './types'

const index = createStationIndex(stationData as unknown as StationData)

describe('référentiel embarqué', () => {
  it('cite sa source et sa licence (ODbL impose la mention)', () => {
    const data = stationData as unknown as StationData
    expect(data.source).toMatch(/SNCF Open Data/)
    expect(data.license).toMatch(/ODbL/)
    expect(data.stations.length).toBeGreaterThan(2500)
  })
})

describe('resolve', () => {
  it('trouve une gare par son libellé SNCF exact', () => {
    expect(index.resolve('SAINT ETIENNE CHATEAUCREUX')).toMatchObject({ kind: 'station', via: 'exact', name: 'Saint-Étienne Châteaucreux', city: 'Saint-Étienne' })
  })

  it('ignore casse, accents, tirets et abréviations ST/STE', () => {
    for (const raw of ['Saint-Étienne Châteaucreux', 'saint etienne chateaucreux', 'ST ETIENNE CHATEAUCREUX']) {
      expect(index.resolve(raw)?.name).toBe('Saint-Étienne Châteaucreux')
    }
  })

  it('regroupe les gares d’une même ville sous une même clé', () => {
    const keys = ['SAINT ETIENNE CHATEAUCREUX', 'SAINT ETIENNE CARNOT', 'SAINT ETIENNE BELLEVUE', 'SAINT ETIENNE LA TERRASSE'].map((n) => index.resolve(n)?.cityKey)
    expect(new Set(keys).size).toBe(1)
    expect(index.resolve('LYON PART DIEU')?.cityKey).toBe(index.resolve('LYON PERRACHE')?.cityKey)
    expect(index.resolve('MONTPELLIER SAINT ROCH')?.cityKey).toBe(index.resolve('MONTPELLIER SUD DE FRANCE')?.cityKey)
    expect(index.resolve('SAINT ETIENNE CARNOT')?.cityKey).not.toBe(index.resolve('LYON PART DIEU')?.cityKey)
  })

  it('rattache les arrondissements de Paris à une seule ville', () => {
    const gdl = index.resolve('PARIS GARE DE LYON')
    expect(gdl?.city).toBe('Paris')
    expect(index.resolve('PARIS MONTPARNASSE')?.cityKey).toBe(gdl?.cityKey)
  })

  it("retrouve une gare dont le libellé SNCF est plus court que le nom officiel (« PARIS BERCY »)", () => {
    expect(index.resolve('PARIS BERCY')).toMatchObject({ kind: 'station', via: 'prefix', city: 'Paris', name: 'Paris Bercy' }) // CSV label, not the official name
    expect(index.resolve('PARIS BERCY')?.cityKey).toBe(index.resolve('PARIS GARE DE LYON')?.cityKey)
  })

  it('rattache un arrêt de car à la gare de la ville', () => {
    expect(index.resolve('ROANNE GARE ROUTIERE')).toMatchObject({ via: 'stripped', name: 'Roanne' })
    expect(index.resolve('LYON PART DIEU GARE ROUTIERE')).toMatchObject({ via: 'stripped', name: 'Lyon Part Dieu' })
  })

  it('se replie sur la ville quand seul le début du libellé est connu', () => {
    const place = index.resolve('SAINT ETIENNE CHTX G ROUTIERE')
    expect(place).toMatchObject({ kind: 'city', via: 'city-prefix', city: 'Saint-Étienne' })
    expect(place?.cityKey).toBe(index.resolve('SAINT ETIENNE CHATEAUCREUX')?.cityKey)
  })

  it('renvoie null pour une gare absente du référentiel (gares étrangères, libellés inconnus)', () => {
    for (const raw of ['BRUXELLES MIDI', 'GENEVE', 'LONDRES ST PANCRAS', '', '   ']) expect(index.resolve(raw)).toBeNull()
  })

  it('résout les gares du réseau CFC (Corse), absentes du jeu de données SNCF Open Data mais domestiques', () => {
    for (const raw of ['AJACCIO', 'BASTIA', 'CORTE', 'CALVI', 'ILE ROUSSE']) {
      const place = index.resolve(raw)
      expect(place?.lat).not.toBeNull()
      expect(place?.lon).not.toBeNull()
    }
    expect(index.resolve('ILE ROUSSE')?.name).toBe('Île-Rousse')
  })

  it('fournit des coordonnées plausibles', () => {
    const p = index.resolve('LYON PART DIEU')
    expect(p?.lat).toBeCloseTo(45.76, 1)
    expect(p?.lon).toBeCloseTo(4.86, 1)
    expect(p?.cityLat).toBeCloseTo(45.76, 0)
  })
})

describe('unresolvedPlace', () => {
  it('garde le nom lisible d’une gare inconnue', () => {
    expect(unresolvedPlace('BRUXELLES MIDI')).toMatchObject({ name: 'Bruxelles Midi', city: 'Bruxelles Midi', cityKey: 'u:BRUXELLES MIDI' })
  })
})
