export type CsvEncoding = 'utf-8' | 'windows-1252'

/**
 * L'export SNCF Connect est encodé en Windows-1252 (« é » = 0xE9) : lu en UTF-8, il donnerait « � ».
 * On tente UTF-8 strict (fichier ré-enregistré par un tableur, BOM inclus) puis on retombe sur Windows-1252.
 */
export function decodeCsvBytes(bytes: ArrayBuffer | Uint8Array): { text: string; encoding: CsvEncoding } {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(view), encoding: 'utf-8' }
  } catch {
    return { text: new TextDecoder('windows-1252').decode(view), encoding: 'windows-1252' }
  }
}

/** Lit un fichier choisi par l'utilisateur, en local (File API) : le contenu ne quitte jamais le navigateur. */
export async function readCsvFile(file: Blob): Promise<{ text: string; encoding: CsvEncoding }> {
  return decodeCsvBytes(await file.arrayBuffer())
}
