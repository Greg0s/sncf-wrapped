import { useLayoutEffect, type MutableRefObject, type RefObject } from 'react'
import { REVEAL_SPEED as SP } from './animation'

/*
 * Reveal animations from the mockup (SNCF Wrapped v3), ported as-is: same durations, same curves,
 * same triggers (IntersectionObserver). Elements to animate are identified by data-* attributes:
 *   data-lanim / data-anim = "up" | "scale"  reveal (offset by data-delay, in ms)
 *   data-roll + data-final                   number whose digits scroll
 *   data-roll-suspense = "true"              on data-roll, use the right-to-left growing variant
 *   data-roll-cycle = "2023,2025,2026"       on data-roll, loop through these values instead of settling
 *                                             once (teaser: years covered), each with its own scroll-in
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

/** Scrambles `el`'s digits at random then settles them, left to right, on `final` over `duration` ms. */
function scrambleTo(el: HTMLElement, final: string, duration: number, onDone?: () => void) {
  cancelAnimationFrame(rolling.get(el) ?? 0)
  const chars = final.split('')
  const digits = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0)
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
    else {
      el.textContent = final
      onDone?.()
    }
  }
  rolling.set(el, requestAnimationFrame(step))
}

/** The digits scroll at random then settle from left to right on the final value. */
function roll(el: HTMLElement) {
  scrambleTo(el, el.dataset.final || el.textContent || '', 900 / SP)
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

// Per year: a quick scramble-and-settle, then a hold long enough to read it, before moving to the next.
const CYCLE_STEP_MS = 900 / SP // ~1.5s per year at the default reveal speed
const CYCLE_ROLL_MS = CYCLE_STEP_MS / 3
const cycleTimers = new WeakMap<HTMLElement, number>()
const cycleGen = new WeakMap<HTMLElement, number>()

/** Stops a running `rollCycle` on `el`, if any (used both to switch year and on screen exit). */
function stopCycle(el: HTMLElement) {
  cycleGen.set(el, (cycleGen.get(el) ?? 0) + 1)
  cancelAnimationFrame(rolling.get(el) ?? 0)
  clearTimeout(cycleTimers.get(el))
}

/** Loops through `data-roll-cycle`'s values (teaser: the years covered), each with its own scramble-in. */
function rollCycle(el: HTMLElement) {
  const years = (el.dataset.rollCycle || '').split(',').filter(Boolean)
  if (years.length < 2) return roll(el)
  stopCycle(el)
  const gen = (cycleGen.get(el) ?? 0) + 1
  cycleGen.set(el, gen)
  let index = 0
  const step = () => {
    if (cycleGen.get(el) !== gen || !el.isConnected) return
    el.dataset.final = years[index]
    scrambleTo(el, years[index], CYCLE_ROLL_MS, () => {
      if (cycleGen.get(el) !== gen || !el.isConnected) return
      cycleTimers.set(
        el,
        window.setTimeout(() => {
          index = (index + 1) % years.length
          step()
        }, CYCLE_STEP_MS - CYCLE_ROLL_MS),
      )
    })
  }
  step()
}

const SEGMENT_OFF = 'rgba(241,244,247,.22)'
// Beat before the map screen's animation starts, so it doesn't fire the instant the screen snaps into view.
const MAP_PLAY_DELAY_MS = 500

/**
 * Wrapped: screens scroll with scroll-snap; each screen becomes "active" past 40% visibility
 * (reveals, numbers, bars, lines) and resets when it leaves. The map player is driven via
 * `onMap` (play when the map screen becomes active, stop when it leaves). `activeIndexRef` is kept
 * in sync with whichever section is most visible right now: it's the single source of truth for
 * "where are we", shared with `useStoryTapNavigation` so the two never disagree.
 */
export function useWrappedScroll(
  root: RefObject<HTMLElement | null>,
  onMap: (event: 'play' | 'stop') => void,
  activeIndexRef: MutableRefObject<number>,
) {
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
        if (on) {
          if (node.dataset.rollCycle) rollCycle(node)
          else (node.dataset.rollSuspense === 'true' ? rollSuspense : roll)(node)
        } else {
          stopCycle(node)
          node.textContent = (node.dataset.final || '').replace(/\d/g, '0')
        }
      })
    }

    const sections = [...el.querySelectorAll<HTMLElement>('[data-sec]')]
    sections.forEach((s) => reveal(s, false))

    let mapPlaying = false
    let mapPlayTimer = 0
    // Latest known visibility ratio per section: kept up to date (both rises and falls) on every
    // observer callback, so the "active" section is always derived from the current picture rather
    // than pushed once and left stale by whichever section happened to cross 40% last. A fast,
    // programmatic scroll (tap navigation, possibly interrupted by another tap) can otherwise report
    // a section as briefly active on its way past, corrupting the progress bar and the "where are
    // we" index that tap navigation relies on for its next/previous target.
    const ratios = new Map<number, number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const section = e.target as HTMLElement
          const i = Number(section.dataset.sec)
          const on = e.isIntersecting && e.intersectionRatio > 0.4
          reveal(section, on)
          if (section.dataset.secId === 'map') {
            if (on && !mapPlaying && !mapPlayTimer) {
              mapPlayTimer = window.setTimeout(() => {
                mapPlayTimer = 0
                mapPlaying = true
                onMap('play')
              }, MAP_PLAY_DELAY_MS)
            } else if (!e.isIntersecting) {
              clearTimeout(mapPlayTimer)
              mapPlayTimer = 0
              if (mapPlaying) {
                mapPlaying = false
                onMap('stop')
              }
            }
          }
          ratios.set(i, e.isIntersecting ? e.intersectionRatio : 0)
        }
        let active = activeIndexRef.current
        let bestRatio = 0.4
        for (const [i, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio
            active = i
          }
        }
        activeIndexRef.current = active
        el.querySelectorAll<HTMLElement>('[data-seg]').forEach((seg) => {
          seg.style.background = Number(seg.dataset.seg) <= active ? 'var(--ac)' : SEGMENT_OFF
        })
      },
      { root: scroller, threshold: [0, 0.42, 0.75] },
    )
    sections.forEach((s) => io.observe(s))
    return () => {
      io.disconnect()
      clearTimeout(mapPlayTimer)
      if (mapPlaying) onMap('stop')
    }
    // Mounted once per wrapped display: the data doesn't change during playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root])
}

