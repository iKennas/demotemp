import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Temporary: allows the dev server to accept requests coming through the
    // ngrok/Cloudflare tunnel host used for sharing a live demo. Revert to
    // the default (no allowedHosts) for normal local-only development.
    allowedHosts: true,
  },
})
