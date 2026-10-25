import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../components/shopHeader.jsx'
import Footer from '../components/footer.jsx'
import ProductImage from '../components/productImage.jsx'
import { formatIDR } from '../lib/format.js'

export default function Receipt() {
    const { orderId } = useParams()
    const [order, setOrder] = useState(null)
    const [missing, setMissing] = useState(false)

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('stickit.lastOrder')
            const parsed = raw ? JSON.parse(raw) : null
            if (parsed && parsed.orderId === orderId) setOrder(parsed)
            else setMissing(true)
        } catch {
            setMissing(true)
        }
    }, [orderId])

    const firstName = order?.buyer?.name?.trim().split(/\s+/)[0] || 'there'

    return (
        <>
            <Header />
            <main className="main-content">
                <section className="cart-page">
                    <h1 className="products__header">Receipt</h1>

                    {!order ? (
                        <div className="cart-empty">
                            <p>
                                {missing
                                    ? 'We could not find this receipt on this device.'
                                    : 'Loading your receipt…'}
                            </p>
                            <Link className="shop-btn" to="/home">
                                Back to home
                            </Link>
                        </div>
                    ) : (
                        <div className="receipt">
                            <div className="receipt-card">
                                <p className="receipt-thanks">
                                    Thank you for your order, {firstName}! 🎉
                                </p>
                                <p className="receipt-ref">
                                    Order <strong>{order.orderRef}</strong>
                                </p>

                                <div className="total__rule" />

                                <ul className="receipt-items">
                                    {order.items.map((it) => (
                                        <li key={it.lineId}>
                                            <ProductImage
                                                className="receipt-thumb"
                                                src={`/outputFiles/${it.imagePath}`}
                                                alt={it.productCode}
                                            />
                                            <span className="receipt-item__title">
                                                {it.title}
                                                {it.packed === 'group' ? ` × ${it.quantity}` : ''}
                                            </span>
                                            <span className="receipt-item__price">
                                                {formatIDR(it.price * it.quantity)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="total__rule" />

                                <div className="summary-row">
                                    <span>Subtotal</span>
                                    <span>{formatIDR(order.subtotal)}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Shipping</span>
                                    <span>{formatIDR(order.shippingCost)}</span>
                                </div>
                                <div className="summary-row summary-row__total">
                                    <span>Total</span>
                                    <span>{formatIDR(order.grandTotal)}</span>
                                </div>

                                <div className="summary-box">
                                    <p className="summary__title">Meet-up details</p>
                                    <p className="summary__content">
                                        {order.buyer.meet && (
                                            <>
                                                Meet at: <strong>{order.buyer.meet}</strong>
                                                <br />
                                            </>
                                        )}
                                        {order.buyer.ig && (
                                            <>
                                                IG: @{String(order.buyer.ig).replace(/^@/, '')}
                                                <br />
                                            </>
                                        )}
                                        {order.buyer.email}
                                    </p>
                                </div>

                                <Link className="shop-btn" to="/shopping/doraemon">
                                    Continue shopping
                                </Link>
                            </div>
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </>
    )
}
