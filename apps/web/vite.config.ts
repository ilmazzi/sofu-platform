import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Use `localhost` (not 127.0.0.1) so Set-Cookie Host matches the browser when you open
      // http://localhost:5173 — otherwise session/XSRF cookies are scoped to 127.0.0.1 and disappear.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/sanctum': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
