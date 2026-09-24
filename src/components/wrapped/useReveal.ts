import { useLayoutEffect, type MutableRefObject, type RefObject } from 'react'
import { REVEAL_SPEED as SP } from './animation'

/*
 * Reveal animations from the mockup (SNCF Wrapped v3), ported as-is: same durations, same curves,
 * same triggers (IntersectionObserver). Elements to animate are identified by data-* attributes:
 *   data-lanim / data-anim = "up" | "scale"  reveal (offset by data-delay, in ms)
 *   data-roll + data-final                   number that counts up from zero to its final value
 *   data-roll-suspense = "true"              on data-roll, use the slower, held-longer variant
 *   data-roll-cycle = "2023,2025,2026"       on data-roll, loop through these values instead of settling
 *                                             once (teaser: years covered); each change rolls in only the
 *                                             digits that differ ("le cran", mockup 3A)
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

// Delay before recomputing the ant-line on resize (mockup: same debounce as buildAntLine's own resize handler).
const ANT_LINE_RESIZE_DEBOUNCE_MS = 120

/**
 * Anticipation screen: the decorative line running from both screen edges, through the clock icon,
 * around the card. Its path depends on the live layout (card size/position, free space around it), so
 * it's computed in JS rather than drawn as a fixed SVG path — a port of the mockup's buildAntLine().
 * Runs before `useWrappedScroll` (a child's layout effect fires before its parent's), so by the time
 * that hook measures every [data-draw] line's length, these two already have their real `d`.
 */
export function useAntLine(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const section = root.current
    if (!section) return

    const build = () => {
      const bg = section.querySelector<SVGSVGElement>('[data-ant-bg]')
      const clock = section.querySelector<SVGSVGElement>('[data-ant-clock]')
      const card = section.querySelector<HTMLElement>('[data-ant-card]')
      if (!bg || !clock || !card) return
      const S = section.getBoundingClientRect()
      const W = S.width
      const H = section.offsetHeight
      const m = clock.getScreenCTM()
      if (!m) return
      const s = m.a
      const P = (x: number, y: number): [number, number] => [m.a * x + m.e - S.left, m.d * y + m.f - S.top]
      const [Lx, Ly] = P(438, 96)
      const [LCx, LCy] = P(446, 84)
      const [Rx, Ry] = P(502, 96)
      const [RCx, RCy] = P(494, 84)
      // Card box in section coordinates (offset*, so the reveal transform doesn't skew it).
      const cl = card.offsetLeft
      const ct = card.offsetTop
      const cr = cl + card.offsetWidth
      const cb = ct + card.offsetHeight
      const r = (v: number) => Math.round(v * 10) / 10
      const lp = Math.max(40, Lx * 0.42)
      const top = ct - 18
      const cyTop = (v: number) => Math.min(v, top)
      const a =
        `M ${r(-30)} ${r(cyTop(Ly + 40 * s))} C ${r(lp * 0.5)} ${r(cyTop(Ly + 60 * s))}, ${r(lp * 0.7)} ${r(Ly - 50 * s)}, ${r(lp)} ${r(cyTop(Ly - 18 * s))}` +
        ` C ${r(lp + 28 * s)} ${r(Ly)}, ${r(lp + 14 * s)} ${r(Ly + 26 * s)}, ${r(lp - 2 * s)} ${r(Ly + 12 * s)}` +
        ` C ${r(lp - 16 * s)} ${r(Ly - 4 * s)}, ${r(lp + 30 * s)} ${r(Ly - 16 * s)}, ${r(lp + 70 * s)} ${r(Ly - 8 * s)}` +
        ` C ${r((lp + Lx) / 2 + 40 * s)} ${r(cyTop(Ly + 10 * s))}, ${r(Lx - 30 * s)} ${r(Ly + 4 * s)}, ${r(Lx)} ${r(Ly)}` +
        ` L ${r(LCx)} ${r(LCy)}`

      const free = W - cr
      const below = H - cb
      const midY = (ct + cb) / 2
      const cw = cr - cl
      const yMax = (v: number) => Math.min(v, H - 12)
      const start = `M ${r(RCx)} ${r(RCy)} L ${r(Rx)} ${r(Ry)}`
      const head =
        free > 120
          ? `${start} C ${r(Rx + 30 * s)} ${r(Ry + 16 * s)}, ${r(cr + Math.min(free * 0.55, 260))} ${r(Ry - 10)}, ${r(cr + Math.min(free * 0.55, 260))} ${r((Ry + midY) / 2)}` +
            ` S ${r(cl + cw * 0.7)} ${r(midY)}, ${r(cl + cw * 0.45)} ${r(cb - 30)}`
          : `${start} C ${r(Rx + 30 * s)} ${r(Ry + 16 * s)}, ${r(cr - 50)} ${r(ct - 30)}, ${r(cr - 60)} ${r(ct + 20)}` +
            ` S ${r(cl + cw * 0.6)} ${r(midY)}, ${r(cl + cw * 0.45)} ${r(cb - 30)}`
      let b: string
      if (below >= 50) {
        const u = Math.max(0.35, Math.min(1, (below - 12) / 150))
        const h = Math.max(0.45, Math.min(1, cw / 700))
        const X = cl + 80 * h
        const Y = (v: number) => r(yMax(cb + v * u))
        const Xh = (v: number) => r(X + v * h)
        b =
          head +
          ` C ${r(cl + cw * 0.25)} ${r(cb - 30)}, ${r(X)} ${r(cb - 40)}, ${r(X)} ${r(cb)}` +
          ` C ${r(X)} ${Y(60)}, ${Xh(60)} ${Y(112)}, ${Xh(200)} ${Y(120)}` +
          ` C ${Xh(250)} ${Y(122)}, ${Xh(294)} ${Y(112)}, ${Xh(292)} ${Y(80)}` +
          ` C ${Xh(290)} ${Y(46)}, ${Xh(238)} ${Y(38)}, ${Xh(220)} ${Y(70)}` +
          ` C ${Xh(206)} ${Y(96)}, ${Xh(222)} ${Y(138)}, ${Xh(266)} ${Y(142)}` +
          ` C ${r(Math.max(X + 380 * h, W * 0.5))} ${Y(146)}, ${r(W * 0.8)} ${Y(130)}, ${r(W + 30)} ${Y(118)}`
      } else {
        const inY = Math.min(midY + 20, cb - 60)
        b = head + ` C ${r(cl + cw * 0.3)} ${r(cb - 60)}, ${r(cl + cw * 0.85)} ${r(inY)}, ${r(W + 30)} ${r(midY)}`
      }

      const pa = bg.querySelector<SVGPathElement>('[data-ant-a]')
      const pb = bg.querySelector<SVGPathElement>('[data-ant-b]')
      for (const [p, d] of [
        [pa, a],
        [pb, b],
      ] as const) {
        if (!p) continue
        const shown = p.style.strokeDashoffset === '0' || p.style.strokeDashoffset === '0px'
        p.setAttribute('d', d)
        p.setAttribute('stroke-width', String(r(4.5 * s)))
        const length = p.getTotalLength()
        p.style.strokeDasharray = String(length)
        p.style.strokeDashoffset = shown ? '0' : String(length)
      }
    }

    build()
    let resizeTimer = 0
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(build, ANT_LINE_RESIZE_DEBOUNCE_MS)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(resizeTimer)
    }
  }, [root])
}

