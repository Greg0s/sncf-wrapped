import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Garde-fou de la contrainte n°1 de CLAUDE.md : le contenu du CSV ne quitte jamais le navigateur.
 * Aucun fichier de l'application (hors tests et scripts de développement) ne doit utiliser d'API réseau ni de
 * dépendance qui en émette. Si un besoin légitime apparaît (ex. charger un asset statique), l'ajouter ici
 * explicitement, avec la justification, après vérification que rien de l'utilisateur ne transite.
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
    return /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : []
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
