import { describe, expect, it } from 'vitest'
import { buildSncfCsv, TRIP_HEADER, tripLine, type FixtureRow } from './__fixtures__/sncfCsv'
import { parseAmount, parseDateTime, parseSncfCsv } from './parseSncfCsv'

const row = (over: Partial<FixtureRow> = {}): FixtureRow => ({
  departure: '2026-01-10T08:00:00.000Z',
  origin: 'SAINT ETIENNE CHATEAUCREUX',
  destination: 'ROANNE',
  amount: '9,2',
  ...over,
})

function parseOk(rows: FixtureRow[], options?: Parameters<typeof parseSncfCsv>[1]) {
  const result = parseSncfCsv(buildSncfCsv(rows), options)
  if (!result.ok) throw new Error(`échec inattendu : ${result.error.message}`)
  return result.data
}

describe('parseDateTime / parseAmount', () => {
  it('lit les dates ISO de l’export en ignorant le suffixe Z', () => {
    expect(parseDateTime('2026-09-13T15:56:00.000Z')).toEqual({ date: '2026-09-13', time: '15:56' })
    expect(parseDateTime('2026-09-13')).toEqual({ date: '2026-09-13', time: null })
  })
  it('lit aussi les dates françaises', () => {
    expect(parseDateTime('13/09/2026 15:56')).toEqual({ date: '2026-09-13', time: '15:56' })
  })
  it('rejette les dates impossibles', () => {
    expect(parseDateTime('2026-02-30')).toBeNull()
    expect(parseDateTime('hier')).toBeNull()
  })
  it('lit les montants à virgule décimale', () => {
    expect(parseAmount('13,4')).toBe(13.4)
    expect(parseAmount('44')).toBe(44)
    expect(parseAmount('0')).toBe(0)
    expect(parseAmount('1 234,50 €')).toBe(1234.5)
    expect(parseAmount('abc')).toBeNull()
  })
})

