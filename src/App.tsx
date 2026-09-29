import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { DataRequestPage } from './components/data/DataRequestPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DebugPanel } from './components/debug/DebugPanel'
import { ImportModal, type ImportPeriod, type ImportStatus } from './components/landing/ImportModal'
import { Landing } from './components/landing/Landing'
import { LegalPage } from './components/legal/LegalPage'
import { Wrapped } from './components/wrapped/Wrapped'
import { computeWrappedStats, importSncfCsv, type ImportResult, type ParseError } from './lib/parsing'
import { applyHead, pathOf, routeOf, type Route } from './lib/routes'
import { ACCENTS, accentFor, buildWrappedView, plural } from './lib/wrapped'

type View = Route | 'wrapped'
type Imported = Extract<ImportResult, { ok: true }>

const NO_TRIPS = "Aucun trajet effectué dans ce fichier : il ne contient que des départs à venir ou des réservations non payées."
const errorMessage = (e: ParseError) => (e.code === 'no-valid-rows' ? NO_TRIPS : e.message)

/** `?debug` opens the calculation panel. Always false when prerendering (no `window` at build time). */
export const isDebug = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')

/**
 * Journey: landing → CSV import (read in the browser) → wrapped. State lives only in memory: nothing is
 * sent or stored (no localStorage, no request). The calculation validation panel stays reachable
 * via ?debug. The landing, data-request and legal pages have their own URLs (`lib/routes.ts`); the wrapped
 * view doesn't, so it can never be deep-linked. `route` is the page to render when prerendering (no `window`).
 */
export default function App({ route = 'landing' }: { route?: Route }) {
  const [session, setSession] = useState(0) // remounting the journey also clears imported data
  if (isDebug()) return <DebugPanel />
  return (
    <ErrorBoundary onReset={() => setSession((n) => n + 1)}>
      <Journey key={session} route={route} />
    </ErrorBoundary>
  )
}

function Journey({ route }: { route: Route }) {
  // In the browser, the URL decides; it matches the prerendered file served for it, so hydration agrees.
  const [view, setView] = useState<View>(() => (typeof window === 'undefined' ? route : routeOf(window.location.pathname)))
  const [modal, setModal] = useState(false)
  const [status, setStatus] = useState<ImportStatus>({ status: 'idle' })
  const [imported, setImported] = useState<Imported | null>(null)
  const [periodIndex, setPeriodIndex] = useState(0)
  const request = useRef(0) // ignore the response for a file that was replaced in the meantime

  const hasWrapped = useRef(false)
  useEffect(() => {
    hasWrapped.current = imported !== null
  }, [imported])

  useEffect(() => {
    window.scrollTo(0, 0)
    if (view !== 'wrapped') applyHead(view)
  }, [view])

  // Back/forward. The wrapped view has its own history entry at the landing's URL (see openWrapped), so
  // "back" from it returns to the landing; forward only restores it while its data is still in memory.
  useEffect(() => {
    const onPop = () => {
      setView(history.state?.wrapped && hasWrapped.current ? 'wrapped' : routeOf(window.location.pathname))
      setModal(false)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

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
  const periodAccent = period ? accentFor(period, periodIndex) : ACCENTS[0]
  // The period accent is a wrapped-only flourish: every other screen keeps the default accent.
  const accent = view === 'wrapped' ? periodAccent : ACCENTS[0]
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

  const go = (to: Route) => {
    if (window.location.pathname !== pathOf(to)) history.pushState(null, '', pathOf(to))
    setView(to)
    setModal(false)
  }
  const openData = () => go('data')
  const openLegal = () => go('legal')
  const backHome = () => go('landing')
  const openWrapped = () => {
    history.pushState({ wrapped: true }, '', pathOf('landing'))
    setView('wrapped')
    setModal(false)
  }
  const closeModal = () => setModal(false)

  return (
    <div style={{ '--ac': accent } as CSSProperties}>
      {view === 'landing' && (
        <Landing
          openData={openData}
          openLegal={openLegal}
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
                onGo={openWrapped}
                onNoData={openData}
              />
            )
          }
        />
      )}
      {view === 'data' && (
        <DataRequestPage backHome={backHome} openLegal={openLegal} />
      )}
      {view === 'legal' && <LegalPage backHome={backHome} />}
      {view === 'wrapped' && wrappedView && (
        // Keyed by period: switching period from inside the wrapped remounts the whole scrollytelling
        // journey (fresh scroll position, reveal animations, map player) instead of patching it in place.
        <Wrapped key={periodIndex} view={wrappedView} onBack={() => history.back()} periods={periods} />
      )}
    </div>
  )
}
