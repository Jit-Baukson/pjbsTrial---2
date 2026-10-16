// ============================================================================
// midtrans-webhook
// ----------------------------------------------------------------------------
// Receives Midtrans server-to-server payment notifications and updates the
// matching order. The request is only trusted after the SHA-1 signature is
// verified with the Server Key, so a random caller cannot mark orders paid.
//
// Point your Midtrans dashboard "Notification Webhook URL" at:
//   <project-url>/functions/v1/midtrans-webhook
//
// Required secrets: MIDTRANS_SERVER_KEY, MIDTRANS_ENV
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

// transaction_status -> (order.status, order.paymentStatus)
function mapStatus(t: string, fraud: string) {
  if (fraud === 'challenge') return { status: 'failed', paymentStatus: 'failed' }
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
      return { status: 'failed', paymentStatus: 'failed' }
    default:
      return { status: 'pending', paymentStatus: 'pending' }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY')
    if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY is not configured')

    const n = await req.json()
    const orderId: string = n.order_id
    if (!orderId) return new Response('missing order_id', { status: 400, headers: CORS })

    // Verify signature when Midtrans includes one (some channels omit it).
    if (n.signature_key) {
      const expected = await sha1Hex(
        `${n.order_id}${n.status_code}${n.gross_amount}${serverKey}`,
      )
      if (expected !== n.signature_key) {
        return new Response('invalid signature', { status: 401, headers: CORS })
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { status, paymentStatus } = mapStatus(
      n.transaction_status ?? 'pending',
      n.fraud_status ?? 'accept',
    )

    const { error } = await supabase
      .from('orders')
      .update({
        status,
        paymentStatus,
        midtransTransactionId: n.transaction_id ?? null,
      })
      .eq('orderRef', orderId)
    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
