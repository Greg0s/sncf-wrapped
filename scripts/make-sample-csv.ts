// Generates a FICTIONAL SNCF Connect export (same sections, Windows-1252 encoding, CRLF) to manually test the import.
//   npm run sample -- <output-file.csv> [--profile lyon|regional|tiny|single|foreign|roundtrips]
// No real data: a fictional user and trips drawn from a deterministic sequence.
import { writeFileSync } from 'node:fs'
import { buildSncfCsv, toWindows1252, type FixtureRow } from '../src/lib/parsing/__fixtures__/sncfCsv'

const args = process.argv.slice(2)
const out = args.find((a) => !a.startsWith('--') && a !== args[args.indexOf('--profile') + 1])
const profile = args.includes('--profile') ? args[args.indexOf('--profile') + 1] : 'lyon'
if (!out) {
  console.error('Usage : npm run sample -- <fichier-de-sortie.csv> [--profile lyon|regional|tiny|single|foreign|roundtrips]')
  process.exit(1)
}

const pad = (x: number) => String(x).padStart(2, '0')

/** Monthly round trips from a base station to destinations (one-way price). */
function commute(home: string, destinations: [string, number][], from: number, until: [number, number], perMonth = 2): FixtureRow[] {
  const rows: FixtureRow[] = []
  let n = 0
  for (let year = from; year <= until[0]; year++) {
    for (let month = 1; month <= (year === until[0] ? until[1] : 12); month++) {
      for (let k = 0; k < perMonth; k++) {
        const [dest, price] = destinations[(k === 0 ? 0 : 1 + ((n + month) % (destinations.length - 1))) % destinations.length]
        const day = 4 + k * 12
        const ordered = new Date(Date.UTC(year, month - 1, day) - ((n * 7) % 30) * 86_400_000).toISOString().slice(0, 10)
        const stamp = (d: number, h: number) => `${year}-${pad(month)}-${pad(d)}T${pad(h)}:${pad((n * 7) % 60)}:00.000Z`
        rows.push(
          { orderDate: ordered, departure: stamp(day, 7 + (n % 8)), origin: home, destination: dest, amount: String(price + (n % 5)).replace('.', ',') },
          { orderDate: ordered, departure: stamp(day + 2, 16 + (n % 5)), origin: dest, destination: home, amount: `${price + 1},5` },
        )
        n++
      }
    }
  }
  return rows
}

const profiles: Record<string, () => FixtureRow[]> = {
  // Lyon resident who often heads up to Paris, a few long distances and a foreign station
  lyon: () => [
    ...commute('LYON PART DIEU', [['PARIS GARE DE LYON', 48], ['MARSEILLE SAINT CHARLES', 32], ['NANTES', 78], ['DIJON VILLE', 22], ['STRASBOURG', 60], ['GENEVE', 30]], 2024, [2026, 8]),
    { departure: '2025-06-01T09:00:00.000Z', origin: 'LYON PART DIEU', destination: 'PARIS GARE DE LYON', payment: 'Option posée', amount: '99' },
    { departure: '2025-07-12T09:30:00.000Z', origin: 'LYON PART DIEU', destination: 'LYON PERRACHE', amount: '1,2' },
    { departure: '2025-08-02T10:00:00.000Z', origin: 'LYON PART DIEU', destination: 'MONTPELLIER SAINT ROCH', roundTrip: true, amount: '64' },
    { order: 'combo', departure: '2025-09-05T08:10:00.000Z', origin: 'SAINT ETIENNE CHATEAUCREUX', destination: 'PARIS BERCY', amount: '39' },
    { order: 'combo', departure: '2025-09-05T08:10:00.000Z', origin: 'SAINT ETIENNE CHATEAUCREUX', destination: 'PARIS BERCY', amount: '10,7' },
    { departure: '2025-09-20T12:00:00.000Z', origin: 'ROANNE GARE ROUTIERE', destination: 'LYON PART DIEU', amount: '8' },
  ],
  // TER commuter who never leaves their region: every point fits within a ~100 km radius
  regional: () =>
    commute('SAINT ETIENNE CHATEAUCREUX', [['ROANNE', 9.2], ['FIRMINY', 2.4], ['LYON PART DIEU', 10.7], ['LE PUY EN VELAY', 17], ['ANDREZIEUX BOUTHEON', 3.1]], 2025, [2026, 8], 3),
  // Only three trips: rankings should shrink, not fill up
  tiny: () => [
    { departure: '2026-03-02T08:00:00.000Z', orderDate: '2026-02-20', origin: 'LYON PART DIEU', destination: 'PARIS GARE DE LYON', amount: '45' },
    { departure: '2026-03-05T18:00:00.000Z', orderDate: '2026-03-01', origin: 'PARIS GARE DE LYON', destination: 'LYON PART DIEU', amount: '52' },
    { departure: '2026-04-10T09:00:00.000Z', orderDate: '2026-04-10', origin: 'LYON PART DIEU', destination: 'GRENOBLE', amount: '18' },
  ],
  // A single route, traveled twice
  single: () => [
    { departure: '2026-03-02T08:00:00.000Z', origin: 'LYON PART DIEU', destination: 'PARIS GARE DE LYON', amount: '45' },
    { departure: '2026-03-09T08:00:00.000Z', origin: 'LYON PART DIEU', destination: 'PARIS GARE DE LYON', amount: '47' },
  ],
  // Only stations absent from the French referential: no km and no map
  foreign: () => [
    { departure: '2026-03-02T08:00:00.000Z', origin: 'LYON PART DIEU', destination: 'GENEVE', amount: '34' },
    { departure: '2026-03-09T08:00:00.000Z', origin: 'GENEVE', destination: 'LYON PART DIEU', amount: '36' },
    { departure: '2026-05-01T08:00:00.000Z', origin: 'PARIS NORD', destination: 'BRUXELLES MIDI', amount: '59' },
  ],
  // Round-trip tickets: each ticket counts as two trips
  roundtrips: () => [
    { departure: '2026-02-07T08:00:00.000Z', orderDate: '2026-01-10', origin: 'LYON PART DIEU', destination: 'MARSEILLE SAINT CHARLES', roundTrip: true, amount: '58' },
    { departure: '2026-03-14T08:00:00.000Z', orderDate: '2026-03-01', origin: 'LYON PART DIEU', destination: 'PARIS GARE DE LYON', roundTrip: true, amount: '96' },
    { departure: '2026-05-16T08:00:00.000Z', orderDate: '2026-05-16', origin: 'LYON PART DIEU', destination: 'MARSEILLE SAINT CHARLES', roundTrip: true, amount: '61' },
  ],
}

const build = profiles[profile]
if (!build) {
  console.error(`Profil inconnu : ${profile}. Profils : ${Object.keys(profiles).join(', ')}`)
  process.exit(1)
}
const rows = build()
writeFileSync(out, toWindows1252(buildSncfCsv(rows)))
console.log(`${rows.length} lignes de billets fictives (profil ${profile}) -> ${out}`)
