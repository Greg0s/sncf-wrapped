// Prerenders the site's public pages to static HTML after `vite build`, so crawlers that don't run JS
// (Bing, GPTBot, ClaudeBot, PerplexityBot, Common Crawl…) read their text; the browser then hydrates it
// (src/main.tsx). One file per route of src/lib/routes.ts (dist/index.html, dist/obtenir-mes-donnees/
// index.html…), each with its own title, description, canonical and JSON-LD (src/lib/structuredData.ts): GitHub Pages has no rewrites, and a
// 404.html fallback would answer HTTP 404. Only data-free markup is rendered here, with no file imported.
// The wrapped view has no URL and stays 100 % client-side (CLAUDE.md constraint #1).
// Also writes dist/sitemap.xml from the same routes (src/lib/sitemap.ts).
//   npm run build (runs it) — or, on an existing build: vite-node scripts/prerender.tsx
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from '../src/App'
import { canonicalOf, ROUTES, type Route } from '../src/lib/routes'
import { sitemapXml } from '../src/lib/sitemap'
import { jsonLdScriptOf } from '../src/lib/structuredData'

const dist = resolve(import.meta.dirname, '../dist')
const EMPTY_ROOT = '<div id="root"></div>'

const template = readFileSync(resolve(dist, 'index.html'), 'utf8')
if (!template.includes(EMPTY_ROOT)) throw new Error(`dist/index.html: no empty ${EMPTY_ROOT} to fill (already prerendered?)`)

// Links and canonicals are built from Vite's base: make sure vite-node picked up the build's, not '/'.
if (!template.includes(`src="${import.meta.env.BASE_URL}assets/`)) throw new Error(`BASE_URL ${import.meta.env.BASE_URL} doesn't match the build's asset paths`)

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Swaps the landing's head values (from index.html) for the route's; fails if index.html drifted from ROUTES. */
function head(html: string, route: Route): string {
  const [from, to] = [ROUTES.landing, ROUTES[route]]
  const swaps: [string, string, number][] = [
    [`>${from.title}<`, `>${attr(to.title)}<`, 1], // <title>
    [`content="${from.title}"`, `content="${attr(to.title)}"`, 2], // og:title, twitter:title
    [`content="${from.description}"`, `content="${attr(to.description)}"`, 3],
    [`href="${canonicalOf('landing')}"`, `href="${canonicalOf(route)}"`, 1],
    [`content="${canonicalOf('landing')}"`, `content="${canonicalOf(route)}"`, 1], // og:url
  ]
  for (const [a, b, n] of swaps) {
    const found = html.split(a).length - 1
    if (found !== n) throw new Error(`index.html: expected ${n} × ${a}, found ${found}. Keep it in sync with src/lib/routes.ts.`)
    html = html.replaceAll(a, b)
  }
  if (html.split('</head>').length !== 2) throw new Error('index.html: expected exactly one </head>')
  return html.replace('</head>', `${jsonLdScriptOf(route)}</head>`)
}

for (const route of Object.keys(ROUTES) as Route[]) {
  // Same tree as src/main.tsx, so hydration matches.
  const markup = renderToString(
    <StrictMode>
      <App route={route} />
    </StrictMode>,
  )
  if (!markup.includes('<h1')) throw new Error(`Prerendered ${route} page has no <h1>: did its view change?`)
  const file = resolve(dist, ROUTES[route].slug, 'index.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, head(template, route).replace(EMPTY_ROOT, `<div id="root" data-route="${route}">${markup}</div>`))
  console.log(`Prerendered ${route} into ${file} (${(markup.length / 1024).toFixed(1)} kB of HTML)`)
}

writeFileSync(resolve(dist, 'sitemap.xml'), sitemapXml())
console.log(`Wrote the sitemap of ${Object.keys(ROUTES).length} pages into ${resolve(dist, 'sitemap.xml')}`)
