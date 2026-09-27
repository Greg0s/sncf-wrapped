import { describe, expect, it } from 'vitest'
import { PHI, SCREEN_LINES, buildScrollLine, sampleScrollLine } from './scrollLinePath'

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