const rolling = new WeakMap<HTMLElement, number>()

/** Formats `n` with fr-FR thousands grouping (regular spaces), matching `fmtNum`'s output. */
function groupThousands(n: number): string {
  return n.toLocaleString('fr-FR').replace(/[  ]/g, ' ')
}

/** Counts up from 0 to the number in `final` (its digits, ignoring separators) over `duration` ms. */
function countUpTo(el: HTMLElement, final: string, duration: number, onDone?: () => void) {
  cancelAnimationFrame(rolling.get(el) ?? 0)
  const target = Number(final.replace(/\D/g, '')) || 0
  const t0 = performance.now()
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration)
    el.textContent = p < 1 ? groupThousands(Math.round(target * p)) : final
    if (p < 1 && el.isConnected) rolling.set(el, requestAnimationFrame(step))
    else onDone?.()
  }
  rolling.set(el, requestAnimationFrame(step))
}

/** The digits count up from zero to the final value. */
function roll(el: HTMLElement) {
  countUpTo(el, el.dataset.final || el.textContent || '', 900 / SP)
}

const SUSPENSE_DURATION = 1300 / SP

/** Suspense variant of `roll`: same count-up, held a little longer so the number grows into view. */
function rollSuspense(el: HTMLElement) {
  countUpTo(el, el.dataset.final || el.textContent || '', SUSPENSE_DURATION)
}

// "Le cran" (mockup 3A): only the digits that actually change move, each sliding down from above into
// its slot with a light bounce. Digits are animated right to left, each one a beat behind the last, so a
// multi-digit change (e.g. a decade rollover) reads as a small cascade instead of every digit snapping at
// once. Non-changing digits are left untouched.
const CYCLE_ROLL_MS = 620 / SP // duration of a single digit's slide
const CYCLE_STAGGER_MS = 110 / SP // extra delay per further (more significant) digit changing alongside it
const CYCLE_HOLD_MS = 260 / SP // pause after a year has settled before rolling to the next
const cycleTimers = new WeakMap<HTMLElement, number>()
const cycleGen = new WeakMap<HTMLElement, number>()
const cycleSlots = new WeakMap<HTMLElement, HTMLElement[]>()

