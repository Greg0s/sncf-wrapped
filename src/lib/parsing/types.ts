// Types partagés par lib/parsing. Aucun n'implique le réseau : tout vit en mémoire dans le navigateur.

/** Un trajet unique (départ + origine + destination), reconstitué à partir d'un ou plusieurs billets du CSV. */
export interface Trip {
  /** Clé de regroupement : départ + gares normalisées. */
  key: string
  /** Date de départ telle qu'écrite dans le CSV (AAAA-MM-JJ, heure locale supposée, le « Z » est ignoré). */
  departureDate: string
  /** Heure de départ (HH:mm), ou null si absente. */
  departureTime: string | null
  /** Plus ancienne date de commande parmi les billets regroupés (AAAA-MM-JJ), ou null. */
  orderDate: string | null
  /** Libellés bruts SNCF, ex. « SAINT ETIENNE CHATEAUCREUX ». */
  origin: string
  destination: string
  /** Somme des montants bruts des billets regroupés, ou null si aucun montant lisible. */
  priceEur: number | null
  /** Faux pour une simple « option » (réservation non payée), possible seulement avec includeOptions. */
  paid: boolean
  passengers: number
  /** Billet aller-retour : compte pour 2 trajets (le retour n'a pas de date dans le CSV). */
  roundTrip: boolean
  /** Codes « dossier voyage » des billets regroupés (traçabilité). */
  refs: string[]
}

export type ParseErrorCode = 'empty-file' | 'file-too-large' | 'section-not-found' | 'missing-columns' | 'no-valid-rows'

export interface ParseError {
  code: ParseErrorCode
  message: string
  /** Colonnes attendues mais absentes (code « missing-columns »). */
  missingColumns?: string[]
}

export type SkipReason = 'missing-station' | 'invalid-departure-date' | 'malformed-row'

export interface ParseReport {
  /** Titre de la section repérée, ex. « Données - Commandes train bus ». */
  sectionTitle: string | null
  delimiter: string
  /** Colonnes lues, telles qu'écrites dans le fichier. */
  columns: string[]
  /** Lignes de données de la section (billets). */
  ticketRows: number
  /** Billets « option » (réservation non payée) rencontrés : exclus des trajets, sauf avec includeOptions. */
  optionRows: number
  /** Billets exclus car illisibles. */
  skipped: { line: number; reason: SkipReason }[]
  /** Billets fusionnés dans un trajet déjà connu (billets complémentaires, échanges). */
  mergedTickets: number
  /** Répartition des modes de paiement rencontrés. */
  paymentModes: Record<string, number>
  /** Montants illisibles (le trajet compte, mais sans prix). */
  unreadableAmounts: number
}

export interface ParsedCsv {
  trips: Trip[]
  report: ParseReport
}

export type ParseResult = { ok: true; data: ParsedCsv } | { ok: false; error: ParseError }

export interface ParseOptions {
  /** Garder les « options » (réservations non payées). Faux par défaut. */
  includeOptions?: boolean
}

/** Lieu résolu à partir d'un libellé SNCF. */
export interface Place {
  /** Libellé brut du CSV. */
  raw: string
  /** Gare du référentiel, ou ville seule quand seule la ville a pu être identifiée. */
  kind: 'station' | 'city'
  /** Comment le lieu a été identifié. */
  via: 'exact' | 'stripped' | 'prefix' | 'city-prefix'
  /** Nom d'affichage de la gare (ex. « Saint-Étienne Châteaucreux »). */
  name: string
  /** Nom d'affichage de la ville (ex. « Saint-Étienne »). */
  city: string
  /** Identifiant opaque de la ville, stable pour un référentiel donné. */
  cityKey: string
  /** Position de la gare (ou de la ville quand kind = « city »). */
  lat: number
  lon: number
  /** Position moyenne des gares de la ville, pour la placer sur la carte. */
  cityLat: number
  cityLon: number
}

export interface StationData {
  source: string
  license: string
  retrievedAt: string
  /** [libellé, latitude, longitude] */
  cities: [string, number, number][]
  /** [nom, latitude, longitude, index dans cities] */
  stations: [string, number, number, number][]
}

export interface StationIndex {
  /** Résout un libellé SNCF ; null si la gare est inconnue du référentiel (ex. gare étrangère). */
  resolve(rawName: string): Place | null
}
