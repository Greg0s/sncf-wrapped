import Papa from 'papaparse'
import { fold, normalizeHeader, normalizeStationName } from './normalize'
import type { ParseOptions, ParseReport, ParseResult, SkipReason, Trip } from './types'

/*
 * L'export RGPD de SNCF Connect est un CSV « multi-sections » (identité, compte, newsletter, commandes de
 * trains/bus, cartes, communications…). Seule la section des commandes de train nous intéresse : on la repère
 * par ses colonnes, on l'isole, et le reste du fichier (données personnelles) n'est jamais interprété.
 */

// Colonnes indispensables pour reconnaître la section, repérées par leur intitulé normalisé.
const REQUIRED_COLUMNS = { departure: 'date voyage', origin: 'lieu origine', destination: 'lieu destination' } as const
const OPTIONAL_COLUMNS = {
  orderDate: 'date commande',
  amount: 'montant brut',
  payment: 'mode de paiement',
  roundTrip: 'est aller retour',
  passengers: 'nombre passagers',
  booking: 'dossier voyage',
} as const

const DELIMITERS = [';', ',', '\t']
const NO_TIME = '--:--'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/
const FR_DATE = /^(\d{2})\/(\d{2})\/(\d{4})(?:[T\s](\d{2}):(\d{2}))?/
const SECTION_TITLE = /^\s*donn.{1,2}es\s+-\s+\S/i

const pad = (n: number) => String(n).padStart(2, '0')

