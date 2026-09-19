import { useRef } from 'react'
import { css } from '../../lib/css'
import type { SectionMeta, WrappedView } from '../../lib/wrapped'
import { Anticipation } from './sections/Anticipation'
import { Budget } from './sections/Budget'
import { Cities } from './sections/Cities'
import { Kilometers } from './sections/Kilometers'
import { Recap } from './sections/Recap'
import { Routes } from './sections/Routes'
import { RoutesMap, type MapHandle } from './sections/RoutesMap'
import { Teaser } from './sections/Teaser'
import { useStoryTapNavigation, useWrappedScroll } from './useReveal'

/**
 * Wrapped: the mockup's screens, in vertical scroll-snap, fed by the display model.
 * Screens with no data are absent from `view.sections`; the progress bar follows their actual count.
 */
export function Wrapped({ view, onBack }: { view: WrappedView; onBack: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapHandle>(null)

  useWrappedScroll(rootRef, (event) => mapRef.current?.[event]())
  useStoryTapNavigation(scrollerRef)
  const replay = () => scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  const section = (s: SectionMeta, i: number) => {
    switch (s.id) {
      case 'teaser':
        return <Teaser key={s.id} d={view.d} index={i} />
      case 'km':
        return <Kilometers key={s.id} d={view.d} star={view.star} index={i} label={s.label} />
      case 'budget':
        return <Budget key={s.id} d={view.d} index={i} label={s.label} />
      case 'cities':
        return <Cities key={s.id} cities={view.cities} heading={view.citiesHeading} index={i} label={s.label} />
      case 'routes':
        return <Routes key={s.id} routes={view.routes} heading={view.routesHeading} index={i} label={s.label} />
      case 'anticipation':
        return <Anticipation key={s.id} d={view.d} index={i} label={s.label} />
      case 'map':
        return view.map ? <RoutesMap key={s.id} model={view.map} mapRef={mapRef} index={i} label={s.label} /> : null
      case 'recap':
        return <Recap key={s.id} view={view} index={i} label={s.label} replay={replay} />
    }
  }

  return (
    <div ref={rootRef} style={css(`position: relative; background: #0E1219;`)}>
      <div
        style={css(`position: fixed; top: 0; left: 0; right: 0; z-index: 20; display: flex; align-items: center; gap: 12px; padding: 12px clamp(12px, 4vw, 44px);`)}
      >
        <button
          type="button"
          onClick={onBack}
          style={css(
            `font-family: 'Schibsted Grotesk', sans-serif; font-size: 13px; font-weight: 600; color: #F1F4F7; background: rgba(27,33,48,.85); backdrop-filter: blur(6px); border: none; border-radius: 999px; padding: 9px 16px; cursor: pointer; flex: 0 0 auto;`,
          )}
        >
          ← Retour
        </button>
        <div style={css(`display: flex; gap: 4px; flex: 1 1 auto;`)}>
          {view.sections.map((s, i) => (
            <div key={s.id} data-seg={i} style={css(`height: 3px; flex: 1; border-radius: 999px; background: rgba(241,244,247,.22); transition: background .4s;`)} />
          ))}
        </div>
      </div>
      <div
        ref={scrollerRef}
        data-scroller="true"
        style={css(
          `height: 100svh; overflow-y: auto; overflow-x: hidden; scroll-snap-type: y mandatory; scroll-behavior: smooth; -webkit-overflow-scrolling: touch;`,
        )}
      >
        {view.sections.map(section)}
      </div>
    </div>
  )
}
