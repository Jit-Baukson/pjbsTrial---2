import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/shopHeader.jsx'
import Footer from '../components/footer.jsx'
import { useCart } from '../context/cart.jsx'
import { useAuth } from '../context/auth.jsx'
import { formatIDR } from '../lib/format.js'
import { SHIPPING_COST, placeOrder } from '../lib/checkout.js'
import { payForOrder } from '../lib/payments.js'
import { getProfile, saveProfile } from '../lib/profiles.js'

const emptyBuyer = {
    name: '',
    email: '',
    ig: '',
    meet: '',
}

export default function Checkout() {
    const navigate = useNavigate()
    const { items, count, subtotal, clear } = useCart()
    const { user, email: authEmail } = useAuth()

    const [buyer, setBuyer] = useState(emptyBuyer)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [pendingOrder, setPendingOrder] = useState(null)

    // Nothing to check out — bounce back to the cart.
    useEffect(() => {
        if (count === 0 && !submitting) navigate('/cart', { replace: true })
    }, [count, submitting, navigate])

    // Prefill name / IG / email from the saved profile (email falls back to the
    // account email). The meeting location is intentionally left blank every time.
    useEffect(() => {
        if (!user) return
        let active = true
        getProfile(user.id)
            .then((p) => {
                if (!active) return
                setBuyer((b) => ({
                    ...b,
                    name: b.name || p?.name || '',
                    ig: b.ig || p?.instagram || '',
                    email: b.email || p?.email || authEmail || '',
                }))
            })
            .catch(() => {
                /* non-fatal: fall back to the account email only */
                if (active) setBuyer((b) => ({ ...b, email: b.email || authEmail || '' }))
            })
        return () => {
            active = false
        }
    }, [user, authEmail])

    // If the customer closed the Snap window and reloaded, recover the reserved
    // order for the same cart. Re-submitting must retry that order: its unique
    // stickers are already marked unavailable and a second order would fail.
    useEffect(() => {
        if (count === 0) return
        try {
            const parsed = JSON.parse(sessionStorage.getItem('stickit.lastOrder') || 'null')
            if (!parsed || parsed.status !== 'pending' || !Array.isArray(parsed.items)) return
            const signature = (lines) =>
                lines
                    .map((i) => `${i.lineId}:${i.productCode}:${i.quantity}`)
                    .sort()
                    .join('|')
            if (signature(parsed.items) === signature(items)) {
                setPendingOrder(parsed)
                if (parsed.buyer) setBuyer({ ...emptyBuyer, ...parsed.buyer })
            }
        } catch {
            /* malformed snapshot — ignore and start a fresh checkout */
        }
    }, [count, items])

    const total = subtotal + SHIPPING_COST

    function update(field) {
        return (e) => setBuyer((b) => ({ ...b, [field]: e.target.value }))
    }

    async function startPayment(order) {
        await payForOrder(order.orderId, {
            onFinish: async () => {
                // Persist the (possibly edited) contact details for next time.
                try {
                    await saveProfile(user.id, {
                        name: buyer.name,
                        instagram: buyer.ig,
                        email: buyer.email,
                    })
                } catch {
                    /* profile save is best-effort; the order already exists */
                }
                clear()
                navigate(`/receipt/${order.orderId}`)
            },
            onClose: () => {
                setPendingOrder(order)
                setError(
                    'Payment window closed. Your order is reserved — retry the payment or open the receipt.'
                )
            },
        })
    }

    async function retryPayment() {
        if (!pendingOrder) return
        setError('')
        setSubmitting(true)
        try {
            await startPayment(pendingOrder)
        } catch (err) {
            console.warn(err)
            setError(err.message || 'Could not reopen the payment window.')
        } finally {
            setSubmitting(false)
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        // A pending order already owns this cart; retry it instead of creating
        // a second order (individual stickers are unique).
        if (pendingOrder) {
            await retryPayment()
            return
        }

        if (!buyer.name || !buyer.email || !buyer.ig || !buyer.meet) {
            setError('Please fill in your name, email, Instagram and where you want to meet.')
            return
        }

        setSubmitting(true)
        let order = null
        try {
            // 1) Create the order server-side (prices validated in the DB).
            order = await placeOrder(items, buyer)
            setPendingOrder(order)

            // 2) Snapshot for the receipt and for retry after a reload.
            sessionStorage.setItem(
                'stickit.lastOrder',
                JSON.stringify({
                    ...order,
                    items: items.map((i) => ({ ...i })),
                    buyer: { ...buyer },
                })
            )

            // 3) Open Midtrans Snap. Clear the cart + show receipt only on success.
            await startPayment(order)
        } catch (err) {
            console.warn(err)
            if (order) setPendingOrder(order)
            setError(err.message || 'Something went wrong starting your payment.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <Header />
            <main className="main-content">
                <section className="cart-page">
                    <h1 className="products__header">Checkout</h1>

                    <div className="checkout-layout">
                        <form className="checkout-form" onSubmit={handleSubmit} noValidate>
                            <h2 className="summary__title">Meet-up details</h2>

                            <div className="form-row">
                                <label htmlFor="name">Full Name</label>
                                <input id="name" value={buyer.name} onChange={update('name')} required autoComplete="name" disabled={Boolean(pendingOrder) || submitting} />
                            </div>

                            <div className="form-row">
                                <label htmlFor="email">Email</label>
                                <input id="email" type="email" value={buyer.email} onChange={update('email')} required autoComplete="email" disabled={Boolean(pendingOrder) || submitting} />
                            </div>

                            <div className="form-row">
                                <label htmlFor="ig">Instagram</label>
                                <input id="ig" value={buyer.ig} onChange={update('ig')} placeholder="@yourhandle" required disabled={Boolean(pendingOrder) || submitting} />
                            </div>

                            <div className="form-row">
                                <label htmlFor="meet">Where do you wanna meet?</label>
                                <textarea id="meet" rows="2" value={buyer.meet} onChange={update('meet')} required disabled={Boolean(pendingOrder) || submitting} />
                            </div>

                            {error && <p className="form-error" role="alert">{error}</p>}

                            {pendingOrder && (
                                <p className="checkout-note">
                                    Order <strong>{pendingOrder.orderRef}</strong> is reserved.
                                    Retrying opens Midtrans for this same order; cart editing is
                                    paused while the payment is pending.
                                </p>
                            )}

                            <button type="submit" className="checkout-btn" disabled={submitting}>
                                {submitting
                                    ? 'Opening payment…'
                                    : pendingOrder
                                      ? 'Retry payment'
                                      : `Pay ${formatIDR(total)}`}
                            </button>

                            {pendingOrder && (
                                <Link className="secondary" to={`/receipt/${pendingOrder.orderId}`}>
                                    View receipt
                                </Link>
                            )}
                            <p className="checkout-note">
                                You’ll complete payment securely in the Midtrans popup.
                            </p>
                        </form>

                        <aside className="cart-summary">
                            <h2 className="summary__title">Order Summary</h2>
                            {items.map((it) => (
                                <div className="summary-row" key={it.lineId}>
                                    <span>
                                        {it.title}
                                        {it.packed === 'group' ? ` × ${it.quantity}` : ''}
                                    </span>
                                    <span>{formatIDR(it.price * it.quantity)}</span>
                                </div>
                            ))}
                            <div className="summary-row">
                                <span>Shipping</span>
                                <span>{formatIDR(SHIPPING_COST)}</span>
                            </div>
                            <div className="total__rule" />
                            <div className="summary-row summary-row__total">
                                <span>Total</span>
                                <span>{formatIDR(total)}</span>
                            </div>
                            {pendingOrder ? (
                                <p className="checkout-note">
                                    Cart editing is paused while this payment is pending.
                                </p>
                            ) : (
                                <Link className="secondary" to="/cart">
                                    Edit cart
                                </Link>
                            )}
                        </aside>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    )
}