describe('parseSncfCsv', () => {
  it("isole la section des trajets d'un export multi-sections (CRLF, guillemets étranges avant la section)", () => {
    const { trips, report } = parseOk([row(), row({ departure: '2026-01-12T18:30:00.000Z', origin: 'ROANNE', destination: 'SAINT ETIENNE CHATEAUCREUX' })])
    expect(report.sectionTitle).toBe('Données - Commandes train bus')
    expect(report.delimiter).toBe(';')
    expect(report.ticketRows).toBe(2)
    expect(trips).toHaveLength(2)
    expect(trips[0]).toMatchObject({ departureDate: '2026-01-10', departureTime: '08:00', origin: 'SAINT ETIENNE CHATEAUCREUX', destination: 'ROANNE', priceEur: 9.2, passengers: 1, roundTrip: false })
  })

  it("n'expose aucune donnée personnelle des autres sections", () => {
    const { trips } = parseOk([row()])
    const dump = JSON.stringify(trips)
    for (const secret of ['example.org', 'DUPONT', 'LILAS', '33600000000', '1990-01-01']) expect(dump).not.toContain(secret)
  })

  it('ne lit pas les sections suivantes comme des trajets', () => {
    expect(parseOk([row()]).trips).toHaveLength(1)
  })

  it('exclut les « options » (réservations non payées) par défaut', () => {
    const rows = [row(), row({ departure: '2026-01-11T08:00:00.000Z', payment: 'Option posée', amount: '80' })]
    const { trips, report } = parseOk(rows)
    expect(trips).toHaveLength(1)
    expect(report.optionRows).toBe(1)
    expect(report.paymentModes).toEqual({ 'Payé en ligne': 1, 'Option posée': 1 })
    const withOptions = parseOk(rows, { includeOptions: true })
    expect(withOptions.trips).toHaveLength(2)
    expect(withOptions.report.optionRows).toBe(1) // toujours signalées, même quand on les garde
  })

  it('fusionne les billets complémentaires d’un même voyage (TER + TGV) et additionne les montants', () => {
    const { trips, report } = parseOk([
      row({ order: 'A', ref: 'AAA111', amount: '31' }),
      row({ order: 'A', ref: 'BBB222', amount: '10,7', orderDate: '2026-01-02' }),
    ])
    expect(trips).toHaveLength(1)
    expect(trips[0].priceEur).toBe(41.7)
    expect(trips[0].refs).toEqual(['AAA111', 'BBB222'])
    expect(trips[0].orderDate).toBe('2026-01-02') // la plus ancienne
    expect(report.mergedTickets).toBe(1)
  })

  it('fusionne aussi un même train ré-acheté dans une autre commande (échange)', () => {
    const { trips } = parseOk([row({ order: 'A', orderDate: '2026-01-01', amount: '27,6' }), row({ order: 'B', orderDate: '2026-01-05', amount: '20,1' })])
    expect(trips).toHaveLength(1)
    expect(trips[0].orderDate).toBe('2026-01-01')
  })

  it("n'additionne jamais les montants d'options (même train réservé deux fois), avec includeOptions", () => {
    const opt = (amount: string, orderDate: string) => row({ payment: 'Option posée', amount, orderDate })
    const twice = parseOk([opt('45', '2026-01-04'), opt('45', '2026-01-11')], { includeOptions: true })
    expect(twice.trips).toHaveLength(1)
    expect(twice.trips[0]).toMatchObject({ priceEur: 45, paid: false })

    const withPaid = parseOk([opt('45', '2026-01-04'), row({ amount: '38,5', orderDate: '2026-01-11' }), opt('50', '2026-01-12')], { includeOptions: true })
    expect(withPaid.trips).toHaveLength(1)
    expect(withPaid.trips[0]).toMatchObject({ priceEur: 38.5, paid: true }) // seul le billet payé compte
  })

  it('ne fusionne pas deux départs différents le même jour', () => {
    expect(parseOk([row(), row({ departure: '2026-01-10T17:00:00.000Z' })]).trips).toHaveLength(2)
  })

  it('reconnaît un aller-retour', () => {
    const { trips } = parseOk([row({ roundTrip: true, amount: '54' })])
    expect(trips[0].roundTrip).toBe(true)
  })

  it('garde le trajet quand le montant est illisible, et le signale', () => {
    const { trips, report } = parseOk([row({ amount: 'n/a' })])
    expect(trips[0].priceEur).toBeNull()
    expect(report.unreadableAmounts).toBe(1)
  })

  it('ignore les lignes sans gare ou sans date valide, en le signalant', () => {
    const { trips, report } = parseOk([row(), row({ destination: '' }), row({ departure: 'bientôt' })])
    expect(trips).toHaveLength(1)
    expect(report.skipped.map((s) => s.reason)).toEqual(['missing-station', 'invalid-departure-date'])
  })

  it('trie les trajets par date de départ', () => {
    const { trips } = parseOk([row({ departure: '2026-03-01T08:00:00.000Z' }), row({ departure: '2026-01-01T08:00:00.000Z' })])
    expect(trips.map((t) => t.departureDate)).toEqual(['2026-01-01', '2026-03-01'])
  })

  it('accepte un CSV « nu » (sans sections), séparateur virgule, BOM et LF', () => {
    const csv = '﻿date voyage,lieu origine,lieu destination,montant_brut\n2026-05-01T10:00:00.000Z,PARIS GARE DE LYON,LYON PART DIEU,"45,5"\n'
    const result = parseSncfCsv(csv)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.report.delimiter).toBe(',')
      expect(result.data.trips[0]).toMatchObject({ origin: 'PARIS GARE DE LYON', priceEur: 45.5, orderDate: null })
    }
  })

  it('reconnaît les colonnes même si les accents sont cassés (mauvais décodage)', () => {
    const csv = `${TRIP_HEADER.replace('numéro', 'num�ro')}\r\n${tripLine(row({ payment: 'Pay� en ligne' }))}`
    expect(parseSncfCsv(csv).ok).toBe(true)
  })

  describe('erreurs', () => {
    it('fichier vide', () => {
      expect(parseSncfCsv('  \n ')).toEqual({ ok: false, error: expect.objectContaining({ code: 'empty-file' }) })
    })
    it("fichier qui n'est pas un export SNCF", () => {
      expect(parseSncfCsv('nom;prenom\nDupont;Jean')).toEqual({ ok: false, error: expect.objectContaining({ code: 'section-not-found' }) })
    })
    it('section de trajets à laquelle il manque une colonne', () => {
      const result = parseSncfCsv('date voyage;lieu origine;montant_brut\n2026-01-01T10:00:00.000Z;A;1')
      expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'missing-columns', missingColumns: ['lieu destination'] }) })
    })
    it('aucun trajet payé', () => {
      const result = parseSncfCsv(buildSncfCsv([row({ payment: 'Option posée' })]))
      expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'no-valid-rows' }) })
    })
  })
})
