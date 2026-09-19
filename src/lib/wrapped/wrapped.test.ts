import { describe, expect, it } from 'vitest'
import { buildSncfCsv, type FixtureRow } from '../parsing/__fixtures__/sncfCsv'
import { buildTripDataset, computeWrappedStats, createStationIndex, parseSncfCsv, type StationData } from '../parsing'
import stationData from '../parsing/data/gares.json'
import { accentFor } from './accents'
import { buildWrappedView } from './buildWrappedView'
import { fmtEur, fmtNum, plural } from './format'
import { FULL_FRAME, arcPath, computeFrame, evaluateMap, showsOutline } from './mapModel'
import { anticipationNote, earthPhrase } from './phrases'
import { regionOf } from './regions'
import { assignSlots, buildStar } from './star'

const index = createStationIndex(stationData as unknown as StationData)
const SEC = 'SAINT ETIENNE CHATEAUCREUX'

function viewOf(rows: FixtureRow[], year = 2026) {
  const parsed = parseSncfCsv(buildSncfCsv(rows))
  if (!parsed.ok) throw new Error(parsed.error.message)
  const ds = buildTripDataset(parsed.data.trips, index, '2026-06-30')
  const stats = computeWrappedStats(ds, { kind: 'year', year })
  return { stats, view: buildWrappedView(stats) }
}

// Same scenario as computeWrappedStats.test.ts (year 2026)
const scenario: FixtureRow[] = [
  { departure: '2026-01-10T08:00:00.000Z', orderDate: '2026-01-05', origin: SEC, destination: 'ROANNE', amount: '9,2' },
  { departure: '2026-01-12T18:30:00.000Z', orderDate: '2026-01-12', origin: 'ROANNE', destination: SEC, amount: '9,2' },
  { departure: '2026-02-14T09:00:00.000Z', orderDate: '2026-01-20', origin: SEC, destination: 'PARIS GARE DE LYON', amount: '45' },
  { departure: '2026-02-16T17:00:00.000Z', orderDate: '2026-01-20', origin: 'PARIS GARE DE LYON', destination: SEC, amount: '42' },
  { departure: '2026-03-01T10:00:00.000Z', orderDate: '2026-03-01', origin: 'SAINT ETIENNE CARNOT', destination: 'LYON PART DIEU', amount: '10' },
  { departure: '2026-03-01T20:00:00.000Z', orderDate: '2026-03-01', origin: 'LYON PERRACHE', destination: 'LYON PART DIEU', amount: '1,2' },
  { departure: '2026-04-05T12:00:00.000Z', orderDate: '2026-03-05', origin: SEC, destination: 'ANNECY', roundTrip: true, amount: '60' },
]

describe('formats', () => {
  it('formate les nombres à la française, sans espace insécable', () => {
    expect(fmtNum(31144)).toBe('31 144')
    expect(fmtNum(2438.4)).toBe('2 438')
  })
  it('garde les centimes sous 10 €', () => {
    expect(fmtEur(31)).toBe('31 €')
    expect(fmtEur(63.7)).toBe('64 €')
    expect(fmtEur(1.5)).toBe('1,50 €')
    expect(fmtEur(9)).toBe('9 €')
  })
  it('accorde 0 et 1 au singulier', () => {
    expect([0, 1, 2].map((n) => plural(n, 'trajet', 'trajets'))).toEqual(['trajet', 'trajet', 'trajets'])
  })
})

describe('earthPhrase', () => {
  it.each([
    [0.01, 'Un premier pas vers le tour de la Terre'],
    [0.17, 'Environ 17 % du tour de la Terre'],
    [0.31, 'Environ un tiers du tour de la Terre'],
    [0.53, 'Environ la moitié du tour de la Terre'],
    [0.78, 'Les trois quarts du tour de la Terre'],
    [1.0, 'Un tour de la Terre'],
    [1.7, 'Presque deux tours de la Terre'],
    [3.24, '3,2 tours de la Terre'],
  ])('%s tour(s) → %s', (laps, expected) => {
    expect(earthPhrase(laps)).toBe(expected)
  })
})

