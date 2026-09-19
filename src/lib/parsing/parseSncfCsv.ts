import Papa from 'papaparse'
import { fold, normalizeHeader, normalizeStationName } from './normalize'
import type { ParseOptions, ParseReport, ParseResult, SkipReason, Trip } from './types'

/*
 * The SNCF Connect GDPR export is a "multi-section" CSV (identity, account, newsletter, train/bus orders,
 * cards, communications…). We only care about the train orders section: we locate it by its columns,
 * isolate it, and the rest of the file (personal data) is never parsed.
 */

// Columns required to recognize the section, matched by their normalized header name.
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

/** Date/time "as written": the export's Z suffix is ignored (times are local departure times). */
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

/** "13,4" → 13.4; "44" → 44; unreadable → null. */
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
 * Reads an SNCF Connect export already decoded to text (see decode.ts) and extracts the trips from it.
 *
 * Reading rules (validated against a real export, to be confirmed against others):
 *  - "options" (payment mode "Option posée") are unpaid reservations: excluded by default;
 *  - the same trip can appear on several rows (a TER ticket + a TGV ticket for the same journey, or an exchange
 *    in another order): rows with the same departure + origin + destination are merged into one trip,
 *    and their amounts are added together;
 *  - the amount is the CSV's gross amount (before any refund, which the file does not describe).
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

  // Section title: last non-blank line above the header.
  let sectionTitle: string | null = null
  for (let i = header.index - 1; i >= 0; i--) {
    if (!isBlank(lines[i], header.delimiter)) {
      sectionTitle = lines[i].replace(/[;,\t\s]+$/, '')
      break
    }
  }

  // Section lines: up to the first blank line or the next section's title.
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
    const line = header.index + i + 1 // line number (1-based) in the file
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
        // An option booked again identically doesn't add up: we keep the highest amount, and never alongside a paid ticket.
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
