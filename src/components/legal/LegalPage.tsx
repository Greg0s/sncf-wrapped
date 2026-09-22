import type { ReactNode } from 'react'
import { css } from '../../lib/css'

/*
 * Legal notice + privacy policy in one page, reachable from a footer link. Content only: no state, no
 * network calls (kept out of scope of privacy.test.ts's file scan since it holds no logic).
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={css(`background: #1B2130; border-radius: 24px; padding: clamp(18px, 3.4vw, 32px); display: flex; flex-direction: column; gap: 12px;`)}>
      <h2 style={css(`margin: 0; font-size: clamp(18px, 2.4vw, 22px); font-weight: 800; letter-spacing: -.02em;`)}>{title}</h2>
      <div style={css(`display: flex; flex-direction: column; gap: 10px; font-size: 15px; line-height: 1.6; color: #DCE1EA;`)}>{children}</div>
    </section>
  )
}

export function LegalPage({ backHome }: { backHome: () => void }) {
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
            `font-family: 'Schibsted Grotesk', sans-serif; font-size: 14px; font-weight: 600; color: #F1F4F7; background: #1B2130; border: none; border-radius: 999px; padding: 11px 18px; cursor: pointer; transition: background .2s ease; display: inline-flex; align-items: center; gap: 8px;`,
          )}
          className="hv-bg-262E40"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="M11 18l-6-6 6-6" />
          </svg>
          <span>Retour</span>
        </button>
      </header>
      <main style={css(`max-width: 1180px; margin: 0 auto; display: flex; flex-direction: column; gap: clamp(12px, 2vw, 20px);`)}>
        <section style={css(`background: #1B2130; border-radius: 28px; padding: clamp(22px, 4.5vw, 44px);`)}>
          <div style={css(`font-size: 13px; font-weight: 600; color: #8DE8FD; color: var(--ac);`)}>Informations légales</div>
          <h1
            style={css(
              `margin: 10px 0 0; font-size: clamp(28px, 6vw, 48px); line-height: 1.02; letter-spacing: -.03em; font-weight: 800; max-width: 20ch;`,
            )}
          >
            Mentions légales
          </h1>
        </section>

        <Section title="Éditeur du site">
          <p style={css(`margin: 0;`)}>
            Ce site est un projet personnel, à titre non professionnel, édité par une personne physique (« Greg »). Conformément à l'article 6-III
            de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique, l'éditeur, personne physique n'agissant pas à titre
            professionnel, n'est pas tenu de rendre publiques les informations d'identification prévues par cet article, sous réserve de les avoir
            communiquées à son hébergeur.
          </p>
          <p style={css(`margin: 0;`)}>
            Contact :{' '}
            <a href="https://github.com/Greg0s/sncf-wrapped/issues" style={css(`color: #8DE8FD; color: var(--ac);`)}>
              issues du dépôt GitHub
            </a>
            .
          </p>
        </Section>

        <Section title="Hébergement">
          <p style={css(`margin: 0;`)}>
            Le site est hébergé par GitHub, Inc., via le service GitHub Pages (88 Colin P Kelly Jr Street, San Francisco, CA 94107, États-Unis).
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p style={css(`margin: 0;`)}>
            « SNCF Wrapped » est un projet non officiel, sans lien avec la SNCF ni avec Spotify. « SNCF » et « SNCF Connect » sont des marques
            déposées appartenant à leurs titulaires respectifs.
          </p>
          <p style={css(`margin: 0;`)}>
            Le code source est consultable sur le{' '}
            <a href="https://github.com/Greg0s/sncf-wrapped" style={css(`color: #8DE8FD; color: var(--ac);`)}>
              dépôt GitHub du projet
            </a>
            . Les données de référence des gares et villes proviennent de SNCF Open Data (licence ODbL) et de l'IGN Admin Express (Licence Ouverte
            / Etalab).
          </p>
        </Section>

        <Section title="Traitement des données personnelles">
          <p style={css(`margin: 0;`)}>Ce site ne collecte, ne stocke et ne transmet aucune donnée personnelle.</p>
          <ul style={css(`margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px;`)}>
            <li>
              Le fichier que vous déposez est lu et traité entièrement par votre navigateur : aucun envoi vers un serveur, aucun stockage, aucun
              partage avec un tiers.
            </li>
            <li>
              Aucun compte utilisateur, aucun cookie, aucun outil de mesure d'audience ou de publicité, aucune police ou script tiers chargé depuis
              un serveur externe.
            </li>
            <li>
              La page « Obtenir mes données » ne fait que préremplir, sur votre appareil, un e-mail vers le délégué à la protection des données de
              SNCF Connect : les informations saisies (nom, prénom, e-mail) ne sont jamais transmises à ce site.
            </li>
          </ul>
          <p style={css(`margin: 0; padding-top: 4px;`)}>
            <strong>Journalisation technique par l'hébergeur.</strong> Comme tout hébergeur web, GitHub Pages peut journaliser techniquement
            certaines informations liées aux requêtes (par exemple l'adresse IP) au niveau de son infrastructure, dans le cadre strict de la
            délivrance des pages du site. Ce traitement est réalisé par GitHub, indépendamment de l'éditeur de ce site, qui n'y a pas accès et
            n'exerce aucun contrôle dessus.
          </p>
          <p style={css(`margin: 0;`)}>
            <strong>Vos droits.</strong> Aucune donnée personnelle n'étant collectée ni conservée par ce site, il n'y a rien à rectifier,
            supprimer ou exporter auprès de son éditeur. Pour les données que la SNCF détient sur vous, voir la page « Obtenir mes données ».
          </p>
        </Section>

        <Section title="Responsabilité">
          <p style={css(`margin: 0;`)}>
            Les statistiques affichées (kilomètres, budget, classements…) sont calculées à partir du fichier que vous déposez et comportent des
            approximations : les distances sont estimées à vol d'oiseau puis majorées d'un facteur correcteur, et aucune durée de trajet n'est
            disponible dans le fichier source. L'éditeur ne garantit pas l'exactitude de ces résultats.
          </p>
        </Section>

        <Section title="Droit applicable">
          <p style={css(`margin: 0;`)}>Les présentes mentions sont soumises au droit français.</p>
        </Section>

        <footer
          style={css(
            `display: flex; flex-wrap: wrap; gap: 8px 24px; justify-content: space-between; font-size: 13px; color: #6C768A; padding: 8px 6px 0;`,
          )}
        >
          <span>
            Projet non officiel — par{' '}
            <a
              href="https://gregoiretinn.es"
              target="_blank"
              rel="noopener noreferrer"
              style={css(`color: #F1F4F7; text-decoration: underline; border-bottom: none; transition: opacity .2s ease;`)}
              className="hv-opacity-80"
            >
              Greg
            </a>
          </span>
        </footer>
      </main>
    </div>
  )
}
