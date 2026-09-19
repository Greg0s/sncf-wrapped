import type { Period } from '../parsing'

/** Accent colors from the mockup: one per period offered in the import window. */
export const ACCENTS = ['#8DE8FD', '#E39BFD', '#7BBFFC', '#B5B5FE'] as const

/**
 * Accent color for a period: years cycle through the first 3 colors (the most recent is cyan), and
 * "all years" keeps the 4th, as in the mockup.
 */
export function accentFor(period: Period, index: number): string {
  return period.kind === 'all' ? ACCENTS[3] : ACCENTS[index % 3]
}
