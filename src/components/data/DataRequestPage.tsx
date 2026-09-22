import { useRef, useState, type ChangeEvent } from 'react'
import { css } from '../../lib/css'

/*
 * "Get your data": helps draft the GDPR request to SNCF Connect. First name, last name and email are
 * only used to pre-fill the message on the device; nothing is sent to this site (the button opens the
 * user's mail client via a mailto link).
 */

const MAIL_TO = 'dpo@connect.sncf'
const MAIL_SUBJECT = "Demande d'accès à mes données personnelles (art. 15 et 20 du RGPD)"

function buildMailBody(firstName: string, lastName: string, email: string): string {
  return [
    'Madame, Monsieur le Délégué à la Protection des Données,',
    '',
    "Conformément aux articles 15 et 20 du Règlement Général sur la Protection des Données (RGPD), je vous sollicite afin d'exercer mon droit d'accès concernant l'ensemble des données personnelles me concernant, détenues par SNCF Connect.",
    '',
    'Voici les informations associées à mon compte :',
    `Nom : ${lastName.trim() || 'xxx'}`,
    `Prénom : ${firstName.trim() || 'xxx'}`,
    `Adresse e-mail du compte : ${email.trim() || 'xxx'}`,
    '',
    "Je souhaite recevoir l'intégralité de ces informations sous un format structuré, couramment utilisé et lisible par machine (type JSON ou CSV).",
    '',
    "Je vous remercie de bien vouloir me transmettre ces données dans le délai d'un mois prévu par l'article 12.3 du RGPD.",
    '',
    "Dans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
  ].join('\n')
}

