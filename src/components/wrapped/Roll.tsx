import { useLayoutEffect, useRef, type CSSProperties } from 'react'

/**
 * "Rolling" number (the digits scroll then settle when the screen appears).
 * The text is driven by hand by the animation (see useWrappedScroll): the component therefore renders no
 * React children, only the final value in `data-final`, and an initial zeroed-out state before the reveal.
 * That animated text is hidden from assistive technology; a visually hidden copy of the real value(s)
 * is what screen readers and text extraction get, from the first render on.
 * `suspense` switches to the variant where digits settle right-to-left and the number grows to its
 * final width during the animation, instead of the width being fixed from the first frame.
 * `cycle` plays the "le cran" digit-slide reveal instead of a plain count-up (teaser: the year(s)
 * covered); with more than one value it then loops through them instead of settling once — see
 * `rollCycle` in useReveal.ts.
 */
export function Roll({
  final,
  style,
  suspense,
  cycle,
}: {
  final: string
  style?: CSSProperties
  suspense?: boolean
  cycle?: string[]
}) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    if (ref.current) ref.current.textContent = final.replace(/\d/g, '0')
  }, [final])
  return (
    <>
      <span className="sr-only">{cycle && cycle.length > 1 ? cycle.join(', ') : final}</span>
      <span
        ref={ref}
        aria-hidden="true"
        data-roll="true"
        data-roll-suspense={suspense ? 'true' : undefined}
        data-roll-cycle={cycle && cycle.length > 0 ? cycle.join(',') : undefined}
        data-final={final}
        style={style}
      />
    </>
  )
}
