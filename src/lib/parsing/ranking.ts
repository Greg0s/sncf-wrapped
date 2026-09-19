/** Maximum size of the screen rankings (cities, routes). */
export const MAX_TOP = 5
/** Maximum size of the rankings on the shareable card. */
export const CARD_TOP = 3

export interface Ranked<T> {
  /** Items to display, best to worst. */
  items: T[]
  /** Number of distinct items available before truncation. */
  totalDistinct: number
  /**
   * - `ranking`: at least 2 items, a ranking makes sense;
   * - `single`: a single item, to be presented as a fact rather than a "top";
   * - `empty`: nothing to rank, the screen should be hidden or replaced.
   */
  mode: 'ranking' | 'single' | 'empty'
}

/**
 * Adaptive ranking: N = min(maxItems, distinct items). Never returns a "top 5" with only 3 items.
 * `sorted` must already be sorted from best to worst.
 */
export function rankTop<T>(sorted: readonly T[], maxItems: number = MAX_TOP): Ranked<T> {
  const items = sorted.slice(0, Math.max(0, maxItems))
  return {
    items,
    totalDistinct: sorted.length,
    mode: sorted.length === 0 ? 'empty' : sorted.length === 1 ? 'single' : 'ranking',
  }
}
