import { Fragment, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { css } from '../../../lib/css'
import { evaluateMap, showsOutline, type MapModel } from '../../../lib/wrapped'
import { CORSICA_OUTLINE, FRANCE_OUTLINE } from '../franceOutline'

/** Animation control by the parent screen: play when the section becomes visible, reset when it leaves. */
export interface MapHandle {
  play: () => void
  stop: () => void
}

const TICK_COLORS = { done: 'var(--ac)', current: 'color-mix(in srgb, var(--ac) 50%, transparent)', todo: 'rgba(241,244,247,.14)' }

export function RoutesMap({ index, label, model, mapRef }: { index: number; label?: string | null; model: MapModel; mapRef?: Ref<MapHandle> }) {
  const [p, setP] = useState(0)
  const raf = useRef(0)
  const months = model.months.length

  const stop = () => {
    cancelAnimationFrame(raf.current)
    setP(0)
  }
  const play = () => {
    cancelAnimationFrame(raf.current)
    // Each month plays for its own duration (see `monthDurationsMs`): boundaries[i] is the elapsed
    // time (ms) at which month i ends, so a given elapsed time falls in exactly one month's span.
    const durations = model.monthDurationsMs
    const boundaries = durations.reduce<number[]>((acc, d) => [...acc, acc[acc.length - 1] + d], [0])
    const total = boundaries[boundaries.length - 1]
    const t0 = performance.now()
    const step = (now: number) => {
      // rAF can provide a timestamp earlier than t0 on the first frame: we clamp elapsed to [0, total].
      const elapsed = Math.min(total, Math.max(0, now - t0))
      let i = 0
      while (i < durations.length - 1 && elapsed >= boundaries[i + 1]) i++
      const frac = durations[i] > 0 ? (elapsed - boundaries[i]) / durations[i] : 1
      setP(Math.min(months, i + frac))
      if (elapsed < total) raf.current = requestAnimationFrame(step)
    }
    setP(0)
    raf.current = requestAnimationFrame(step)
  }
  useImperativeHandle(mapRef, () => ({ play, stop }))
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const state = evaluateMap(model, p)
  const { frame } = model
  const hub = model.cities.find((c) => c.isHub)
  const mapTicks = state.ticks.map((t) => ({ color: TICK_COLORS[t] }))
  const { recentTrips: mapRecentTrips, arcs: mapArcs, dots: mapDots, labels: mapLabels, km: mapKm, phase: mapPhase } = state

  return (
    <section
      data-sec={index}
      data-sec-id="map"
      style={css(
        `min-height: 100svh; scroll-snap-align: start; background: #0E1219; display: flex; flex-direction: column; justify-content: center; gap: clamp(8px, 1.4vh, 14px); padding: clamp(46px, 7vh, 90px) clamp(14px, 4vw, 60px) clamp(16px, 3vh, 50px);`,
      )}
    >
      <div data-anim="up" style={css(`font-size: 14px; font-weight: 600; color: #8A93A6; padding-left: 6px;`)}>
        {label}
      </div>
      <div
        data-anim="scale"
        data-delay="90"
        style={css(
          `background: #1B2130; border-radius: 28px; padding: clamp(14px, 2.6vw, 26px); display: flex; flex-wrap: wrap; gap: clamp(14px, 3vw, 30px); align-items: center; max-width: 960px; width: 100%;`,
        )}
      >
        <div style={css(`flex: 1 1 230px; min-width: 0; display: flex; flex-direction: column; gap: 13px; order: 2;`)}>
          <div>
            <div style={css(`font-size: 13px; color: #8A93A6; margin-bottom: 4px;`)}>{mapPhase}</div>
            <div style={css(`font-size: clamp(26px, 5vw, 42px); font-weight: 800; letter-spacing: -.04em; line-height: 1;`)}>
              {mapKm} <span style={css(`font-size: .5em; font-weight: 700;`)}>km</span>
            </div>
          </div>
          <div style={css(`display: flex; flex-direction: column; gap: 7px;`)}>
            {mapRecentTrips.map((t, i) => (
              <Fragment key={i}>
                <div style={css(`display: flex; align-items: center; gap: 10px;`)}>
                  <span style={css(`width: 6px; height: 6px; flex: 0 0 auto; border-radius: 999px; background: var(--ac);`)} />
                  <span style={css(`flex: 1 1 auto; min-width: 0; font-size: 14px; font-weight: 600; overflow-wrap: anywhere;`)}>{t.label}</span>
                  <span style={css(`flex: 0 0 auto; font-size: 13px; color: #8A93A6;`)}>{t.date}</span>
                </div>
              </Fragment>
            ))}
          </div>
          <div style={css(`display: flex; gap: 3px; padding-top: 2px;`)}>
            {mapTicks.map((k, i) => (
              <Fragment key={i}>
                <div style={css(`flex: 1 1 0; height: 3px; border-radius: 999px; background: ${k.color};`)} />
              </Fragment>
            ))}
          </div>
          <button
            type="button"
            onClick={play}
            style={css(
              `align-self: flex-start; font-family: 'Schibsted Grotesk', sans-serif; font-size: 13px; font-weight: 600; color: #F1F4F7; background: #262E40; border: none; border-radius: 999px; padding: 9px 16px; cursor: pointer; transition: background .2s ease;`,
            )}
            className="hv-bg-333D54"
          >
            Rejouer
          </button>
        </div>
        <div style={css(`flex: 1 1 250px; min-width: 190px; display: flex; justify-content: center; order: 1;`)}>
          <svg
            viewBox={`${frame.x} ${frame.y} ${frame.size} ${frame.size}`}
            preserveAspectRatio="xMidYMid meet"
            style={css(`width: 100%; max-width: 340px; height: clamp(190px, 36vh, 320px);`)}
          >
            {(model.regionOutline ? [model.regionOutline] : showsOutline(frame) ? [FRANCE_OUTLINE, CORSICA_OUTLINE] : []).map((points) => (
              <polyline key={points} points={points} fill="none" stroke="rgba(241,244,247,.18)" strokeWidth={1.2 * frame.k} strokeLinejoin="round" />
            ))}
            {mapArcs.map((a, i) => (
              <path
                key={i}
                d={a.d}
                fill="none"
                style={{ stroke: 'var(--ac)' }}
                strokeWidth={a.w}
                strokeLinecap="round"
                opacity={a.o}
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={a.off}
              />
            ))}
            {mapDots.map((c, i) => (
              <circle key={i} cx={c.x} cy={c.y} r={c.r} style={{ fill: 'var(--ac)' }} opacity={c.o} />
            ))}
            {hub && (
              <circle
                cx={hub.x}
                cy={hub.y}
                r={9 * frame.k}
                fill="none"
                style={{ stroke: 'var(--ac)', transformBox: 'fill-box', transformOrigin: 'center', animation: 'ping 2.8s ease-out infinite' }}
                strokeWidth={frame.k}
              />
            )}
            {mapLabels.map((t, i) => (
              <text
                key={i}
                x={t.x}
                y={t.y}
                textAnchor={t.anchor}
                fill="#F1F4F7"
                opacity={t.o}
                fontFamily="Schibsted Grotesk, sans-serif"
                fontSize={t.fontSize}
                fontWeight="600"
              >
                {t.name}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </section>
  )
}
