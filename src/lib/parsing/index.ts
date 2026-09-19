/*
 * lib/parsing — from the SNCF Connect CSV export to the values displayed by the wrapped.
 *
 * Privacy constraint (CLAUDE.md): everything happens in memory, in the browser. Nothing in this folder
 * makes a network request with the file's content; the only thing loaded is the station referential,
 * a static file of the site. A test (privacy.test.ts) makes sure no network API creeps in here.
 */
import { readCsvFile, type CsvEncoding } from './decode'
import { buildTripDataset, listPeriods, type PeriodOption, type TripDataset } from './dataset'
import { parseSncfCsv } from './parseSncfCsv'
import { loadStationIndex } from './stations'
import type { ParseError, ParseOptions, ParseReport, StationIndex } from './types'

export { decodeCsvBytes, readCsvFile, type CsvEncoding } from './decode'
export { parseSncfCsv } from './parseSncfCsv'
export { createStationIndex, loadStationIndex } from './stations'
export { buildTripDataset, legCount, listPeriods } from './dataset'
export type { CityRef, Period, PeriodOption, PlaceUsage, ResolvedTrip, TripDataset, TripPlace } from './dataset'
export { computeWrappedStats } from './computeWrappedStats'
export type { Anticipation, CityVisit, MonthBucket, RouteStat, StatsOptions, TravelLeg, TripHighlight, WrappedStats } from './computeWrappedStats'
export { CARD_TOP, MAX_TOP, rankTop, type Ranked } from './ranking'
export { EARTH_CIRCUMFERENCE_KM, RAIL_DETOUR_FACTOR, haversineKm, projectToFranceMap } from './geo'
export { MONTHS_FR, WEEKDAYS_FR, dayNumber, daysInMonth, localToday, monthOf } from './dates'
export type * from './types'

/** Maximum size accepted for the import (the mockup advertises "20 MB max"). */
export const MAX_FILE_BYTES = 20 * 1024 * 1024

export type ImportResult =
  | { ok: true; encoding: CsvEncoding; report: ParseReport; dataset: TripDataset; periods: PeriodOption[] }
  | { ok: false; error: ParseError }

/** Full pipeline: chosen file → decoding → CSV reading → trips linked to stations → selectable periods. */
export async function importSncfCsv(
  file: Blob,
  options: ParseOptions & { today?: string; stationIndex?: StationIndex } = {},
): Promise<ImportResult> {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: { code: 'file-too-large', message: 'Ce fichier dépasse 20 Mo, la taille maximale acceptée.' } }
  }
  const { text, encoding } = await readCsvFile(file)
  const parsed = parseSncfCsv(text, { includeOptions: options.includeOptions })
  if (!parsed.ok) return parsed
  const index = options.stationIndex ?? (await loadStationIndex())
  const dataset = buildTripDataset(parsed.data.trips, index, options.today)
  return { ok: true, encoding, report: parsed.data.report, dataset, periods: listPeriods(dataset) }
}