export function DataRequestPage({
  backHome,
  goImport,
  openLegal,
}: {
  backHome: () => void
  goImport: () => void
  openLegal: () => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [mailOpen, setMailOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [touched, setTouched] = useState(false)
  const [copied, setCopied] = useState('')
  const timer = useRef(0)

  const mailBody = buildMailBody(firstName, lastName, email)
  const okMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const [errFirst, errLast, errEmail] = [touched && !firstName.trim(), touched && !lastName.trim(), touched && !okMail]
  const notSent = !sent
  const hasBlanks = mailBody.includes('xxx')
  const mailToggleLabel = mailOpen ? 'Masquer −' : 'Afficher +'
  const addressLabel = copied === 'to' ? 'Adresse copiée ✓' : "Copier l'adresse"
  const subjectLabel = copied === 'subject' ? 'Objet copié ✓' : "Copier l'objet"
  const bodyLabel = copied === 'body' ? 'Message copié ✓' : 'Copier le message'

  const setFirst = (e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)
  const setLast = (e: ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)
  const setEmailValue = (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)
  const toggleMail = () => setMailOpen(!mailOpen)
  const unsend = () => setSent(false)

  const copy = (text: string, key: string) => {
    const done = () => {
      setCopied(key)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(''), 1800)
    }
    void navigator.clipboard.writeText(text).then(done, done)
  }
  const copyAddress = () => copy(MAIL_TO, 'to')
  const copySubject = () => copy(MAIL_SUBJECT, 'subject')
  const copyBody = () => copy(mailBody, 'body')

  const sendMail = () => {
    if (!firstName.trim() || !lastName.trim() || !okMail) {
      setTouched(true)
      setMailOpen(true)
      return
    }
    window.location.href = `mailto:${MAIL_TO}?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(mailBody)}`
    setSent(true)
    setTouched(false)
  }

  return (
    <div style={css(`min-height: 100svh; background: #0E1219; padding: 0 clamp(12px, 3.5vw, 40px) clamp(24px, 5vw, 56px);`)}>
      <header
        style={css(
          `display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 4px; max-width: 1180px; margin: 0 auto;`,
        )}
      >
        <button
          type="button"
          onClick={backHome}
          style={css(
            `font-family: 'Schibsted Grotesk', sans-serif; font-size: 14px; font-weight: 600; color: #F1F4F7; background: #1B2130; border: none; border-radius: 999px; padding: 11px 18px; cursor: pointer; transition: background .2s ease;`,
          )}
          className="hv-bg-262E40"
        >
          ← Retour
        </button>
      </header>
      <main style={css(`max-width: 1180px; margin: 0 auto; display: flex; flex-direction: column; gap: clamp(12px, 2vw, 20px);`)}>
        <section style={css(`background: #1B2130; border-radius: 28px; padding: clamp(22px, 4.5vw, 44px); position: relative; overflow: hidden;`)}>
          <svg
            viewBox="0 0 320 90"
            preserveAspectRatio="none"
            style={css(`position: absolute; right: -4%; top: 10%; width: min(50%, 330px); height: auto; opacity: .4; pointer-events: none;`)}
          >
            <path
              d="M2 74 C 46 74, 58 28, 106 34 C 144 39, 140 78, 106 72 C 76 66, 88 24, 132 16 C 190 4, 232 52, 316 26"
              fill="none"
              stroke="#8DE8FD"
              strokeWidth="2.2"
              strokeLinecap="round"
              style={css(`stroke-dasharray: 8 10; animation: dashy 3.4s linear infinite; stroke: var(--ac);`)}
            />
          </svg>
          <div style={css(`position: relative; display: flex; flex-direction: column; gap: 14px; max-width: 620px;`)}>
            <div style={css(`font-size: 13px; font-weight: 600; color: #8DE8FD; color: var(--ac);`)}>Étape préalable</div>
            <h1
              style={css(
                `margin: 0; font-size: clamp(30px, 6.5vw, 58px); line-height: .98; letter-spacing: -.04em; font-weight: 800; max-width: 18ch; text-wrap: balance;`,
              )}
            >
              Obtenir vos données de voyage
            </h1>
            <p style={css(`margin: 0; font-size: clamp(15px, 1.9vw, 19px); line-height: 1.5; color: #AEB7C6; max-width: 52ch;`)}>
              Pour obtenir votre récap, il faut avoir vos données d'historique SNCF connect. Heureusement, le RGPD vous donne le droit de
              demander vos données : suivez les étapes ci-dessous pour demander vos données en 1 minute chrono.
            </p>
          </div>
        </section>
        <div className="tuto-flow">
          <div
            className="tuto-step1"
            style={css(
              `background: #1B2130; border-radius: 22px; padding: clamp(16px, 2.6vw, 24px); display: flex; flex-direction: column; gap: 10px;`,
            )}
          >
            {sent ? (
              <div
                style={css(
                  `width: 30px; height: 30px; border-radius: 50%; background: #2FBF71; color: #0E1219; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800;`,
                )}
              >
                ✓
              </div>
            ) : (
              <div
                style={css(
                  `width: 30px; height: 30px; border-radius: 50%; background: #8DE8FD; color: #0E1219; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; background: var(--ac);`,
                )}
              >
                1
              </div>
            )}
            <h3 style={css(`margin: 0; font-size: 17px; font-weight: 700; letter-spacing: -.02em;`)}>Envoyez la demande</h3>
            <p style={css(`margin: 0; font-size: 14px; line-height: 1.5; color: #AEB7C6;`)}>
              Indiquez vos informations et envoyez l'email prérempli en moins de 30s.
            </p>
          </div>
          <div
            className="tuto-step2"
            style={css(
              `background: #1B2130; border-radius: 22px; padding: clamp(16px, 2.6vw, 24px); display: flex; flex-direction: column; gap: 10px;`,
            )}
          >
            {sent ? (
              <div
                style={css(
                  `width: 30px; height: 30px; border-radius: 50%; background: #8DE8FD; color: #0E1219; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; background: var(--ac);`,
                )}
              >
                2
              </div>
            ) : (
              <div
                style={css(
                  `width: 30px; height: 30px; border-radius: 50%; border: 1.5px solid rgba(241,244,247,.3); color: #AEB7C6; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;`,
                )}
              >
                2
              </div>
            )}
            <h3 style={css(`margin: 0; font-size: 17px; font-weight: 700; letter-spacing: -.02em;`)}>Attendez la réponse</h3>
            <p style={css(`margin: 0; font-size: 14px; line-height: 1.5; color: #AEB7C6;`)}>Sous 1 mois maximum, souvent 2 semaines environ.</p>
          </div>
          <div
            className="tuto-step3"
            style={css(
              `background: #1B2130; border-radius: 22px; padding: clamp(16px, 2.6vw, 24px); display: flex; flex-direction: column; gap: 10px;`,
            )}
          >
            <div
              style={css(
                `width: 30px; height: 30px; border-radius: 50%; border: 1.5px solid rgba(241,244,247,.3); color: #AEB7C6; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;`,
              )}
            >
              3
            </div>
            <h3 style={css(`margin: 0; font-size: 17px; font-weight: 700; letter-spacing: -.02em;`)}>Revenez importer</h3>
            <p style={css(`margin: 0; font-size: 14px; line-height: 1.5; color: #AEB7C6;`)}>
              Déposez le fichier reçu ici, et votre récap se génère aussitôt.
            </p>
          </div>
          {notSent && (
            <section
              className="tuto-form"
              style={css(
                `background: #1B2130; border-radius: 28px; padding: clamp(18px, 3.4vw, 34px); display: flex; flex-direction: column; gap: 18px;`,
              )}
            >
              <div style={css(`display: flex; flex-direction: column; gap: 6px;`)}>
                <h2 style={css(`margin: 0; font-size: clamp(19px, 2.6vw, 25px); font-weight: 800; letter-spacing: -.03em;`)}>Vos informations</h2>
                <p style={css(`margin: 0; font-size: 14px; line-height: 1.5; color: #8A93A6; max-width: 58ch;`)}>
                  Elles servent uniquement à pré-remplir l'e-mail sur votre appareil. Rien n'est envoyé à ce site.
                </p>
              </div>
              <div style={css(`display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px;`)}>
                <label style={css(`display: flex; flex-direction: column; gap: 7px;`)}>
                  <span style={css(`font-size: 13px; font-weight: 600; color: #AEB7C6;`)}>Prénom</span>
                  <input
                    type="text"
                    value={firstName}
                    onChange={setFirst}
                    placeholder="Camille"
                    style={css(
                      `font-family: 'Schibsted Grotesk', sans-serif; font-size: 16px; color: #F1F4F7; background: #151A25; border: 1.5px solid rgba(241,244,247,.14); border-radius: 14px; padding: 13px 15px; outline: none; width: 100%;`,
                    )}
                    className="focus-accent"
                  />
                  {errFirst && (
                    <>
                      <span style={css(`font-size: 12px; color: #FF9B8A;`)}>Ce champ est nécessaire pour identifier votre compte.</span>
                    </>
                  )}
                </label>
                <label style={css(`display: flex; flex-direction: column; gap: 7px;`)}>
                  <span style={css(`font-size: 13px; font-weight: 600; color: #AEB7C6;`)}>Nom</span>
                  <input
                    type="text"
                    value={lastName}
                    onChange={setLast}
                    placeholder="Durand"
                    style={css(
                      `font-family: 'Schibsted Grotesk', sans-serif; font-size: 16px; color: #F1F4F7; background: #151A25; border: 1.5px solid rgba(241,244,247,.14); border-radius: 14px; padding: 13px 15px; outline: none; width: 100%;`,
                    )}
                    className="focus-accent"
                  />
                  {errLast && (
                    <>
                      <span style={css(`font-size: 12px; color: #FF9B8A;`)}>Ce champ est nécessaire pour identifier votre compte.</span>
                    </>
                  )}
                </label>
                <label style={css(`display: flex; flex-direction: column; gap: 7px;`)}>
                  <span style={css(`font-size: 13px; font-weight: 600; color: #AEB7C6;`)}>E-mail du compte SNCF Connect</span>
                  <input
                    type="email"
                    value={email}
                    onChange={setEmailValue}
                    placeholder="camille.durand@email.fr"
                    style={css(
                      `font-family: 'Schibsted Grotesk', sans-serif; font-size: 16px; color: #F1F4F7; background: #151A25; border: 1.5px solid rgba(241,244,247,.14); border-radius: 14px; padding: 13px 15px; outline: none; width: 100%;`,
                    )}
                    className="focus-accent"
                  />
                  {errEmail && (
                    <>
                      <span style={css(`font-size: 12px; color: #FF9B8A;`)}>Indiquez l'adresse de votre compte, c'est elle qui sert de preuve.</span>
                    </>
                  )}
                </label>
              </div>
              <div style={css(`display: flex; justify-content: flex-start; padding: 2px 0`)}>
                <button
                  type="button"
                  onClick={sendMail}
                  style={css(
                    `font-family: 'Schibsted Grotesk', sans-serif; font-size: 17px; font-weight: 700; color: #0E1219; background: #8DE8FD; border: none; border-radius: 999px; padding: 16px 30px; cursor: pointer; transition: transform .18s ease, filter .2s ease; background: var(--ac);`,
                  )}
                  className="hv-cta"
                >
                  Envoyer mon mail
                </button>
              </div>
              <div style={css(`height: 1px; background: rgba(241,244,247,.12);`)} />
              <div>
                <button
                  type="button"
                  onClick={toggleMail}
                  style={css(
                    `width: 100%; text-align: left; font-family: 'Schibsted Grotesk', sans-serif; background: transparent; border: none; padding: 0; cursor: pointer; color: #F1F4F7; display: flex; align-items: center; justify-content: space-between; gap: 12px;`,
                  )}
                >
                  <span style={css(`display: flex; flex-direction: column; gap: 3px; min-width: 0;`)}>
                    <span style={css(`font-size: 15px; font-weight: 700; letter-spacing: -.02em;`)}>Vous préférez copier le texte vous-même ?</span>
                    <span style={css(`font-size: 13px; color: #8A93A6;`)}>
                      Voir et copier l'e-mail, pour l'envoyer depuis le client de votre choix
                    </span>
                  </span>
                  <span style={css(`font-size: 13px; color: #8A93A6; flex: 0 0 auto;`)}>{mailToggleLabel}</span>
                </button>
                {mailOpen && (
                  <>
                    <div
                      style={css(
                        `margin-top: 14px; display: flex; flex-direction: column; gap: 10px; animation: popIn .24s cubic-bezier(.16,.84,.26,1) both;`,
                      )}
                    >
                      <div style={css(`display: flex; flex-wrap: wrap; gap: 8px;`)}>
                        <button
                          type="button"
                          onClick={copyAddress}
                          style={css(
                            `font-family: 'Schibsted Grotesk', sans-serif; font-size: 13px; font-weight: 600; color: #F1F4F7; background: #262E40; border: none; border-radius: 999px; padding: 9px 16px; cursor: pointer; transition: background .2s ease;`,
                          )}
                          className="hv-bg-333D54"
                        >
                          {addressLabel}
                        </button>
                        <button
                          type="button"
                          onClick={copySubject}
                          style={css(
                            `font-family: 'Schibsted Grotesk', sans-serif; font-size: 13px; font-weight: 600; color: #F1F4F7; background: #262E40; border: none; border-radius: 999px; padding: 9px 16px; cursor: pointer; transition: background .2s ease;`,
                          )}
                          className="hv-bg-333D54"
                        >
                          {subjectLabel}
                        </button>
                        <button
                          type="button"
                          onClick={copyBody}
                          style={css(
                            `font-family: 'Schibsted Grotesk', sans-serif; font-size: 13px; font-weight: 700; color: #8DE8FD; background: transparent; border: 1.5px solid #8DE8FD; border-radius: 999px; padding: 8px 16px; cursor: pointer; border-color: var(--ac);`,
                          )}
                        >
                          <span style={css(`color: #8DE8FD; color: var(--ac);`)}>{bodyLabel}</span>
                        </button>
                      </div>
                      <div
                        style={css(
                          `background: #151A25; border-radius: 18px; padding: clamp(14px, 2.4vw, 20px); display: flex; flex-direction: column; gap: 12px;`,
                        )}
                      >
                        <div style={css(`display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 14px; line-height: 1.5;`)}>
                          <span style={css(`color: #8A93A6; flex: 0 0 auto;`)}>À</span>
                          <span style={css(`font-weight: 600; overflow-wrap: anywhere;`)}>dpo@connect.sncf</span>
                        </div>
                        <div style={css(`display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 14px; line-height: 1.5;`)}>
                          <span style={css(`color: #8A93A6; flex: 0 0 auto;`)}>Objet</span>
                          <span style={css(`font-weight: 600; min-width: 0; overflow-wrap: anywhere;`)}>
                            Demande d'accès à mes données personnelles (art. 15 et 20 du RGPD)
                          </span>
                        </div>
                        <div style={css(`height: 1px; background: rgba(241,244,247,.12);`)} />
                        <div style={css(`font-size: 14px; line-height: 1.6; color: #DCE1EA; white-space: pre-wrap;`)}>{mailBody}</div>
                      </div>
                      {hasBlanks && (
                        <>
                          <p style={css(`margin: 0; font-size: 13px; color: #8A93A6;`)}>
                            Les mentions « xxx » se remplissent au fur et à mesure que vous complétez les champs ci-dessus.
                          </p>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          )}
          {sent && (
            <section
              className="tuto-form"
              style={css(
                `background: #1B2130; border-radius: 28px; padding: clamp(20px, 4vw, 40px); display: flex; flex-direction: column; gap: 18px; animation: popIn .3s cubic-bezier(.16,.84,.26,1) both;`,
              )}
            >
              <div style={css(`display: flex; align-items: center; gap: 14px;`)}>
                <div
                  style={css(
                    `width: 46px; height: 46px; flex: 0 0 auto; border-radius: 50%; background: #2FBF71; color: #0E1219; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800;`,
                  )}
                >
                  ✓
                </div>
                <div style={css(`min-width: 0;`)}>
                  <h2 style={css(`margin: 0 0 4px; font-size: clamp(19px, 2.6vw, 25px); font-weight: 800; letter-spacing: -.03em;`)}>
                    Demande prête à partir
                  </h2>
                  <p style={css(`margin: 0; font-size: 14px; color: #8A93A6;`)}>
                    Votre application mail s'est ouverte avec le message pré-rempli. Vérifiez-le et envoyez-le.
                  </p>
                </div>
              </div>
              <div style={css(`display: flex; flex-wrap: wrap; gap: 10px;`)}>
                <button
                  type="button"
                  onClick={goImport}
                  style={css(
                    `font-family: 'Schibsted Grotesk', sans-serif; font-size: 16px; font-weight: 700; color: #0E1219; background: #8DE8FD; border: none; border-radius: 999px; padding: 15px 26px; cursor: pointer; transition: transform .18s ease, filter .2s ease; background: var(--ac);`,
                  )}
                  className="hv-cta"
                >
                  J'ai déjà mon fichier, l'importer
                </button>
                <button
                  type="button"
                  onClick={unsend}
                  style={css(
                    `font-family: 'Schibsted Grotesk', sans-serif; font-size: 16px; font-weight: 600; color: #F1F4F7; background: transparent; border: 1.5px solid rgba(241,244,247,.35); border-radius: 999px; padding: 14px 24px; cursor: pointer; transition: border-color .2s ease;`,
                  )}
                  className="hv-border"
                >
                  Revoir le message
                </button>
              </div>
            </section>
          )}
        </div>
        <footer
          style={css(
            `display: flex; flex-wrap: wrap; gap: 8px 24px; justify-content: space-between; font-size: 13px; color: #6C768A; padding: 8px 6px 0;`,
          )}
        >
          <span>Projet non officiel — par Greg</span>
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
    </div>
  )
}
