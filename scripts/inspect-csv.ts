// Affiche dans la console ce que lib/parsing calcule pour un export SNCF Connect.
//   npm run inspect -- "<chemin du csv>" [--year 2025 | --all] [--include-options] [--json]
// Tout est local : le fichier est lu sur disque, rien n'est envoyé nulle part.
import { readFileSync } from 'node:fs'
import {
  MONTHS_FR,
  WEEKDAYS_FR,
  buildTripDataset,
  computeWrappedStats,
  createStationIndex,
  decodeCsvBytes,
  listPeriods,
  parseSncfCsv,
  type Period,
  type StationData,
} from '../src/lib/parsing'
import stationData from '../src/lib/parsing/data/gares.json'

const args = process.argv.slice(2)
const path = args.find((a) => !a.startsWith('--') && !/^\d{4}$/.test(a))
if (!path) {
  console.error('Usage : npm run inspect -- "<fichier.csv>" [--year 2025 | --all] [--include-options] [--json]')
  process.exit(1)
}
const yearArg = args.indexOf('--year') >= 0 ? Number(args[args.indexOf('--year') + 1]) : null
const fmt = (n: number | null, digits = 0) => (n === null ? '—' : n.toLocaleString('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: digits }))
const eur = (n: number | null) => (n === null ? '—' : `${fmt(n, 2)} €`)

const { text, encoding } = decodeCsvBytes(readFileSync(path))
const parsed = parseSncfCsv(text, { includeOptions: args.includes('--include-options') })
if (!parsed.ok) {
  console.error(`✗ ${parsed.error.code} : ${parsed.error.message}`)
  process.exit(1)
}
const { trips, report } = parsed.data
const ds = buildTripDataset(trips, createStationIndex(stationData as unknown as StationData))

console.log(`\n══ Lecture du fichier ══`)
console.log(`encodage détecté        : ${encoding}`)
console.log(`section                 : ${report.sectionTitle}`)
console.log(`colonnes                : ${report.columns.join(' | ')}`)
console.log(`lignes de billets       : ${report.ticketRows}`)
console.log(`  options non payées    : ${report.optionRows} (exclues)`)
console.log(`  lignes illisibles     : ${report.skipped.length}`)
console.log(`  billets fusionnés     : ${report.mergedTickets} (billets complémentaires / échanges)`)
console.log(`trajets reconstitués    : ${trips.length}  (dont ${ds.upcoming.length} à venir, exclus)`)
console.log(`modes de paiement       : ${JSON.stringify(report.paymentModes)}`)
console.log(`premier départ / dernière donnée : ${ds.firstDate} / ${ds.dataEnd}`)
console.log(`gares sans coordonnées  : ${ds.unresolvedPlaces.length ? ds.unresolvedPlaces.map((p) => `${p.raw} ×${p.count}`).join(', ') : 'aucune'}`)
console.log(`gares rattachées par approximation :`)
for (const p of ds.approximatedPlaces) console.log(`   ${p.raw.padEnd(34)} → ${p.matchedAs}  [${p.via}] ×${p.count}`)

const periods = listPeriods(ds)
console.log(`\n══ Périodes proposées ══`)
for (const p of periods) console.log(`  ${p.period.kind === 'year' ? p.period.year : 'toutes les années'} : ${p.tripCount} trajets`)

const wanted: Period[] = args.includes('--all')
  ? [{ kind: 'all' }]
  : yearArg
    ? [{ kind: 'year', year: yearArg }]
    : periods.map((p) => p.period)

for (const period of wanted) {
  const s = computeWrappedStats(ds, period)
  if (args.includes('--json')) {
    console.log(JSON.stringify(s, null, 2))
    continue
  }
  const monthName = (m: string) => `${MONTHS_FR[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`
  console.log(`\n══ ${s.display.period} (${s.from} → ${s.to}) ══`)
  console.log(`trajets (allers simples) : ${s.tripCount}   [${s.bookingCount} voyages, dont ${s.quality.roundTripBookings} aller-retour]`)
  console.log(`km estimés               : ${fmt(s.distance.estimatedKm)} km  (à vol d'oiseau ${fmt(s.distance.straightLineKm)} km × ${s.distance.detourFactor})`)
  console.log(`  moyenne / trajet        : ${fmt(s.distance.kmPerTrip)} km  |  ${fmt(s.distance.earthLaps, 2)} tour de la Terre`)
  console.log(`  distance connue pour    : ${s.distance.coveredTrips} trajets (${s.distance.uncoveredTrips} sans)`)
  console.log(`budget                   : ${eur(s.spend.totalEur)}   moyenne/trajet ${eur(s.spend.avgPerTripEur)}   par mois ${eur(s.spend.perMonthEur)} (sur ${s.spend.monthsSpan} mois)`)
  const h = (t: typeof s.spend.priciest) => (t ? `${eur(t.priceEur)} — ${t.from} → ${t.to}, ${WEEKDAYS_FR[t.weekday]} ${t.partOfDay ?? ''} (${t.date})` : '—')
  console.log(`  billet le plus cher     : ${h(s.spend.priciest)}`)
  console.log(`  billet le moins cher    : ${h(s.spend.cheapest)}   (hors 0 € : ${s.quality.freeBookings} voyage(s) à 0 €)`)
  console.log(`  mois le plus cher       : ${s.spend.priciestMonth ? `${monthName(s.spend.priciestMonth.month)} (${eur(s.spend.priciestMonth.totalEur)})` : '—'}`)
  console.log(`ville de base            : ${s.hub ? `${s.hub.name} (${s.hub.appearances} passages)` : '—'}`)
  console.log(`top destinations (${s.destinations.items.length}/${s.destinations.totalDistinct}, ${s.destinations.mode}) :`)
  s.destinations.items.forEach((d, i) => console.log(`   ${i + 1}. ${d.city.name.padEnd(28)} ${String(d.visits).padStart(3)} visite(s)  barre ${d.pct}%`))
  console.log(`top itinéraires (${s.routes.items.length}/${s.routes.totalDistinct}, ${s.routes.mode}) :`)
  s.routes.items.forEach((r, i) => console.log(`   ${i + 1}. ${r.label.padEnd(36)} ${String(r.trips).padStart(3)} trajets  ${fmt(r.km)} km  ${eur(r.totalEur)}   [${r.stations.join(' ↔ ')}]`))
  const a = s.anticipation
  console.log(
    a
      ? `anticipation             : ${fmt(a.averageDays, 1)} j en moyenne, ${a.sameDayCount} le jour même, min ${a.minDays} j, max ${a.maxDays} j, commande surtout le ${a.bookingWeekday ? `${WEEKDAYS_FR[a.bookingWeekday.weekday]} (${a.bookingWeekday.count})` : '—'}`
      : 'anticipation             : —',
  )
  console.log(`qualité                  : ${JSON.stringify(s.quality)}`)
}
