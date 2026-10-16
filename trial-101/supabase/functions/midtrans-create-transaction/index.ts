// ============================================================================
// midtrans-create-transaction
// ----------------------------------------------------------------------------
// Guest-callable. Takes an orderId that was just created by create_order(),
// reads the TRUSTED totals from the database (service role), and asks Midtrans
// to open a Snap transaction. Returns the { token } the browser hands to
// snap.js to open the payment popup. The Midtrans Server Key never leaves
// this function.
//
// Required secrets (see README "Payments" section):
//   MIDTRANS_SERVER_KEY, MIDTRANS_ENV ("sandbox" | "production")
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY')
    if (!serverKey) throw new Error('MIDTRANS_SERVER_KEY is not configured')

    const { orderId } = await req.json()
    if (!orderId) throw new Error('orderId is required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Read the order + items from the trusted backend (never trust client totals)
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single()
    if (error || !order) throw new Error('Order not found')
    if (order.status !== 'pending') throw new Error('Order is not payable')

    const grossAmount = Math.round(Number(order.grandTotal))

    const res = await fetch(`${SNAP_BASE}/snap/v1/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${btoa(serverKey + ':')}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: order.orderRef, // our human-readable ref is the Midtrans order id
          gross_amount: grossAmount,
        },
        item_details: (order.order_items ?? []).map((it: any) => ({
          id: it.productCode,
          price: Math.round(Number(it.unitPrice)),
          quantity: it.quantity,
          name: it.title,
        })),
        customer_details: {
          first_name: order.buyerName,
          email: order.buyerEmail,
          phone: order.buyerPhone ?? undefined,
          billing_address: {
            address: order.shippingAddress,
            city: order.shippingCity,
            postal_code: order.shippingPostal ?? undefined,
          },
        },
      }),
    })

    const snap = await res.json()
    if (!res.ok) throw new Error(snap?.message ?? 'Midtrans charge failed')

    // Persist the Midtrans order reference for webhook correlation
    await supabase
      .from('orders')
      .update({ midtransOrderId: order.orderRef })
      .eq('id', order.id)

    return new Response(
      JSON.stringify({ token: snap.token, redirect_url: snap.redirect_url }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? String(err) }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
