import { Fragment, useId, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { css } from '../../lib/css'

export interface ImportPeriod {
  label: string
  sub: string
  /** Accent color of the period (dot). */
  ac: string
  mark: string
  bd: string
  bg: string
  pick: () => void
}

export type ImportStatus =
  | { status: 'idle' }
  | { status: 'reading'; fileName: string }
  | { status: 'error'; message: string }
  | { status: 'loaded'; fileName: string; summary: string }

interface ImportModalProps {
  state: ImportStatus
  periods: ImportPeriod[]
  /** Chosen file (picker or drag-and-drop): it is read locally, never sent. */
  onFile: (file: File) => void
  onClose: () => void
  onReset: () => void
  onGo: () => void
  /** No file yet: user picks the "how do I get my data" path instead. */
  onNoData: () => void
}

export function ImportModal({
  state,
  periods,
  onFile: pick,
  onClose: closeImport,
  onReset: reset,
  onGo: go,
  onNoData: noData,
}: ImportModalProps) {
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const loaded = state.status === 'loaded' ? state : null
  const notLoaded = !loaded
  const stop = (e: MouseEvent) => e.stopPropagation()
  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) pick(file)
  }
  // The "Choose a file" button is a label: we make it usable from the keyboard (Enter / Space).
  const onLabelKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    input.current?.click()
  }
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) pick(file)
    e.target.value = '' // allows re-selecting the same file
  }
  return (
    <div
      style={css(
        `position: fixed; inset: 0; z-index: 40; background: rgba(6,9,14,.76); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: clamp(14px, 4vw, 40px); animation: veilIn .22s ease both;`,
      )}
      onClick={closeImport}
    >
      <div
        onClick={stop}
        style={css(
          `width: 100%; max-width: 520px; max-height: 92svh; overflow-y: auto; background: #1B2130; border-radius: 28px; padding: clamp(16px, 3vw, 24px); animation: popIn .28s cubic-bezier(.16,.84,.26,1) both;`,
        )}
      >
        <div style={css(`display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px;`)}>
          <span style={css(`font-size: 17px; font-weight: 700; letter-spacing: -.02em;`)}>Importer mon historique</span>
          <button
            type="button"
            onClick={closeImport}
            style={css(
              `font-size: 14px; background: #262E40; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; color: #F1F4F7; transition: background .2s ease;`,
            )}
            className="hv-bg-333D54"
          >
            ✕
          </button>
        </div>
        <div style={css(`display: flex; flex-direction: column; gap: 11px;`)}>
          {notLoaded && (
            <>
              <span style={css(`font-size: 15px; font-weight: 700; letter-spacing: -.02em;`)}>J'ai déjà mes données</span>
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                style={css(
                  `border: 1.5px dashed ${dragging ? '#F1F4F7' : 'rgba(241,244,247,.3)'}; border-radius: 22px; background: ${dragging ? '#0E1219' : '#151A25'}; padding: clamp(22px, 6vw, 36px) 20px; display: flex; flex-direction: column; align-items: center; gap: 13px; text-align: center; transition: border-color .2s ease, background .2s ease;`,
                )}
              >
                <div
                  style={css(
                    `width: 44px; height: 44px; border-radius: 50%; background: #8DE8FD; color: #0E1219; display: flex; align-items: center; justify-content: center; font-size: 19px; animation: floaty 3.6s ease-in-out infinite; background: var(--ac);`,
                  )}
                >
                  ↓
                </div>
                <div style={css(`font-size: 17px; font-weight: 700; letter-spacing: -.02em;`)}>Déposez votre fichier ici</div>
                <div style={css(`font-size: 13px; color: #8A93A6;`)}>CSV — 20 Mo max</div>
                <label
                  htmlFor={inputId}
                  tabIndex={0}
                  role="button"
                  onKeyDown={onLabelKey}
                  style={css(
                    `font-family: 'Schibsted Grotesk', sans-serif; font-size: 15px; font-weight: 700; color: #F1F4F7; background: #262E40; border-radius: 999px; padding: 12px 22px; cursor: pointer; transition: background .2s ease;`,
                  )}
                  className="hv-bg-333D54"
                >
                  Choisir un fichier
                </label>
                <input ref={input} id={inputId} type="file" accept=".csv,text/csv" onChange={onFile} style={css(`display: none;`)} />
              </div>
              {state.status === 'error' && (
                <p role="alert" style={css(`margin: 0; font-size: 13px; line-height: 1.5; color: #FF9B8A;`)}>
                  {state.message}
                </p>
              )}
              <p style={css(`margin: 0; font-size: 13px; line-height: 1.5; color: #8A93A6;`)}>
                {state.status === 'reading'
                  ? `Lecture de ${state.fileName}…`
                  : "Le fichier est lu dans votre navigateur. Il n'est ni envoyé, ni stocké."}
              </p>
              <div style={css(`height: 1px; background: rgba(241,244,247,.12); margin: 3px 0;`)} />
              <button
                type="button"
                onClick={noData}
                style={css(
                  `text-align: left; font-family: 'Schibsted Grotesk', sans-serif; cursor: pointer; display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; border-radius: 18px; border: 1.5px solid rgba(241,244,247,.2); background: #151A25; color: #F1F4F7; transition: border-color .2s ease, background .2s ease;`,
                )}
                className="hv-outline"
              >
                <span style={css(`font-size: 15px; font-weight: 700; letter-spacing: -.02em;`)}>Je n'ai rien</span>
                <span style={css(`font-size: 13px; font-weight: 500; color: #AEB7C6;`)}>Voir comment récupérer mon historique</span>
              </button>
            </>
          )}
          {loaded && (
            <>
              <div style={css(`display: flex; align-items: center; gap: 12px; background: #151A25; border-radius: 18px; padding: 10px 12px;`)}>
                <div
                  style={css(
                    `width: 32px; height: 32px; flex: 0 0 auto; border-radius: 50%; background: #8DE8FD; color: #0E1219; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; background: var(--ac);`,
                  )}
                >
                  ✓
                </div>
                <div style={css(`flex: 1 1 auto; min-width: 0;`)}>
                  <div style={css(`font-size: 14px; font-weight: 700; overflow-wrap: anywhere;`)}>{loaded.fileName}</div>
                  <div style={css(`font-size: 12px; color: #8A93A6; margin-top: 3px;`)}>{loaded.summary}</div>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  style={css(
                    `font-family: 'Schibsted Grotesk', sans-serif; font-size: 13px; font-weight: 600; background: transparent; border: 1px solid rgba(241,244,247,.28); border-radius: 999px; padding: 8px 14px; cursor: pointer; color: #AEB7C6; flex: 0 0 auto; transition: border-color .2s ease;`,
                  )}
                  className="hv-change"
                >
                  Changer
                </button>
              </div>
              <div style={css(`display: flex; flex-direction: column; gap: 6px;`)}>
                <div style={css(`font-size: 13px; font-weight: 600; color: #8A93A6;`)}>Quelle période ?</div>
                {periods.map((p, i) => (
                  <Fragment key={i}>
                    <button
                      type="button"
                      onClick={p.pick}
                      style={css(
                        `text-align: left; font-family: 'Schibsted Grotesk', sans-serif; cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 16px; border: 1.5px solid ${p.bd}; background: ${p.bg}; color: #F1F4F7; transition: transform .16s ease, border-color .2s ease;`,
                      )}
                      className="hv-lift-2"
                    >
                      <span style={css(`width: 20px; height: 20px; flex: 0 0 auto; border-radius: 50%; background: ${p.ac};`)} />
                      <span style={css(`flex: 1 1 auto; min-width: 0;`)}>
                        <span style={css(`display: block; font-size: 16px; font-weight: 700; letter-spacing: -.02em;`)}>{p.label}</span>
                        <span style={css(`display: block; font-size: 12px; color: #8A93A6; margin-top: 2px;`)}>{p.sub}</span>
                      </span>
                      <span style={css(`font-size: 13px; flex: 0 0 auto; color: #8A93A6;`)}>{p.mark}</span>
                    </button>
                  </Fragment>
                ))}
              </div>
              <button
                type="button"
                onClick={go}
                style={css(
                  `font-family: 'Schibsted Grotesk', sans-serif; font-size: 17px; font-weight: 700; color: #0E1219; background: #8DE8FD; border: none; border-radius: 999px; padding: 14px 24px; cursor: pointer; transition: transform .18s ease, filter .2s ease; background: var(--ac);`,
                )}
                className="hv-cta"
              >
                Voir mon récap
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
