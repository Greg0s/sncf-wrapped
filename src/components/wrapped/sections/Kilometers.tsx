import { css } from '../../../lib/css'
import { Roll } from '../Roll'
import { STAR_HUB, type DisplayData, type WrappedView } from '../../../lib/wrapped'

export function Kilometers({ d, star, index, label }: { d: DisplayData; star: WrappedView['star']; index: number; label?: string | null }) {
  return (
    <section
      data-sec={index}
      data-sec-id="km"
      style={css(
        `min-height: 100svh; scroll-snap-align: start; background: #0E1219; display: flex; flex-direction: column; justify-content: center; gap: clamp(10px, 1.8vh, 16px); padding: clamp(58px, 9vh, 96px) clamp(14px, 4vw, 60px) clamp(30px, 5vh, 60px); position: relative; overflow: hidden; isolation: isolate;`,
      )}
    >
      <svg
        viewBox="0 0 400 110"
        preserveAspectRatio="none"
        style={css(`position: absolute; left: -4%; top: 2%; width: 108%; height: auto; opacity: .45; pointer-events: none; z-index: -1;`)}
      >
        <path
          data-draw="0"
          d="M396 20 C 330 20, 318 78, 262 70 C 214 63, 222 12, 264 20 C 300 27, 290 80, 236 90 C 170 102, 120 50, 60 64 C 30 71, 14 84, 2 92"
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
      <div
        data-anim="scale"
        data-delay="90"
        style={css(
          `background: #8DE8FD; color: #0E1219; border-radius: 28px; padding: clamp(18px, 3.4vw, 34px); display: flex; flex-wrap: wrap; gap: clamp(16px, 3vw, 40px); align-items: center; position: relative; overflow: hidden; background: var(--ac);`,
        )}
      >
        <div style={css(`position: absolute; left: 0; right: 0; top: 14px; height: 34px; pointer-events: none; opacity: .7;`)}>
          <div
            style={css(
              `position: absolute; top: 0; left: 0; display: flex; align-items: flex-end; gap: 3px; animation: glide 9s linear infinite, glideFade 9s linear infinite;`,
            )}
          >
            <div style={css(`width: 48px; height: 20px; background: #0E1219; border-radius: 4px 12px 2px 2px;`)} />
            <div style={css(`width: 32px; height: 16px; background: rgba(14,18,25,.7); border-radius: 3px;`)} />
            <div style={css(`width: 32px; height: 16px; background: rgba(14,18,25,.45); border-radius: 3px;`)} />
          </div>
          <div style={css(`position: absolute; top: 23px; left: 0; right: 0; height: 1.5px; background: rgba(14,18,25,.6); border-radius: 2px;`)} />
          <div
            style={css(
              `position: absolute; top: 27px; left: 0; right: 0; height: 6px; background-image: repeating-linear-gradient(90deg, rgba(14,18,25,.35) 0 2px, transparent 2px 18px); animation: ties 1.5s linear infinite;`,
            )}
          />
        </div>
        <div style={css(`flex: 1 1 280px; min-width: 0; display: flex; flex-direction: column; gap: 12px; padding-top: 30px;`)}>
          <div style={css(`display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;`)}>
            <Roll
              final={d.km}
              suspense
              style={css(`font-size: clamp(54px, 13vw, 132px); font-weight: 800; letter-spacing: -.055em; line-height: .86;`)}
            />
            <span style={css(`font-size: clamp(22px, 3.6vw, 38px); font-weight: 700; letter-spacing: -.03em;`)}>km</span>
          </div>
          <p style={css(`margin: 0; font-size: clamp(16px, 2.1vw, 22px); line-height: 1.35; max-width: 32ch; font-weight: 500;`)}>{d.kmNote}</p>
          <div style={css(`display: flex; flex-wrap: wrap; gap: 8px;`)}>
            <div style={css(`border: 1.5px solid rgba(14,18,25,.5); border-radius: 999px; padding: 8px 15px; font-size: 13px; font-weight: 600;`)}>
              {d.trips} {d.tripsLabel}
            </div>
            {d.kmPer && (
              <div style={css(`border: 1.5px solid rgba(14,18,25,.5); border-radius: 999px; padding: 8px 15px; font-size: 13px; font-weight: 600;`)}>
                {d.kmPer}
              </div>
            )}
          </div>
          <p style={css(`margin: 0; font-size: 12px; line-height: 1.4; max-width: 44ch; font-weight: 500; opacity: .7;`)}>{d.kmFootnote}</p>
        </div>
        <div style={css(`flex: 0 1 220px; min-width: 160px; max-width: 250px; margin: 0 auto;`)}>
          <svg viewBox="0 0 200 252" style={css(`width: 100%; height: auto; overflow: visible;`)}>
            {star.spokes.map((s) => (
              <line
                key={s.draw}
                data-draw={s.draw}
                x1={STAR_HUB.x}
                y1={STAR_HUB.y}
                x2={s.slot.end.x}
                y2={s.slot.end.y}
                stroke={s.slot.stroke}
                strokeWidth={s.slot.strokeWidth}
                strokeLinecap="round"
              />
            ))}
            <circle
              cx="120"
              cy="140"
              r="10"
              fill="none"
              stroke="#0E1219"
              strokeWidth="1.2"
              style={css(`transform-box: fill-box; transform-origin: center; animation: ping 2.8s ease-out infinite;`)}
            />
            {star.spokes.map((s) => (
              <circle key={s.draw} cx={s.slot.end.x} cy={s.slot.end.y} r={s.slot.r} fill={s.slot.dotFill} />
            ))}
            <circle cx={STAR_HUB.x} cy={STAR_HUB.y} r="6.5" fill="#0E1219" />
            {star.spokes.map((s) => (
              <text
                key={s.draw}
                x={s.slot.label.x}
                y={s.slot.label.y}
                textAnchor={s.slot.label.anchor}
                fill={s.slot.label.fill}
                fontFamily="Schibsted Grotesk, sans-serif"
                fontSize={s.slot.label.fontSize}
                fontWeight="600"
              >
                {s.name}
              </text>
            ))}
            <text x="133" y="158" textAnchor="start" fill="#0E1219" fontFamily="Schibsted Grotesk, sans-serif" fontSize="11.5" fontWeight="700">
              {star.hubName}
            </text>
          </svg>
        </div>
      </div>
    </section>
  )
}
