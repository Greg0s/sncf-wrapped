import type { MouseEvent } from 'react'
import { css } from '../../lib/css'

interface ChoiceModalProps {
  onHasData: () => void
  onNoData: () => void
  onClose: () => void
}

export function ChoiceModal({ onHasData: hasData, onNoData: noData, onClose: closeChoice }: ChoiceModalProps) {
  const stop = (e: MouseEvent) => e.stopPropagation()
  return (
    <div
      style={css(
        `position: fixed; inset: 0; z-index: 40; background: rgba(6,9,14,.76); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: clamp(14px, 4vw, 40px); animation: veilIn .22s ease both;`,
      )}
      onClick={closeChoice}
    >
      <div
        onClick={stop}
        style={css(
          `width: 100%; max-width: 460px; background: #1B2130; border-radius: 28px; padding: clamp(16px, 3vw, 24px); animation: popIn .28s cubic-bezier(.16,.84,.26,1) both;`,
        )}
      >
        <div style={css(`display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px;`)}>
          <span style={css(`font-size: 17px; font-weight: 700; letter-spacing: -.02em;`)}>Avez-vous déjà vos données ?</span>
          <button
            type="button"
            onClick={closeChoice}
            style={css(
              `font-size: 14px; background: #262E40; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; color: #F1F4F7; transition: background .2s ease;`,
            )}
            className="hv-bg-333D54"
          >
            ✕
          </button>
        </div>
        <div style={css(`display: flex; flex-direction: column; gap: 11px;`)}>
          <button
            type="button"
            onClick={hasData}
            style={css(
              `text-align: left; font-family: 'Schibsted Grotesk', sans-serif; cursor: pointer; display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; border-radius: 18px; border: none; background: #8DE8FD; color: #0E1219; transition: transform .18s ease, filter .2s ease; background: var(--ac);`,
            )}
            className="hv-cta"
          >
            <span style={css(`font-size: 17px; font-weight: 700; letter-spacing: -.02em;`)}>J'ai mes données exportées</span>
            <span style={css(`font-size: 13px; font-weight: 500; opacity: .75;`)}>Importer le fichier reçu de SNCF Connect</span>
          </button>
          <button
            type="button"
            onClick={noData}
            style={css(
              `text-align: left; font-family: 'Schibsted Grotesk', sans-serif; cursor: pointer; display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; border-radius: 18px; border: 1.5px solid rgba(241,244,247,.2); background: #151A25; color: #F1F4F7; transition: border-color .2s ease, background .2s ease;`,
            )}
            className="hv-outline"
          >
            <span style={css(`font-size: 17px; font-weight: 700; letter-spacing: -.02em;`)}>Je n'ai rien</span>
            <span style={css(`font-size: 13px; font-weight: 500; color: #AEB7C6;`)}>Voir comment récupérer mon historique</span>
          </button>
        </div>
      </div>
    </div>
  )
}
