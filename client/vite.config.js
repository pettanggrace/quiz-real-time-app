import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Le front parle au back-end via un proxy : pas de CORS ni d'URL en dur dans le code.
const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      // Mode duel : WebSocket
      '/ws': { target: BACKEND, ws: true, changeOrigin: true },
    },
  },
})
