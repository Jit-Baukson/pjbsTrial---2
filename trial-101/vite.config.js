import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Fail the Netlify build early when the public runtime configuration is
// missing, instead of shipping a bundle that crashes with a blank page.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']
  const missing = required.filter((key) => !env[key])

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Add them to .env.local or Netlify Site configuration.',
    )
  }

  if (!env.VITE_MIDTRANS_CLIENT_KEY) {
    const message =
      'VITE_MIDTRANS_CLIENT_KEY is empty. Checkout payments will be unavailable.'
    const productionDeploy =
      env.VITE_MIDTRANS_ENV === 'production' || process.env.CONTEXT === 'production'
    if (productionDeploy) {
      throw new Error(`${message} Refusing to build a production bundle without it.`)
    }
    console.warn(`[vite] ${message}`)
  }

  if (process.env.CONTEXT === 'production' && env.VITE_MIDTRANS_ENV !== 'production') {
    throw new Error(
      'VITE_MIDTRANS_ENV must be "production" on Netlify production builds. ' +
        'Use a Deploy Preview for sandbox payments.',
    )
  }

  return {
    plugins: [react()],
  }
})
