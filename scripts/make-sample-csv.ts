// Generates a FICTIONAL SNCF Connect export (same sections, Windows-1252 encoding, CRLF) to manually test the import.
//   npm run sample -- <output-file.csv> [--profile lyon|regional|regional-outlier|tiny|minimal|single|foreign|international|corsica|roundtrips|huge]
// No real data: a fictional user and trips drawn from a deterministic sequence.
import { writeFileSync } from 'node:fs'
import { buildSncfCsv, toWindows1252, type FixtureRow } from '../src/lib/parsing/__fixtures__/sncfCsv'

const args = process.argv.slice(2)
const out = args.find((a) => !a.startsWith('--') && a !== args[args.indexOf('--profile') + 1])
const profile = args.includes('--profile') ? args[args.indexOf('--profile') + 1] : 'lyon'
if (!out) {
  console.error(
    'Usage : npm run sample -- <fichier-de-sortie.csv> [--profile lyon|regional|regional-outlier|tiny|minimal|single|foreign|international|corsica|roundtrips|huge]',
  )
  process.exit(1)
}

const pad = (x: number) => String(x).padStart(2, '0')

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

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
  // Foreign cities in direct connection (referential): real km, and a map line cut/faded at the border
  foreign: () => [
    { departure: '2026-03-02T08:00:00.000Z', origin: 'LYON PART DIEU', destination: 'GENEVE', amount: '34' },
    { departure: '2026-03-09T08:00:00.000Z', origin: 'GENEVE', destination: 'LYON PART DIEU', amount: '36' },
    { departure: '2026-05-01T08:00:00.000Z', origin: 'PARIS NORD', destination: 'BRUXELLES MIDI', amount: '59' },
    { departure: '2026-06-01T08:00:00.000Z', origin: 'TOKYO SHINJUKU', destination: 'LYON PART DIEU', amount: '199' }, // genuinely unresolvable label: no km, no map
  ],
  // Round-trip tickets: each ticket counts as two trips
  roundtrips: () => [
    { departure: '2026-02-07T08:00:00.000Z', orderDate: '2026-01-10', origin: 'LYON PART DIEU', destination: 'MARSEILLE SAINT CHARLES', roundTrip: true, amount: '58' },
    { departure: '2026-03-14T08:00:00.000Z', orderDate: '2026-03-01', origin: 'LYON PART DIEU', destination: 'PARIS GARE DE LYON', roundTrip: true, amount: '96' },
    { departure: '2026-05-16T08:00:00.000Z', orderDate: '2026-05-16', origin: 'LYON PART DIEU', destination: 'MARSEILLE SAINT CHARLES', roundTrip: true, amount: '61' },
  ],
  // The absolute minimum: a single ticket, ever. Every ranking screen degrades to nothing or a single fact.
  minimal: () => [{ departure: '2026-06-14T08:30:00.000Z', orderDate: '2026-06-01', origin: 'LYON PART DIEU', destination: 'PARIS GARE DE LYON', amount: '45' }],
  // Frequent trips abroad: all in direct connection (referential), so all get real km and a map line cut/faded at the border
  international: () => [
    ...commute('LYON PART DIEU', [['GENEVE', 30], ['LAUSANNE', 38], ['ZURICH HB', 75], ['BRUXELLES MIDI', 90], ['BARCELONE SANTS', 65]], 2024, [2026, 8], 2),
    { departure: '2025-11-14T07:20:00.000Z', orderDate: '2025-10-20', origin: 'PARIS NORD', destination: 'LONDRES ST PANCRAS', amount: '99' },
    { departure: '2025-11-17T18:40:00.000Z', orderDate: '2025-10-20', origin: 'LONDRES ST PANCRAS', destination: 'PARIS NORD', amount: '104' },
  ],
  // Corsica (CFC network): also absent from the SNCF referential, but a fully domestic trip, unlike `foreign`
  corsica: () => commute('AJACCIO', [['BASTIA', 24], ['CORTE', 15], ['CALVI', 28], ['ILE ROUSSE', 22]], 2024, [2026, 8], 2),
  // A regional commuter (Auvergne-Rhône-Alpes) with a single long-distance outlier trip
  'regional-outlier': () => [
    ...commute('SAINT ETIENNE CHATEAUCREUX', [['ROANNE', 9.2], ['LYON PART DIEU', 10.7], ['LE PUY EN VELAY', 17]], 2025, [2026, 8], 3),
    { departure: '2026-05-22T07:00:00.000Z', orderDate: '2026-04-30', origin: 'SAINT ETIENNE CHATEAUCREUX', destination: 'LILLE FLANDRES', amount: '89' },
    { departure: '2026-05-25T19:00:00.000Z', orderDate: '2026-04-30', origin: 'LILLE FLANDRES', destination: 'SAINT ETIENNE CHATEAUCREUX', amount: '92' },
  ],
  // A dozen years of frequent travel across two dozen destinations: volume stress test (thousands of rows)
  huge: () => {
    const home = 'PARIS GARE DE LYON'
    const destinations: [string, number][] = [
      ['LYON PART DIEU', 48],
      ['MARSEILLE SAINT CHARLES', 65],
      ['NANTES', 55],
      ['STRASBOURG', 60],
      ['BORDEAUX SAINT JEAN', 58],
      ['TOULOUSE MATABIAU', 70],
      ['MONTPELLIER SAINT ROCH', 62],
      ['RENNES', 50],
      ['LILLE FLANDRES', 35],
      ['DIJON VILLE', 28],
      ['NICE', 90],
      ['METZ', 45],
      ['TOURS', 30],
      ['REIMS', 25],
      ['CLERMONT FERRAND', 40],
      ['BESANCON VIOTTE', 38],
      ['LIMOGES BENEDICTINS', 42],
      ['CAEN', 32],
      ['LE MANS', 27],
      ['AVIGNON TGV', 55],
      ['PERPIGNAN', 68],
      ['BREST', 60],
      ['GENEVE', 45],
    ]
    const rows: FixtureRow[] = []
    let day = '2014-01-03'
    let n = 0
    while (day < '2026-08-15') {
      const [dest, price] = destinations[n % destinations.length]
      const orderDate = addDays(day, -(1 + (n % 20)))
      const dep = `${day}T${pad(7 + (n % 10))}:${pad((n * 13) % 60)}:00.000Z`
      const returnDay = addDays(day, 1 + (n % 3))
      const ret = `${returnDay}T${pad(16 + (n % 6))}:${pad((n * 7) % 60)}:00.000Z`
      rows.push(
        { orderDate, departure: dep, origin: home, destination: dest, amount: String(price + (n % 7)).replace('.', ',') },
        { orderDate, departure: ret, origin: dest, destination: home, amount: `${price + 1},${n % 9}` },
      )
      n++
      day = addDays(day, 1 + (n % 3))
    }
    return rows
  },
}

const build = profiles[profile]
if (!build) {
  console.error(`Profil inconnu : ${profile}. Profils : ${Object.keys(profiles).join(', ')}`)
  process.exit(1)
}
const rows = build()
writeFileSync(out, toWindows1252(buildSncfCsv(rows)))
console.log(`${rows.length} lignes de billets fictives (profil ${profile}) -> ${out}`)
