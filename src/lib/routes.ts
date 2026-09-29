import type { MouseEvent } from 'react'

/*
 * The site's public pages and their URLs. The wrapped view is deliberately not a route: it holds the
 * user's data and must never be deep-linkable (CLAUDE.md constraint #1), so it lives at the landing's URL.
 * `npm run build` emits one prerendered HTML file per route (scripts/prerender.tsx), since GitHub Pages
 * has no rewrites.
 */

export type Route = 'landing' | 'data' | 'legal'

export const SITE_ORIGIN = 'https://greg0s.github.io'
const BASE = import.meta.env.BASE_URL // '/sncf-wrapped/'

export const ROUTES: Record<Route, { slug: string; title: string; description: string }> = {
  landing: {
    slug: '',
    title: 'SNCF Wrapped : le récap de vos trajets en train',
    description:
      "Transformez l'export RGPD de SNCF Connect en rétrospective animée : kilomètres, villes, trajets favoris, budget. 100 % dans votre navigateur, rien n'est envoyé.",
  },
  data: {
    slug: 'obtenir-mes-donnees/',
    title: 'Récupérer son historique de trajets SNCF Connect (demande RGPD) · SNCF Wrapped',
    description:
      "Demandez à SNCF Connect l'historique de vos trajets en train : e-mail RGPD pré-rempli pour dpo@connect.sncf, réponse sous un mois. Rien n'est envoyé à ce site.",
  },
  legal: {
    slug: 'mentions-legales/',
    title: 'Mentions légales et confidentialité · SNCF Wrapped',
    description:
      "Mentions légales et politique de confidentialité de SNCF Wrapped : votre export SNCF Connect est lu dans votre navigateur et n'est jamais envoyé.",
  },
}

/** Path of a route, under Vite's base: `/sncf-wrapped/mentions-legales/`. */
export const pathOf = (route: Route) => BASE + ROUTES[route].slug

export const canonicalOf = (route: Route) => SITE_ORIGIN + pathOf(route)

/** Route for a location pathname; tolerates a missing trailing slash. Anything unknown is the landing. */
export function routeOf(pathname: string): Route {
  const slug = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : ''
  const normalized = slug && !slug.endsWith('/') ? `${slug}/` : slug
  return (Object.keys(ROUTES) as Route[]).find((r) => ROUTES[r].slug === normalized) ?? 'landing'
}

/**
 * Click handler for an in-site `<a href>`: plain left clicks navigate in place, while modified clicks
 * (new tab, download…) keep the browser's default behaviour.
 */
export function linkClick(go: () => void) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    go()
  }
}

/** Points the document's title, description and canonical at a route, after a client-side navigation. */
export function applyHead(route: Route) {
  const { title, description } = ROUTES[route]
  const url = canonicalOf(route)
  document.title = title
  const set = (selector: string, attr: string, value: string) => document.querySelector(selector)?.setAttribute(attr, value)
  set('meta[name="description"]', 'content', description)
  set('link[rel="canonical"]', 'href', url)
  set('meta[property="og:title"]', 'content', title)
  set('meta[property="og:description"]', 'content', description)
  set('meta[property="og:url"]', 'content', url)
  set('meta[name="twitter:title"]', 'content', title)
  set('meta[name="twitter:description"]', 'content', description)
}
