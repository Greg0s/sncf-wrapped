import type { CSSProperties } from 'react'

/*
 * Faithful port of the mockup: its styles are inline CSS strings ("display: flex; gap: 10px;").
 * Rather than retyping them as objects (and risking drifting from the design), we keep them as-is and
 * convert them here into a React `style` object. The result is cached per string.
 */

const cache = new Map<string, CSSProperties>()

/** Splits declarations on ";" while respecting parentheses and quotes (e.g. "url(data:…;base64,…)"). */
function declarations(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quote) {
      if (c === quote) quote = ''
    } else if (c === '"' || c === "'") quote = c
    else if (c === '(') depth++
    else if (c === ')') depth--
    else if (c === ';' && depth === 0) {
      out.push(text.slice(start, i))
      start = i + 1
    }
  }
  out.push(text.slice(start))
  return out.map((s) => s.trim()).filter(Boolean)
}

/** "align-items" → "alignItems", "-webkit-x" → "WebkitX", "--ac" unchanged. */
const propName = (name: string) => (name.startsWith('--') ? name : name.replace(/^-ms-/, 'ms-').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()))

export function css(text: string): CSSProperties {
  const known = cache.get(text)
  if (known) return known
  const style: Record<string, string> = {}
  for (const declaration of declarations(text)) {
    const colon = declaration.indexOf(':')
    if (colon < 1) continue
    style[propName(declaration.slice(0, colon).trim())] = declaration.slice(colon + 1).trim()
  }
  cache.set(text, style as CSSProperties)
  return style as CSSProperties
}
