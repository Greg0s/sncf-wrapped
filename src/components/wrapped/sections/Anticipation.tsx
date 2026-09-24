import { useRef } from 'react'
import { css } from '../../../lib/css'
import type { DisplayData } from '../../../lib/wrapped'
import { useAntLine } from '../useReveal'

// The clock's decorative strokes (ring, hands, ticks, and the antenna line threading to the card):
// a muted mix of the period's accent into the screen's background, same as the mockup's "strokedim".
const STROKE_DIM = 'color-mix(in srgb, var(--ac) 45%, #0E1219 55%)'

export function Anticipation({ d, index, label }: { d: DisplayData; index: number; label?: string | null }) {
  const sectionRef = useRef<HTMLElement>(null)
  useAntLine(sectionRef)

  return (
    <section
      ref={sectionRef}
      data-sec={index}
      data-sec-id="anticipation"
      style={css(
        `min-height: 100svh; scroll-snap-align: start; background: #0E1219; display: flex; flex-direction: column; justify-content: center; gap: clamp(8px, 1.4vh, 14px); padding: clamp(46px, 7vh, 90px) clamp(14px, 4vw, 60px) clamp(16px, 3vh, 50px); position: relative; overflow: hidden;`,
      )}
    >
      <svg
        data-ant-bg="1"
        style={css(`position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; overflow: visible;`)}
      >
        <path data-draw="0" data-ant-a="1" d="M0 0" fill="none" stroke="#477280" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: STROKE_DIM }} />
        <path data-draw="4" data-ant-b="1" d="M0 0" fill="none" stroke="#477280" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: STROKE_DIM }} />
      </svg>
      <div data-anim="up" style={css(`position: relative; z-index: 1; font-size: 14px; font-weight: 600; color: #8A93A6; padding-left: 6px;`)}>
        {label}
      </div>
      <div style={css(`position: relative; z-index: 1; max-width: 920px; width: 100%; pointer-events: none;`)}>
        <svg data-ant-clock="1" viewBox="0 0 700 120" style={css(`display: block; width: 100%; height: auto; max-height: 150px; overflow: visible;`)}>
          <path
            data-draw="2"
            d="M446 84 A 34 34 0 1 1 494 84"
            fill="none"
            stroke="#477280"
            strokeWidth="4.5"
            strokeLinecap="round"
            style={{ stroke: STROKE_DIM }}
          />
          <path
            data-draw="3"
            d="M437 34 Q 438 14 460 17 M503 34 Q 502 14 480 17"
            fill="none"
            stroke="#477280"
            strokeWidth="4.5"
            strokeLinecap="round"
            style={{ stroke: STROKE_DIM }}
          />
          <line
            data-draw="4"
            x1="470"
            y1="60"
            x2="470"
            y2="40"
            stroke="#477280"
            strokeWidth="4.5"
            strokeLinecap="round"
            style={{ stroke: STROKE_DIM, transformBox: 'view-box', transformOrigin: '470px 60px', animation: 'spin 18s linear infinite' }}
          />
          <line
            data-draw="4"
            x1="470"
            y1="60"
            x2="484"
            y2="68"
            stroke="#477280"
            strokeWidth="4.5"
            strokeLinecap="round"
            style={{ stroke: STROKE_DIM, transformBox: 'view-box', transformOrigin: '470px 60px', animation: 'spin 3s linear infinite' }}
          />
          <path
            data-draw="5"
            d="M426 22 L 416 14 M424 38 L 412 38 M514 22 L 524 14 M516 38 L 528 38"
            fill="none"
            stroke="#477280"
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{ stroke: STROKE_DIM, animation: 'ringTick 3s ease-in-out infinite' }}
          />
        </svg>
      </div>
      <div
        data-anim="scale"
        data-delay="90"
        data-ant-card="1"
        style={css(
          `position: relative; z-index: 1; background: #1B2130; border-radius: 28px; padding: clamp(16px, 3vw, 30px); display: flex; flex-direction: column; gap: clamp(12px, 2vh, 20px); max-width: 920px; width: 100%;`,
        )}
      >
        <div className="anticipation-head" style={css(`display: flex; flex-wrap: wrap; gap: clamp(14px, 3vw, 36px); align-items: baseline;`)}>
          <div style={css(`display: flex; align-items: baseline; gap: 10px; flex: 0 1 auto;`)}>
            <span
              style={css(
                `font-size: clamp(54px, 13vw, 128px); font-weight: 800; letter-spacing: -.055em; line-height: .86; color: #8DE8FD; color: var(--ac);`,
              )}
            >
              {d.adv}
            </span>
            <span style={css(`font-size: clamp(20px, 3.2vw, 32px); font-weight: 700; letter-spacing: -.03em;`)}>{d.advUnit}</span>
          </div>
          <p style={css(`margin: 0; flex: 1 1 220px; min-width: 0; font-size: clamp(15px, 1.9vw, 20px); line-height: 1.35; color: #DCE1EA;`)}>
            {d.advNote}
          </p>
        </div>
        <div style={css(`position: relative; padding: 16px 0 4px;`)}>
          <div style={css(`display: flex; align-items: center; gap: 10px;`)}>
            <span style={css(`width: 11px; height: 11px; border-radius: 50%; background: #8DE8FD; flex: 0 0 auto; background: var(--ac);`)} />
            <span
              style={css(
                `flex: 1 1 auto; height: 2px; border-radius: 2px; background-image: repeating-linear-gradient(90deg, rgba(241,244,247,.5) 0 5px, transparent 5px 11px);`,
              )}
            />
            <span
              data-bar="100"
              style={css(
                `position: absolute; left: 11px; top: 22px; height: 2px; border-radius: 2px; background: #8DE8FD; width: 0%; max-width: calc(100% - 32px); transition: width 1.1s cubic-bezier(.16,.84,.26,1); background: var(--ac);`,
              )}
            />
            <span style={css(`width: 11px; height: 11px; border-radius: 50%; border: 2px solid #8DE8FD; flex: 0 0 auto; border-color: var(--ac);`)} />
          </div>
          <div style={css(`display: flex; justify-content: space-between; gap: 12px; margin-top: 8px; font-size: 12px; color: #8A93A6;`)}>
            <span>Achat du billet</span>
            <span>Départ du train</span>
          </div>
        </div>
        <div style={css(`display: grid; grid-template-columns: repeat(auto-fit, minmax(138px, 1fr)); gap: 8px;`)}>
          <div style={css(`background: #151A25; border-radius: 16px; padding: 11px 14px;`)}>
            <div style={css(`font-size: 12px; color: #8A93A6; margin-bottom: 5px;`)}>{d.advSideLabel}</div>
            <div style={css(`font-size: 19px; font-weight: 800; letter-spacing: -.03em;`)}>{d.advSideValue}</div>
          </div>
          <div style={css(`background: #151A25; border-radius: 16px; padding: 11px 14px;`)}>
            <div style={css(`font-size: 12px; color: #8A93A6; margin-bottom: 5px;`)}>Le plus anticipé</div>
            <div style={css(`font-size: 19px; font-weight: 800; letter-spacing: -.03em;`)}>{d.advMax}</div>
          </div>
          <div style={css(`background: #151A25; border-radius: 16px; padding: 11px 14px;`)}>
            <div style={css(`font-size: 12px; color: #8A93A6; margin-bottom: 5px;`)}>Vous réservez surtout le</div>
            <div style={css(`font-size: 19px; font-weight: 800; letter-spacing: -.03em;`)}>{d.advDay}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
