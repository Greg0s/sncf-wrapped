import { css } from '../../../lib/css'
import type { DisplayData } from '../../../lib/wrapped'

export function Anticipation({ d, index, label }: { d: DisplayData; index: number; label?: string | null }) {
  return (
    <section
      data-sec={index}
      data-sec-id="anticipation"
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
          `background: #1B2130; border-radius: 28px; padding: clamp(16px, 3vw, 30px); display: flex; flex-direction: column; gap: clamp(12px, 2vh, 20px); max-width: 920px; width: 100%;`,
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
