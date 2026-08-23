import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On GitHub Pages the app is served from /<repo>/, so the CI build sets
// DEPLOY_TARGET=pages to use that base. Everywhere else (Netlify, local) the
// base stays "/".
const base = process.env.DEPLOY_TARGET === 'pages' ? '/Nexus-review/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