describe('anticipationNote', () => {
  const base = { tripsConsidered: 10, averageDays: 12.4, minDays: 0, maxDays: 40, bookingWeekday: null }
  const stats = { period: { kind: 'year', year: 2026 }, years: [2026] } as unknown as Parameters<typeof anticipationNote>[1]
  it('cite le nombre d’achats le jour même quand il est minoritaire', () => {
    expect(anticipationNote({ ...base, sameDayCount: 3 }, stats)).toBe('Vous réservez en moyenne 12 jours avant le départ. Et 3 fois, vous avez acheté votre billet le jour même.')
  })
  it('dit « plus d’un billet sur deux » quand ils sont majoritaires', () => {
    expect(anticipationNote({ ...base, sameDayCount: 6 }, stats)).toContain("Plus d'un billet sur deux")
  })
  it('sans achat le jour même, cite l’achat le plus tardif', () => {
    expect(anticipationNote({ ...base, sameDayCount: 0, minDays: 2 }, stats)).toContain('Votre achat le plus tardif : 2 jours')
  })
})

describe('accentFor', () => {
  it('donne cyan à la période la plus récente et la 4e couleur à « toutes les années »', () => {
    expect(accentFor({ kind: 'year', year: 2026 }, 0)).toBe('#8DE8FD')
    expect(accentFor({ kind: 'year', year: 2025 }, 1)).toBe('#E39BFD')
    expect(accentFor({ kind: 'year', year: 2022 }, 4)).toBe('#E39BFD')
    expect(accentFor({ kind: 'all' }, 3)).toBe('#B5B5FE')
  })
})

