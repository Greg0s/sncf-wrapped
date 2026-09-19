/** Taille maximale des classements des écrans (villes, itinéraires). */
export const MAX_TOP = 5
/** Taille maximale des classements de la carte à partager. */
export const CARD_TOP = 3

export interface Ranked<T> {
  /** Éléments à afficher, du meilleur au moins bon. */
  items: T[]
  /** Nombre d'éléments distincts disponibles avant coupe. */
  totalDistinct: number
  /**
   * - `ranking` : au moins 2 éléments, un classement a du sens ;
   * - `single`  : un seul élément, à présenter comme un constat plutôt que comme un « top » ;
   * - `empty`   : rien à classer, l'écran doit être masqué ou remplacé.
   */
  mode: 'ranking' | 'single' | 'empty'
}

/**
 * Classement adaptatif : N = min(maxItems, éléments distincts). Ne renvoie jamais un « top 5 » à 3 éléments.
 * `sorted` doit déjà être trié du meilleur au moins bon.
 */
export function rankTop<T>(sorted: readonly T[], maxItems: number = MAX_TOP): Ranked<T> {
  const items = sorted.slice(0, Math.max(0, maxItems))
  return {
    items,
    totalDistinct: sorted.length,
    mode: sorted.length === 0 ? 'empty' : sorted.length === 1 ? 'single' : 'ranking',
  }
}
