import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Le site est servi sous un sous-chemin sur GitHub Pages
  // (greg0s.github.io/wrapped-sncf), cf. STACK.md §6.
  base: '/wrapped-sncf/',
  plugins: [react(), tailwindcss()],
})
