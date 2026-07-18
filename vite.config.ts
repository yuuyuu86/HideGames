import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // The Electron release opens dist/index.html through file://, while Render
  // serves the same directory over HTTPS. Relative assets work in both modes.
  base: './',
  plugins: [react()],
})
