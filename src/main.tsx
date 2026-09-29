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

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)
// The build prerenders the landing into #root (scripts/prerender.tsx): hydrate it. The ?debug panel
// renders something else entirely, so it starts from an empty container instead.
if (container.hasChildNodes() && !isDebug()) hydrateRoot(container, app)
else {
  container.textContent = ''
  createRoot(container).render(app)
}
