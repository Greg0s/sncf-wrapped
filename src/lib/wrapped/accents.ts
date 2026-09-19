import type { Period } from '../parsing'

/** Couleurs d'accent de la maquette : une par période proposée dans la fenêtre d'import. */
export const ACCENTS = ['#8DE8FD', '#E39BFD', '#7BBFFC', '#B5B5FE'] as const

/**
 * Accent d'une période : les années tournent sur les 3 premières couleurs (la plus récente est cyan), et
 * « toutes les années » garde la 4e, comme dans la maquette.
 */
export function accentFor(period: Period, index: number): string {
  return period.kind === 'all' ? ACCENTS[3] : ACCENTS[index % 3]
}
