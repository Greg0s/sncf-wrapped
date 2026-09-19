import { useLayoutEffect, useRef, type CSSProperties } from 'react'

/**
 * Nombre « qui roule » (les chiffres défilent puis se figent à l'apparition de l'écran).
 * Le texte est piloté à la main par l'animation (cf. useWrappedScroll) : le composant ne rend donc aucun
 * enfant React, seulement la valeur finale dans `data-final`, et un état initial à zéro avant la révélation.
 */
export function Roll({ final, style }: { final: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    if (ref.current) ref.current.textContent = final.replace(/\d/g, '0')
  }, [final])
  return <span ref={ref} data-roll="true" data-final={final} style={style} />
}
