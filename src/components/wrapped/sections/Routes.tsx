import { Fragment } from 'react'
import { css } from '../../../lib/css'
import type { RouteRow } from '../../../lib/wrapped'

export function Routes({ routes, heading, index, label }: { routes: RouteRow[]; heading: string; index: number; label?: string | null }) {
  return (
    <section
      data-sec={index}
      data-sec-id="routes"
      style={css(
        `min-height: 100svh; scroll-snap-align: start; background: #0E1219; display: flex; flex-direction: column; justify-content: center; gap: clamp(6px, 1.2vh, 12px); padding: clamp(46px, 7vh, 90px) clamp(14px, 4vw, 60px) clamp(16px, 3vh, 50px); position: relative; overflow: hidden; isolation: isolate;`,
      )}
    >
      <svg
        viewBox="0 0 400 400"
        preserveAspectRatio="none"
        style={css(`position: absolute; inset: 0; width: 100%; height: 100%; opacity: .35; pointer-events: none; z-index: -1;`)}
      >
        <path
          data-draw="0"
          d="M-4 40 C 90 60, 120 150, 180 170 C 232 188, 250 130, 214 118 C 176 106, 170 190, 230 240 C 290 290, 350 280, 404 380"
          fill="none"
          stroke="#8DE8FD"
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{ stroke: 'var(--ac)' }}
        />
      </svg>
      <div data-anim="up" style={css(`font-size: 14px; font-weight: 600; color: #8A93A6; padding-left: 6px;`)}>
        {label}
      </div>
      <h2
        data-anim="up"
        data-delay="80"
        style={css(
          `margin: 0 0 4px; padding-left: 6px; font-size: clamp(23px, 3.8vw, 38px); font-weight: 800; letter-spacing: -.04em; line-height: 1.02; max-width: 22ch;`,
        )}
      >
        {heading}
      </h2>
      <div style={css(`display: flex; flex-direction: column; gap: 6px; max-width: 920px; width: 100%;`)}>
        {routes.map((r, i) => (
          <Fragment key={i}>
            <div
              data-anim="up"
              data-delay={140 + i * 60}
              style={css(
                `background: #1B2130; border-radius: 20px; padding: clamp(7px, 1.2vh, 14px) clamp(14px, 2.6vw, 22px); display: flex; flex-wrap: wrap; gap: 8px clamp(12px, 2.6vw, 24px); align-items: center;`,
              )}
            >
              <span style={css(`font-size: 13px; color: #6C768A; font-weight: 600; flex: 0 0 auto;`)}>{r.rank}</span>
              <div style={css(`flex: 1 1 150px; min-width: 0; display: flex; align-items: center; gap: 8px;`)}>
                <span style={css(`width: 9px; height: 9px; border-radius: 50%; background: #8DE8FD; flex: 0 0 auto; background: var(--ac);`)} />
                <span
                  style={css(
                    `flex: 1 1 auto; min-width: 14px; height: 1.5px; border-radius: 2px; background-image: repeating-linear-gradient(90deg, rgba(241,244,247,.55) 0 4px, transparent 4px 9px);`,
                  )}
                />
                <span
                  style={css(`width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid #8DE8FD; flex: 0 0 auto; border-color: var(--ac);`)}
                />
              </div>
              <div style={css(`flex: 2 1 240px; min-width: 0;`)}>
                <div
                  style={css(
                    `font-size: clamp(16px, 2.1vw, 21px); font-weight: 700; letter-spacing: -.025em; line-height: 1.2; overflow-wrap: anywhere;`,
                  )}
                >
                  {r.label}
                </div>
                {r.meta && <div style={css(`font-size: 12px; color: #8A93A6; margin-top: 5px;`)}>{r.meta}</div>}
              </div>
              <div style={css(`flex: 0 0 auto; text-align: right;`)}>
                <div style={css(`font-size: clamp(19px, 2.8vw, 30px); font-weight: 800; letter-spacing: -.04em; color: #8DE8FD; color: var(--ac);`)}>
                  {r.count}
                </div>
                <div style={css(`font-size: 11px; color: #8A93A6;`)}>{r.countLabel}</div>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  )
}
