// @ts-nocheck — Deno Edge Function. Deno globals and URL imports are resolved
// by the Supabase Edge Runtime, not by the browser app's TypeScript project.
// ============================================================================
// midtrans-create-transaction
// ----------------------------------------------------------------------------
// Authenticated checkout endpoint. It verifies the caller owns the pending
// order, reads trusted totals from the database, and asks Midtrans Snap to
// create a payment session. The Midtrans Server Key never leaves this function.
//
// Required secrets:
//   MIDTRANS_SERVER_KEY, MIDTRANS_ENV ("sandbox" | "production")
// Supabase injects SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY into deployed functions.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const sandbox = (Deno.env.get('MIDTRANS_ENV') ?? 'sandbox') === 'sandbox'
const SNAP_BASE = sandbox
  ? 'https://app.sandbox.midtrans.com'
  : 'https://app.midtrans.com'

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
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
    if (!serverKey) throw new HttpError(500, 'MIDTRANS_SERVER_KEY is not configured')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const publicKey =
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    if (!supabaseUrl || !serviceKey || !publicKey) {
      throw new HttpError(500, 'Supabase function secrets are incomplete')
    }

    // Only a signed-in user may start a payment, and only for their own order.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authentication required')
    }

    const authClient = createClient(supabaseUrl, publicKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await authClient.auth.getUser()
    if (userError || !userData.user) {
      throw new HttpError(401, 'Invalid or expired session')
    }

    const body = await req.json().catch(() => null)
    const orderId = body?.orderId
    if (!orderId || typeof orderId !== 'string') {
      throw new HttpError(400, 'orderId is required')
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Read the order + items from the trusted backend (never trust client totals).
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single()

    if (error || !order) throw new HttpError(404, 'Order not found')
    if (order.userId !== userData.user.id) {
      throw new HttpError(403, 'This order belongs to another account')
    }
    if (order.status !== 'pending') {
      throw new HttpError(409, 'Order is not payable')
    }

    const items = (order.order_items ?? []).map((it: any) => ({
      id: it.productCode,
      price: Math.round(Number(it.unitPrice)),
      quantity: it.quantity,
      name: String(it.title || it.productCode).slice(0, 50),
    }))

    // Midtrans requires item_details to sum to gross_amount. Shipping is part
    // of the order total, so it must be a line item too.
    const shipping = Math.round(Number(order.shippingCost))
    if (shipping > 0) {
      items.push({ id: 'SHIPPING', price: shipping, quantity: 1, name: 'Shipping' })
    }

    const grossAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    if (grossAmount !== Math.round(Number(order.grandTotal))) {
      throw new HttpError(500, 'Order total mismatch; payment was not started')
    }

    const res = await fetch(`${SNAP_BASE}/snap/v1/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${btoa(serverKey + ':')}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: order.orderRef, // human-readable ref is the Midtrans order id
          gross_amount: grossAmount,
        },
        item_details: items,
        customer_details: {
          first_name: order.buyerName,
          email: order.buyerEmail,
          billing_address: { address: order.shippingAddress },
        },
        // Preserve our order reference even if a future attempt id is used.
        custom_field1: order.orderRef,
      }),
    })

    const snap = await res.json().catch(() => null)
    if (!res.ok) {
      console.error('Midtrans charge failed', res.status, snap)
      throw new HttpError(502, snap?.message ?? 'Midtrans charge failed')
    }
    if (!snap?.token) throw new HttpError(502, 'Midtrans did not return a payment token')

    // Best-effort correlation id; the webhook also matches on orderRef.
    await supabase
      .from('orders')
      .update({ midtransOrderId: order.orderRef })
      .eq('id', order.id)

    return json({ token: snap.token, redirect_url: snap.redirect_url })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    if (status >= 500) console.error(err)
    return json({ error: (err as Error)?.message ?? String(err) }, status)
  }
})
