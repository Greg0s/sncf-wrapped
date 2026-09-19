import { useLayoutEffect, useRef, type CSSProperties } from 'react'

/**
 * "Rolling" number (the digits scroll then settle when the screen appears).
 * The text is driven by hand by the animation (see useWrappedScroll): the component therefore renders no
 * React children, only the final value in `data-final`, and an initial zeroed-out state before the reveal.
 */
export function Roll({ final, style }: { final: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    if (ref.current) ref.current.textContent = final.replace(/\d/g, '0')
  }, [final])
  return <span ref={ref} data-roll="true" data-final={final} style={style} />
}
