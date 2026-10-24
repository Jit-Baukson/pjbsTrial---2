// @ts-nocheck — Deno Edge Function. Deno globals and URL imports are resolved
// by the Supabase Edge Runtime, not by the browser app's TypeScript project.
// ============================================================================
// midtrans-webhook
// ----------------------------------------------------------------------------
// Receives Midtrans server-to-server payment notifications and applies the
// status transition through the trusted apply_payment_status() database
// function. The request is only accepted after the SHA-1 signature has been
// verified with the Server Key, so a random caller cannot mark orders paid.
//
// Point the Midtrans dashboard "Notification Webhook URL" at:
//   <project-url>/functions/v1/midtrans-webhook
//
// Required secrets: MIDTRANS_SERVER_KEY, MIDTRANS_ENV
// This function must be deployed with verify_jwt = false (see config.toml).
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// `crypto` is a Deno global (WebCrypto); no import needed.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-1', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Constant-time comparison for the signature string.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// transaction_status -> (order.status, order.paymentStatus)
function mapStatus(t: string, fraud: string) {
  // A challenged capture is not final: keep it pending for manual review.
  if (fraud === 'challenge') return { status: 'pending', paymentStatus: 'pending' }
  // A denied capture is a failed payment, even though transaction_status is capture.
  if (fraud === 'deny') return { status: 'failed', paymentStatus: 'failed' }

  switch (t) {
    case 'settlement':
    case 'capture':
      return { status: 'paid', paymentStatus: 'settlement' }
    case 'authorize':
    case 'authorization':
    case 'pending':
      return { status: 'pending', paymentStatus: 'pending' }
    case 'cancel':
    case 'insecure':
      return { status: 'failed', paymentStatus: 'cancel' }
    case 'expire':
      return { status: 'expired', paymentStatus: 'expire' }
    case 'refund':
      return { status: 'refunded', paymentStatus: 'refund' }
    case 'deny':
    case 'failure':
      return { status: 'failed', paymentStatus: 'failed' }
    default:
      return { status: 'pending', paymentStatus: 'pending' }
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY')
    if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY is not configured')

    const n = await req.json().catch(() => null)
    const orderId: string = n?.order_id
    const signature: string = n?.signature_key
    if (!orderId) return json({ error: 'missing order_id' }, 400)
    if (!signature) return json({ error: 'missing signature_key' }, 401)

    const expected = await sha1Hex(
      `${n.order_id}${n.status_code}${n.gross_amount}${serverKey}`,
    )
    if (!safeEqual(expected, signature)) {
      return json({ error: 'invalid signature' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    const { status, paymentStatus } = mapStatus(
      n.transaction_status ?? 'pending',
      n.fraud_status ?? 'accept',
    )

    // custom_field1 is our own order ref (set when creating the Snap session);
    // fall back to order_id for notifications created before this change.
    const orderRef = n.custom_field1 ?? orderId

    const { data, error } = await supabase.rpc('apply_payment_status', {
      p_order_ref: orderRef,
      p_status: status,
      p_payment_status: paymentStatus,
      p_transaction_id: n.transaction_id ?? null,
    })

    if (error) {
      console.error('apply_payment_status failed', error)
      return json({ error: 'Could not update order status' }, 500)
    }

    return json({ ok: true, result: data })
  } catch (err) {
    console.error(err)
    return json({ error: (err as Error)?.message ?? String(err) }, 500)
  }
})
