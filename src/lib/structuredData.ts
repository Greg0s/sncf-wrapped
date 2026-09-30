import { canonicalOf, ROUTES, type Route } from './routes'

/*
 * Schema.org structured data (JSON-LD) for the public pages, so search engines and generative engines
 * don't have to guess what the site is. `scripts/prerender.tsx` inlines it into each page's <head>:
 * static JSON, nothing loaded from anywhere (CLAUDE.md constraint #1). Whatever it states must match the
 * page's visible text, which is why the data-request steps are shared with `DataRequestPage`.
 */

const AUTHOR = { '@type': 'Person', name: 'Greg', url: 'https://gregoiretinn.es' }

/** The three steps of the data-request page, shown on the page and described by its HowTo. */
export const DATA_REQUEST_STEPS = [
  { name: 'Envoyez la demande', text: "Indiquez vos informations et envoyez l'email prérempli en moins de 30s." },
  { name: 'Attendez la réponse', text: 'Sous 1 mois maximum, souvent 2 semaines environ.' },
  { name: 'Revenez importer', text: 'Déposez le fichier reçu ici, et votre récap se génère aussitôt.' },
] as const

/** The page's JSON-LD object, or null for a page that has none. */
export function structuredDataOf(route: Route): Record<string, unknown> | null {
  const url = canonicalOf(route)
  switch (route) {
    case 'landing':
      return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'SNCF Wrapped',
        url,
        description: ROUTES.landing.description,
        inLanguage: 'fr',
        applicationCategory: 'TravelApplication',
        operatingSystem: 'Web',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' },
        author: AUTHOR,
      }
    case 'data':
      return {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'Obtenir vos données de voyage',
        description: ROUTES.data.description,
        url,
        inLanguage: 'fr',
        step: DATA_REQUEST_STEPS.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
      }
    case 'legal':
      return null
  }
}

/**
 * The page's `<script type="application/ld+json">` tag, or '' when it has none. `<` is escaped so no
 * string can close the script element early.
 */
export function jsonLdScriptOf(route: Route): string {
  const data = structuredDataOf(route)
  return data ? `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>` : ''
}
