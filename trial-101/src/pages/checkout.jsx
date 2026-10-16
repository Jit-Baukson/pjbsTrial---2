import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/shopHeader.jsx'
import Footer from '../components/footer.jsx'
import { useCart } from '../context/cart.jsx'
import { formatIDR } from '../lib/format.js'
import { SHIPPING_COST, placeOrder } from '../lib/checkout.js'
import { payForOrder } from '../lib/payments.js'

const emptyBuyer = {
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal: '',
}

export default function Checkout() {
    const navigate = useNavigate()
    const { items, count, subtotal, clear } = useCart()

    const [buyer, setBuyer] = useState(emptyBuyer)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    // Nothing to check out — bounce back to the cart.
    useEffect(() => {
        if (count === 0 && !submitting) navigate('/cart', { replace: true })
    }, [count, submitting, navigate])

    const total = subtotal + SHIPPING_COST

    function update(field) {
        return (e) => setBuyer((b) => ({ ...b, [field]: e.target.value }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        if (!buyer.name || !buyer.email || !buyer.address || !buyer.city) {
            setError('Please fill in your name, email, address and city.')
            return
        }

        setSubmitting(true)
        try {
            // 1) Create the order server-side (prices validated in the DB).
            const order = await placeOrder(items, buyer)

            // 2) Snapshot for the receipt (guests can't re-query RLS-locked orders).
            sessionStorage.setItem(
                'stickit.lastOrder',
                JSON.stringify({
                    ...order,
                    items: items.map((i) => ({ ...i })),
                    buyer: { ...buyer },
                })
            )

            // 3) Open Midtrans Snap. Clear the cart + show receipt only on success.
            await payForOrder(order.orderId, {
                onFinish: () => {
                    clear()
                    navigate(`/receipt/${order.orderId}`)
                },
                onClose: () => {
                    setError('Payment was cancelled. Your cart is still saved.')
                },
            })
        } catch (err) {
            console.warn(err)
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
                            <h2 className="summary__title">Shipping details</h2>

                            <div className="form-row">
                                <label htmlFor="name">Full Name</label>
                                <input id="name" value={buyer.name} onChange={update('name')} required autoComplete="name" />
                            </div>

                            <div className="form-row">
                                <label htmlFor="email">Email</label>
                                <input id="email" type="email" value={buyer.email} onChange={update('email')} required autoComplete="email" />
                            </div>

                            <div className="form-row">
                                <label htmlFor="phone">Phone (optional)</label>
                                <input id="phone" type="tel" value={buyer.phone} onChange={update('phone')} autoComplete="tel" />
                            </div>

                            <div className="form-row">
                                <label htmlFor="address">Address</label>
                                <textarea id="address" rows="2" value={buyer.address} onChange={update('address')} required />
                            </div>

                            <div className="form-row form-row__split">
                                <div>
                                    <label htmlFor="city">City</label>
                                    <input id="city" value={buyer.city} onChange={update('city')} required />
                                </div>
                                <div>
                                    <label htmlFor="postal">Postal Code</label>
                                    <input id="postal" value={buyer.postal} onChange={update('postal')} />
                                </div>
                            </div>

                            {error && <p className="form-error" role="alert">{error}</p>}

                            <button type="submit" className="checkout-btn" disabled={submitting}>
                                {submitting ? 'Opening payment…' : `Pay ${formatIDR(total)}`}
                            </button>
                            <p className="checkout-note">
                                You’ll complete payment securely in the Midtrans popup.
                            </p>
                        </form>

                        <aside className="cart-summary">
                            <h2 className="summary__title">Order Summary</h2>
                            {items.map((it) => (
                                <div className="summary-row" key={it.productId}>
                                    <span>
                                        {it.title} × {it.quantity}
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
                            <Link className="secondary" to="/cart">
                                Edit cart
                            </Link>
                        </aside>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    )
}