const TAP_TOLERANCE_PX = 10
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"], [contenteditable]'
// Longer than the CSS smooth-scroll to a neighbouring section takes to settle, so scroll-snap comes
// back on well after the tap's own scroll (see `onPointerUp` below) is done, not mid-animation.
const SNAP_SUSPEND_MS = 900

/**
 * Instagram-style tap-to-navigate: tapping the right/left half of the screen moves to the
 * next/previous section. Touch only (checked via `pointerType`), so mouse clicks (desktop: text
 * selection, etc.) and keyboard use are untouched. A tap is only recognized when the pointer moved
 * less than TAP_TOLERANCE_PX between down and up, so a swipe-to-scroll never also navigates. Taps
 * on an interactive element (button, link…) are left alone so their own handler runs normally.
 *
 * `activeIndexRef` (shared with `useWrappedScroll`) says which section is currently active; taps
 * step from there instead of guessing from `scrollTop`, which is unreliable mid-scroll. A tap fired
 * before the previous one's smooth scroll has settled — very much how someone taps through a story —
 * would otherwise measure a stale, in-transit position and could recompute a target behind where the
 * user already is, which reads as the page bouncing back.
 */
export function useStoryTapNavigation(scrollerRef: RefObject<HTMLDivElement | null>, activeIndexRef: MutableRefObject<number>) {
  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    // Captured once, before any tap ever runs: restoring to '' instead of this would clear the inline
    // property rather than reinstate it (React only reapplies a style prop that itself changed, so it
    // never re-sets what we overwrote directly on the DOM node), leaving snapping off for good after
    // the very first tap.
    const defaultSnapType = scroller.style.scrollSnapType

    let start: { id: number; x: number; y: number } | null = null
    // The index our own last tap is scrolling toward, until the observer confirms we got there.
    let pendingIndex: number | null = null
    let restoreSnapTimer = 0

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
      if (Math.abs(e.clientX - x) > TAP_TOLERANCE_PX || Math.abs(e.clientY - y) > TAP_TOLERANCE_PX) {
        // A real swipe, not a tap: the user just took over navigation by hand, so any section a
        // previous tap was still heading toward is no longer where they're going. Drop it — the next
        // tap must start from the observer's own account of where we are, not a now-irrelevant guess.
        pendingIndex = null
        return
      }
      if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return

      const sections = [...scroller.querySelectorAll<HTMLElement>('[data-sec]')]
      if (sections.length === 0) return
      if (pendingIndex !== null && activeIndexRef.current === pendingIndex) pendingIndex = null
      const index = pendingIndex ?? activeIndexRef.current
      const forward = e.clientX > window.innerWidth / 2
      const nextIndex = Math.min(sections.length - 1, Math.max(0, index + (forward ? 1 : -1)))
      if (nextIndex !== index) {
        pendingIndex = nextIndex
        // `scroll-snap-type: mandatory` can fight a JS-driven `scrollIntoView` on WebKit: once the
        // scroll animation ends, the browser re-settles on the section it started from instead of
        // the one just scrolled to. Suspending snapping for the scroll's duration removes anything
        // for it to fight; restoring it shortly after puts native swipe-scrolling back to normal.
        scroller.style.scrollSnapType = 'none'
        clearTimeout(restoreSnapTimer)
        restoreSnapTimer = window.setTimeout(() => {
          scroller.style.scrollSnapType = defaultSnapType
        }, SNAP_SUSPEND_MS)
        sections[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    scroller.addEventListener('pointerdown', onPointerDown)
    scroller.addEventListener('pointerup', onPointerUp)
    scroller.addEventListener('pointercancel', onPointerCancel)
    return () => {
      scroller.removeEventListener('pointerdown', onPointerDown)
      scroller.removeEventListener('pointerup', onPointerUp)
      scroller.removeEventListener('pointercancel', onPointerCancel)
      clearTimeout(restoreSnapTimer)
      scroller.style.scrollSnapType = defaultSnapType
    }
  }, [scrollerRef, activeIndexRef])
}
