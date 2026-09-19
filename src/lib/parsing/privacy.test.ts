import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Guard rail for constraint #1 of CLAUDE.md: the CSV's content never leaves the browser.
 * No file of the application (outside tests and development scripts) may use a network API or a
 * dependency that emits one. If a legitimate need arises (e.g. loading a static asset), add it here
 * explicitly, with justification, after verifying that none of the user's data goes through it.
 */

const SRC = resolve(__dirname, '../..')
const NETWORK_APIS = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bsendBeacon\b/,
  /\bWebSocket\b/,
  /\bEventSource\b/,
  /\bnavigator\.connection\b/,
  /import\s*\(\s*['"`]https?:/,
  /<script[^>]+src=["']https?:/i,
  /\bgtag\s*\(|\bga\s*\(|\bplausible\b|\bposthog\b|\bsentry\b|\bmixpanel\b/i,
]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [path] : []
  })
}

describe('confidentialité : traitement 100 % côté client', () => {
  const files = sourceFiles(SRC)

  it('inspecte bien le code de l’application', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it.each(files.map((f) => [relative(SRC, f), f]))('%s : aucune API réseau ni traceur', (_name, file) => {
    const code = readFileSync(file, 'utf8')
    for (const pattern of NETWORK_APIS) expect(code, `${pattern} trouvé`).not.toMatch(pattern)
  })

  it('n’embarque aucun export personnel dans le dépôt (les CSV sont ignorés par git)', () => {
    const gitignore = readFileSync(resolve(SRC, '../.gitignore'), 'utf8')
    expect(gitignore).toMatch(/^\*\.csv$/m)
  })
})