describe('buildWrappedView — scénario complet', () => {
  const { stats, view } = viewOf(scenario)

  it('affiche les 8 écrans, numérotés dans l’ordre', () => {
    expect(view.sections.map((s) => s.id)).toEqual(['teaser', 'km', 'budget', 'cities', 'routes', 'anticipation', 'map', 'recap'])
    expect(view.sections.map((s) => s.label)).toEqual([
      null,
      '01 — Distance parcourue',
      '02 — Ce que ça vous a coûté',
      '03 — Vos destinations',
      '04 — Vos itinéraires',
      '05 — Votre anticipation',
      "06 — Vos lignes de l'année",
      '07 — Votre carte à partager',
    ])
  })

  it('n’affiche jamais d’heures à bord', () => {
    expect(JSON.stringify(view)).not.toMatch(/h à bord|heures? de train|hours/i)
    expect(Object.keys(view.d)).not.toContain('hours')
  })

  it('remplit le teaser et la carte à partager avec la période', () => {
    expect(view.d).toMatchObject({ period: 'Édition 2026', big: '2026', bigA: '2026', bigB: '2026' })
  })

  it('rédige les notes des écrans Kilomètres et Budget à partir des chiffres', () => {
    expect(view.d.km).toBe(fmtNum(stats.distance.estimatedKm))
    expect(view.d.kmNote).toBe(`${earthPhrase(stats.distance.earthLaps)}, en 8 trajets.`)
    expect(view.d.trips).toBe('8')
    expect(view.d.tripsLabel).toBe('trajets')
    expect(view.d.kmPer).toMatch(/^\d[\d ]* km \/ trajet$/)
    expect(view.d.kmFootnote).toMatch(/vol d'oiseau/)
    expect(view.d.eur).toBe('177')
    expect(view.d.eurNote).toBe('Soit 22 € par trajet et 44 € par mois. Votre billet le plus cher : 60 € pour un aller-retour Saint-Étienne — Annecy un dimanche après-midi.')
    expect(view.d.avg).toBe('22 €')
    expect(view.d.month).toBe('Février')
    expect(view.d.min).toBe('1,20 €')
  })

  it('remplit l’écran Anticipation', () => {
    expect(view.d).toMatchObject({ adv: '13', advUnit: 'jours', advSideLabel: 'Achats le jour même', advSideValue: '3 trajets', advMax: '31 jours', advDay: 'Lundi' })
    expect(view.d.advNote).toBe('Vous réservez en moyenne 13 jours avant le départ. Et 3 fois, vous avez acheté votre billet le jour même.')
  })

  it('classe villes et itinéraires sans jamais dépasser ce qui existe', () => {
    expect(view.cities).toEqual([
      { rank: '01', name: 'Annecy', count: '1 visite', pct: 100 },
      { rank: '02', name: 'Lyon', count: '1 visite', pct: 100 },
      { rank: '03', name: 'Paris', count: '1 visite', pct: 100 },
      { rank: '04', name: 'Roanne', count: '1 visite', pct: 100 },
    ])
    expect(view.routes).toHaveLength(4)
    expect(view.routes[0]).toMatchObject({ rank: '01', label: 'Saint-Étienne Châteaucreux ↔ Paris Gare de Lyon', count: '2', countLabel: 'trajets' })
    expect(view.routes[3]).toMatchObject({ count: '1', countLabel: 'trajet' })
    expect(view.routes[0].meta).toMatch(/^\d[\d ]* km$/)
  })

  it('titre l’écran Itinéraires selon qu’un trajet domine ou non', () => {
    expect(view.routesHeading).toBe('Les trajets que vous refaites le plus.') // tie at the top
    const dominant = viewOf([...scenario, { departure: '2026-02-20T09:00:00.000Z', origin: SEC, destination: 'ROANNE' }, { departure: '2026-02-21T09:00:00.000Z', origin: SEC, destination: 'ROANNE' }])
    expect(dominant.view.routesHeading).toBe('Un trajet revient plus souvent que tous les autres.')
  })

  it('prépare la carte à partager : 3 lignes au plus, itinéraires en noms de villes', () => {
    expect(view.cardCities).toHaveLength(3)
    expect(view.cardCities[0]).toEqual({ n: 'N°1', name: 'Annecy' })
    expect(view.cardRoutes.map((r) => r.name)).toEqual(['Saint-Étienne ↔ Paris', 'Saint-Étienne ↔ Annecy', 'Saint-Étienne ↔ Roanne'])
  })

  it('mentionne l’estimation des km et la licence des données dans la légende finale', () => {
    expect(view.recapNote).toMatch(/estimés/)
    expect(view.recapNote).toMatch(/ODbL/)
  })
})

describe('buildWrappedView — adaptation aux petits volumes', () => {
  it('une seule destination : titres au singulier, un seul rang', () => {
    const { view } = viewOf([
      { departure: '2026-02-01T10:00:00.000Z', origin: SEC, destination: 'ROANNE', amount: '9' },
      { departure: '2026-02-02T10:00:00.000Z', origin: SEC, destination: 'ROANNE', amount: '9' },
    ])
    expect(view.cities).toHaveLength(1)
    expect(view.cities[0]).toMatchObject({ name: 'Roanne', count: '2 visites' }) // the home city is excluded from return trips
    expect(view.citiesHeading).toBe('Une seule ville vous a vu arriver.')
    expect(view.routesHeading).toBe("Vous n'avez fait qu'un seul itinéraire.")
    expect(view.cardCities).toHaveLength(1)
  })

  it('retire l’écran Anticipation sans dates de commande cohérentes, et renumérote', () => {
    const { view } = viewOf([{ departure: '2026-02-01T10:00:00.000Z', orderDate: '2026-03-01', origin: SEC, destination: 'ROANNE', amount: '9' }])
    expect(view.sections.map((s) => s.id)).not.toContain('anticipation')
    expect(view.sections.map((s) => s.label)).toEqual([null, '01 — Distance parcourue', '02 — Ce que ça vous a coûté', '03 — Vos destinations', '04 — Vos itinéraires', "05 — Vos lignes de l'année", '06 — Votre carte à partager'])
  })

  it('retire Kilomètres et la carte quand aucune gare n’a de coordonnées (gares étrangères)', () => {
    const { view } = viewOf([{ departure: '2026-02-01T10:00:00.000Z', origin: 'LYON PART DIEU', destination: 'GENEVE', amount: '30' }])
    expect(view.sections.map((s) => s.id)).toEqual(['teaser', 'budget', 'cities', 'routes', 'anticipation', 'recap'])
    expect(view.map).toBeNull()
    expect(view.cities[0].name).toBe('Geneve')
    expect(view.routes[0].meta).toBe('') // no known distance
  })

  it('retire Budget quand aucun montant n’est lisible', () => {
    const { view } = viewOf([{ departure: '2026-02-01T10:00:00.000Z', origin: SEC, destination: 'ROANNE', amount: '' }])
    expect(view.sections.map((s) => s.id)).not.toContain('budget')
    expect(view.d.min).toBeNull()
  })

  it('un trajet unique reste affichable', () => {
    const { view } = viewOf([{ departure: '2026-02-01T10:00:00.000Z', origin: 'PARIS GARE DE LYON', destination: 'LYON PART DIEU', amount: '55' }])
    expect(view.d.tripsLabel).toBe('trajet')
    expect(view.d.eurNote).toBe('Soit 55 € par trajet. Votre billet le plus cher : 55 € pour un Paris — Lyon un dimanche matin.')
    expect(view.sections.map((s) => s.id)).toContain('map')
  })
})

describe('étoile de l’écran Kilomètres', () => {
  it('range les villes selon leur direction réelle, pas selon leur rang', () => {
    // northwest (~ -107°), south (~ 85°), west (~ -162°), northeast (~ -54°): the mockup's 4 spokes
    expect(assignSlots([-105, 85])).toEqual([0, 1])
    expect(assignSlots([85, -105])).toEqual([1, 0])
    expect(assignSlots([-160, -50, 90, -100])).toEqual([2, 3, 1, 0])
  })

  it('donne les rayons restants aux villes sans coordonnées', () => {
    const slots = assignSlots([null, -105])
    expect(slots[1]).toBe(0)
    expect(slots[0]).not.toBe(0)
    expect(new Set(slots).size).toBe(2)
  })

  it('place Roanne au nord de Saint-Étienne et Montpellier au sud', () => {
    const { stats } = viewOf([
      { departure: '2026-02-01T10:00:00.000Z', origin: SEC, destination: 'ROANNE' },
      { departure: '2026-02-02T10:00:00.000Z', origin: SEC, destination: 'MONTPELLIER SAINT ROCH' },
    ])
    const spokes = buildStar(stats.hub, stats.destinations.items.map((v) => v.city))
    const byName = Object.fromEntries(spokes.map((s) => [s.name, s.slot.end.y]))
    expect(byName['Roanne']).toBeLessThan(140) // above the star's center
    expect(byName['Montpellier']).toBeGreaterThan(140) // below
  })

  it('n’affiche pas plus de 4 rayons', () => {
    const { view } = viewOf(['ROANNE', 'LYON PART DIEU', 'PARIS GARE DE LYON', 'ANNECY', 'MONTPELLIER SAINT ROCH', 'RENNES'].map((dest, i) => ({ departure: `2026-02-0${i + 1}T10:00:00.000Z`, origin: SEC, destination: dest })))
    expect(view.star.spokes).toHaveLength(4)
    expect(view.star.hubName).toBe('Saint-Étienne')
  })
})

describe('carte des trajets', () => {
  const { stats, view } = viewOf(scenario)
  const model = view.map!

  it('dessine les itinéraires réels depuis la ville de base', () => {
    expect(model.routes.map((r) => r.name)).toEqual(['Saint-Étienne ↔ Paris', 'Saint-Étienne ↔ Annecy', 'Saint-Étienne ↔ Roanne', 'Saint-Étienne ↔ Lyon'])
    expect(model.cities).toHaveLength(5)
    expect(model.cities.filter((c) => c.isHub).map((c) => c.name)).toEqual(['Saint-Étienne'])
    expect(model.months).toHaveLength(12)
    expect(model.doneLabel).toBe("Toute l'année, 4 lignes")
  })

  it('ne trace encore rien au départ : seuls la ville de base et la destination de janvier sont posées', () => {
    const s = evaluateMap(model, 0)
    expect(s.arcs.every((a) => a.off === 100)).toBe(true) // dashes fully offset: no line visible
    expect(s.dots.filter((d) => d.o === 1)).toHaveLength(2) // Saint-Étienne + Roanne (2 trips in January)
    expect(s.km).toBe('0')
    expect(s.phase).toBe('Janvier')
  })

  it('trace les lignes mois après mois, et finit sur le total exact', () => {
    const mid = evaluateMap(model, 1.5) // February in progress: Saint-Étienne ↔ Paris is being drawn
    const paris = model.routes.findIndex((r) => r.name.endsWith('Paris'))
    expect(mid.arcs[paris].o).toBe(1)
    expect(mid.arcs[paris].off).toBe(50)
    expect(mid.phase).toBe('Février')
    expect(mid.legend[0].name).toBe('Saint-Étienne ↔ Roanne') // 2 trips in January, the only route with any total so far
    const end = evaluateMap(model, 12)
    expect(end.km).toBe(fmtNum(stats.distance.estimatedKm))
    expect(end.phase).toBe("Toute l'année, 4 lignes")
    expect(end.arcs.every((a) => a.off === 0)).toBe(true)
    expect(end.legend.map((l) => l.trips)).toEqual(['2 trajets', '2 trajets', '2 trajets', '1 trajet'])
    expect(end.ticks.every((t) => t === 'done')).toBe(true)
  })

  it('reste valide pour une progression hors bornes (horodatage rAF antérieur au départ)', () => {
    const start = evaluateMap(model, 0)
    expect(evaluateMap(model, -0.004)).toEqual(start)
    expect(evaluateMap(model, Number.NaN)).toEqual(start)
    expect(evaluateMap(model, 99)).toEqual(evaluateMap(model, 12))
  })

  it('la ligne la plus fréquente finit à l’épaisseur maximale', () => {
    const end = evaluateMap(model, 12)
    expect(Math.max(...end.arcs.map((a) => Number(a.w)))).toBeCloseTo(4.6, 5)
  })

  it('les libellés ne se chevauchent pas (ou sont masqués)', () => {
    const shown = model.cities.filter((c) => !c.label.hidden)
    expect(shown.length).toBeGreaterThanOrEqual(3)
  })

  it('dessine tous les itinéraires géolocalisés, même au-delà du top 5 affiché sur l’écran de classement', () => {
    const cities = ['ROANNE', 'LYON PART DIEU', 'PARIS GARE DE LYON', 'ANNECY', 'MONTPELLIER SAINT ROCH', 'BORDEAUX SAINT JEAN']
    const many = viewOf(cities.map((dest, i) => ({ departure: `2026-02-0${i + 1}T10:00:00.000Z`, origin: SEC, destination: dest })))
    expect(many.view.routes).toHaveLength(5) // ranking screen stays capped
    expect(many.view.map!.routes).toHaveLength(6) // the map draws every geolocated route
  })
})

describe('cadrage de la carte', () => {
  it('garde la France entière quand les points sont éloignés', () => {
    expect(computeFrame([{ x: 208, y: 106 }, { x: 264, y: 242 }])).toEqual(FULL_FRAME)
  })
  it('ne trace la silhouette de la France que si le zoom reste modéré', () => {
    expect(showsOutline(FULL_FRAME)).toBe(true)
    expect(showsOutline(computeFrame([{ x: 255, y: 218 }, { x: 264, y: 242 }]))).toBe(false) // region: ~×3.4
    expect(showsOutline(computeFrame([{ x: 250, y: 200 }, { x: 320, y: 262 }]))).toBe(true) // a few départements
  })
  it('zoome quand tous les points sont regroupés, en gardant l’épaisseur des traits', () => {
    const f = computeFrame([{ x: 255, y: 218 }, { x: 264, y: 242 }, { x: 261, y: 244 }])
    expect(f.size).toBeLessThan(FULL_FRAME.size)
    expect(f.k).toBeCloseTo(f.size / FULL_FRAME.size, 6)
    expect(f.x).toBeGreaterThanOrEqual(10)
    expect(f.x + f.size).toBeLessThanOrEqual(415)
  })
  it("ne montre pas de contour de région à l'échelle nationale (Saint-Étienne → Paris)", () => {
    const { view } = viewOf(scenario)
    expect(view.map!.regionOutline).toBeNull()
    expect(view.franceMap.regionOutline).toBeNull()
  })

  it('montre le contour de la région quand tous les trajets y restent', () => {
    const regional = scenario.filter((r) => !r.origin.includes('PARIS') && !r.destination.includes('PARIS'))
    const { view } = viewOf(regional)
    const lyon = index.resolve('LYON PART DIEU')!
    const expected = regionOf(lyon.cityLat, lyon.cityLon)!.outline
    expect(view.map!.regionOutline).toBe(expected)
    expect(view.franceMap.regionOutline).toBe(expected)
  })

  it('trace des arcs quadratiques comme la maquette (Lyon → Paris)', () => {
    expect(arcPath({ x: 276.3, y: 229.4 }, { x: 207.9, y: 105.7 }, 0)).toBe('M276.3 229.4 Q224.8 177.1 207.9 105.7')
    expect(arcPath({ x: 276.3, y: 229.4 }, { x: 100.4, y: 171.3 }, 2)).toBe('M276.3 229.4 Q196.5 175.7 100.4 171.3')
  })
})
