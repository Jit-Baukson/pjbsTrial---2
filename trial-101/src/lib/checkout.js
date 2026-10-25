import { supabase } from './supabaseClient.js'

// Flat domestic shipping. MUST match the v_shipping default in
// supabase/migrations/20261019000000_ecommerce.sql (create_order). The customer
// sees this number, but the ORDER TOTAL is always recomputed server-side.
export const SHIPPING_COST = 4500

// Places an order via the trusted create_order() RPC. The client sends ONLY
// product codes + quantities + buyer details; every price is read from the DB.
export async function placeOrder(items, buyer) {
    // Cart lines are unique (individual stickers never bundle), but the order
    // payload is aggregated per product code so create_order() gets one row each.
    const totals = new Map()
    for (const i of items) {
        totals.set(i.productCode, (totals.get(i.productCode) || 0) + i.quantity)
    }
    const payloadItems = [...totals].map(([productCode, quantity]) => ({ productCode, quantity }))

    const { data, error } = await supabase.rpc('create_order', {
        p_items: payloadItems,
        p_buyer: {
            name: buyer.name,
            email: buyer.email,
            ig: buyer.ig,
            meet: buyer.meet,
        },
    })

    if (error) throw error
    return data // { orderId, orderRef, subtotal, shippingCost, grandTotal, status }
}
