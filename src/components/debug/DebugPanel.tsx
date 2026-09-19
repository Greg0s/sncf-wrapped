import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CARD_TOP,
  MONTHS_FR,
  WEEKDAYS_FR,
  computeWrappedStats,
  importSncfCsv,
  type ImportResult,
  type Period,
  type TripHighlight,
} from '../../lib/parsing'
import './debug.css'

// Panneau de validation des calculs (étape 3) : affiche, écran par écran de la maquette, les valeurs calculées
// à partir du CSV. Tout reste dans le navigateur : le fichier est lu via l'API File, jamais envoyé.

const fmt = (n: number | null | undefined, digits = 0) =>
  n == null ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const eur = (n: number | null | undefined) => (n == null ? '—' : `${fmt(n, 2)} €`)
const keyOf = (p: Period) => (p.kind === 'all' ? 'all' : String(p.year))
const monthLabel = (m: string) => `${MONTHS_FR[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`
const DAY_PART = { night: 'de nuit', morning: 'le matin', afternoon: "l'après-midi", evening: 'le soir' } as const

function describeTicket(h: TripHighlight | null): string {
  if (!h) return '—'
  const when = `${WEEKDAYS_FR[h.weekday]}${h.partOfDay ? ` ${DAY_PART[h.partOfDay]}` : ''}, ${h.date}`
  return `${eur(h.priceEur)} — ${h.from} → ${h.to}, ${when}${h.roundTrip ? ' (aller-retour)' : ''}`
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="dbg-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{children}</td>
    </tr>
  )
}

const Estimate = () => <span className="dbg-tag dbg-tag--estimate">estimation</span>
const Missing = ({ children = 'non disponible dans le CSV' }: { children?: ReactNode }) => <span className="dbg-tag dbg-tag--missing">{children}</span>

