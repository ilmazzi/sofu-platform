import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Prefer explicit proxy target. Default to artisan serve — on this machine
  // sofu-platform.test is often hijacked by XAMPP (slamin) on port 80.
  const apiTarget = env.VITE_DEV_API_PROXY || 'http://127.0.0.1:18080'

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Use `localhost` (not 127.0.0.1) in the browser so cookies match.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/sanctum': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
