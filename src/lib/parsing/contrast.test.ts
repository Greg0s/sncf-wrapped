import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// WCAG 2 relative luminance / contrast ratio: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const chan = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)
}

function contrastRatio(hexA: string, hexB: string): number {
  const [lighter, darker] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

const BACKGROUND = '0E1219' // src/styles/global.css body background

function srcFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return srcFiles(full)
    return /\.tsx?$/.test(full) && !full.endsWith('.test.ts') ? [full] : []
  })
}

describe('muted gray text contrast on the dark background', () => {
  it('computes WCAG contrast ratios correctly (reference pairs)', () => {
    expect(contrastRatio('FFFFFF', '000000')).toBeCloseTo(21, 0)
    expect(contrastRatio('000000', '000000')).toBeCloseTo(1, 1)
  })

  // The project's muted "secondary text" gray (rank numbers, footer links, hints) sits directly on
  // the page background in every component that uses it, unlike other hex literals in these files
  // (e.g. #0E1219 used as dark text on a light pill/button, not as foreground on the page itself).
  it('every use of the muted gray as `color:` meets WCAG AA (4.5:1) against the page background', () => {
    const offenders: string[] = []
    for (const file of srcFiles(join(__dirname, '..', '..', 'components'))) {
      const text = readFileSync(file, 'utf-8')
      for (const match of text.matchAll(/color:\s*#(727D92|6C768A)\b/gi)) {
        const hex = match[1].toUpperCase()
        const ratio = contrastRatio(hex, BACKGROUND)
        if (ratio < 4.5) offenders.push(`${file}: #${hex} (${ratio.toFixed(2)}:1)`)
      }
    }
    expect(offenders).toEqual([])
  })
})
