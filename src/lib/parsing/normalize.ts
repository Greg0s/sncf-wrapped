const DIACRITICS = /[̀-ͯ]/g

/** Lowercase, without accents or ligatures. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
}

/** Column key: "numéro de commande" and "est_aller_retour" become "numero de commande" and "est aller retour". */
export function normalizeHeader(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Station key, identical for "SAINT ETIENNE CHATEAUCREUX" (CSV) and "Saint-Étienne Châteaucreux" (referential).
 * The ST / STE abbreviations are expanded on both sides.
 */
export function normalizeStationName(s: string): string {
  return fold(s)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\bSTE\b/g, 'SAINTE')
    .replace(/\bST\b/g, 'SAINT')
}

const SMALL_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'sur', 'sous', 'en', 'et', 'aux', 'au', 'd', 'l'])

/** "BRUXELLES MIDI" → "Bruxelles Midi" (used for stations missing from the referential). */
export function titleCaseFr(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}
