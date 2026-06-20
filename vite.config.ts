import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // Guard: a production build must not ship pointed at a dev/loopback host.
  // Set VITE_ALLOW_LOCAL_BUILD=1 in a local (gitignored) .env to verify a prod
  // build locally; a clean release checkout has no .env, so the guard stands.
  if (mode === 'production' && env.VITE_ALLOW_LOCAL_BUILD !== '1') {
    const base = env.VITE_API_BASE_URL ?? ''
    const bad = !base || !/^https:\/\//.test(base) || /(localhost|127\.0\.0\.1|10\.0\.2\.2)/.test(base)
    if (bad) {
      throw new Error(
        `Refusing production build: VITE_API_BASE_URL must be an https:// non-loopback host (got "${base}"). ` +
          'Set it in .env.production / the build environment, or VITE_ALLOW_LOCAL_BUILD=1 for a local test build.',
      )
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: true, // expose on LAN so a physical device / emulator can reach the dev server
      port: 5173,
    },
  }
})
