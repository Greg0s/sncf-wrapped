/*
 * Background line of the wrapped screens (all but Anticipation, whose line threads through its clock
 * and around its card, see useAntLine). Screen after screen, these lines join into one stroke running
 * through the whole wrapped: each meets the next in the junction lane (JUNCTION).
 *
 * A hand-drawn-looking stroke: it always runs from the top edge of the screen to its bottom edge,
 * following the scroll, drifting softly between lanes on a gentle wave, and curling into loops that
 * cross themselves. It is built in real pixels from the section's live size (never a stretched
 * viewBox) and walked by arc length, so loops keep their shape on any aspect ratio and slope.
 *
 * Proportions follow the golden ratio φ: lanes and loop heights sit at golden fractions of the screen
 * (1/φ⁴, 1/φ³, 1/φ², 1/φ…), the loop radius is min(W, H) / φ⁵ (a small loop is that / φ), a loop spans
 * φ² radii of line, the wave spans one loop radius over about φ⁴ radii (a whole number of waves per
 * screen), and the stroke width is the loop radius / φ⁵.
 */

export const PHI = (1 + Math.sqrt(5)) / 2

/** Golden fractions of the screen, used as lanes (x) and heights (y). */
export const G = {
  /** 1/φ⁴ ≈ .146 */
  edge: PHI ** -4,
  /** 1/φ³ ≈ .236 */
  quarter: PHI ** -3,
  /** 1/φ² ≈ .382 */
  minor: PHI ** -2,
  /** 1 − 1/φ² ≈ .618 (= 1/φ) */
  major: PHI ** -1,
  /** 1 − 1/φ³ ≈ .764 */
  late: 1 - PHI ** -3,
  /** 1 − 1/φ⁴ ≈ .854 */
  far: 1 - PHI ** -4,
} as const

/** A curl at height `at` (fraction of H), turning toward `dir` first (1 = right, −1 = left). */
export type LineLoop = { at: number; dir: 1 | -1; small?: boolean }
/**
 * A line: lanes it passes through, as [height, lane] pairs (fractions of H and W, heights increasing,
 * first at 0 and last at 1), and its loops.
 */
export type LineSpec = { lanes: [number, number][]; loops: LineLoop[] }

export type BuiltLine = { d: string; strokeWidth: number }

const round = (v: number) => Math.round(v * 10) / 10
/** Smoothstep: eases 0 → 1 with zero slope at both ends. */
const ease = (u: number) => {
  const c = Math.min(1, Math.max(0, u))
  return c * c * (3 - 2 * c)
}

/**
 * Lane `f` in px. Lanes are fractions of a band centred on the screen, no wider than its height, so
 * the line never lies down flat on wide screens.
 */
export function laneX(f: number, W: number, H: number): number {
  const band = Math.min(W, H)
  return (W - band) / 2 + f * band
}

/**
 * Where consecutive screens' lines meet: every line enters at the top edge and leaves at the bottom
 * edge in this lane, heading straight down, so the lines of the whole wrapped read as a single stroke
 * (whatever screens are dropped for lack of data).
 */
export const JUNCTION = G.major

/** Stroke width of the wrapped line on a W × H screen: the loop radius / φ⁵. */
export function lineStrokeWidth(W: number, H: number): number {
  return round(Math.min(6, Math.max(2.5, Math.min(W, H) / PHI ** 10)))
}

/** Lane (in px) at height y: soft S-curves between the spec's anchors. */
function laneAt(lanes: [number, number][], y: number, W: number, H: number): number {
  const px = (f: number) => laneX(f, W, H)
  const f = y / H
  if (f <= lanes[0][0]) return px(lanes[0][1])
  for (let i = 1; i < lanes.length; i++) {
    const [f0, x0] = lanes[i - 1]
    const [f1, x1] = lanes[i]
    if (f <= f1) return px(x0 + (x1 - x0) * ease((f - f0) / (f1 - f0)))
  }
  return px(lanes[lanes.length - 1][1])
}

