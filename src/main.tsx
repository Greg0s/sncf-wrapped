import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
// Self-hosted font (no request to a third-party font service: consistent with "no tracking").
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/500.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/schibsted-grotesk/700.css'
import '@fontsource/schibsted-grotesk/800.css'
import '@fontsource/schibsted-grotesk/900.css'
import './styles/global.css'
import App, { isDebug } from './App'
import { routeOf } from './lib/routes'

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)
// The build prerenders each page into #root (scripts/prerender.tsx): hydrate it when it is the page
// this URL shows. A server that answers with another page's file (e.g. a SPA fallback for a URL without
// its trailing slash) and the ?debug panel start from an empty container instead.
if (container.hasChildNodes() && container.dataset.route === routeOf(window.location.pathname) && !isDebug()) hydrateRoot(container, app)
else {
  container.textContent = ''
  createRoot(container).render(app)
}
