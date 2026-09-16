import { useState } from 'react'
import { CsvImportButton } from '../components/upload/CsvImportButton.tsx'

/**
 * Landing temporaire : un seul bouton d'import, le temps de brancher le
 * parsing puis le récit scrollé.
 */
export function LandingPage() {
  const [fichier, setFichier] = useState<File | null>(null)

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <header className="flex flex-col gap-4">
        <h1 className="bg-gradient-to-r from-violet-wrapped to-cyan-wrapped bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-6xl">
          Wrapped SNCF
        </h1>
        <p className="mx-auto max-w-md text-balance text-base text-white/70 sm:text-lg">
          Votre année de train, racontée à partir de votre export SNCF Connect.
        </p>
      </header>

      <CsvImportButton onFileSelected={setFichier} />

      {fichier && (
        <p className="text-sm text-white/60">
          Fichier sélectionné : <span className="font-medium text-white">{fichier.name}</span>
        </p>
      )}

      <p className="max-w-sm text-xs leading-relaxed text-white/40">
        Votre fichier est lu dans votre navigateur et n'est envoyé nulle part.
      </p>
    </main>
  )
}
