import { supabase } from './supabaseClient.js'

// Loads the Midtrans Snap.js popup SDK once, from the sandbox or production
// host depending on VITE_MIDTRANS_ENV. Safe to call repeatedly.
export function loadSnap() {
    const env = import.meta.env.VITE_MIDTRANS_ENV || 'sandbox'
    const host =
        env === 'production'
            ? 'https://app.midtrans.com'
            : 'https://app.sandbox.midtrans.com'

    return new Promise((resolve, reject) => {
        if (window.snap) return resolve(window.snap)

        const existing = document.getElementById('snap-js')
        if (existing) {
            existing.addEventListener('load', () => resolve(window.snap))
            existing.addEventListener('error', reject)
            return
        }

        const s = document.createElement('script')
        s.id = 'snap-js'
        s.src = `${host}/snap/snap.js`
        s.dataset.clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || ''
        s.async = true
        s.onload = () => resolve(window.snap)
        s.onerror = () => reject(new Error('Failed to load Midtrans Snap SDK'))
        document.body.appendChild(s)
    })
}

// Requests a Snap token for an order from the Edge Function (which recomputes
// the amount from the DB), then opens the payment popup.
export async function payForOrder(orderId, { onFinish, onClose } = {}) {
    const { data, error } = await supabase.functions.invoke(
        'midtrans-create-transaction',
        { body: { orderId } }
    )
    if (error) throw error
    if (!data?.token) throw new Error(data?.error || 'Could not start payment')

    const snap = await loadSnap()
    snap.pay(data.token, {
        // Fired when the customer completes the flow in the popup.
        onFinish: () => onFinish?.(),
        // Fired on the "Back"/close button of the popup.
        onClose: () => onClose?.(),
    })

    return data
}
