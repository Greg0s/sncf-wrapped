import { describe, expect, it } from 'vitest'
import { G, PHI, buildScrollLine, type LineSpec } from './scrollLinePath'

const SPEC: LineSpec = {
  from: G.major,
  steps: [
    { at: G.quarter, to: G.edge, loop: true },
    { at: G.major, to: G.far },
  ],
}

// Screen sizes: small phone, phone, tablet, desktop, wide desktop.
const SIZES: [number, number][] = [
  [320, 568],
  [390, 844],
  [820, 1180],
  [1440, 900],
  [2560, 1080],
]

function points(d: string): { cmd: string; nums: number[] }[] {
  return [...d.matchAll(/([MLA])([^MLA]*)/g)].map((m) => ({ cmd: m[1], nums: m[2].trim().split(/[\s,]+/).map(Number) }))
}

describe('buildScrollLine', () => {
  it.each(SIZES)('runs from above the top edge to below the bottom edge (%i × %i)', (W, H) => {
    const segs = points(buildScrollLine(SPEC, W, H).d)
    const first = segs[0].nums
    const last = segs[segs.length - 1].nums
    expect(first[1]).toBeLessThan(0)
    expect(last[last.length - 1]).toBeGreaterThan(H)
    expect(last[last.length - 2]).toBeCloseTo(G.far * W, 0)
  })

  it.each(SIZES)('keeps arcs circular with radii in the golden ratio (%i × %i)', (W, H) => {
    const arcs = points(buildScrollLine(SPEC, W, H).d).filter((s) => s.cmd === 'A')
    for (const a of arcs) expect(a.nums[0]).toBe(a.nums[1])
    const radii = [...new Set(arcs.map((a) => a.nums[0]))].sort((x, y) => x - y)
    expect(radii).toHaveLength(2)
    expect(radii[1] / radii[0]).toBeCloseTo(PHI, 1)
  })

  it('shrinks radii together, keeping φ, when lanes are too close for a full bend', () => {
    const narrow: LineSpec = { from: G.minor, steps: [{ at: G.minor, to: G.major }] }
    const W = 320
    const arcs = points(buildScrollLine(narrow, W, 568).d).filter((s) => s.cmd === 'A')
    // Two quarter arcs of radius R fit exactly in the lane gap.
    expect(2 * arcs[0].nums[0]).toBeLessThanOrEqual((G.major - G.minor) * W + 0.2)
  })

  it('never goes back up except inside a loop', () => {
    const plain: LineSpec = { from: G.edge, steps: [{ at: G.minor, to: G.far }, { at: G.late, to: G.minor }] }
    const ys = points(buildScrollLine(plain, 390, 844).d).map((s) => s.nums[s.nums.length - 1])
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1])
  })
})
