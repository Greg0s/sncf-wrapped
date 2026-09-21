import { useEffect, useState } from 'react'
import { css } from '../lib/css'
import { REVEAL_SPEED as SP } from './wrapped/animation'

/*
 * Brand mark: a line looping over itself, on an accent-colored tile. `public/favicon.svg` is the same
 * drawing with fixed colors. The 392×392 viewBox is the design's canvas: the line overshoots it on both
 * sides and the tile clips it, so the line enters and leaves the tile instead of starting and stopping inside.
 */
const LINE =
  'M-71.5 244.973C32.3333 268.973 278.5 300.974 297.5 168.473C317.372 29.891 132 49.9734 132 151.973C132 253.973 218.909 369.459 474.5 300.973'

// The intro plays once per page load: the landing remounts every time the visitor comes back to it.
// Plain module state on purpose, nothing is persisted (CLAUDE.md constraint #1).
let introPlayed = false

/**
 * `intro` draws the line on the mark's first appearance (landing header), unless the visitor prefers
 * reduced motion. Anywhere else, and on later appearances, the mark is simply there, fully drawn.
 */
export function Logo({ size, intro = false }: { size: number; intro?: boolean }) {
  // Decided once, at mount: the flag flips while the intro is still running and must not cut it short.
  const [draw] = useState(() => intro && !introPlayed && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (intro) introPlayed = true
  }, [intro])
  return (
    <svg
      viewBox="0 0 392 392"
      aria-hidden="true"
      focusable="false"
      style={css(`display: block; flex: 0 0 auto; width: ${size}px; height: ${size}px; border-radius: 22%; overflow: hidden; background: var(--ac, #8DE8FD);`)}
    >
      <path
        d={LINE}
        fill="none"
        stroke="#0E1219"
        strokeWidth="36"
        pathLength={1}
        style={draw ? css(`stroke-dasharray: 1; animation: logoDraw ${1.1 / SP}s cubic-bezier(.4,.05,.2,1) ${0.15 / SP}s backwards;`) : undefined}
      />
    </svg>
  )
}
