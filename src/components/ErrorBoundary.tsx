import { Component, type ErrorInfo, type ReactNode } from 'react'
import { css } from '../lib/css'

/**
 * Filet de sécurité : un fichier inattendu ne doit jamais laisser une page blanche. On affiche un message
 * et un retour à l'accueil (qui remonte tout le parcours, donc efface le fichier importé de la mémoire).
 */
export class ErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Uniquement dans la console locale : rien n'est envoyé.
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div style={css(`min-height: 100svh; display: flex; align-items: center; justify-content: center; padding: 24px; background: #0E1219;`)}>
        <div style={css(`max-width: 460px; background: #1B2130; border-radius: 28px; padding: clamp(20px, 4vw, 32px); display: flex; flex-direction: column; gap: 14px;`)}>
          <h1 style={css(`margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -.03em;`)}>Oups, ce fichier a fait dérailler le récap.</h1>
          <p style={css(`margin: 0; font-size: 15px; line-height: 1.5; color: #AEB7C6;`)}>
            Une erreur inattendue est survenue en construisant votre récap. Rien n'a été envoyé ni conservé. Vous pouvez réessayer avec le même fichier ou un autre.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ failed: false })
              this.props.onReset()
            }}
            style={css(
              `align-self: flex-start; font-family: 'Schibsted Grotesk', sans-serif; font-size: 16px; font-weight: 700; color: #0E1219; background: var(--ac, #8DE8FD); border: none; border-radius: 999px; padding: 13px 24px; cursor: pointer;`,
            )}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }
}