/** Stops a running `rollCycle` on `el`, if any (used both to switch year and on screen exit). */
function stopCycle(el: HTMLElement) {
  cycleGen.set(el, (cycleGen.get(el) ?? 0) + 1)
  cancelAnimationFrame(rolling.get(el) ?? 0)
  clearTimeout(cycleTimers.get(el))
  el.getAnimations({ subtree: true }).forEach((a) => a.cancel())
  if (cycleSlots.has(el)) {
    cycleSlots.delete(el)
    el.style.display = ''
    el.style.height = ''
  }
}

function cycleDigit(ch: string): HTMLSpanElement {
  const span = document.createElement('span')
  span.textContent = ch
  span.style.cssText = 'display:block;height:1em;line-height:1;'
  return span
}

/** Builds one slot per character of `value`, each clipping its own vertical strip of digits. */
function buildCycleSlots(el: HTMLElement, value: string): HTMLElement[] {
  el.textContent = ''
  el.style.display = 'flex'
  el.style.height = '1em'
  const slots = [...value].map((ch) => {
    // clip-path (not overflow:hidden) so only the top/bottom are clipped: the big, tightly tracked
    // digits of the teaser bleed slightly into their neighbour's box, and overflow:hidden would cut
    // that bleed off at the slot's own edges.
    const slot = document.createElement('span')
    slot.style.cssText = 'display:block;position:relative;height:1em;clip-path:inset(0 -30% 0 -30%);'
    const strip = document.createElement('span')
    strip.style.display = 'block'
    strip.appendChild(cycleDigit(ch))
    slot.appendChild(strip)
    el.appendChild(slot)
    return slot
  })
  cycleSlots.set(el, slots)
  return slots
}

/** Slides every digit that differs between `prev` and `next` into place. Returns how many digits moved. */
function stepRoll(slots: HTMLElement[], prev: string, next: string): number {
  const changed: number[] = []
  for (let i = prev.length - 1; i >= 0; i--) if (prev[i] !== next[i]) changed.push(i)
  changed.forEach((charIndex, k) => {
    const slot = slots[charIndex]
    slot.getAnimations({ subtree: true }).forEach((a) => a.cancel())
    const strip = document.createElement('span')
    strip.style.cssText = 'display:block;position:relative;will-change:transform;'
    const nextEl = cycleDigit(next[charIndex])
    const prevEl = cycleDigit(prev[charIndex])
    // The outgoing digit is taken out of flow so only the incoming one sizes the slot, from the first
    // frame to the last. Otherwise the slot briefly shrink-wraps around whichever glyph is wider while
    // both are present, then snaps to the narrower one the instant the slide ends — the digits visibly
    // drifting closer together right after they'd already settled.
    prevEl.style.cssText += 'position:absolute;top:1em;left:0;'
    strip.appendChild(nextEl)
    strip.appendChild(prevEl)
    slot.textContent = ''
    slot.appendChild(strip)
    const anim = strip.animate([{ transform: 'translateY(-1em)' }, { transform: 'translateY(0)' }], {
      duration: CYCLE_ROLL_MS,
      delay: k * CYCLE_STAGGER_MS,
      easing: 'cubic-bezier(.3,1.35,.45,1)',
      fill: 'both',
    })
    anim.onfinish = () => {
      slot.textContent = ''
      slot.appendChild(cycleDigit(next[charIndex]))
    }
  })
  return changed.length
}

/** Loops through `data-roll-cycle`'s values (teaser: the years covered), each rolling in with "le cran". */
function rollCycle(el: HTMLElement) {
  const years = (el.dataset.rollCycle || '').split(',').filter(Boolean)
  if (years.length < 2) return roll(el)
  stopCycle(el)
  const gen = (cycleGen.get(el) ?? 0) + 1
  cycleGen.set(el, gen)
  let current = years[0].replace(/\d/g, '0')
  const slots = buildCycleSlots(el, current)
  let index = 0
  const step = () => {
    if (cycleGen.get(el) !== gen || !el.isConnected) return
    const next = years[index]
    el.dataset.final = next
    const changed = stepRoll(slots, current, next)
    current = next
    index = (index + 1) % years.length
    const stepDuration = CYCLE_ROLL_MS + CYCLE_STAGGER_MS * Math.max(0, changed - 1) + CYCLE_HOLD_MS
    cycleTimers.set(el, window.setTimeout(step, stepDuration))
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
