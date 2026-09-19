import { useLayoutEffect, type RefObject } from 'react'
import { REVEAL_SPEED as SP } from './animation'

/*
 * Animations d'apparition de la maquette (SNCF Wrapped v3), portées telles quelles : mêmes durées, mêmes courbes,
 * mêmes déclencheurs (IntersectionObserver). Les éléments à animer sont repérés par des attributs data-* :
 *   data-lanim / data-anim = "up" | "scale"  apparition (décalée par data-delay, en ms)
 *   data-roll + data-final                   nombre dont les chiffres défilent
 *   data-bar = pourcentage                   barre qui se remplit
 *   data-draw = rang                         trait qui se dessine
 *   data-sec / data-seg                      écran / segment de la barre de progression
 * Les styles sont posés à la main sur le DOM (comme dans la maquette) : ils n'apparaissent pas dans le JSX,
 * donc React ne les écrase pas au rendu suivant.
 */

function hide(el: HTMLElement) {
  const delay = Number(el.dataset.delay || 0) / 1000 / SP
  const kind = el.dataset.anim || el.dataset.lanim
  el.style.opacity = '0'
  el.style.willChange = 'opacity, transform'
  el.style.transform = kind === 'scale' ? 'scale(.97)' : 'translateY(24px)'
  el.style.transition = `opacity ${0.6 / SP}s ease ${delay}s, transform ${0.78 / SP}s cubic-bezier(.16,.84,.26,1) ${delay}s`
}

function show(el: HTMLElement) {
  el.style.opacity = '1'
  el.style.transform = 'none'
}

/** Landing : chaque bloc [data-lanim] apparaît une fois, quand il entre dans l'écran. */
export function useLandingReveal(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const elements = [...(root.current?.querySelectorAll<HTMLElement>('[data-lanim]') ?? [])]
    elements.forEach(hide)
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          show(e.target as HTMLElement)
          io.unobserve(e.target)
        }
      },
      { threshold: 0.15 },
    )
    elements.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [root])
}

const rolling = new WeakMap<HTMLElement, number>()

/** Les chiffres défilent au hasard puis se figent de gauche à droite sur la valeur finale. */
function roll(el: HTMLElement) {
  cancelAnimationFrame(rolling.get(el) ?? 0)
  const final = el.dataset.final || el.textContent || ''
  const chars = final.split('')
  const digits = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0)
  const duration = 900 / SP
  const t0 = performance.now()
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration)
    const settled = Math.floor(p * digits.length * 1.05)
    const out = chars.slice()
    digits.forEach((di, k) => {
      if (k >= settled) out[di] = String(Math.floor(Math.random() * 10))
    })
    el.textContent = out.join('')
    if (p < 1 && el.isConnected) rolling.set(el, requestAnimationFrame(step))
    else el.textContent = final
  }
  rolling.set(el, requestAnimationFrame(step))
}

const SEGMENT_OFF = 'rgba(241,244,247,.22)'

/**
 * Wrapped : les écrans défilent en scroll-snap ; chaque écran devient « actif » au-delà de 40 % de visibilité
 * (révélations, chiffres, barres, tracés) et se remet à zéro en sortant. Le lecteur de la carte est piloté via
 * `onMap` (lecture quand l'écran de la carte devient actif, arrêt quand il sort).
 */
export function useWrappedScroll(root: RefObject<HTMLElement | null>, onMap: (event: 'play' | 'stop') => void) {
  useLayoutEffect(() => {
    const el = root.current
    const scroller = el?.querySelector<HTMLElement>('[data-scroller]')
    if (!el || !scroller) return

    el.querySelectorAll<SVGGeometryElement>('[data-draw]').forEach((line) => {
      const length = line.getTotalLength ? line.getTotalLength() : 140
      line.style.strokeDasharray = String(length)
      line.style.strokeDashoffset = String(length)
      line.style.transition = `stroke-dashoffset ${1.1 / SP}s cubic-bezier(.4,.05,.2,1) ${(0.14 * Number(line.dataset.draw)) / SP}s`
    })
    el.querySelectorAll<HTMLElement>('[data-anim]').forEach(hide)

    const reveal = (section: HTMLElement, on: boolean) => {
      section.querySelectorAll<HTMLElement>('[data-anim]').forEach((node) => (on ? show(node) : hide(node)))
      section.querySelectorAll<SVGGeometryElement>('[data-draw]').forEach((line) => {
        line.style.strokeDashoffset = on ? '0' : String(line.getTotalLength ? line.getTotalLength() : 140)
      })
      section.querySelectorAll<HTMLElement>('[data-bar]').forEach((bar, i) => {
        bar.style.transitionDelay = on ? `${(0.12 * i) / SP}s` : '0s'
        bar.style.width = on ? `${bar.dataset.bar}%` : '0%'
      })
      section.querySelectorAll<HTMLElement>('[data-roll]').forEach((node) => {
        if (on) roll(node)
        else {
          cancelAnimationFrame(rolling.get(node) ?? 0)
          node.textContent = (node.dataset.final || '').replace(/\d/g, '0')
        }
      })
    }

    const sections = [...el.querySelectorAll<HTMLElement>('[data-sec]')]
    sections.forEach((s) => reveal(s, false))

    let mapPlaying = false
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const section = e.target as HTMLElement
          const i = Number(section.dataset.sec)
          const on = e.isIntersecting && e.intersectionRatio > 0.4
          reveal(section, on)
          if (section.dataset.secId === 'map') {
            if (on && !mapPlaying) {
              mapPlaying = true
              onMap('play')
            } else if (!e.isIntersecting && mapPlaying) {
              mapPlaying = false
              onMap('stop')
            }
          }
          if (on) {
            el.querySelectorAll<HTMLElement>('[data-seg]').forEach((seg) => {
              seg.style.background = Number(seg.dataset.seg) <= i ? 'var(--ac)' : SEGMENT_OFF
            })
          }
        }
      },
      { root: scroller, threshold: [0, 0.42, 0.75] },
    )
    sections.forEach((s) => io.observe(s))
    return () => {
      io.disconnect()
      if (mapPlaying) onMap('stop')
    }
    // Monté une fois par affichage du wrapped : les données ne changent pas pendant la lecture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root])
}
