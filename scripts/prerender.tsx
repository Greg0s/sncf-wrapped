// Prerenders the landing into dist/index.html after `vite build`, so crawlers that don't run JS (Bing,
// GPTBot, ClaudeBot, PerplexityBot, Common Crawl…) read the page's text; the browser then hydrates it
// (src/main.tsx). Only data-free markup is rendered here: the App's initial state is the landing, with
// no file imported. The wrapped view stays 100 % client-side (CLAUDE.md constraint #1).
//   npm run build (runs it) — or, on an existing build: vite-node scripts/prerender.tsx
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from '../src/App'

const file = resolve(import.meta.dirname, '../dist/index.html')
const EMPTY_ROOT = '<div id="root"></div>'

const html = readFileSync(file, 'utf8')
if (!html.includes(EMPTY_ROOT)) throw new Error(`${file}: no empty ${EMPTY_ROOT} to fill (already prerendered?)`)

// Same tree as src/main.tsx, so hydration matches.
const markup = renderToString(
  <StrictMode>
    <App />
  </StrictMode>,
)
if (!markup.includes('<h1')) throw new Error('Prerendered landing has no <h1>: did the initial view change?')

writeFileSync(file, html.replace(EMPTY_ROOT, `<div id="root">${markup}</div>`))
console.log(`Prerendered the landing into ${file} (${(markup.length / 1024).toFixed(1)} kB of HTML)`)