export function DebugPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [includeOptions, setIncludeOptions] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    // eslint-disable-next-line react/set-state-in-effect -- reset avant le parsing asynchrone du fichier
    setResult(null)
    void importSncfCsv(file, { includeOptions }).then((r) => {
      if (!cancelled) setResult(r)
    })
    return () => {
      cancelled = true
    }
  }, [file, includeOptions])

  const ok = result?.ok ? result : null
  const period = ok ? (ok.periods.find((p) => keyOf(p.period) === selected) ?? ok.periods[0])?.period : undefined
  const stats = useMemo(() => (ok && period ? computeWrappedStats(ok.dataset, period) : null), [ok, period])

  return (
    <main className="dbg">
      <header>
        <h1>Debug — validation des calculs</h1>
        <p className="dbg-muted">
          Le fichier est lu dans votre navigateur ; il n'est ni envoyé, ni stocké. Ce panneau sert uniquement à vérifier les chiffres avant de les brancher
          sur les écrans.
        </p>
        <label className="dbg-file">
          <span>Choisir l'export SNCF Connect (.csv)</span>
          <input type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setSelected(null) }} />
        </label>
        {file && <p className="dbg-muted">{file.name} — {fmt(file.size / 1024, 1)} Ko</p>}
      </header>

      {file && !result && <p>Analyse en cours…</p>}

      {result && !result.ok && (
        <p role="alert" className="dbg-error">
          Import impossible ({result.error.code}) : {result.error.message}
        </p>
      )}

      {ok && stats && (
        <>
          <Section title="Ce que le CSV ne contient pas">
            <ul className="dbg-list">
              <li><b>Retard</b> <Missing /> : aucune colonne de retard/ponctualité (et aucun écran « retard » dans la maquette v3).</li>
              <li><b>Distance</b> <Missing /> : calculée à vol d'oiseau entre les gares (coordonnées SNCF Open Data) × {stats.distance.detourFactor} de détour <Estimate />.</li>
              <li><b>Durée</b> <Missing /> : seule l'heure de départ figure dans le fichier, donc pas de « h à bord » ni de durée moyenne par itinéraire.</li>
            </ul>
          </Section>

          <Section title="Lecture du fichier">
            <table className="dbg-kv">
              <tbody>
                <Row label="Encodage détecté">{ok.encoding}</Row>
                <Row label="Section">{ok.report.sectionTitle ?? '—'}</Row>
                <Row label="Colonnes">{ok.report.columns.filter((c) => c !== 'email').join(' · ')}</Row>
                <Row label="Lignes de billets">{ok.report.ticketRows}</Row>
                <Row label="Options non payées">
                  {ok.report.optionRows} {includeOptions ? 'incluses' : 'exclues'}{' '}
                  <label className="dbg-inline">
                    <input type="checkbox" checked={includeOptions} onChange={(e) => setIncludeOptions(e.target.checked)} /> les inclure
                  </label>
                </Row>
                <Row label="Lignes illisibles">{ok.report.skipped.length}</Row>
                <Row label="Billets fusionnés">{ok.report.mergedTickets} (billet TER + TGV d'un même voyage, ou échange)</Row>
                <Row label="Trajets reconstitués">
                  {ok.dataset.trips.length + ok.dataset.upcoming.length}, dont {ok.dataset.upcoming.length} à venir (exclus)
                </Row>
                <Row label="Modes de paiement">{Object.entries(ok.report.paymentModes).map(([k, v]) => `${k} : ${v}`).join(' · ')}</Row>
                <Row label="Données du">{ok.dataset.firstDate} au {ok.dataset.dataEnd}</Row>
              </tbody>
            </table>
            <details>
              <summary>Gares rattachées par approximation ({ok.dataset.approximatedPlaces.length}) et sans coordonnées ({ok.dataset.unresolvedPlaces.length})</summary>
              <table className="dbg-table">
                <thead><tr><th>Libellé du CSV</th><th>Rattaché à</th><th>Méthode</th><th>Occurrences</th></tr></thead>
                <tbody>
                  {[...ok.dataset.approximatedPlaces, ...ok.dataset.unresolvedPlaces].map((p) => (
                    <tr key={p.raw}><td>{p.raw}</td><td>{p.matchedAs ?? <Missing>aucune coordonnée</Missing>}</td><td>{p.via}</td><td>{p.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
            <details>
              <summary>Voyages issus de plusieurs billets ({ok.dataset.trips.filter((t) => t.refs.length > 1).length})</summary>
              <table className="dbg-table">
                <thead><tr><th>Départ</th><th>Trajet</th><th>Billets</th><th>Montant cumulé</th></tr></thead>
                <tbody>
                  {ok.dataset.trips.filter((t) => t.refs.length > 1).map((t) => (
                    <tr key={t.key}><td>{t.departureDate} {t.departureTime}</td><td>{t.origin} → {t.destination}</td><td>{t.refs.length}</td><td>{eur(t.priceEur)}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          </Section>

          <div className="dbg-periods" role="tablist" aria-label="Période">
            {ok.periods.map((p) => (
              <button key={keyOf(p.period)} role="tab" aria-selected={keyOf(p.period) === keyOf(stats.period)} onClick={() => setSelected(keyOf(p.period))}>
                {p.period.kind === 'all' ? 'Toutes les années' : p.period.year} <small>{p.tripCount} trajets</small>
              </button>
            ))}
          </div>

          <Section title={`00 — Teaser · ${stats.display.period}`}>
            <table className="dbg-kv">
              <tbody>
                <Row label="Texte de période">{stats.display.period}</Row>
                <Row label="Grand chiffre">{stats.display.big} <small className="dbg-muted">(carte à partager : {stats.display.bigStart} / {stats.display.bigEnd})</small></Row>
                <Row label="Période couverte">{stats.from} → {stats.to}</Row>
              </tbody>
            </table>
          </Section>

          <Section title="01 — Kilomètres">
            <table className="dbg-kv">
              <tbody>
                <Row label="Km parcourus">{fmt(stats.distance.estimatedKm)} km <Estimate /> <small className="dbg-muted">(à vol d'oiseau : {fmt(stats.distance.straightLineKm)} km × {stats.distance.detourFactor})</small></Row>
                <Row label="Trajets">{stats.tripCount} <small className="dbg-muted">({stats.bookingCount} voyages, {stats.quality.roundTripBookings} aller-retour comptés 2 fois)</small></Row>
                <Row label="Km par trajet">{fmt(stats.distance.kmPerTrip)} km <Estimate /></Row>
                <Row label="Équivalent Terre">{fmt(stats.distance.earthLaps, 2)} tour de la Terre</Row>
                <Row label="« h à bord »"><Missing /></Row>
                <Row label="Distance connue pour">{stats.distance.coveredTrips} trajets sur {stats.tripCount} ({stats.distance.uncoveredTrips} sans distance)</Row>
                <Row label="Étoile (ville de base + 4 destinations)">{stats.hub?.name ?? '—'} ← {stats.destinations.items.slice(0, 4).map((d) => d.city.name).join(', ') || '—'}</Row>
              </tbody>
            </table>
          </Section>

          <Section title="02 — Budget">
            <table className="dbg-kv">
              <tbody>
                <Row label="Total dépensé">{eur(stats.spend.totalEur)} <small className="dbg-muted">(montant brut du CSV, hors remboursements éventuels)</small></Row>
                <Row label="Moyenne / trajet">{eur(stats.spend.avgPerTripEur)}</Row>
                <Row label="Par mois">{eur(stats.spend.perMonthEur)} <small className="dbg-muted">(sur {stats.spend.monthsSpan} mois de données)</small></Row>
                <Row label="Billet le plus cher">{describeTicket(stats.spend.priciest)}</Row>
                <Row label="Billet le moins cher">{describeTicket(stats.spend.cheapest)} <small className="dbg-muted">(hors 0 € : {stats.quality.freeBookings} voyage(s) gratuit(s))</small></Row>
                <Row label="Mois le plus cher">{stats.spend.priciestMonth ? `${monthLabel(stats.spend.priciestMonth.month)} — ${eur(stats.spend.priciestMonth.totalEur)}` : '—'}</Row>
              </tbody>
            </table>
          </Section>

          <Section title="03 — Top destinations">
            <p className="dbg-muted">
              {stats.destinations.items.length} affichée(s) sur {stats.destinations.totalDistinct} destinations distinctes · présentation « {stats.destinations.mode} » ·
              ville de base exclue : {stats.hub?.name ?? '—'} ({stats.hub?.appearances ?? 0} passages)
            </p>
            <table className="dbg-table">
              <thead><tr><th>#</th><th>Ville</th><th>Visites</th><th>Barre</th></tr></thead>
              <tbody>
                {stats.destinations.items.map((d, i) => (
                  <tr key={d.city.key}><td>{i + 1}</td><td>{d.city.name}</td><td>{d.visits}</td><td>{d.pct} %</td></tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="04 — Top itinéraires">
            <p className="dbg-muted">
              {stats.routes.items.length} affiché(s) sur {stats.routes.totalDistinct} itinéraires distincts · présentation « {stats.routes.mode} » · deux sens confondus
            </p>
            <table className="dbg-table">
              <thead><tr><th>#</th><th>Itinéraire</th><th>Gares les plus utilisées</th><th>Trajets</th><th>Km</th><th>Dépensé</th></tr></thead>
              <tbody>
                {stats.routes.items.map((r, i) => (
                  <tr key={r.key}><td>{i + 1}</td><td>{r.label}</td><td>{r.stations.join(' ↔ ')}</td><td>{r.trips}</td><td>{fmt(r.km)} <Estimate /></td><td>{eur(r.totalEur)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="dbg-muted">Durée moyenne par itinéraire : <Missing /></p>
          </Section>

          <Section title="05 — Anticipation">
            {stats.anticipation ? (
              <table className="dbg-kv">
                <tbody>
                  <Row label="Réservation en moyenne">{fmt(stats.anticipation.averageDays, 1)} jours avant le départ <small className="dbg-muted">({stats.anticipation.tripsConsidered} voyages)</small></Row>
                  <Row label="Achats le jour même">{stats.anticipation.sameDayCount}</Row>
                  <Row label="Le plus tardif / le plus anticipé">{stats.anticipation.minDays} j / {stats.anticipation.maxDays} j</Row>
                  <Row label="Vous réservez surtout le">{stats.anticipation.bookingWeekday ? `${WEEKDAYS_FR[stats.anticipation.bookingWeekday.weekday]} (${stats.anticipation.bookingWeekday.count} commandes)` : '—'}</Row>
                </tbody>
              </table>
            ) : (
              <p className="dbg-muted">Pas de date de commande exploitable.</p>
            )}
          </Section>

          <Section title="06 — Carte des trajets">
            <p className="dbg-muted">Positions (x, y) dans le viewBox du SVG de la maquette, obtenues par projection lat/lon.</p>
            <table className="dbg-table">
              <thead><tr><th>Itinéraire</th><th>A (x, y)</th><th>B (x, y)</th></tr></thead>
              <tbody>
                {stats.routes.items.map((r) => (
                  <tr key={r.key}>
                    <td>{r.label}</td>
                    <td>{r.cityA.x == null ? '—' : `${fmt(r.cityA.x, 1)}, ${fmt(r.cityA.y, 1)}`}</td>
                    <td>{r.cityB.x == null ? '—' : `${fmt(r.cityB.x, 1)}, ${fmt(r.cityB.y, 1)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <details>
              <summary>Chronologie mensuelle ({stats.timeline.length} mois)</summary>
              <table className="dbg-table">
                <thead><tr><th>Mois</th><th>Trajets</th><th>Km</th><th>Dépensé</th></tr></thead>
                <tbody>
                  {stats.timeline.map((m) => (
                    <tr key={m.month}><td>{monthLabel(m.month)}</td><td>{m.trips}</td><td>{fmt(m.km)}</td><td>{eur(m.spendEur)}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          </Section>

          <Section title="07 — Carte à partager">
            <table className="dbg-kv">
              <tbody>
                <Row label={`Top villes (${Math.min(CARD_TOP, stats.destinations.totalDistinct)})`}>{stats.destinations.items.slice(0, CARD_TOP).map((d, i) => `N°${i + 1} ${d.city.name}`).join(' · ') || '—'}</Row>
                <Row label={`Top trajets (${Math.min(CARD_TOP, stats.routes.totalDistinct)})`}>{stats.routes.items.slice(0, CARD_TOP).map((r, i) => `N°${i + 1} ${r.label}`).join(' · ') || '—'}</Row>
                <Row label="Kilomètres / Budget">{fmt(stats.distance.estimatedKm)} / {fmt(stats.spend.totalEur)} €</Row>
              </tbody>
            </table>
          </Section>

          <details className="dbg-section">
            <summary>JSON complet de la période</summary>
            <pre>{JSON.stringify(stats, null, 2)}</pre>
          </details>
        </>
      )}
    </main>
  )
}
