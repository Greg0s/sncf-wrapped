import { useId, type CSSProperties } from 'react'
import { CORSICA_OUTLINE, FRANCE_OUTLINE, showsOutline, type FranceMapModel } from '../../lib/wrapped'

/** Mini map of France for the shareable card (port of "CarteFrance" from the mockup), fed by the real routes. */
export function FranceMap({ lineColor, scale, model, style }: { lineColor: string; scale: number; model: FranceMapModel; style?: CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const { frame, regionOutline, arcs, hub } = model
  const s = scale * frame.k // lines keep their apparent thickness when the map is zoomed
  const size = (n: number) => (n * s).toFixed(1)
  const outlines = regionOutline ? [regionOutline] : showsOutline(frame) ? [FRANCE_OUTLINE, CORSICA_OUTLINE] : []
  return (
    <svg
      viewBox={`${frame.x} ${frame.y} ${frame.size} ${frame.size}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
    >
      {/* A route reaching a foreign city fades out where it leaves France, instead of stopping mid-air. */}
      <defs>
        {arcs.map(
          (a, i) =>
            a.fade && (
              <linearGradient key={i} id={`${uid}-fade-${i}`} gradientUnits="userSpaceOnUse" x1={a.fade.x1} y1={a.fade.y1} x2={a.fade.x2} y2={a.fade.y2}>
                <stop offset="0" stopColor={lineColor} stopOpacity={1} />
                <stop offset="1" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            ),
        )}
      </defs>
      {outlines.map((points) => (
        <polyline key={points} points={points} fill="#0E1219" stroke="#0075EB38" strokeWidth={size(2.6)} strokeLinejoin="round" />
      ))}
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill="none" stroke={a.fade ? `url(#${uid}-fade-${i})` : lineColor} strokeWidth={size(a.w)} strokeLinecap="round" />
      ))}
      {arcs.flatMap((a, i) => a.dots.map((c, j) => <circle key={`${i}-${j}`} cx={c.x} cy={c.y} r={size(c.r)} fill={lineColor} />))}
      {hub && <circle cx={hub.x} cy={hub.y} r={size(8.4)} fill="#F1F4F7" />}
    </svg>
  )
}
