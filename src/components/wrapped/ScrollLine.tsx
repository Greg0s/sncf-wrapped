import { useLayoutEffect, useRef } from 'react'
import { css } from '../../lib/css'
import { buildScrollLine, type LineSpec } from './scrollLinePath'

// Same muted accent as the Anticipation screen's line (its STROKE_DIM), so all screens' lines read as
// one stroke.
const LINE_COLOR = 'color-mix(in srgb, var(--ac) 45%, #0E1219 55%)'

// Delay before rebuilding the line after its section is resized (same debounce as the ant-line).
const RESIZE_DEBOUNCE_MS = 120

/**
 * Decorative background line of a wrapped screen, drawn top to bottom behind its content, joining the
 * previous and next screens' lines (see scrollLinePath.ts). Must be a direct child of a `position: relative; overflow: hidden; isolation: isolate`
 * section. Its path is built from the section's size in a layout effect, which runs before
 * `useWrappedScroll`'s (child before parent), so that hook measures the real path for the draw-in.
 */
export function ScrollLine({ spec, draw = 0 }: { spec: LineSpec; draw?: number }) {
  const ref = useRef<SVGPathElement>(null)

  useLayoutEffect(() => {
    const path = ref.current
    const section = path?.ownerSVGElement?.parentElement
    if (!path || !section) return
    let size = ''

    const build = () => {
      const W = section.clientWidth
      const H = section.clientHeight
      if (!W || !H || `${W}x${H}` === size) return
      size = `${W}x${H}`
      const shown = path.style.strokeDashoffset === '0' || path.style.strokeDashoffset === '0px'
      const line = buildScrollLine(spec, W, H)
      path.setAttribute('d', line.d)
      path.setAttribute('stroke-width', String(line.strokeWidth))
      const length = path.getTotalLength()
      path.style.strokeDasharray = String(length)
      path.style.strokeDashoffset = shown ? '0' : String(length)
    }

    build()
    let timer = 0
    const observer = new ResizeObserver(() => {
      clearTimeout(timer)
      timer = window.setTimeout(build, RESIZE_DEBOUNCE_MS)
    })
    observer.observe(section)
    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [spec])

  return (
    <svg style={css(`position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: -1;`)}>
      <path ref={ref} data-draw={draw} d="M0 0" fill="none" strokeLinecap="round" style={{ stroke: LINE_COLOR }} />
    </svg>
  )
}
