import { css } from '../../../lib/css'
import { Roll } from '../Roll'
import type { DisplayData } from '../../../lib/wrapped'

export function Budget({ d, index, label }: { d: DisplayData; index: number; label?: string | null }) {
  return (
    <section
      data-sec={index}
      data-sec-id="budget"
      style={css(
        `min-height: 100svh; scroll-snap-align: start; background: #0E1219; display: flex; flex-direction: column; justify-content: center; gap: clamp(10px, 1.8vh, 16px); padding: clamp(58px, 9vh, 96px) clamp(14px, 4vw, 60px) clamp(30px, 5vh, 60px);`,
      )}
    >
      <div data-anim="up" style={css(`font-size: 14px; font-weight: 600; color: #8A93A6; padding-left: 6px;`)}>
        {label}
      </div>
      <div
        data-anim="scale"
        data-delay="90"
        style={css(
          `background: #1B2130; border-radius: 28px; padding: clamp(18px, 3.4vw, 34px); display: flex; flex-direction: column; gap: clamp(14px, 2.4vh, 24px);`,
        )}
      >
        <div style={css(`display: flex; align-items: center; gap: clamp(14px, 3vw, 32px); flex-wrap: wrap;`)}>
          <div style={css(`display: flex; gap: clamp(8px, 1.6vw, 14px); animation: eyePop 2.8s ease-in-out infinite;`)}>
            <div
              style={css(
                `width: clamp(48px, 10vw, 80px); height: clamp(48px, 10vw, 80px); border-radius: 50%; background: #F3BB67; color: #0E1219; display: flex; align-items: center; justify-content: center; font-size: clamp(26px, 6vw, 46px); font-weight: 800; position: relative; overflow: hidden;`,
              )}
            >
              $
              <span style={css(`position: absolute; inset: 0; background: #1B2130; animation: blinkLid 4.4s ease-in-out infinite;`)} />
            </div>
            <div
              style={css(
                `width: clamp(48px, 10vw, 80px); height: clamp(48px, 10vw, 80px); border-radius: 50%; background: #F3BB67; color: #0E1219; display: flex; align-items: center; justify-content: center; font-size: clamp(26px, 6vw, 46px); font-weight: 800; position: relative; overflow: hidden;`,
              )}
            >
              $
              <span style={css(`position: absolute; inset: 0; background: #1B2130; animation: blinkLid 4.4s ease-in-out infinite .08s;`)} />
            </div>
          </div>
          <div style={css(`display: flex; align-items: baseline; gap: 8px; color: #F3BB67;`)}>
            <Roll final={d.eur} style={css(`font-size: clamp(54px, 14vw, 140px); font-weight: 800; letter-spacing: -.055em; line-height: .84;`)} />
            <span style={css(`font-size: clamp(26px, 6vw, 56px); font-weight: 800;`)}>€</span>
          </div>
        </div>
        <p style={css(`margin: 0; font-size: clamp(16px, 2.1vw, 22px); line-height: 1.35; max-width: 38ch; color: #DCE1EA;`)}>{d.eurNote}</p>
        <div style={css(`display: grid; grid-template-columns: repeat(auto-fit, minmax(146px, 1fr)); gap: 10px;`)}>
          <div style={css(`background: #151A25; border-radius: 18px; padding: 13px 16px;`)}>
            <div style={css(`font-size: 12px; color: #8A93A6; margin-bottom: 6px;`)}>Moyenne / trajet</div>
            <div style={css(`font-size: 24px; font-weight: 800; letter-spacing: -.03em;`)}>{d.avg}</div>
          </div>
          {d.month && (
            <div style={css(`background: #151A25; border-radius: 18px; padding: 13px 16px;`)}>
              <div style={css(`font-size: 12px; color: #8A93A6; margin-bottom: 6px;`)}>Mois le plus cher</div>
              <div style={css(`font-size: 24px; font-weight: 800; letter-spacing: -.03em;`)}>{d.month}</div>
            </div>
          )}
          {d.min && (
            <div style={css(`background: #151A25; border-radius: 18px; padding: 13px 16px;`)}>
              <div style={css(`font-size: 12px; color: #8A93A6; margin-bottom: 6px;`)}>Billet le moins cher</div>
              <div style={css(`font-size: 24px; font-weight: 800; letter-spacing: -.03em;`)}>{d.min}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
