// Générateur d'exports SNCF Connect FICTIFS et aléatoires (graine fixe → reproductible), pour les tests de robustesse.
// Il mélange volontairement les cas difficiles : très peu ou beaucoup de trajets, options non payées, billets
// dupliqués, allers-retours, gares inconnues ou étrangères, arrêts de car, montants illisibles, dates de commande
// manquantes ou postérieures au départ, départs à venir.
import { normalizeStationName } from '../normalize'
import type { FixtureRow } from './sncfCsv'

/** PRNG déterministe (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
const UNKNOWN_STATIONS = ['GENEVE', 'BRUXELLES MIDI', 'LONDRES ST PANCRAS', 'ZURICH HB', 'PARIS NORD', 'LYON SAINT EXUPERY AEROPORT', 'BARCELONE SANTS']
const SIZES = [1, 2, 3, 5, 10, 40, 150, 400]

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export interface RandomExport {
  rows: FixtureRow[]
  /** Date du jour à utiliser : certains départs sont postérieurs (donc « à venir »). */
  today: string
}

/** `stationNames` : noms de gares du référentiel, tels que publiés (avec accents et tirets). */
export function randomExport(seed: number, stationNames: string[]): RandomExport {
  const rand = mulberry32(seed)
  const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)]
  const chance = (p: number) => rand() < p
  const csvName = (name: string) => normalizeStationName(name)

  const home = csvName(pick(stationNames))
  const favorites = Array.from({ length: 1 + Math.floor(rand() * 12) }, () => csvName(pick(stationNames)))
  const size = pick(SIZES)
  const rows: FixtureRow[] = []

  for (let i = 0; i < size; i++) {
    let other = chance(0.06) ? pick(UNKNOWN_STATIONS) : pick(favorites)
    if (chance(0.04)) other = `${other} GARE ROUTIERE`
    const outbound = chance(0.5)
    const day = addDays('2021-06-01', Math.floor(rand() * 1400))
    const date = chance(0.5) ? day : addDays(day, 700) // étale de 2021 à 2027 : plusieurs années, dont des départs à venir
    const lead = chance(0.05) ? -1 - Math.floor(rand() * 3) : chance(0.4) ? 0 : Math.floor(rand() * 90)
    const amountKind = rand()
    const amount =
      amountKind < 0.04 ? 'n/a' : amountKind < 0.07 ? '' : amountKind < 0.12 ? '0' : amountKind < 0.16 ? '1 234,5' : String(Math.round(rand() * 12000) / 100).replace('.', ',')
    const paymentKind = rand()
    rows.push({
      departure: `${date}T${pad(Math.floor(rand() * 24))}:${pad(Math.floor(rand() * 60))}:00.000Z`,
      orderDate: chance(0.03) ? '' : addDays(date, -lead),
      origin: outbound ? home : other,
      destination: outbound ? other : home,
      payment: paymentKind < 0.12 ? 'Option posée' : paymentKind < 0.15 ? 'Payé en boutique' : 'Payé en ligne',
      roundTrip: chance(0.1),
      amount,
      passengers: chance(0.9) ? 1 : 2 + Math.floor(rand() * 3),
    })
    // Même train racheté (échange) ou billet complémentaire dans la même commande
    if (chance(0.1)) rows.push({ ...rows[rows.length - 1], order: `dup-${i}`, amount: String(Math.round(rand() * 5000) / 100).replace('.', ',') })
  }
  return { rows, today: '2026-06-30' }
}
