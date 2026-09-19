import { useLayoutEffect, type RefObject } from 'react'
import { REVEAL_SPEED as SP } from './animation'

/*
 * Reveal animations from the mockup (SNCF Wrapped v3), ported as-is: same durations, same curves,
 * same triggers (IntersectionObserver). Elements to animate are identified by data-* attributes:
 *   data-lanim / data-anim = "up" | "scale"  reveal (offset by data-delay, in ms)
 *   data-roll + data-final                   number whose digits scroll
 *   data-roll-suspense = "true"              on data-roll, use the right-to-left growing variant
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

const SUSPENSE_DURATION = 1300 / SP
const SUSPENSE_GROWTH_SHARE = 0.4 // share of the duration spent growing the number to its final width

/**
 * Suspense variant of `roll`: digits appear and settle right-to-left (instead of all at once,
 * left to right), so the final digit count only becomes clear near the end of the animation.
 * A group separator (thousands space) reveals together with the digit right before it.
 */
function rollSuspense(el: HTMLElement) {
  cancelAnimationFrame(rolling.get(el) ?? 0)
  const final = el.dataset.final || el.textContent || ''
  const chars = final.split('')
  const digitPositions = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0)
  const total = digitPositions.length
  if (total === 0) {
    el.textContent = final
    return
  }
  const rankOf = (charIndex: number) => {
    const digitAt = digitPositions.indexOf(charIndex)
    if (digitAt >= 0) return total - 1 - digitAt
    const before = [...digitPositions].reverse().find((i) => i < charIndex)
    const after = digitPositions.find((i) => i > charIndex)
    return total - 1 - digitPositions.indexOf(before ?? after ?? digitPositions[0])
  }
  const ranks = chars.map((_, i) => rankOf(i))
  const t0 = performance.now()
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / SUSPENSE_DURATION)
    const q = Math.min(1, p * 1.05)
    let firstVisible = chars.length
    const out = chars.slice()
    chars.forEach((c, i) => {
      const rank = ranks[i]
      const appearAt = (rank / total) * SUSPENSE_GROWTH_SHARE
      const settleAt = SUSPENSE_GROWTH_SHARE + (rank / total) * (1 - SUSPENSE_GROWTH_SHARE)
      if (q < appearAt) return
      firstVisible = Math.min(firstVisible, i)
      if (/\d/.test(c) && q < settleAt) out[i] = String(Math.floor(Math.random() * 10))
    })
    el.textContent = out.slice(firstVisible).join('')
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
        if (on) (node.dataset.rollSuspense === 'true' ? rollSuspense : roll)(node)
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

const TAP_TOLERANCE_PX = 10
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"], [contenteditable]'

/**
 * Instagram-style tap-to-navigate: tapping the right/left half of the screen moves to the
 * next/previous section. Touch only (checked via `pointerType`), so mouse clicks (desktop: text
 * selection, etc.) and keyboard use are untouched. A tap is only recognized when the pointer moved
 * less than TAP_TOLERANCE_PX between down and up, so a swipe-to-scroll never also navigates. Taps
 * on an interactive element (button, link…) are left alone so their own handler runs normally.
 */
export function useStoryTapNavigation(scrollerRef: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    let start: { id: number; x: number; y: number } | null = null

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      start = { id: e.pointerId, x: e.clientX, y: e.clientY }
    }

    const onPointerCancel = (e: PointerEvent) => {
      if (start?.id === e.pointerId) start = null
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || !start || start.id !== e.pointerId) return
      const { x, y } = start
      start = null
      if (Math.abs(e.clientX - x) > TAP_TOLERANCE_PX || Math.abs(e.clientY - y) > TAP_TOLERANCE_PX) return
      if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return

      const sections = [...scroller.querySelectorAll<HTMLElement>('[data-sec]')]
      if (sections.length === 0) return
      const current = sections.reduce((closest, s) =>
        Math.abs(s.offsetTop - scroller.scrollTop) < Math.abs(closest.offsetTop - scroller.scrollTop) ? s : closest,
      )
      const index = sections.indexOf(current)
      const forward = e.clientX > window.innerWidth / 2
      const nextIndex = Math.min(sections.length - 1, Math.max(0, index + (forward ? 1 : -1)))
      if (nextIndex !== index) sections[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    scroller.addEventListener('pointerdown', onPointerDown)
    scroller.addEventListener('pointerup', onPointerUp)
    scroller.addEventListener('pointercancel', onPointerCancel)
    return () => {
      scroller.removeEventListener('pointerdown', onPointerDown)
      scroller.removeEventListener('pointerup', onPointerUp)
      scroller.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [scrollerRef])
}
