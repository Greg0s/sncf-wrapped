import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { DataRequestPage } from './components/data/DataRequestPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DebugPanel } from './components/debug/DebugPanel'
import { ImportModal, type ImportPeriod, type ImportStatus } from './components/landing/ImportModal'
import { Landing } from './components/landing/Landing'
import { Wrapped } from './components/wrapped/Wrapped'
import { computeWrappedStats, importSncfCsv, type ImportResult, type ParseError } from './lib/parsing'
import { ACCENTS, accentFor, buildWrappedView, plural } from './lib/wrapped'

type View = 'landing' | 'data' | 'wrapped'
type Imported = Extract<ImportResult, { ok: true }>

const NO_TRIPS = "Aucun trajet effectué dans ce fichier : il ne contient que des départs à venir ou des réservations non payées."
const errorMessage = (e: ParseError) => (e.code === 'no-valid-rows' ? NO_TRIPS : e.message)

/**
 * Parcours : landing → import du CSV (lu dans le navigateur) → wrapped. L'état ne vit qu'en mémoire : rien n'est
 * envoyé ni stocké (pas de localStorage, pas de requête). Le panneau de validation des calculs reste accessible
 * via ?debug.
 */
export default function App() {
  const [session, setSession] = useState(0) // remonter le parcours vide aussi les données importées
  if (new URLSearchParams(window.location.search).has('debug')) return <DebugPanel />
  return (
    <ErrorBoundary onReset={() => setSession((n) => n + 1)}>
      <Journey key={session} />
    </ErrorBoundary>
  )
}

function Journey() {
  const [view, setView] = useState<View>('landing')
  const [modal, setModal] = useState(false)
  const [status, setStatus] = useState<ImportStatus>({ status: 'idle' })
  const [imported, setImported] = useState<Imported | null>(null)
  const [periodIndex, setPeriodIndex] = useState(0)
  const request = useRef(0) // ignore la réponse d'un fichier remplacé entre-temps

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  const handleFile = async (file: File) => {
    const id = ++request.current
    setStatus({ status: 'reading', fileName: file.name })
    let result: ImportResult
    try {
      result = await importSncfCsv(file)
    } catch {
      if (id === request.current) setStatus({ status: 'error', message: "Une erreur est survenue à la lecture de ce fichier. Réessayez, ou vérifiez qu'il s'agit bien de l'export SNCF Connect." })
      return
    }
    if (id !== request.current) return
    if (!result.ok || result.periods.length === 0) {
      setImported(null)
      setStatus({ status: 'error', message: result.ok ? NO_TRIPS : errorMessage(result.error) })
      return
    }
    const years = result.periods.filter((p) => p.period.kind === 'year').length
    const trips = (result.periods.find((p) => p.period.kind === 'all') ?? result.periods[0]).tripCount
    const upcoming = result.dataset.upcoming.length
    setImported(result)
    setPeriodIndex(0)
    setStatus({
      status: 'loaded',
      fileName: file.name,
      summary:
        `${trips} ${plural(trips, 'trajet', 'trajets')} · ${years} ${plural(years, 'année détectée', 'années détectées')}` +
        (upcoming ? ` · ${upcoming} ${plural(upcoming, 'départ à venir ignoré', 'départs à venir ignorés')}` : ''),
    })
  }

  const period = imported?.periods[periodIndex]?.period
  const accent = period ? accentFor(period, periodIndex) : ACCENTS[0]
  const wrappedView = useMemo(() => (imported && period ? buildWrappedView(computeWrappedStats(imported.dataset, period)) : null), [imported, period])

  const periods: ImportPeriod[] = (imported?.periods ?? []).map((p, i) => {
    const on = i === periodIndex
    const years = imported!.periods.flatMap((o) => (o.period.kind === 'year' ? [o.period.year] : []))
    return {
      label: p.period.kind === 'year' ? String(p.period.year) : 'Toutes les années',
      sub:
        (p.period.kind === 'year' ? '' : `${Math.min(...years)} → ${Math.max(...years)} · `) + `${p.tripCount} ${plural(p.tripCount, 'trajet', 'trajets')}`,
      ac: accentFor(p.period, i),
      mark: on ? '●' : '',
      bd: on ? '#F1F4F7' : 'rgba(241,244,247,.18)',
      bg: on ? '#262E40' : 'transparent',
      pick: () => setPeriodIndex(i),
    }
  })

  const openData = () => {
    setView('data')
    setModal(false)
  }
  const closeModal = () => setModal(false)

  return (
    <div style={{ '--ac': accent } as CSSProperties}>
      {view === 'landing' && (
        <Landing
          openData={openData}
          openImport={() => setModal(true)}
          modal={
            modal && (
              <ImportModal
                state={status}
                periods={periods}
                onFile={(file) => void handleFile(file)}
                onClose={closeModal}
                onReset={() => {
                  request.current++
                  setImported(null)
                  setStatus({ status: 'idle' })
                }}
                onGo={() => {
                  setView('wrapped')
                  setModal(false)
                }}
              />
            )
          }
        />
      )}
      {view === 'data' && (
        <DataRequestPage
          backHome={() => setView('landing')}
          goImport={() => {
            setView('landing')
            setModal(true)
          }}
        />
      )}
      {view === 'wrapped' && wrappedView && <Wrapped view={wrappedView} onBack={() => setView('landing')} />}
    </div>
  )
}
