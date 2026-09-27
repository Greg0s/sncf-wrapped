import { describe, expect, it } from 'vitest'
import { JUNCTION, PHI, SCREEN_LINES, buildScrollLine, laneX, sampleScrollLine } from './scrollLinePath'

// Screen sizes: small phone, phone, tablet, desktop, wide desktop.
const SIZES: [number, number][] = [
  [320, 568],
  [390, 844],
  [820, 1180],
  [1440, 900],
  [2560, 1080],
]
const SPECS = Object.entries(SCREEN_LINES)

describe('scroll line', () => {
  it.each(SIZES)('every screen line runs from above the top edge to below the bottom edge (%i × %i)', (W, H) => {
    for (const [, spec] of SPECS) {
      const { points } = sampleScrollLine(spec, W, H)
      expect(points[0][1]).toBeLessThan(0)
      expect(points[points.length - 1][1]).toBeGreaterThan(H)
      for (const [x, y] of points) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
        expect(x).toBeGreaterThan(-W * 0.1)
        expect(x).toBeLessThan(W * 1.1)
      }
    }
  })

  it.each(SIZES)('every screen line meets its neighbours in the junction lane, heading straight down (%i × %i)', (W, H) => {
    const Jx = laneX(JUNCTION, W, H)
    for (const [, spec] of SPECS) {
      const { points } = sampleScrollLine(spec, W, H)
      for (const edge of [0, H]) {
        // Where the stroke crosses the edge: in the junction lane, with no sideways slope, so the next
        // screen's line picks up right there.
        const i = points.findIndex(([, y], k) => k > 0 && points[k - 1][1] <= edge && y > edge)
        expect(i).toBeGreaterThan(0)
        const [[x0, y0], [x1, y1]] = [points[i - 1], points[i]]
        // Linear interpolation between samples: within a px or two, well under the stroke width.
        expect(Math.abs(x0 + ((x1 - x0) * (edge - y0)) / (y1 - y0) - Jx)).toBeLessThan(2)
        // Chord slope across the edge: only curvature over one sample step (the tangent at the edge
        // itself is vertical); a line crossing the edge on a slant would show far more.
        expect(Math.abs((x1 - x0) / (y1 - y0))).toBeLessThan(0.35)
      }
    }
  })

  it.each(SIZES)('only goes back up inside a loop (%i × %i)', (W, H) => {
    for (const [, spec] of SPECS) {
      const { points, loops } = sampleScrollLine(spec, W, H)
      const reach = Math.max(...loops.map((l) => 2 * l.r + l.span), 0)
      const loopYs = spec.loops.map((l) => l.at * H)
      for (let i = 1; i < points.length; i++) {
        const [, y] = points[i]
        if (y < points[i - 1][1] - 0.01) expect(loopYs.some((ly) => Math.abs(y - ly) < reach)).toBe(true)
      }
    }
  })

  it('sizes loops from the screen, keeping φ between big and small ones', () => {
    const { loops } = sampleScrollLine(SCREEN_LINES.teaser, 390, 844)
    expect(loops[0].r).toBeCloseTo(390 / PHI ** 5, 5)
    expect(loops[0].r / loops[1].r).toBeCloseTo(PHI, 5)
  })

  it('makes each loop cross itself', () => {
    // The curl outruns the line mid-turn: along the line's direction, the stroke moves backwards.
    const { points, loops } = sampleScrollLine(SCREEN_LINES.kilometers, 390, 844)
    const { T } = loops[0]
    const backwards = points.some((p, i) => i > 0 && (p[0] - points[i - 1][0]) * T[0] + (p[1] - points[i - 1][1]) * T[1] < 0)
    expect(backwards).toBe(true)
  })

  it('outputs one smooth cubic path', () => {
    const { d } = buildScrollLine(SCREEN_LINES.recap, 1440, 900)
    expect(d).toMatch(/^M [-\d.]+ [-\d.]+( C [-\d.]+ [-\d.]+, [-\d.]+ [-\d.]+, [-\d.]+ [-\d.]+)+$/)
  })
})
