import { LandingPage } from './pages/LandingPage.tsx'

/**
 * Parcours à état unique (landing → récit → partage), sans routeur : cf. STACK.md.
 * Seule la landing existe pour l'instant ; l'état d'avancement vivra ici.
 */
export default function App() {
  return <LandingPage />
}
