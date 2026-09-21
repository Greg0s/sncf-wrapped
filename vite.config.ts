import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Site de projet GitHub Pages : servi sous /sncf-wrapped/ (cf. STACK.md §6)
export default defineConfig({
  base: '/sncf-wrapped/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
