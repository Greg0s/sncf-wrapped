import { describe, expect, it } from 'vitest'
import { EARTH_CIRCUMFERENCE_KM, haversineKm, projectToFranceMap } from './geo'

describe('haversineKm', () => {
  it('donne ~392 km à vol d’oiseau entre Paris et Lyon', () => {
    expect(haversineKm(48.8566, 2.3522, 45.764, 4.8357)).toBeCloseTo(392, -1)
  })
  it('est nul pour un même point et symétrique', () => {
    expect(haversineKm(45.5, 4.5, 45.5, 4.5)).toBe(0)
    expect(haversineKm(48.85, 2.35, 43.3, 5.37)).toBeCloseTo(haversineKm(43.3, 5.37, 48.85, 2.35), 9)
  })
  it('un demi-tour de la Terre vaut la moitié de la circonférence', () => {
    expect(haversineKm(0, 0, 0, 180)).toBeCloseTo(EARTH_CIRCUMFERENCE_KM / 2, -2)
  })
})

describe('projectToFranceMap', () => {
  // Villes ancrées dans la maquette (CarteFrance / SNCF Wrapped v3) : lat, lon → x, y du SVG.
  const anchors: [string, number, number, number, number][] = [
    ['Lyon', 45.764, 4.8357, 276.3, 229.4],
    ['Paris', 48.8566, 2.3522, 207.9, 105.7],
    ['Marseille', 43.2965, 5.3698, 291.0, 328.1],
    ['Nantes', 47.2184, -1.5536, 100.4, 171.3],
    ['Dijon', 47.322, 5.0415, 282.0, 167.1],
    ['Strasbourg', 48.5734, 7.7521, 356.6, 117.1],
  ]
  it.each(anchors)('place %s à l’endroit dessiné dans la maquette', (_name, lat, lon, x, y) => {
    const p = projectToFranceMap(lat, lon)
    expect(Math.abs(p.x - x)).toBeLessThan(0.3)
    expect(Math.abs(p.y - y)).toBeLessThan(0.3)
  })
})
