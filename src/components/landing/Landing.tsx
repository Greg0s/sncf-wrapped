import { useRef, type ReactNode } from 'react'
import { css } from '../../lib/css'
import { useLandingReveal } from '../wrapped/useReveal'

export function Landing({
  openData,
  openImport,
  openLegal,
  modal,
}: {
  openData: () => void
  openImport: () => void
  openLegal: () => void
  modal: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  useLandingReveal(root)
  return (
    <div ref={root} style={css(`min-height: 100svh; background: #0E1219; padding: 0 clamp(12px, 3.5vw, 40px) clamp(24px, 5vw, 56px);`)}>
      <header
        style={css(
          `display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 4px; max-width: 1180px; margin: 0 auto;`,
        )}
      >
        <div style={css(`display: flex; align-items: center; gap: 10px;`)}>
          <div
            style={css(
              `width: 26px; height: 26px; border-radius: 50%; background: #8DE8FD; position: relative; overflow: hidden; background: var(--ac);`,
            )}
          >
            <div style={css(`position: absolute; left: 11px; top: 0; bottom: 0; width: 13px; background: #0E1219; border-radius: 13px 0 0 13px;`)} />
          </div>
          <span style={css(`font-weight: 700; font-size: 17px; letter-spacing: -.02em;`)}>SNCF Wrapped</span>
        </div>
        <button
          type="button"
          onClick={openData}
          style={css(
            `font-family: 'Schibsted Grotesk', sans-serif; font-size: 14px; font-weight: 600; color: #F1F4F7; background: #1B2130; border: none; border-radius: 999px; padding: 11px 18px; cursor: pointer; transition: background .2s ease;`,
          )}
          className="hv-bg-262E40"
        >
          Obtenir mes données
        </button>
      </header>
      <main style={css(`max-width: 1180px; margin: 0 auto; display: flex; flex-direction: column; gap: clamp(12px, 2vw, 20px);`)}>
        <section
          data-lanim="scale"
          style={css(`background: #1B2130; border-radius: 28px; padding: clamp(24px, 5vw, 56px); position: relative; overflow: hidden;`)}
        >
          <svg
            viewBox="0 0 420 120"
            preserveAspectRatio="none"
            style={css(`position: absolute; right: -6%; top: 6%; width: min(62%, 460px); height: auto; opacity: .55; pointer-events: none;`)}
          >
            <path
              d="M4 96 C 60 96, 74 40, 132 48 C 178 55, 172 104, 130 96 C 96 89, 108 38, 158 26 C 224 10, 268 66, 330 50 C 372 39, 392 22, 414 16"
              fill="none"
              stroke="#8DE8FD"
              strokeWidth="2.4"
              strokeLinecap="round"
              style={css(`stroke-dasharray: 8 10; animation: dashy 3.4s linear infinite; stroke: var(--ac);`)}
            />
          </svg>
          <div style={css(`position: relative; display: flex; flex-direction: column; gap: clamp(16px, 3vw, 24px); max-width: 720px;`)}>
            <div style={css(`font-size: 13px; font-weight: 600; letter-spacing: .04em; color: #8DE8FD; color: var(--ac);`)}>
              Bilan de vos trajets en train
            </div>
            <h1
              style={css(
                `margin: 0; font-size: clamp(38px, 8.4vw, 92px); line-height: .94; letter-spacing: -.045em; font-weight: 800; max-width: 16ch; text-wrap: balance;`,
              )}
            >
              Les chiffres marquants de vos années sur les rails
            </h1>
            <p style={css(`margin: 0; font-size: clamp(16px, 2vw, 20px); line-height: 1.5; color: #AEB7C6; max-width: 46ch;`)}>
              Revivez vos voyages en train des années passées et découvrez votre utilisation comme vous ne l'avez jamais vue.
            </p>
            <div style={css(`display: flex; flex-wrap: wrap; gap: 10px; padding-top: 4px;`)}>
              <button
                type="button"
                onClick={openImport}
                style={css(
                  `font-family: 'Schibsted Grotesk', sans-serif; font-size: 17px; font-weight: 700; color: #0E1219; background: #8DE8FD; border: none; border-radius: 999px; padding: 17px 30px; cursor: pointer; transition: transform .18s ease, filter .2s ease; background: var(--ac);`,
                )}
                className="hv-cta cta-import"
              >
                Voir mon récap
              </button>
            </div>
          </div>
        </section>
        <div style={css(`background: #1B2130; border-radius: 999px; overflow: hidden; padding: 9px 0;`)}>
          <div
            style={css(
              `display: flex; width: max-content; animation: marquee 34s linear infinite; font-size: 13px; font-weight: 500; color: #AEB7C6; white-space: nowrap;`,
            )}
          >
            <div style={css(`display: flex; align-items: center;`)}>
              <span style={css(`padding: 0 18px;`)}>Lecture 100% locale</span>
              <span style={css(`color: #8DE8FD; color: var(--ac);`)}>•</span>
              <span style={css(`padding: 0 18px;`)}>#SNCFwrapped</span>
              <span style={css(`color: #8DE8FD; color: var(--ac);`)}>•</span>
              <span style={css(`padding: 0 18px;`)}>Projet non officiel</span>
              <span style={css(`color: #8DE8FD; color: var(--ac);`)}>•</span>
            </div>
            <div style={css(`display: flex; align-items: center;`)}>
              <span style={css(`padding: 0 18px;`)}>Lecture 100% locale</span>
              <span style={css(`color: #8DE8FD; color: var(--ac);`)}>•</span>
              <span style={css(`padding: 0 18px;`)}>#SNCFwrapped</span>
              <span style={css(`color: #8DE8FD; color: var(--ac);`)}>•</span>
              <span style={css(`padding: 0 18px;`)}>Projet non officiel</span>
              <span style={css(`color: #8DE8FD; color: var(--ac);`)}>•</span>
            </div>
          </div>
        </div>
        <section style={css(`display: grid; grid-template-columns: repeat(auto-fit, minmax(232px, 1fr)); gap: clamp(12px, 2vw, 20px);`)}>
          <div
            data-lanim="up"
            style={css(
              `background: #8DE8FD; color: #0E1219; border-radius: 24px; padding: clamp(16px, 2.4vw, 22px); aspect-ratio: 4/3; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; transition: transform .25s ease; background: var(--ac);`,
            )}
            className="hv-lift-5"
          >
            <div style={css(`display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 13px; font-weight: 600;`)}>
              <span>Kilomètres</span>
              <span style={css(`opacity: .55;`)}>01</span>
            </div>
            <div style={css(`display: flex; align-items: baseline; gap: 7px;`)}>
              <span style={css(`font-size: clamp(30px, 4.6vw, 46px); font-weight: 800; letter-spacing: -.045em; line-height: .9;`)}>31 144</span>
              <span style={css(`font-size: 15px; font-weight: 600;`)}>km</span>
            </div>
            <div style={css(`position: relative; height: 30px;`)}>
              <div
                style={css(`position: absolute; left: 0; right: 0; top: 13px; height: 1.5px; background: rgba(14,18,25,.9); border-radius: 2px;`)}
              />
              <div
                style={css(
                  `position: absolute; left: 0; right: 0; top: 17px; height: 5px; background-image: repeating-linear-gradient(90deg, rgba(14,18,25,.4) 0 2px, transparent 2px 13px);`,
                )}
              />
              <div style={css(`position: absolute; left: 3%; top: 0; display: flex; align-items: flex-end; gap: 2px;`)}>
                <div style={css(`width: 26px; height: 13px; background: #0E1219; border-radius: 3px 8px 2px 2px;`)} />
                <div style={css(`width: 16px; height: 10px; background: rgba(14,18,25,.75); border-radius: 2px;`)} />
                <div style={css(`width: 16px; height: 10px; background: rgba(14,18,25,.45); border-radius: 2px;`)} />
              </div>
              <div style={css(`position: absolute; left: 44%; top: 10px; width: 8px; height: 8px; border-radius: 50%; background: #0E1219;`)} />
              <div
                style={css(
                  `position: absolute; right: 0; top: 9px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #0E1219; background: #8DE8FD;`,
                )}
              />
            </div>
            <div style={css(`font-size: 13px; font-weight: 500; opacity: .8;`)}>0,78 tour de la Terre</div>
          </div>
          <div
            data-lanim="up"
            data-delay="90"
            style={css(
              `background: #1B2130; border-radius: 24px; padding: clamp(16px, 2.4vw, 22px); aspect-ratio: 4/3; display: flex; flex-direction: column; justify-content: space-between; transition: transform .25s ease;`,
            )}
            className="hv-lift-5"
          >
            <div style={css(`display: flex; align-items: center; justify-content: space-between; gap: 10px;`)}>
              <div style={css(`display: flex; gap: 6px;`)}>
                <div
                  style={css(
                    `width: 24px; height: 24px; border-radius: 50%; background: #F3BB67; color: #0E1219; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800;`,
                  )}
                >
                  $
                </div>
                <div
                  style={css(
                    `width: 24px; height: 24px; border-radius: 50%; background: #F3BB67; color: #0E1219; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800;`,
                  )}
                >
                  $
                </div>
              </div>
              <span style={css(`font-size: 13px; font-weight: 600; color: #6C768A;`)}>02</span>
            </div>
            <div style={css(`display: flex; align-items: flex-end; gap: 5px; height: 42px;`)}>
              <div style={css(`flex: 1; height: 38%; background: rgba(243,187,103,.3); border-radius: 4px;`)} />
              <div style={css(`flex: 1; height: 56%; background: rgba(243,187,103,.3); border-radius: 4px;`)} />
              <div style={css(`flex: 1; height: 44%; background: rgba(243,187,103,.3); border-radius: 4px;`)} />
              <div style={css(`flex: 1; height: 72%; background: rgba(243,187,103,.6); border-radius: 4px;`)} />
              <div style={css(`flex: 1; height: 100%; background: #F3BB67; border-radius: 4px;`)} />
              <div style={css(`flex: 1; height: 61%; background: rgba(243,187,103,.6); border-radius: 4px;`)} />
              <div style={css(`flex: 1; height: 34%; background: rgba(243,187,103,.3); border-radius: 4px;`)} />
            </div>
            <div>
              <div style={css(`font-size: clamp(30px, 4.6vw, 46px); font-weight: 800; letter-spacing: -.045em; line-height: .9; color: #F3BB67;`)}>
                2 438 €
              </div>
              <div style={css(`font-size: 13px; color: #AEB7C6; margin-top: 7px;`)}>31 € par trajet · pic en juillet</div>
            </div>
          </div>
          <div
            data-lanim="up"
            data-delay="180"
            style={css(
              `background: #1B2130; border-radius: 24px; padding: clamp(16px, 2.4vw, 22px); aspect-ratio: 4/3; display: flex; flex-direction: column; justify-content: space-between; transition: transform .25s ease;`,
            )}
            className="hv-lift-5"
          >
            <div
              style={css(
                `display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: 13px; font-weight: 600; color: #AEB7C6;`,
              )}
            >
              <span>Top destinations</span>
              <span style={css(`color: #6C768A;`)}>03</span>
            </div>
            <div style={css(`display: flex; flex-direction: column; gap: 10px;`)}>
              <div>
                <div style={css(`display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;`)}>
                  <span style={css(`font-size: 16px; font-weight: 700;`)}>Paris</span>
                  <span style={css(`font-size: 13px; color: #AEB7C6;`)}>24</span>
                </div>
                <div style={css(`height: 5px; width: 100%; background: #8DE8FD; border-radius: 999px; background: var(--ac);`)} />
              </div>
              <div>
                <div style={css(`display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;`)}>
                  <span style={css(`font-size: 16px; font-weight: 700;`)}>Marseille</span>
                  <span style={css(`font-size: 13px; color: #AEB7C6;`)}>5</span>
                </div>
                <div style={css(`height: 5px; width: 42%; background: rgba(241,244,247,.28); border-radius: 999px;`)} />
              </div>
              <div>
                <div style={css(`display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;`)}>
                  <span style={css(`font-size: 16px; font-weight: 700;`)}>Nantes</span>
                  <span style={css(`font-size: 13px; color: #AEB7C6;`)}>4</span>
                </div>
                <div style={css(`height: 5px; width: 34%; background: rgba(241,244,247,.28); border-radius: 999px;`)} />
              </div>
            </div>
            <div style={css(`display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6C768A;`)}>
              <span style={css(`width: 7px; height: 7px; border-radius: 50%; background: #6C768A;`)} />
              <span
                style={css(
                  `flex: 1 1 auto; height: 1px; background-image: repeating-linear-gradient(90deg, rgba(108,118,138,.8) 0 3px, transparent 3px 7px);`,
                )}
              />
              <span>5 villes</span>
            </div>
          </div>
        </section>
        <section style={css(`display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: clamp(12px, 2vw, 20px);`)}>
          <div
            data-lanim="up"
            style={css(
              `background: #1B2130; border-radius: 24px; padding: clamp(20px, 3vw, 30px); display: flex; flex-direction: column; gap: 12px;`,
            )}
          >
            <div
              style={css(
                `width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid #8DE8FD; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; border-color: var(--ac);`,
              )}
            >
              <span style={css(`color: #8DE8FD; color: var(--ac);`)}>1</span>
            </div>
            <h3 style={css(`margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -.02em;`)}>Demandez votre historique</h3>
            <p style={css(`margin: 0; font-size: 15px; line-height: 1.5; color: #AEB7C6;`)}>
              Une demande d'accès à vos données personnelles suffit. Vous recevez un fichier listant vos trajets.
            </p>
            <button
              type="button"
              onClick={openData}
              style={css(
                `align-self: flex-start; font-family: 'Schibsted Grotesk', sans-serif; font-size: 14px; font-weight: 600; color: #8DE8FD; background: transparent; border: none; padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 4px; color: var(--ac);`,
              )}
            >
              Faire la demande
            </button>
          </div>
          <div
            data-lanim="up"
            data-delay="90"
            style={css(
              `background: #1B2130; border-radius: 24px; padding: clamp(20px, 3vw, 30px); display: flex; flex-direction: column; gap: 12px;`,
            )}
          >
            <div
              style={css(
                `width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid #8DE8FD; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; border-color: var(--ac);`,
              )}
            >
              <span style={css(`color: #8DE8FD; color: var(--ac);`)}>2</span>
            </div>
            <h3 style={css(`margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -.02em;`)}>Déposez le fichier</h3>
            <p style={css(`margin: 0; font-size: 15px; line-height: 1.5; color: #AEB7C6;`)}>
              Il est lu sur place, par votre navigateur. Rien n'est téléversé, aucun compte n'est créé.
            </p>
          </div>
          <div
            data-lanim="up"
            data-delay="180"
            style={css(
              `background: #1B2130; border-radius: 24px; padding: clamp(20px, 3vw, 30px); display: flex; flex-direction: column; gap: 12px;`,
            )}
          >
            <div
              style={css(
                `width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid #8DE8FD; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; border-color: var(--ac);`,
              )}
            >
              <span style={css(`color: #8DE8FD; color: var(--ac);`)}>3</span>
            </div>
            <h3 style={css(`margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -.02em;`)}>Choisissez la période</h3>
            <p style={css(`margin: 0; font-size: 15px; line-height: 1.5; color: #AEB7C6;`)}>
              Une année en particulier ou tout votre historique, puis sept écrans et une carte à partager.
            </p>
          </div>
        </section>
        <section
          data-lanim="up"
          style={css(
            `background: #8DE8FD; color: #0E1219; border-radius: 28px; padding: clamp(22px, 4vw, 44px); display: flex; flex-wrap: wrap; gap: clamp(18px, 3vw, 40px); align-items: center; position: relative; overflow: hidden; background: var(--ac);`,
          )}
        >
          <svg
            viewBox="0 0 300 90"
            preserveAspectRatio="none"
            style={css(`position: absolute; right: -4%; bottom: -8%; width: min(54%, 340px); height: auto; opacity: .45; pointer-events: none;`)}
          >
            <path
              d="M2 74 C 46 74, 58 30, 104 36 C 140 41, 136 78, 104 72 C 76 66, 88 26, 130 18 C 186 6, 224 52, 296 30"
              fill="none"
              stroke="#0E1219"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <div style={css(`width: 52px; height: 62px; flex: 0 0 auto; position: relative; animation: floaty 4.5s ease-in-out infinite;`)}>
            <div style={css(`position: absolute; left: 11px; top: 0; width: 30px; height: 30px; border: 3px solid #0E1219; border-radius: 50%;`)} />
            <div style={css(`position: absolute; left: 0; bottom: 3px; width: 52px; height: 39px; background: #0E1219; border-radius: 12px;`)} />
            <div
              style={css(
                `position: absolute; left: 23px; bottom: 16px; width: 6px; height: 13px; background: #8DE8FD; border-radius: 3px; background: var(--ac);`,
              )}
            />
          </div>
          <div style={css(`flex: 1 1 280px; min-width: 0; position: relative;`)}>
            <h3 style={css(`margin: 0 0 10px; font-size: clamp(20px, 3vw, 30px); font-weight: 800; letter-spacing: -.03em;`)}>
              Aucune de vos données n'est conservée ou analysée
            </h3>
            <p style={css(`margin: 0; font-size: 15px; line-height: 1.55; max-width: 62ch; opacity: .85;`)}>
              Le fichier ne quitte pas votre appareil. Les calculs tournent dans le navigateur : pas de serveur, pas de compte, pas de traçage. Vous
              fermez l'onglet, il ne reste rien.
            </p>
          </div>
          <div
            style={css(`flex: 0 0 auto; font-size: 13px; font-weight: 700; border: 1.5px solid #0E1219; border-radius: 999px; padding: 10px 16px;`)}
          >
            100% côté client
          </div>
        </section>
        <footer
          style={css(
            `display: flex; flex-wrap: wrap; gap: 8px 24px; justify-content: space-between; font-size: 13px; color: #6C768A; padding: 8px 6px 0;`,
          )}
        >
          <span>Projet non officiel — par Greg</span>
          <span>Aperçus : chiffres d'exemple · Contient des données SNCF Open Data (licence ODbL) et IGN Admin Express (Licence Ouverte / Etalab)</span>
          <button
            type="button"
            onClick={openLegal}
            style={css(
              `font-family: 'Schibsted Grotesk', sans-serif; font-size: 13px; color: #6C768A; background: transparent; border: none; padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 3px;`,
            )}
          >
            Mentions légales
          </button>
        </footer>
      </main>
      {modal}
    </div>
  )
}
