import type { CSSProperties } from 'react'
import { showsOutline, type FranceMapModel } from '../../lib/wrapped'
import { CORSICA_OUTLINE, FRANCE_OUTLINE } from './franceOutline'

/** Mini map of France for the shareable card (port of "CarteFrance" from the mockup), fed by the real routes. */
export function FranceMap({ lineColor, scale, model, style }: { lineColor: string; scale: number; model: FranceMapModel; style?: CSSProperties }) {
  const { frame, arcs, hub } = model
  const s = scale * frame.k // lines keep their apparent thickness when the map is zoomed
  const size = (n: number) => (n * s).toFixed(1)
  return (
    <svg
      viewBox={`${frame.x} ${frame.y} ${frame.size} ${frame.size}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
    >
      {showsOutline(frame) &&
        [FRANCE_OUTLINE, CORSICA_OUTLINE].map((points) => (
          <polyline key={points} points={points} fill="#0E1219" stroke="#0075EB38" strokeWidth={size(2.6)} strokeLinejoin="round" />
        ))}
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill="none" stroke={lineColor} strokeWidth={size(a.w)} strokeLinecap="round" />
      ))}
      {arcs.flatMap((a, i) => a.dots.map((c, j) => <circle key={`${i}-${j}`} cx={c.x} cy={c.y} r={size(c.r)} fill={lineColor} />))}
      {hub && <circle cx={hub.x} cy={hub.y} r={size(8.4)} fill="#F1F4F7" />}
    </svg>
  )
}
