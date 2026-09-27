/*
 * Background line of the wrapped screens (all but Anticipation, whose line threads around its card).
 *
 * The line always runs from the top edge of the screen to its bottom edge, following the scroll. It is
 * built in real pixels from the section's live size (never a stretched viewBox), out of straight runs
 * and true circular arcs joined tangentially, so its curves stay round on any aspect ratio.
 *
 * Proportions follow the golden ratio φ: lanes and turn heights sit at 1/φ⁴, 1/φ², 1/φ, 1 − 1/φ⁴ of the
 * screen, the bend radius is min(W, H) / φ⁴, the loop radius is that radius / φ, and the stroke width
 * is that radius / φ⁶. When a screen is too narrow for a bend, every radius shrinks by the same factor,
 * so the φ ratios hold.
 */

export const PHI = (1 + Math.sqrt(5)) / 2

/** Golden fractions of the screen, used as lanes (x) and turn heights (y). */
export const G = {
  /** 1/φ⁴ ≈ .146 */
  edge: PHI ** -4,
  /** 1/φ³ ≈ .236 */
  quarter: PHI ** -3,
  /** 1/φ² ≈ .382 */
  minor: PHI ** -2,
  /** 1/φ ≈ .618 */
  major: PHI ** -1,
  /** 1 − 1/φ³ ≈ .764 */
  late: 1 - PHI ** -3,
  /** 1 − 1/φ⁴ ≈ .854 */
  far: 1 - PHI ** -4,
} as const

/**
 * A lane change, starting at height `at` (fraction of H) and ending in lane `to` (fraction of W).
 * `loop` adds a crossing curl before the bend, turning away from the target lane.
 */
export type LineStep = { at: number; to: number; loop?: boolean }
/** A line: starting lane (fraction of W) and its lane changes, top to bottom. */
export type LineSpec = { from: number; steps: LineStep[] }

export type BuiltLine = { d: string; strokeWidth: number }

const round = (v: number) => Math.round(v * 10) / 10

/** Builds the SVG path of `spec` for a W × H screen, in pixels. */
export function buildScrollLine(spec: LineSpec, W: number, H: number): BuiltLine {
  const base = Math.min(W, H) / PHI ** 4
  // Shrink every radius together when a lane change is too narrow for it (a bend needs 2R of
  // horizontal room, a loop needs R to cross its own incoming run).
  let k = 1
  let lane = spec.from
  for (const step of spec.steps) {
    const dx = Math.abs(step.to - lane) * W
    if (dx > 0) k = Math.min(k, dx / (step.loop ? base : 2 * base))
    lane = step.to
  }
  const R = base * k
  const r = R / PHI
  const strokeWidth = round(Math.min(6, Math.max(2.5, base / PHI ** 6)))
  const pad = strokeWidth * 2

  let x = spec.from * W
  let y = -pad
  const parts = [`M ${round(x)} ${round(y)}`]
  const to = (px: number, py: number) => `${round(px)} ${round(py)}`

  for (const step of spec.steps) {
    const b = step.to * W
    const dir = Math.sign(b - x)
    if (dir === 0) continue
    // Heading down: turning east is counter-clockwise on screen (sweep 0), turning west clockwise (1).
    const toward = dir > 0 ? 0 : 1
    const away = 1 - toward
    if (step.loop) {
      // Leave room above the curl so it crosses a visible stretch of the incoming run.
      const y0 = Math.max(step.at * H, y + 2 * r)
      // 270° curl away from the target: ends one radius above y0, heading toward the target lane,
      // crossing the incoming vertical run.
      const cx = x - dir * r
      parts.push(`L ${to(x, y0)}`, `A ${round(r)} ${round(r)} 0 1 ${away} ${to(cx, y0 - r)}`)
      parts.push(`L ${to(b - dir * R, y0 - r)}`, `A ${round(R)} ${round(R)} 0 0 ${away} ${to(b, y0 - r + R)}`)
      y = y0 - r + R
    } else {
      const y0 = Math.max(step.at * H, y)
      parts.push(`L ${to(x, y0)}`, `A ${round(R)} ${round(R)} 0 0 ${toward} ${to(x + dir * R, y0 + R)}`)
      parts.push(`L ${to(b - dir * R, y0 + R)}`, `A ${round(R)} ${round(R)} 0 0 ${away} ${to(b, y0 + 2 * R)}`)
      y = y0 + 2 * R
    }
    x = b
  }
  parts.push(`L ${to(x, Math.max(H + pad, y))}`)
  return { d: parts.join(' '), strokeWidth }
}

/*
 * One line per screen. Loops only start from the inner lanes (minor / major), so their curl, which
 * turns away from the target lane, stays on screen on phones.
 */
export const SCREEN_LINES = {
  teaser: { from: G.major, steps: [{ at: G.quarter, to: G.edge, loop: true }, { at: G.major, to: G.far }] },
  kilometers: { from: G.far, steps: [{ at: G.edge, to: G.minor }, { at: G.major, to: G.far, loop: true }] },
  budget: { from: G.minor, steps: [{ at: G.minor, to: G.far, loop: true }, { at: G.late, to: G.edge }] },
  cities: { from: G.edge, steps: [{ at: G.quarter, to: G.major }, { at: G.major, to: G.edge, loop: true }] },
  routes: { from: G.minor, steps: [{ at: G.edge, to: G.far, loop: true }, { at: G.major, to: G.edge }] },
  routesMap: { from: G.far, steps: [{ at: G.quarter, to: G.edge }, { at: G.late, to: G.far }] },
  recap: { from: G.edge, steps: [{ at: G.edge, to: G.major }, { at: G.major, to: G.edge, loop: true }] },
} satisfies Record<string, LineSpec>
