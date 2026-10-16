import { supabase } from './supabaseClient.js'

// Flat domestic shipping. MUST match the v_shipping default in
// supabase/migrations/20261016120000_ecommerce_schema_and_security.sql
// (create_order). The customer sees this number, but the ORDER TOTAL is always
// recomputed server-side — this value is display-only.
export const SHIPPING_COST = 4500

// Places an order via the trusted create_order() RPC. The client sends ONLY
// product ids + quantities + buyer details; every price is read from the DB.
export async function placeOrder(items, buyer) {
    const payloadItems = items.map((i) => ({ productId: i.productId, quantity: i.quantity }))

    const { data, error } = await supabase.rpc('create_order', {
        p_items: payloadItems,
        p_buyer: {
            name: buyer.name,
            email: buyer.email,
            phone: buyer.phone || null,
            address: buyer.address,
            city: buyer.city,
            postal: buyer.postal || null,
        },
    })

    if (error) throw error
    return data // { orderId, orderRef, subtotal, shippingCost, grandTotal, status }
}
