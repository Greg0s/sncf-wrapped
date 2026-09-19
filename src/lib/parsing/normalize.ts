const DIACRITICS = /[̀-ͯ]/g

/** Minuscules sans accents ni ligatures. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
}

/** Clé de colonne : « numéro de commande » et « est_aller_retour » deviennent « numero de commande » et « est aller retour ». */
export function normalizeHeader(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Clé de gare, identique pour « SAINT ETIENNE CHATEAUCREUX » (CSV) et « Saint-Étienne Châteaucreux » (référentiel).
 * Les abréviations ST / STE sont développées des deux côtés.
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

/** « BRUXELLES MIDI » → « Bruxelles Midi » (utilisé pour les gares absentes du référentiel). */
export function titleCaseFr(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}
