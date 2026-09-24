import { Fragment } from 'react'
import { css } from '../../../lib/css'
import type { CityRow } from '../../../lib/wrapped'

export function Cities({ cities, heading, index, label }: { cities: CityRow[]; heading: string; index: number; label?: string | null }) {
  return (
    <section
      data-sec={index}
      data-sec-id="cities"
      style={css(
        `min-height: 100svh; scroll-snap-align: start; background: #0E1219; display: flex; flex-direction: column; justify-content: center; gap: clamp(8px, 1.4vh, 14px); padding: clamp(46px, 7vh, 90px) clamp(14px, 4vw, 60px) clamp(16px, 3vh, 50px); position: relative; overflow: hidden; isolation: isolate;`,
      )}
    >
      <svg
        viewBox="0 0 110 400"
        preserveAspectRatio="none"
        style={css(`position: absolute; right: 11%; top: -4%; height: 108%; width: clamp(80px, 18vw, 220px); opacity: .45; pointer-events: none; z-index: -1;`)}
      >
        <path
          data-draw="0"
          d="M20 4 C 20 64, 90 80, 80 136 C 72 184, 22 176, 30 140 C 38 104, 96 118, 90 190 C 84 260, 30 280, 46 340 C 54 370, 80 386, 92 398"
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
          `margin: 0 0 4px; padding-left: 6px; font-size: clamp(23px, 3.8vw, 38px); font-weight: 800; letter-spacing: -.04em; line-height: 1.02; max-width: 20ch;`,
        )}
      >
        {heading}
      </h2>
      <div
        data-anim="up"
        data-delay="140"
        style={css(`background: #1B2130; border-radius: 28px; padding: clamp(4px, 1vh, 12px) clamp(16px, 3vw, 28px); max-width: 880px; width: 100%;`)}
      >
        {cities.map((v, i) => (
          <Fragment key={i}>
            <div style={css(`padding: clamp(6px, 1.1vh, 12px) 0; display: flex; align-items: baseline; gap: clamp(10px, 2.4vw, 20px);`)}>
              <span style={css(`font-size: 13px; color: #6C768A; flex: 0 0 auto; font-weight: 600;`)}>{v.rank}</span>
              <div style={css(`flex: 1 1 auto; min-width: 0;`)}>
                <div style={css(`display: flex; align-items: baseline; gap: 10px; justify-content: space-between; flex-wrap: wrap;`)}>
                  <span
                    style={css(
                      `font-size: clamp(19px, 3.4vw, 32px); font-weight: 700; letter-spacing: -.035em; min-width: 0; overflow-wrap: anywhere;`,
                    )}
                  >
                    {v.name}
                  </span>
                  <span style={css(`font-size: 13px; color: #8A93A6; flex: 0 0 auto;`)}>{v.count}</span>
                </div>
                <div style={css(`height: 5px; background: rgba(241,244,247,.12); border-radius: 999px; margin-top: 7px;`)}>
                  <div
                    data-bar={v.pct}
                    style={css(
                      `height: 5px; background: #8DE8FD; border-radius: 999px; width: 0%; transition: width .9s cubic-bezier(.16,.84,.26,1); background: var(--ac);`,
                    )}
                  />
                </div>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  )
}
