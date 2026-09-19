import { useLayoutEffect, type RefObject } from 'react'
import { REVEAL_SPEED as SP } from './animation'

/*
 * Reveal animations from the mockup (SNCF Wrapped v3), ported as-is: same durations, same curves,
 * same triggers (IntersectionObserver). Elements to animate are identified by data-* attributes:
 *   data-lanim / data-anim = "up" | "scale"  reveal (offset by data-delay, in ms)
 *   data-roll + data-final                   number whose digits scroll
 *   data-bar = percentage                    bar that fills up
 *   data-draw = rank                         line that draws itself
 *   data-sec / data-seg                      screen / segment of the progress bar
 * Styles are set by hand on the DOM (as in the mockup): they don't appear in the JSX,
 * so React doesn't overwrite them on the next render.
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

/** Landing: each [data-lanim] block appears once, when it enters the screen. */
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

/** The digits scroll at random then settle from left to right on the final value. */
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
 * Wrapped: screens scroll with scroll-snap; each screen becomes "active" past 40% visibility
 * (reveals, numbers, bars, lines) and resets when it leaves. The map player is driven via
 * `onMap` (play when the map screen becomes active, stop when it leaves).
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
    // Mounted once per wrapped display: the data doesn't change during playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root])
}
