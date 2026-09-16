import { parse } from 'papaparse'
import type { ParsedCsv, RawCsvRow } from '../../types/csv.ts'

/**
 * Parse un export CSV SNCF Connect entièrement en mémoire, dans le navigateur.
 * Le fichier n'est jamais transmis à un serveur (cf. CLAUDE.md, contrainte 1).
 *
 * Le parsing en Web Worker (option `worker: true`) pourra être activé si les
 * exports s'avèrent assez volumineux pour bloquer l'UI.
 */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    parse<RawCsvRow, File>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        resolve({
          rows: results.data,
          fields: results.meta.fields ?? [],
          errors: results.errors,
        })
      },
      error: (error) => reject(error),
    })
  })
}