/** Samples the line top to bottom, in px. Exported for tests. */
export function sampleScrollLine(spec: LineSpec, W: number, H: number) {
  const R = Math.min(W, H) / PHI ** 5
  const strokeWidth = lineStrokeWidth(W, H)
  const pad = strokeWidth * 2 + R * PHI
  // A whole number of waves over the screen, as 1 − cos: no offset and no slope at the top and bottom
  // edges, so the line meets its neighbours' in the junction lane, heading straight down.
  const waveAmp = R / 2
  const waves = Math.max(1, Math.round(H / (R * PHI ** 4)))

  // The loop-free line, sampled every px of height, then walked by arc length so a loop keeps its
  // shape whatever the line's slope.
  const bx: number[] = []
  const by: number[] = []
  const bl: number[] = []
  for (let y = -pad, l = 0; y <= H + pad; y += 1) {
    const x = laneAt(spec.lanes, y, W, H) + waveAmp * (1 - Math.cos((2 * Math.PI * waves * y) / H))
    if (bx.length) l += Math.hypot(x - bx[bx.length - 1], 1)
    bx.push(x)
    by.push(y)
    bl.push(l)
  }
  const total = bl[bl.length - 1]
  let cursor = 0
  const baseAt = (l: number): [number, number] => {
    while (cursor > 0 && bl[cursor] > l) cursor--
    while (cursor < bl.length - 2 && bl[cursor + 1] < l) cursor++
    const f = Math.min(1, Math.max(0, (l - bl[cursor]) / (bl[cursor + 1] - bl[cursor] || 1)))
    return [bx[cursor] + (bx[cursor + 1] - bx[cursor]) * f, by[cursor] + (by[cursor + 1] - by[cursor]) * f]
  }

  const loops = spec.loops.map((lp) => {
    const r = lp.small ? R / PHI : R
    const i = Math.min(by.length - 2, Math.max(1, Math.round(lp.at * H + pad)))
    const len = Math.hypot(bx[i + 1] - bx[i - 1], 2)
    // Local frame at the loop: T along the line, N across it, on the loop's side.
    const T: [number, number] = [(bx[i + 1] - bx[i - 1]) / len, 2 / len]
    const N: [number, number] = Math.sign(-T[1]) === lp.dir ? [-T[1], T[0]] : [T[1], -T[0]]
    // The line advances φ² radii while the curl makes one turn; the curl outruns it mid-turn, so it
    // crosses itself.
    return { l: bl[i], r, T, N, span: r * PHI ** 2 }
  })

  const points: [number, number][] = []
  const h = Math.max(4, R / PHI ** 3)
  for (let l = 0; ; ) {
    let [x, y] = baseAt(Math.min(l, total))
    let speed = 1
    for (const lp of loops) {
      const u = (l - lp.l) / lp.span + 0.5
      if (u <= 0 || u >= 1) continue
      // θ = 2πu − sin 2πu: one full turn, starting and ending at rest, so the stroke leaves and
      // rejoins the line tangentially, without a kink.
      const th = 2 * Math.PI * u - Math.sin(2 * Math.PI * u)
      x += lp.r * (lp.T[0] * Math.sin(th) + lp.N[0] * (1 - Math.cos(th)))
      y += lp.r * (lp.T[1] * Math.sin(th) + lp.N[1] * (1 - Math.cos(th)))
      speed += (lp.r / lp.span) * 2 * Math.PI * (1 - Math.cos(2 * Math.PI * u))
    }
    points.push([x, y])
    if (l >= total) break
    // Finer steps where the curl moves fast, so the samples stay evenly spaced along the stroke.
    l = Math.min(total, l + h / speed)
  }
  return { points, strokeWidth, loops }
}

/** Builds the SVG path of `spec` for a W × H screen, in pixels (Catmull-Rom through the samples). */
export function buildScrollLine(spec: LineSpec, W: number, H: number): BuiltLine {
  const { points: p, strokeWidth } = sampleScrollLine(spec, W, H)
  const pt = ([x, y]: [number, number]) => `${round(x)} ${round(y)}`
  const parts = [`M ${pt(p[0])}`]
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)]
    const b = p[i]
    const c = p[i + 1]
    const d = p[Math.min(p.length - 1, i + 2)]
    const c1: [number, number] = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6]
    const c2: [number, number] = [c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6]
    parts.push(`C ${pt(c1)}, ${pt(c2)}, ${pt(c)}`)
  }
  return { d: parts.join(' '), strokeWidth }
}

/*
 * One line per screen, each starting and ending in the junction lane. Loops sit on inner lanes (or turn
 * inward from outer ones), so their curl stays on screen on phones.
 */
const J = JUNCTION
export const SCREEN_LINES = {
  teaser: {
    lanes: [[0, J], [G.minor, G.edge], [G.late, G.far], [1, J]],
    loops: [{ at: G.quarter, dir: 1 }, { at: G.late, dir: -1, small: true }],
  },
  kilometers: {
    lanes: [[0, J], [G.minor, G.far], [G.late, G.minor], [1, J]],
    loops: [{ at: G.major, dir: -1 }],
  },
  budget: {
    lanes: [[0, J], [G.major, G.edge], [1, J]],
    loops: [{ at: G.minor, dir: 1 }, { at: G.late, dir: -1, small: true }],
  },
  cities: {
    lanes: [[0, J], [G.minor, G.edge], [1, J]],
    loops: [{ at: G.edge, dir: 1, small: true }, { at: G.major, dir: -1 }],
  },
  routes: {
    lanes: [[0, J], [G.quarter, J], [G.late, G.far], [1, J]],
    loops: [{ at: G.quarter, dir: -1 }],
  },
  routesMap: {
    lanes: [[0, J], [G.major, G.edge], [1, J]],
    loops: [{ at: G.late, dir: 1, small: true }],
  },
  recap: {
    lanes: [[0, J], [G.minor, G.edge], [G.late, G.far], [1, J]],
    loops: [{ at: G.minor, dir: 1 }],
  },
} satisfies Record<string, LineSpec>
