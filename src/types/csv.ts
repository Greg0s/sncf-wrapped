import type { ParseError } from 'papaparse'

/**
 * Ligne brute de l'export SNCF Connect. Les en-têtes exacts ne sont pas figés
 * ici : le mapping vers les types métier (Trip, Station…) se fera dans
 * `src/lib/csv/` une fois le format d'export réel confirmé.
 */
export type RawCsvRow = Record<string, string>

export type ParsedCsv = {
  rows: RawCsvRow[]
  fields: string[]
  errors: ParseError[]
}
