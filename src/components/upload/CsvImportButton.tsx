import { useRef } from 'react'
import type { ChangeEvent } from 'react'

type CsvImportButtonProps = {
  onFileSelected: (file: File) => void
}

/**
 * Bouton d'import : déclenche un `<input type="file">` masqué.
 * Le fichier reste un objet `File` local — aucun envoi réseau.
 */
export function CsvImportButton({ onFileSelected }: CsvImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (file) {
      onFileSelected(file)
    }

    // Réinitialise la valeur pour que re-sélectionner le même fichier
    // déclenche bien un nouvel événement `change`.
    event.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full max-w-xs cursor-pointer rounded-full bg-gradient-to-r from-violet-wrapped to-cyan-wrapped px-8 py-4 text-base font-semibold text-nuit transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-wrapped active:scale-[0.98] sm:w-auto sm:text-lg"
      >
        Importer mon CSV
      </button>
    </>
  )
}
