import { describe, expect, it } from 'vitest'
import { decodeCsvBytes, readCsvFile } from './decode'
import { toWindows1252 } from './__fixtures__/sncfCsv'

describe('decodeCsvBytes', () => {
  it("décode l'export SNCF (Windows-1252) sans produire de « � »", () => {
    const bytes = toWindows1252('Données - Commandes train bus;Payé en ligne;Option posée;Première')
    expect(bytes).toContain(0xe9) // « é » codé sur un octet, invalide en UTF-8
    const { text, encoding } = decodeCsvBytes(bytes)
    expect(encoding).toBe('windows-1252')
    expect(text).toBe('Données - Commandes train bus;Payé en ligne;Option posée;Première')
    expect(text).not.toContain('�')
  })

  it('lit un fichier UTF-8 (ré-enregistré par un tableur), BOM compris', () => {
    const utf8 = new TextEncoder().encode('﻿Données;Payé')
    const { text, encoding } = decodeCsvBytes(utf8)
    expect(encoding).toBe('utf-8')
    expect(text).toBe('Données;Payé')
  })

  it("accepte l'ASCII pur comme de l'UTF-8", () => {
    expect(decodeCsvBytes(new TextEncoder().encode('a;b')).encoding).toBe('utf-8')
  })

  it('lit un Blob comme un fichier choisi par l’utilisateur', async () => {
    const blob = new Blob([toWindows1252('Payé;Première')])
    expect((await readCsvFile(blob)).text).toBe('Payé;Première')
  })
})