/** Date/heure « telles qu'écrites » : le suffixe Z de l'export est ignoré (les heures sont des heures de départ locales). */
export function parseDateTime(raw: string): { date: string; time: string | null } | null {
  const s = raw.trim()
  let y: number, mo: number, d: number, hh: string | undefined, mm: string | undefined
  const iso = ISO_DATE.exec(s)
  const fr = iso ? null : FR_DATE.exec(s)
  if (iso) {
    ;[y, mo, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    ;[hh, mm] = [iso[4], iso[5]]
  } else if (fr) {
    ;[d, mo, y] = [Number(fr[1]), Number(fr[2]), Number(fr[3])]
    ;[hh, mm] = [fr[4], fr[5]]
  } else {
    return null
  }
  const t = new Date(Date.UTC(y, mo - 1, d))
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null
  const timeOk = hh !== undefined && mm !== undefined && Number(hh) <= 23 && Number(mm) <= 59
  return { date: `${y}-${pad(mo)}-${pad(d)}`, time: timeOk ? `${hh}:${mm}` : null }
}

/** « 13,4 » → 13.4 ; « 44 » → 44 ; illisible → null. */
export function parseAmount(raw: string): number | null {
  const s = raw.replace(/[\s €]/g, '').replace(',', '.')
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null
}

const TRUE_VALUES = new Set(['oui', 'yes', 'true', 'o', 'y', '1'])
const roundCents = (n: number) => Math.round(n * 100) / 100

interface HeaderMatch {
  index: number
  delimiter: string
  keys: string[]
}

function findHeader(lines: string[]): { header: HeaderMatch | null; closest: { matched: number; missing: string[] } } {
  const required = Object.values(REQUIRED_COLUMNS)
  let closest = { matched: 0, missing: required as string[] }
  for (let i = 0; i < lines.length; i++) {
    for (const delimiter of DELIMITERS) {
      if (!lines[i].includes(delimiter)) continue
      const keys = lines[i].split(delimiter).map(normalizeHeader)
      const missing = required.filter((k) => !keys.includes(k))
      if (missing.length === 0) return { header: { index: i, delimiter, keys }, closest }
      const matched = required.length - missing.length
      if (matched > closest.matched) closest = { matched, missing }
    }
  }
  return { header: null, closest }
}

const isBlank = (line: string, delimiter: string) => line.split(delimiter).every((c) => c.trim() === '')

/**
 * Lit un export SNCF Connect déjà décodé en texte (cf. decode.ts) et en extrait les trajets.
 *
 * Règles de lecture (validées sur un export réel, à confirmer sur d'autres) :
 *  - les « options » (mode de paiement « Option posée ») sont des réservations non payées : exclues par défaut ;
 *  - un même trajet peut apparaître sur plusieurs lignes (billet TER + billet TGV d'un même voyage, ou échange
 *    dans une autre commande) : les lignes de même départ + origine + destination sont fusionnées en un trajet,
 *    et leurs montants s'additionnent ;
 *  - le montant est le montant brut du CSV (avant tout remboursement, que le fichier ne décrit pas).
 */
export function parseSncfCsv(text: string, options: ParseOptions = {}): ParseResult {
  if (!text.trim()) {
    return { ok: false, error: { code: 'empty-file', message: 'Le fichier est vide.' } }
  }
  const lines = text.replace(/^﻿/, '').split(/\r\n|\n|\r/)

  const { header, closest } = findHeader(lines)
  if (!header) {
    const expected = Object.values(REQUIRED_COLUMNS)
    if (closest.matched >= 2) {
      return {
        ok: false,
        error: {
          code: 'missing-columns',
          message: `Colonnes manquantes dans la section des trajets : ${closest.missing.join(', ')}.`,
          missingColumns: closest.missing,
        },
      }
    }
    return {
      ok: false,
      error: {
        code: 'section-not-found',
        message: `Aucune section de trajets reconnue (colonnes attendues : ${expected.join(', ')}). Est-ce bien l'export de vos données personnelles SNCF Connect ?`,
      },
    }
  }

  // Titre de la section : dernière ligne non vide au-dessus de l'en-tête.
  let sectionTitle: string | null = null
  for (let i = header.index - 1; i >= 0; i--) {
    if (!isBlank(lines[i], header.delimiter)) {
      sectionTitle = lines[i].replace(/[;,\t\s]+$/, '')
      break
    }
  }

  // Lignes de la section : jusqu'à la première ligne vide ou au titre de la section suivante.
  const sectionLines = [lines[header.index]]
  for (let i = header.index + 1; i < lines.length; i++) {
    if (isBlank(lines[i], header.delimiter) || SECTION_TITLE.test(lines[i])) break
    sectionLines.push(lines[i])
  }
  const rows = Papa.parse<string[]>(sectionLines.join('\n'), { delimiter: header.delimiter, skipEmptyLines: 'greedy' }).data
  const columns = (rows[0] ?? []).map((c) => c.trim())
  const keys = columns.map(normalizeHeader)
  const col = (name: string) => keys.indexOf(name)
  const idx = {
    departure: col(REQUIRED_COLUMNS.departure),
    origin: col(REQUIRED_COLUMNS.origin),
    destination: col(REQUIRED_COLUMNS.destination),
    orderDate: col(OPTIONAL_COLUMNS.orderDate),
    amount: col(OPTIONAL_COLUMNS.amount),
    payment: col(OPTIONAL_COLUMNS.payment),
    roundTrip: col(OPTIONAL_COLUMNS.roundTrip),
    passengers: col(OPTIONAL_COLUMNS.passengers),
    booking: col(OPTIONAL_COLUMNS.booking),
  }

  const report: ParseReport = {
    sectionTitle,
    delimiter: header.delimiter,
    columns,
    ticketRows: rows.length - 1,
    optionRows: 0,
    skipped: [],
    mergedTickets: 0,
    paymentModes: {},
    unreadableAmounts: 0,
  }
  const skip = (line: number, reason: SkipReason) => report.skipped.push({ line, reason })
  const trips = new Map<string, Trip>()

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const line = header.index + i + 1 // numéro de ligne (à partir de 1) dans le fichier
    const cell = (c: number) => (c >= 0 ? (row[c] ?? '').trim() : '')

    const origin = cell(idx.origin)
    const destination = cell(idx.destination)
    if (!origin || !destination) {
      skip(line, row.length < 3 ? 'malformed-row' : 'missing-station')
      continue
    }
    const departure = parseDateTime(cell(idx.departure))
    if (!departure) {
      skip(line, 'invalid-departure-date')
      continue
    }

    const payment = cell(idx.payment) || '(non renseigné)'
    report.paymentModes[payment] = (report.paymentModes[payment] ?? 0) + 1
    const isOption = fold(payment).includes('option')
    if (isOption) {
      report.optionRows++
      if (!options.includeOptions) continue
    }

    const amountRaw = cell(idx.amount)
    const price = amountRaw ? parseAmount(amountRaw) : null
    if (amountRaw && price === null) report.unreadableAmounts++
    const orderDate = idx.orderDate >= 0 ? (parseDateTime(cell(idx.orderDate))?.date ?? null) : null
    const passengers = Math.max(1, parseInt(cell(idx.passengers), 10) || 1)
    const roundTrip = TRUE_VALUES.has(fold(cell(idx.roundTrip)))
    const ref = cell(idx.booking)

    const key = `${departure.date}T${departure.time ?? NO_TIME}|${normalizeStationName(origin)}|${normalizeStationName(destination)}`
    const known = trips.get(key)
    if (known) {
      report.mergedTickets++
      if (isOption) {
        // Une option reposée à l'identique ne s'additionne pas : on garde la plus élevée, et jamais à côté d'un billet payé.
        if (!known.paid && price !== null) known.priceEur = Math.max(known.priceEur ?? 0, price)
      } else {
        if (price !== null) known.priceEur = roundCents((known.paid ? (known.priceEur ?? 0) : 0) + price)
        known.paid = true
      }
      if (orderDate && (!known.orderDate || orderDate < known.orderDate)) known.orderDate = orderDate
      known.passengers = Math.max(known.passengers, passengers)
      known.roundTrip ||= roundTrip
      if (ref) known.refs.push(ref)
    } else {
      trips.set(key, {
        key,
        departureDate: departure.date,
        departureTime: departure.time,
        orderDate,
        origin,
        destination,
        priceEur: price,
        paid: !isOption,
        passengers,
        roundTrip,
        refs: ref ? [ref] : [],
      })
    }
  }

  if (trips.size === 0) {
    return {
      ok: false,
      error: {
        code: 'no-valid-rows',
        message:
          report.optionRows > 0
            ? `Aucun trajet payé dans ce fichier (${report.optionRows} réservation(s) non payée(s) ignorée(s)).`
            : 'Aucun trajet exploitable dans ce fichier.',
      },
    }
  }

  const sorted = [...trips.values()].sort((a, b) =>
    `${a.departureDate}${a.departureTime ?? ''}`.localeCompare(`${b.departureDate}${b.departureTime ?? ''}`) || a.key.localeCompare(b.key),
  )
  return { ok: true, data: { trips: sorted, report } }
}
