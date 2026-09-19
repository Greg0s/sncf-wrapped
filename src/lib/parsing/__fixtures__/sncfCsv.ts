// Factory for "SNCF Connect style" CSVs used in tests. All the data is FICTIONAL (identity, address,
// emails…): never paste a real export here, since it contains personal data.

export interface FixtureRow {
  order?: string
  ref?: string
  orderDate?: string
  /** Export format: 2026-01-10T08:00:00.000Z */
  departure: string
  origin: string
  destination: string
  payment?: string
  roundTrip?: boolean
  /** As written in the CSV (decimal comma). */
  amount?: string
  passengers?: number
}

export const TRIP_HEADER =
  'email;numéro de commande;dossier voyage;date commande;date voyage;lieu origine;lieu destination;mode de retrait;mode de paiement;classe;est_aller_retour;montant_brut;nombre_passagers'

let seq = 0

export function tripLine(r: FixtureRow): string {
  seq++
  return [
    'jean.dupont@example.org',
    r.order ?? `order-${seq}`,
    r.ref ?? `REF${String(seq).padStart(3, '0')}`,
    r.orderDate ?? r.departure.slice(0, 10),
    r.departure,
    r.origin,
    r.destination,
    'Billet à imprimer',
    r.payment ?? 'Payé en ligne',
    'Seconde',
    r.roundTrip ? 'oui' : 'non',
    r.amount ?? '10',
    String(r.passengers ?? 1),
  ].join(';')
}

const blank = ';;;;;;;;;;;;'

/** Full export: identity/account sections (fictional), trips, then other sections after. CRLF line endings. */
export function buildSncfCsv(rows: FixtureRow[]): string {
  return [
    "Demande d'extraction des données personnelles;;;;;;;;;;;;",
    'Email faisant l\'objet de la demande : jean.dupont@example.org;;;;;;;;;;;;',
    blank,
    'Données - Info client;;;;;;;;;;;;',
    'email;civilite;prenom;nom;date_naissance;source_technique',
    'jean.dupont@example.org;Monsieur;JEAN;DUPONT;1990-01-01;CommandeTRAIN',
    blank,
    blank,
    'Données - Compte client;;;;;;;;;;;;',
    'email;adresse;date_de_creation;date_de_mise_a_jour;date_de_naissance;numerotelephone',
    // Quotes with "weird escaping" like in a real export: they must not break anything.
    'jean.dupont@example.org;"{\\mainAddress\\"":\\""1 RUE DES LILAS\\"",\\""city\\"":\\""LYON\\""}""";2018-01-01T00:00:00.000Z;2026-01-01T00:00:00.000Z;1990-01-01;33600000000',
    blank,
    blank,
    'Données - Commandes train bus;;;;;;;;;;;;',
    TRIP_HEADER,
    ...rows.map(tripLine),
    blank,
    blank,
    blank,
    'Données - Commandes carte abo;;;;;;;;;;;;',
    'email;numero_de_commande;numero_de_réservation;date_commande;type_achat;type_de_carte_ou_abonnement;date_de_debut_de_validite;montant_brut',
    'jean.dupont@example.org;abo-1;CARTE1;2025-09-06;CARTE;Carte Avantage;2025-10-28;49',
    blank,
    'Données - Catalogue ter;;;;;;;;;;;;',
    'Pas de données;;;;;;;;;;;;',
  ].join('\r\n')
}

/** Encodes as Windows-1252 (the fixture's characters are all within Latin-1): reproduces a real export's bytes. */
export function toWindows1252(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(text, (c) => c.charCodeAt(0) & 0xff)
}
