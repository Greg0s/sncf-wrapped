import { css } from '../../../lib/css'
import { Roll } from '../Roll'
import type { DisplayData } from '../../../lib/wrapped'

export function Teaser({ d, index }: { d: DisplayData; index: number }) {
  return (
    <section
      data-sec={index}
      data-sec-id="teaser"
      style={css(
        `min-height: 100svh; scroll-snap-align: start; background: #0E1219; display: flex; flex-direction: column; justify-content: center; gap: clamp(14px, 2.6vh, 24px); padding: clamp(58px, 9vh, 96px) clamp(18px, 5vw, 80px) clamp(40px, 7vh, 72px); position: relative; overflow: hidden;`,
      )}
    >
      <svg
        viewBox="0 0 400 110"
        preserveAspectRatio="none"
        style={css(`position: absolute; left: -4%; bottom: 12%; width: 108%; height: auto; opacity: .5; pointer-events: none;`)}
      >
        <path
          data-draw="1"
          d="M4 92 C 64 92, 78 34, 138 42 C 186 49, 180 100, 136 92 C 100 85, 112 34, 164 22 C 232 6, 278 62, 342 46 C 372 38, 386 26, 398 18"
          fill="none"
          stroke="#8DE8FD"
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{ stroke: 'var(--ac)' }}
        />
      </svg>
      <div data-anim="up" style={css(`font-size: 14px; font-weight: 600; color: #8A93A6;`)}>
        {'SNCF Wrapped — '}
        {d.period}
      </div>
      <div
        data-anim="up"
        data-delay="120"
        style={css(
          `font-size: clamp(84px, 26vw, 250px); font-weight: 800; letter-spacing: -.07em; line-height: .82; color: #8DE8FD; color: var(--ac);`,
        )}
      >
        <Roll final={d.big} />
      </div>
      <p
        data-anim="up"
        data-delay="280"
        style={css(`margin: 0; font-size: clamp(20px, 3.4vw, 36px); line-height: 1.2; max-width: 22ch; font-weight: 700; letter-spacing: -.03em;`)}
      >
        Vous avez passé plus de temps sur les rails que vous ne le croyez.
      </p>
      <div data-anim="up" data-delay="440" style={css(`display: flex; align-items: center; gap: 10px; font-size: 13px; color: #8A93A6;`)}>
        <span style={css(`animation: bob 1.8s ease-in-out infinite; display: inline-block;`)}>↓</span>
        {' Faites défiler'}
      </div>
    </section>
  )
}
