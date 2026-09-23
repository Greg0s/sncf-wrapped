// Generator of FICTIONAL, randomized SNCF Connect exports (fixed seed → reproducible), for robustness tests.
// It deliberately mixes in the tricky cases: very few or very many trips, unpaid options, duplicate
// tickets, round trips, unknown or foreign stations, bus stops, unreadable amounts, missing order
// dates or ones after the departure, upcoming departures.
import { normalizeStationName } from '../normalize'
import type { FixtureRow } from './sncfCsv'

/** Deterministic PRNG (mulberry32). */
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
// A mix of: genuinely unknown labels (no coordinates at all), a domestic label only the city
// resolves (Paris/Lyon, via city-prefix), and foreign cities that ARE in the referential (real
// coordinates, but outside every French region — exercises the map's cut/fade code path).
const UNKNOWN_STATIONS = ['TOKYO SHINJUKU', 'NEW YORK PENN STATION', 'PARIS NORD', 'LYON SAINT EXUPERY AEROPORT', 'GENEVE', 'BARCELONE SANTS']
const SIZES = [1, 2, 3, 5, 10, 40, 150, 400]

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export interface RandomExport {
  rows: FixtureRow[]
  /** "Today" date to use: some departures are later than this (and thus "upcoming"). */
  today: string
}

/** `stationNames`: station names from the referential, as published (with accents and hyphens). */
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
    const date = chance(0.5) ? day : addDays(day, 700) // spreads from 2021 to 2027: several years, including upcoming departures
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
    // Same train rebought (exchange) or supplementary ticket in the same order
    if (chance(0.1)) rows.push({ ...rows[rows.length - 1], order: `dup-${i}`, amount: String(Math.round(rand() * 5000) / 100).replace('.', ',') })
  }
  return { rows, today: '2026-06-30' }
}
