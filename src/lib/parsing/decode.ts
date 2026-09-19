export type CsvEncoding = 'utf-8' | 'windows-1252'

/**
 * The SNCF Connect export is encoded in Windows-1252 ("é" = 0xE9): read as UTF-8, it would produce "�".
 * We try strict UTF-8 first (file re-saved by a spreadsheet app, BOM included) then fall back to Windows-1252.
 */
export function decodeCsvBytes(bytes: ArrayBuffer | Uint8Array): { text: string; encoding: CsvEncoding } {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(view), encoding: 'utf-8' }
  } catch {
    return { text: new TextDecoder('windows-1252').decode(view), encoding: 'windows-1252' }
  }
}

/** Reads a file chosen by the user, locally (File API): the content never leaves the browser. */
export async function readCsvFile(file: Blob): Promise<{ text: string; encoding: CsvEncoding }> {
  return decodeCsvBytes(await file.arrayBuffer())
}
