// Types shared by lib/parsing. None of them involves the network: everything lives in memory in the browser.

/** A single trip (departure + origin + destination), reconstructed from one or more tickets in the CSV. */
export interface Trip {
  /** Grouping key: departure + normalized stations. */
  key: string
  /** Departure date as written in the CSV (YYYY-MM-DD, assumed local time, the "Z" is ignored). */
  departureDate: string
  /** Departure time (HH:mm), or null if absent. */
  departureTime: string | null
  /** Oldest order date among the grouped tickets (YYYY-MM-DD), or null. */
  orderDate: string | null
  /** Raw SNCF labels, e.g. "SAINT ETIENNE CHATEAUCREUX". */
  origin: string
  destination: string
  /** Sum of the raw amounts of the grouped tickets, or null if no amount is readable. */
  priceEur: number | null
  /** False for a mere "option" (unpaid reservation), only possible with includeOptions. */
  paid: boolean
  passengers: number
  /** Round-trip ticket: counts as 2 trips (the return leg has no date in the CSV). */
  roundTrip: boolean
  /** "Booking reference" codes of the grouped tickets (for traceability). */
  refs: string[]
}

export type ParseErrorCode = 'empty-file' | 'file-too-large' | 'section-not-found' | 'missing-columns' | 'no-valid-rows'

export interface ParseError {
  code: ParseErrorCode
  message: string
  /** Expected columns that are missing (code "missing-columns"). */
  missingColumns?: string[]
}

export type SkipReason = 'missing-station' | 'invalid-departure-date' | 'malformed-row'

export interface ParseReport {
  /** Title of the section that was found, e.g. "Données - Commandes train bus". */
  sectionTitle: string | null
  delimiter: string
  /** Columns read, as written in the file. */
  columns: string[]
  /** Data rows of the section (tickets). */
  ticketRows: number
  /** "Option" tickets (unpaid reservation) encountered: excluded from trips, except with includeOptions. */
  optionRows: number
  /** Tickets excluded because they were unreadable. */
  skipped: { line: number; reason: SkipReason }[]
  /** Tickets merged into an already-known trip (supplementary tickets, exchanges). */
  mergedTickets: number
  /** Breakdown of the payment modes encountered. */
  paymentModes: Record<string, number>
  /** Unreadable amounts (the trip still counts, just without a price). */
  unreadableAmounts: number
}

export interface ParsedCsv {
  trips: Trip[]
  report: ParseReport
}

export type ParseResult = { ok: true; data: ParsedCsv } | { ok: false; error: ParseError }

export interface ParseOptions {
  /** Keep the "options" (unpaid reservations). False by default. */
  includeOptions?: boolean
}

/** A place resolved from an SNCF label. */
export interface Place {
  /** Raw label from the CSV. */
  raw: string
  /** Station from the referential, or just a city when only the city could be identified. */
  kind: 'station' | 'city'
  /** How the place was identified. */
  via: 'exact' | 'stripped' | 'prefix' | 'city-prefix'
  /** Display name of the station (e.g. "Saint-Étienne Châteaucreux"). */
  name: string
  /** Display name of the city (e.g. "Saint-Étienne"). */
  city: string
  /** Opaque city identifier, stable for a given referential. */
  cityKey: string
  /** Position of the station (or of the city when kind = "city"). */
  lat: number
  lon: number
  /** Average position of the city's stations, used to place it on the map. */
  cityLat: number
  cityLon: number
}

export interface StationData {
  source: string
  license: string
  retrievedAt: string
  /** [label, latitude, longitude] */
  cities: [string, number, number][]
  /** [name, latitude, longitude, index into cities] */
  stations: [string, number, number, number][]
}

export interface StationIndex {
  /** Resolves an SNCF label; null if the station is unknown to the referential (major foreign cities in direct connection are known — see `data/README.md`). */
  resolve(rawName: string): Place | null
}
