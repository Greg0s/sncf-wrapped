import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Déployé sous un domaine personnalisé, servi à la racine (cf. STACK.md §6)
export default defineConfig({
  base: '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
