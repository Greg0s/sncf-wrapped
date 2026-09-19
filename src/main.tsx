import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Police auto-hébergée (aucune requête vers un service de polices tiers : cohérent avec « aucun traçage »).
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/500.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/schibsted-grotesk/700.css'
import '@fontsource/schibsted-grotesk/800.css'
import '@fontsource/schibsted-grotesk/900.css'
import './styles/global.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
