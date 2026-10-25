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

  // Midtrans is optional for a catalog/demo deploy, but the chosen
  // environment must be explicit whenever a client key is supplied.
  const clientKey = env.VITE_MIDTRANS_CLIENT_KEY || ''
  const midtransEnv = env.VITE_MIDTRANS_ENV || 'sandbox'

  if (clientKey && !env.VITE_MIDTRANS_ENV) {
    throw new Error(
      'VITE_MIDTRANS_ENV must be set to "sandbox" or "production" when a client key is configured.',
    )
  }

  if (!clientKey) {
    if (midtransEnv === 'production') {
      throw new Error(
        'VITE_MIDTRANS_CLIENT_KEY is required for a production payment build.',
      )
    }
    console.warn(
      '[vite] VITE_MIDTRANS_CLIENT_KEY is empty. Building in sandbox/demo mode; checkout payments will be unavailable.',
    )
  } else if (midtransEnv !== 'production') {
    console.warn(
      '[vite] Building with Midtrans sandbox. Real payments are disabled; use test payment details.',
    )
  }

  return {
    plugins: [react()],
  }
})
