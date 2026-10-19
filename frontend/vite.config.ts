import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Local dev (start.bat): send /api to the FastAPI backend on :8000.
  // On Vercel, /api/* is routed to the backend service by vercel.json instead.
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
